import express from 'express';
import { teacherAuthMiddleware, classTeacherAuthMiddleware, subjectTeacherAuthMiddleware } from './teacher_middleware.js';
import { login, assignMarksheet,  getMarksheet,  giveNote, acknowledgeNote, giveForm, getFormResponses, getAttendanceReport ,getClassStudents,getChatHistory,sendMessageToParent,getNotes,getSentForms,getFormAnalytics,assignAttendance,setWorkingDays,getAttendance,setWorkingDaysFromExcel,assignAttendanceFromExcel,assignMarksheetFromExcel} from './teacher_controller.js';

import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post('/login', login);
router.post('/assign-marksheet', teacherAuthMiddleware, classTeacherAuthMiddleware, assignMarksheet);

router.get('/marksheet/:studentId', teacherAuthMiddleware, classTeacherAuthMiddleware, getMarksheet);
router.post('/assign-attendance', teacherAuthMiddleware, classTeacherAuthMiddleware, assignAttendance);
router.post('/set-working-days', teacherAuthMiddleware, classTeacherAuthMiddleware, setWorkingDays);
router.get('/get-attendance/:studentId', teacherAuthMiddleware, classTeacherAuthMiddleware, getAttendance);

router.post('/give-note', teacherAuthMiddleware, subjectTeacherAuthMiddleware, giveNote);
router.post('/acknowledge-note/:noteId', teacherAuthMiddleware, acknowledgeNote);
router.post('/give-form', teacherAuthMiddleware, classTeacherAuthMiddleware, giveForm);
router.get('/form-responses/:formId', teacherAuthMiddleware, classTeacherAuthMiddleware, getFormResponses);
router.get('/attendance/:studentId', teacherAuthMiddleware, classTeacherAuthMiddleware, getAttendanceReport);
router.get('/class-students', teacherAuthMiddleware, classTeacherAuthMiddleware, getClassStudents);
router.post('/chat/send', teacherAuthMiddleware, subjectTeacherAuthMiddleware, sendMessageToParent);
router.post('/chat/history', teacherAuthMiddleware, subjectTeacherAuthMiddleware, getChatHistory);
router.get('/notes', teacherAuthMiddleware, getNotes);
router.get('/forms/sent', teacherAuthMiddleware, getSentForms);
router.get('/forms/analytics/:formId', teacherAuthMiddleware, classTeacherAuthMiddleware, getFormAnalytics);
router.post('/set-working-days-excel', teacherAuthMiddleware, classTeacherAuthMiddleware, upload.single('file'), setWorkingDaysFromExcel);
router.post('/assign-attendance-excel', teacherAuthMiddleware, classTeacherAuthMiddleware, upload.single('file'), assignAttendanceFromExcel);
router.post('/assign-marksheet-excel', teacherAuthMiddleware, classTeacherAuthMiddleware, upload.single('file'), assignMarksheetFromExcel);
export default router;