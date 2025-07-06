import express from 'express';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();
// Apply authentication to all routes
router.use(authenticate);
// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        // Get basic counts
        const [totalPatients, totalDoctors, todayAppointments, pendingAppointments, completedAppointments, newPatientsThisMonth] = await Promise.all([
            Patient.countDocuments({ isActive: true }),
            User.countDocuments({ role: 'doctor', isActive: true }),
            Appointment.countDocuments({
                date: { $gte: startOfDay, $lte: endOfDay }
            }),
            Appointment.countDocuments({
                status: { $in: ['scheduled', 'confirmed'] }
            }),
            Appointment.countDocuments({
                status: 'completed',
                date: { $gte: startOfDay, $lte: endOfDay }
            }),
            Patient.countDocuments({
                isActive: true,
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            })
        ]);
        // Get upcoming appointments
        const upcomingAppointments = await Appointment.find({
            date: { $gte: new Date() },
            status: { $in: ['scheduled', 'confirmed'] }
        })
            .populate('patient', 'firstName lastName')
            .populate('doctor', 'firstName lastName')
            .sort({ date: 1, time: 1 })
            .limit(5);
        // Get recent patients
        const recentPatients = await Patient.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('firstName lastName email createdAt');
        // Get appointment statistics by status
        const appointmentStats = await Appointment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        // Get monthly appointment trends (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyTrends = await Appointment.aggregate([
            {
                $match: {
                    date: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);
        // Get patient demographics
        const patientDemographics = await Patient.aggregate([
            {
                $match: { isActive: true }
            },
            {
                $group: {
                    _id: '$gender',
                    count: { $sum: 1 }
                }
            }
        ]);
        // Get age distribution
        const ageDistribution = await Patient.aggregate([
            {
                $match: { isActive: true }
            },
            {
                $addFields: {
                    age: {
                        $floor: {
                            $divide: [
                                { $subtract: [new Date(), '$dateOfBirth'] },
                                365.25 * 24 * 60 * 60 * 1000
                            ]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $lt: ['$age', 18] }, then: '0-17' },
                                { case: { $lt: ['$age', 35] }, then: '18-34' },
                                { case: { $lt: ['$age', 50] }, then: '35-49' },
                                { case: { $lt: ['$age', 65] }, then: '50-64' },
                            ],
                            default: '65+'
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);
        const dashboardData = {
            overview: {
                totalPatients,
                totalDoctors,
                todayAppointments,
                pendingAppointments,
                completedAppointments,
                newPatientsThisMonth
            },
            upcomingAppointments: upcomingAppointments.map(apt => ({
                id: apt._id.toString(),
                patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
                doctorName: `${apt.doctor.firstName} ${apt.doctor.lastName}`,
                date: apt.date,
                time: apt.time,
                type: apt.type,
                status: apt.status
            })),
            recentPatients: recentPatients.map(patient => ({
                id: patient._id.toString(),
                name: `${patient.firstName} ${patient.lastName}`,
                email: patient.email,
                createdAt: patient.createdAt
            })),
            appointmentStats,
            monthlyTrends,
            demographics: {
                gender: patientDemographics,
                age: ageDistribution
            }
        };
        res.json({
            success: true,
            data: dashboardData
        });
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity feed
// @access  Private
router.get('/recent-activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        // Get recent appointments
        const recentAppointments = await Appointment.find()
            .populate('patient', 'firstName lastName')
            .populate('doctor', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(Math.floor(limit / 2));
        // Get recent patients
        const recentPatients = await Patient.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(Math.floor(limit / 2))
            .select('firstName lastName createdAt');
        // Combine and format activities
        const activities = [];
        recentAppointments.forEach(apt => {
            activities.push({
                id: apt._id.toString(),
                type: 'appointment',
                action: 'created',
                description: `New appointment scheduled for ${apt.patient.firstName} ${apt.patient.lastName} with Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`,
                timestamp: apt.createdAt,
                user: apt.createdBy ? `${apt.createdBy.firstName} ${apt.createdBy.lastName}` : 'System'
            });
        });
        recentPatients.forEach(patient => {
            activities.push({
                id: patient._id.toString(),
                type: 'patient',
                action: 'registered',
                description: `New patient registered: ${patient.firstName} ${patient.lastName}`,
                timestamp: patient.createdAt,
                user: 'System'
            });
        });
        // Sort by timestamp
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json({
            success: true,
            data: activities.slice(0, limit)
        });
    }
    catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
export default router;
//# sourceMappingURL=dashboard.routes.js.map