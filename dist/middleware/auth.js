import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
            return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.',
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Account is deactivated.',
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token.',
            });
            return;
        }
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Token expired.',
            });
            return;
        }
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions.',
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=auth.js.map