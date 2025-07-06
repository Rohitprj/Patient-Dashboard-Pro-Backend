import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { validateUserRegistration, validateUserLogin, handleValidationErrors } from '../middleware/validation.js';
const router = express.Router();
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateUserRegistration, handleValidationErrors, async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role } = req.body;
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: existingUser.email === email
                    ? 'User with this email already exists'
                    : 'Username already taken',
            });
            return;
        }
        // Create new user
        const user = new User({
            username,
            email,
            password,
            firstName,
            lastName,
            role: role || 'staff',
        });
        await user.save();
        // Generate JWT token
        const token = jwt.sign({
            userId: user._id,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: user.toJSON(),
                token
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }
        // Check if user is active
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Account is deactivated',
            });
            return;
        }
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
            return;
        }
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        // Generate JWT token
        const token = jwt.sign({
            userId: user._id,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toJSON(),
                token
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user,
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
    try {
        // In a stateless JWT system, logout is handled client-side
        // This endpoint can be used for logging purposes
        res.json({
            success: true,
            message: 'Logout successful',
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticate, async (req, res) => {
    try {
        // Generate new token
        const token = jwt.sign({
            userId: req.user._id,
            email: req.user.email,
            role: req.user.role
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: { token },
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
export default router;
//# sourceMappingURL=auth.routes.js.map