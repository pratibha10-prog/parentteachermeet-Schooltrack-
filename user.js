import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { Admin, Parent, Teacher } from './model.js';

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

const generateRandomPassword = () => {
    const length = 12; // Changed to 12 digits
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';

    // Ensure at least one uppercase, one lowercase, and one number
    password += charset.charAt(Math.floor(Math.random() * 26) + 26); // Uppercase
    password += charset.charAt(Math.floor(Math.random() * 26)); // Lowercase
    password += charset.charAt(Math.floor(Math.random() * 10) + 52); // Number

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

const forgotPassword = async (req, res) => {
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

        const newPassword = generateRandomPassword();
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

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
            subject: 'Password Reset',
            text: `Your new password is: ${newPassword}\n\nPlease change this password after logging in.`,
            html: `
                <h2>Password Reset</h2>
                <p>Your new password is: <strong>${newPassword}</strong></p>
                <p>Please change this password after logging in.</p>
                <p>If you didn't request this password reset, please contact support immediately.</p>
            `
        });

        res.json({ 
            success: true,
            message: 'New password has been sent to your email',
            userType
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
router.post('/forgot-password', forgotPassword);

export default router;