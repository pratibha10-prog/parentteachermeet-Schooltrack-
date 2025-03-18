import jwt from 'jsonwebtoken';
import { Parent } from '../model.js';

const parentAuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send({ error: 'No token provided. Please authenticate.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const parent = await Parent.findOne({ _id: decoded.id });

        if (!parent) {
            return res.status(401).send({ error: 'Invalid token. Please authenticate.' });
        }

        req.token = token;
        req.parent = parent;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

export { parentAuthMiddleware };