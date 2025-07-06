import express from 'express';
import Patient from '../models/Patient.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  validatePatientCreation, 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/patients
// @desc    Get all patients with pagination and filtering
// @access  Private
router.get('/', validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { isActive: true };
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    if (req.query.gender) {
      filter.gender = req.query.gender;
    }

    if (req.query.bloodType) {
      filter.bloodType = req.query.bloodType;
    }

    // Execute query with pagination
    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .populate('primaryDoctor', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Patient.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const patient = await Patient.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('primaryDoctor', 'firstName lastName email');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/patients
// @desc    Create new patient
// @access  Private (Admin, Doctor, Nurse)
router.post('/', 
  authorize('admin', 'doctor', 'nurse'), 
  validatePatientCreation, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      // Check if patient with email already exists
      const existingPatient = await Patient.findOne({ 
        email: req.body.email,
        isActive: true 
      });

      if (existingPatient) {
        return res.status(400).json({
          success: false,
          message: 'Patient with this email already exists',
        });
      }

      const patient = new Patient(req.body);
      await patient.save();

      // Populate the response
      await patient.populate('primaryDoctor', 'firstName lastName email');

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: patient,
      });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private (Admin, Doctor, Nurse)
router.put('/:id', 
  authorize('admin', 'doctor', 'nurse'),
  validateObjectId('id'),
  validatePatientCreation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const patient = await Patient.findOne({ 
        _id: req.params.id, 
        isActive: true 
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      // Check if email is being changed and if it conflicts
      if (req.body.email !== patient.email) {
        const existingPatient = await Patient.findOne({ 
          email: req.body.email,
          _id: { $ne: req.params.id },
          isActive: true 
        });

        if (existingPatient) {
          return res.status(400).json({
            success: false,
            message: 'Patient with this email already exists',
          });
        }
      }

      // Update patient
      Object.assign(patient, req.body);
      await patient.save();

      // Populate the response
      await patient.populate('primaryDoctor', 'firstName lastName email');

      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: patient,
      });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

// @route   DELETE /api/patients/:id
// @desc    Soft delete patient
// @access  Private (Admin only)
router.delete('/:id', 
  authorize('admin'),
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const patient = await Patient.findOne({ 
        _id: req.params.id, 
        isActive: true 
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      // Soft delete
      patient.isActive = false;
      await patient.save();

      res.json({
        success: true,
        message: 'Patient deleted successfully',
      });
    } catch (error) {
      console.error('Delete patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

// @route   GET /api/patients/:id/medical-history
// @desc    Get patient medical history
// @access  Private
router.get('/:id/medical-history', 
  validateObjectId('id'), 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const patient = await Patient.findOne({ 
        _id: req.params.id, 
        isActive: true 
      }).select('medicalHistory');

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      res.json({
        success: true,
        data: patient.medicalHistory,
      });
    } catch (error) {
      console.error('Get medical history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

// @route   GET /api/patients/:id/medications
// @desc    Get patient current medications
// @access  Private
router.get('/:id/medications', 
  validateObjectId('id'), 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const patient = await Patient.findOne({ 
        _id: req.params.id, 
        isActive: true 
      }).select('currentMedications');

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      // Filter active medications
      const activeMedications = patient.currentMedications.filter(med => med.isActive);

      res.json({
        success: true,
        data: activeMedications,
      });
    } catch (error) {
      console.error('Get medications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;