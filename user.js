import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { Admin, Parent, Teacher ,OTP} from './model.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Authentication required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('decoded:', decoded);
        req.user_id = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user_id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ 
                success: false,
                message: 'Old password and new password are required' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: 'New password must be at least 6 characters' 
            });
        }

        // Search for user in all collections simultaneously
        const [admin, parent, teacher] = await Promise.all([
            Admin.findById(userId),
            Parent.findById(userId),
            Teacher.findById(userId)
        ]);

        // Find the user and their type
        let user = null;
        let userType = '';

        if (admin) {
            user = admin;
            userType = 'Admin';
        } else if (parent) {
            user = parent;
            userType = 'Parent';
        } else if (teacher) {
            user = teacher;
            userType = 'Teacher';
        }

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found. Invalid user ID.' 
            });
        }

        // Verify old password
        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ 
                success: false,
                message: 'Current password is incorrect' 
            });
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ 
            success: true,
            message: `Password updated successfully for ${userType}`,
          
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to change password',
            error: error.message 
        });
    }
};


const generateOTP= async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false,
                message: 'Email is required' 
            });
        }

        // Search for user in all collections simultaneously
        const [admin, parent, teacher] = await Promise.all([
            Admin.findOne({ email }),
            Parent.findOne({ email }),
            Teacher.findOne({ email })
        ]);

        // Find the user and their type
        let user = null;
        let userType = '';

        if (admin) {
            user = admin;
            userType = 'Admin';
        } else if (parent) {
            user = parent;
            userType = 'Parent';
        } else if (teacher) {
            user = teacher;
            userType = 'Teacher';
        }

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'No user found with this email address' 
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    
        const otpExpiration = Date.now() + 2 * 60 * 1000; // 2 minutes from now

        // Save OTP and expiration time in the database
        await OTP.create({ email, otp, expiresAt: otpExpiration });

        // Configure email transporter
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Send email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 2 minutes.`,
            html: `
                <h2>Password Reset OTP</h2>
                <p>Your OTP for password reset is: <strong>${otp}</strong></p>
                <p>This OTP is valid for 2 minutes.</p>
                <p>If you didn't request this password reset, please contact support immediately.</p>
            `
        });

        res.json({ 
            success: true,
            message: 'OTP has been sent to your email',
            userType
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to send OTP',
            error: error.message 
        });
    }
};
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ 
                success: false,
                message: 'Email, OTP, and new password are required' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: 'New password must be at least 6 characters' 
            });
        }

        // Find the OTP record
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid OTP' 
            });
        }

        // Check if OTP is expired
        if (Date.now() > otpRecord.expiresAt) {
            return res.status(400).json({ 
                success: false,
                message: 'OTP has expired' 
            });
        }

        // Search for user in all collections simultaneously
        const [admin, parent, teacher] = await Promise.all([
            Admin.findOne({ email }),
            Parent.findOne({ email }),
            Teacher.findOne({ email })
        ]);

        // Find the user and their type
        let user = null;
        let userType = '';

        if (admin) {
            user = admin;
            userType = 'Admin';
        } else if (parent) {
            user = parent;
            userType = 'Parent';
        } else if (teacher) {
            user = teacher;
            userType = 'Teacher';
        }

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Update password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Delete the OTP record
        await OTP.deleteOne({ email, otp });

        res.json({ 
            success: true,
            message: `Password updated successfully for ${userType}`,
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to reset password',
            error: error.message 
        });
    }
};

router.post('/change-password', authMiddleware, changePassword);
router.post('/send-otp',generateOTP);
router.post('/reset-password', resetPassword);


export default router;