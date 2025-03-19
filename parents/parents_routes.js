import express from 'express';
import { parentAuthMiddleware } from './parents_middleware.js';
import { login,getChildren, getForms, getMarksheet, getAttendanceReport, sendNoteToTeacher, acknowledgeNote, getTeacherDetails,fillForm ,getChatHistory,sendMessageToTeacher,    createDonation,
    getPendingDonations,
    applyForDonation,getAllFormsNotFilled,
    getNotes} from './parents_controller.js';

const router = express.Router();

router.post('/login', login);
router.get('/children', parentAuthMiddleware, getChildren);
router.get('/forms/:studentId', parentAuthMiddleware, getForms);
router.get('/marksheet/:studentId', parentAuthMiddleware, getMarksheet);
router.get('/attendance/:studentId', parentAuthMiddleware, getAttendanceReport);
router.post('/send-note', parentAuthMiddleware, sendNoteToTeacher);
router.post('/acknowledge-note/:noteId', parentAuthMiddleware, acknowledgeNote);
router.get('/teacher-details/:studentId', parentAuthMiddleware, getTeacherDetails);
router.post('/fill-form', parentAuthMiddleware, fillForm);
router.post('/chat/send', parentAuthMiddleware, sendMessageToTeacher);
router.get('/chat/history', parentAuthMiddleware, getChatHistory);
router.get('/forms/not-filled', parentAuthMiddleware, getAllFormsNotFilled);
router.get('/notes', parentAuthMiddleware, getNotes);

router.post('/donations/create', parentAuthMiddleware, createDonation);
router.get('/donations/pending', parentAuthMiddleware, getPendingDonations);
router.post('/donations/apply/:donationId', parentAuthMiddleware, applyForDonation);


export default router;