import express from 'express';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateAppointmentCreation, validateObjectId, validatePagination, handleValidationErrors } from '../middleware/validation.js';
const router = express.Router();
// Apply authentication to all routes
router.use(authenticate);
// @route   GET /api/appointments
// @desc    Get all appointments with pagination and filtering
// @access  Private
router.get('/', validatePagination, handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Build filter object
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.doctor) {
            filter.doctor = req.query.doctor;
        }
        if (req.query.patient) {
            filter.patient = req.query.patient;
        }
        if (req.query.date) {
            const startDate = new Date(req.query.date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            filter.date = {
                $gte: startDate,
                $lt: endDate
            };
        }
        if (req.query.dateFrom && req.query.dateTo) {
            filter.date = {
                $gte: new Date(req.query.dateFrom),
                $lte: new Date(req.query.dateTo)
            };
        }
        // Execute query with pagination
        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('patient', 'firstName lastName email phone')
                .populate('doctor', 'firstName lastName email')
                .populate('createdBy', 'firstName lastName')
                .sort({ date: 1, time: 1 })
                .skip(skip)
                .limit(limit),
            Appointment.countDocuments(filter)
        ]);
        res.json({
            success: true,
            data: appointments,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
            },
        });
    }
    catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', validateObjectId('id'), handleValidationErrors, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient', 'firstName lastName email phone dateOfBirth gender')
            .populate('doctor', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .populate('updatedBy', 'firstName lastName');
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
            return;
        }
        res.json({
            success: true,
            data: appointment,
        });
    }
    catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private (Admin, Doctor, Nurse)
router.post('/', authorize('admin', 'doctor', 'nurse'), validateAppointmentCreation, handleValidationErrors, async (req, res) => {
    try {
        const { patient: patientId, doctor: doctorId, date, time } = req.body;
        // Verify patient exists
        const patient = await Patient.findOne({ _id: patientId, isActive: true });
        if (!patient) {
            res.status(400).json({
                success: false,
                message: 'Patient not found',
            });
            return;
        }
        // Verify doctor exists and has appropriate role
        const doctor = await User.findOne({
            _id: doctorId,
            isActive: true,
            role: { $in: ['doctor', 'admin'] }
        });
        if (!doctor) {
            res.status(400).json({
                success: false,
                message: 'Doctor not found',
            });
            return;
        }
        // Check for scheduling conflicts
        const conflictingAppointment = await Appointment.findOne({
            doctor: doctorId,
            date: new Date(date),
            time: time,
            status: { $nin: ['cancelled', 'no-show'] }
        });
        if (conflictingAppointment) {
            res.status(400).json({
                success: false,
                message: 'Doctor is not available at this time',
            });
            return;
        }
        // Create appointment
        const appointment = new Appointment({
            ...req.body,
            createdBy: req.user._id,
        });
        await appointment.save();
        // Populate the response
        await appointment.populate([
            { path: 'patient', select: 'firstName lastName email phone' },
            { path: 'doctor', select: 'firstName lastName email' },
            { path: 'createdBy', select: 'firstName lastName' }
        ]);
        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment,
        });
    }
    catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private (Admin, Doctor, Nurse)
router.put('/:id', authorize('admin', 'doctor', 'nurse'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
            return;
        }
        // Check if time/date is being changed and verify availability
        if (req.body.date || req.body.time || req.body.doctor) {
            const newDate = req.body.date ? new Date(req.body.date) : appointment.date;
            const newTime = req.body.time || appointment.time;
            const newDoctor = req.body.doctor || appointment.doctor;
            const conflictingAppointment = await Appointment.findOne({
                _id: { $ne: req.params.id },
                doctor: newDoctor,
                date: newDate,
                time: newTime,
                status: { $nin: ['cancelled', 'no-show'] }
            });
            if (conflictingAppointment) {
                res.status(400).json({
                    success: false,
                    message: 'Doctor is not available at this time',
                });
                return;
            }
        }
        // Update appointment
        Object.assign(appointment, req.body);
        appointment.updatedBy = req.user._id;
        await appointment.save();
        // Populate the response
        await appointment.populate([
            { path: 'patient', select: 'firstName lastName email phone' },
            { path: 'doctor', select: 'firstName lastName email' },
            { path: 'updatedBy', select: 'firstName lastName' }
        ]);
        res.json({
            success: true,
            message: 'Appointment updated successfully',
            data: appointment,
        });
    }
    catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   DELETE /api/appointments/:id
// @desc    Cancel appointment
// @access  Private (Admin, Doctor, Nurse)
router.delete('/:id', authorize('admin', 'doctor', 'nurse'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            res.status(404).json({
                success: false,
                message: 'Appointment not found',
            });
            return;
        }
        // Update status to cancelled instead of deleting
        appointment.status = 'cancelled';
        appointment.updatedBy = req.user._id;
        await appointment.save();
        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
        });
    }
    catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   GET /api/appointments/doctor/:doctorId/availability
// @desc    Get doctor availability for a specific date
// @access  Private
router.get('/doctor/:doctorId/availability', validateObjectId('doctorId'), handleValidationErrors, async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;
        if (!date) {
            res.status(400).json({
                success: false,
                message: 'Date is required',
            });
            return;
        }
        // Get all appointments for the doctor on the specified date
        const appointments = await Appointment.find({
            doctor: doctorId,
            date: new Date(date),
            status: { $nin: ['cancelled', 'no-show'] }
        }).select('time duration');
        // Generate available time slots (example: 9 AM to 5 PM, 30-minute slots)
        const workingHours = {
            start: 9, // 9 AM
            end: 17, // 5 PM
            slotDuration: 30 // 30 minutes
        };
        const availableSlots = [];
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
            for (let minute = 0; minute < 60; minute += workingHours.slotDuration) {
                const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                // Check if this slot conflicts with existing appointments
                const hasConflict = appointments.some(apt => {
                    const aptStart = apt.time;
                    const [aptHour, aptMinute] = aptStart.split(':').map(Number);
                    const aptStartMinutes = aptHour * 60 + aptMinute;
                    const aptEndMinutes = aptStartMinutes + apt.duration;
                    const slotStartMinutes = hour * 60 + minute;
                    const slotEndMinutes = slotStartMinutes + workingHours.slotDuration;
                    return (slotStartMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes);
                });
                if (!hasConflict) {
                    availableSlots.push(timeSlot);
                }
            }
        }
        res.json({
            success: true,
            data: {
                date,
                availableSlots,
                bookedSlots: appointments.map(apt => ({
                    time: apt.time,
                    duration: apt.duration
                }))
            },
        });
    }
    catch (error) {
        console.error('Get availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
export default router;
//# sourceMappingURL=appointment.routes.js.map