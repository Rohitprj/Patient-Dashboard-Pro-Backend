import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'doctor' | 'nurse' | 'staff';
  isActive: boolean;
  lastLogin?: Date;
  profileImage?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): any;
}

export interface IPatient extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  medicalHistory: Array<{
    condition: string;
    diagnosedDate?: Date;
    status: 'active' | 'resolved' | 'chronic';
    notes?: string;
  }>;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    prescribedBy: string;
    isActive: boolean;
  }>;
  allergies: Array<{
    allergen: string;
    severity: 'mild' | 'moderate' | 'severe';
    reaction?: string;
  }>;
  bloodType?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  primaryDoctor?: Types.ObjectId;
  isActive: boolean;
  profileImage?: string;
  notes?: string;
  fullName: string;
  age: number;
}

export interface IAppointment extends Document {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  type: 'checkup' | 'consultation' | 'followup' | 'emergency' | 'procedure';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  date: Date;
  time: string;
  duration: number;
  reason: string;
  notes?: string;
  symptoms?: string[];
  diagnosis?: string;
  treatment?: string;
  prescriptions?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  followUpRequired: boolean;
  followUpDate?: Date;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  datetime: Date;
  endTime: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface DashboardStats {
  overview: {
    totalPatients: number;
    totalDoctors: number;
    todayAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
    newPatientsThisMonth: number;
  };
  upcomingAppointments: Array<{
    id: string;
    patientName: string;
    doctorName: string;
    date: Date;
    time: string;
    type: string;
    status: string;
  }>;
  recentPatients: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }>;
  appointmentStats: Array<{
    _id: string;
    count: number;
  }>;
  monthlyTrends: Array<{
    _id: {
      year: number;
      month: number;
      status: string;
    };
    count: number;
  }>;
  demographics: {
    gender: Array<{
      _id: string;
      count: number;
    }>;
    age: Array<{
      _id: string;
      count: number;
    }>;
  };
}