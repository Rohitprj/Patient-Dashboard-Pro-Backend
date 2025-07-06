# Patient Dashboard Backend

A robust Node.js/Express/MongoDB backend for the Patient Dashboard application.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Patient Management**: Complete CRUD operations for patient records
- **Appointment System**: Scheduling and management of medical appointments
- **Dashboard Analytics**: Real-time statistics and insights
- **User Management**: Admin panel for managing healthcare staff
- **Data Validation**: Comprehensive input validation and sanitization
- **Security**: Helmet, rate limiting, and secure password hashing
- **Error Handling**: Centralized error handling with detailed logging

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Security**: bcryptjs, helmet, cors, express-rate-limit
- **Development**: nodemon, jest, supertest

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js      # Global error handler
│   │   ├── notFound.js          # 404 handler
│   │   └── validation.js        # Input validation rules
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Patient.js           # Patient model
│   │   └── Appointment.js       # Appointment model
│   ├── routes/
│   │   ├── auth.routes.js       # Authentication routes
│   │   ├── user.routes.js       # User management routes
│   │   ├── patient.routes.js    # Patient CRUD routes
│   │   ├── appointment.routes.js # Appointment routes
│   │   └── dashboard.routes.js  # Dashboard analytics
│   └── server.js                # Main server file
├── uploads/                     # File upload directory
├── .env.example                 # Environment variables template
├── package.json
└── README.md
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/patient_dashboard
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   JWT_EXPIRES_IN=24h
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:8081
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/doctors` - Get all doctors
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Patients
- `GET /api/patients` - Get all patients (with pagination)
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient (Admin only)
- `GET /api/patients/:id/medical-history` - Get patient medical history
- `GET /api/patients/:id/medications` - Get patient medications

### Appointments
- `GET /api/appointments` - Get all appointments (with filtering)
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment
- `GET /api/appointments/doctor/:doctorId/availability` - Get doctor availability

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent activity feed

## User Roles

- **Admin**: Full access to all features
- **Doctor**: Can manage patients and appointments
- **Nurse**: Can manage patients and appointments
- **Staff**: Limited access to patient information

## Data Models

### User
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: ['admin', 'doctor', 'nurse', 'staff'],
  isActive: Boolean,
  lastLogin: Date,
  profileImage: String
}
```

### Patient
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  dateOfBirth: Date,
  gender: ['male', 'female', 'other'],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  medicalHistory: Array,
  currentMedications: Array,
  allergies: Array,
  bloodType: String,
  insuranceProvider: String,
  insuranceNumber: String,
  primaryDoctor: ObjectId,
  isActive: Boolean
}
```

### Appointment
```javascript
{
  patient: ObjectId,
  doctor: ObjectId,
  type: ['checkup', 'consultation', 'followup', 'emergency', 'procedure'],
  status: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
  date: Date,
  time: String,
  duration: Number,
  reason: String,
  notes: String,
  symptoms: Array,
  diagnosis: String,
  treatment: String,
  prescriptions: Array,
  followUpRequired: Boolean,
  followUpDate: Date
}
```

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Comprehensive validation using express-validator
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **Role-based Access Control**: Different permissions for different user roles

## Error Handling

The API uses a centralized error handling system that:
- Catches and formats all errors consistently
- Provides meaningful error messages
- Logs errors for debugging
- Returns appropriate HTTP status codes

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use a production MongoDB instance
   - Set secure JWT secrets
   - Configure proper CORS origins

2. **Build and Start**
   ```bash
   npm start
   ```

3. **Health Check**
   The API provides a health check endpoint at `/health`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.