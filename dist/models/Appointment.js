import mongoose, { Schema } from 'mongoose';
const appointmentSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: [true, 'Patient is required'],
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Doctor is required'],
    },
    type: {
        type: String,
        enum: ['checkup', 'consultation', 'followup', 'emergency', 'procedure'],
        required: [true, 'Appointment type is required'],
    },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
        default: 'scheduled',
    },
    date: {
        type: Date,
        required: [true, 'Appointment date is required'],
    },
    time: {
        type: String,
        required: [true, 'Appointment time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)'],
    },
    duration: {
        type: Number,
        required: [true, 'Duration is required'],
        min: [15, 'Minimum duration is 15 minutes'],
        max: [480, 'Maximum duration is 8 hours'],
    },
    reason: {
        type: String,
        required: [true, 'Reason for appointment is required'],
        maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    symptoms: [{
            type: String,
            trim: true,
        }],
    diagnosis: {
        type: String,
        maxlength: [500, 'Diagnosis cannot exceed 500 characters'],
    },
    treatment: {
        type: String,
        maxlength: [1000, 'Treatment cannot exceed 1000 characters'],
    },
    prescriptions: [{
            medication: {
                type: String,
                required: true,
            },
            dosage: {
                type: String,
                required: true,
            },
            frequency: {
                type: String,
                required: true,
            },
            duration: {
                type: String,
                required: true,
            },
            instructions: String,
        }],
    followUpRequired: {
        type: Boolean,
        default: false,
    },
    followUpDate: {
        type: Date,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});
// Indexes for performance
appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ createdAt: -1 });
// Compound index for preventing double booking
appointmentSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });
// Virtual for appointment datetime
appointmentSchema.virtual('datetime').get(function () {
    const [hours, minutes] = this.time.split(':');
    const datetime = new Date(this.date);
    datetime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return datetime;
});
// Virtual for end time
appointmentSchema.virtual('endTime').get(function () {
    const [hours, minutes] = this.time.split(':');
    const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
    const endMinutes = startMinutes + this.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
});
// Ensure virtual fields are serialized
appointmentSchema.set('toJSON', { virtuals: true });
const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
//# sourceMappingURL=Appointment.js.map