import express, { Request, Response } from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} from '../middleware/validation.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
router.get('/', 
  authorize('admin'), 
  validatePagination, 
  handleValidationErrors, 
  async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Build filter object
      const filter: any = { isActive: true };
      
      if (req.query.role) {
        filter.role = req.query.role;
      }

      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search as string, 'i');
        filter.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { username: searchRegex }
        ];
      }

      // Execute query with pagination
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

// @route   GET /api/users/doctors
// @desc    Get all doctors
// @access  Private
router.get('/doctors', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const doctors = await User.find({ 
      role: 'doctor', 
      isActive: true 
    })
    .select('firstName lastName email')
    .sort({ firstName: 1 });

    res.json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', validateObjectId('id'), handleValidationErrors, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if user can access this profile
    if (req.user!.role !== 'admin' && req.user!._id.toString() !== req.params.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', validateObjectId('id'), handleValidationErrors, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id, 
      isActive: true 
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check permissions
    if (req.user!.role !== 'admin' && req.user!._id.toString() !== req.params.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // Prevent non-admins from changing role
    if (req.user!.role !== 'admin' && req.body.role) {
      delete req.body.role;
    }

    // Prevent password updates through this endpoint
    delete req.body.password;

    // Check if email/username is being changed and if it conflicts
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({ 
        email: req.body.email,
        _id: { $ne: req.params.id },
        isActive: true 
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }
    }

    if (req.body.username && req.body.username !== user.username) {
      const existingUser = await User.findOne({ 
        username: req.body.username,
        _id: { $ne: req.params.id },
        isActive: true 
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Username already taken',
        });
        return;
      }
    }

    // Update user
    Object.assign(user, req.body);
    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Soft delete user
// @access  Private (Admin only)
router.delete('/:id', 
  authorize('admin'),
  validateObjectId('id'),
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    try {
      const user = await User.findOne({ 
        _id: req.params.id, 
        isActive: true 
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Prevent admin from deleting themselves
      if (req.user!._id.toString() === req.params.id) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete your own account',
        });
        return;
      }

      // Soft delete
      user.isActive = false;
      await user.save();

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;