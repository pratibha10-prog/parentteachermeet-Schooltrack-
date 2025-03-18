import jwt from 'jsonwebtoken';
import { Admin } from '../model.js';

const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ error: 'No token provided. Please authenticate.' });
    }

    try {
        console.log('Token:', token);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded:', decoded);
     
        const admin = await Admin.findOne({ _id: decoded.id});

        console.log('Admin:', admin);

        if (!admin) {
            return res.status(401).send({ error: 'Invalid token. Please authenticate.' });
        }

        req.token = token;
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

export default authMiddleware;
