import express from 'express';
import {
    registerAdmin,
    loginAdmin,
    addTeacher,
    removeTeacher,
    addParent,
    removeParent,
    addStudent,
    removeStudent,    getAllDonations,
    getPendingDonations,
    assignDonation
} from '../admin/admin_controller.js';

import authMiddleware from './admin_middleware.js';

const router = express.Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.post('/teacher', authMiddleware, addTeacher);
router.delete('/teacher/:id', authMiddleware, removeTeacher);
router.post('/parent', authMiddleware, addParent);
router.delete('/parent/:id', authMiddleware, removeParent);
router.post('/student', authMiddleware, addStudent);
router.delete('/student/:id', authMiddleware, removeStudent);
router.get('/donations', authMiddleware, getAllDonations);
router.get('/donations/pending',authMiddleware, getPendingDonations);
router.post('/donations/assign',authMiddleware, assignDonation);



export default router;