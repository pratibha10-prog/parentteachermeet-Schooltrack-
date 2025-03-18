import jwt from 'jsonwebtoken';
import { Teacher, Student } from '../model.js';

const teacherAuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send({ error: 'No token provided. Please authenticate.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teacher = await Teacher.findOne({ _id: decoded.id });

        if (!teacher) {
            return res.status(401).send({ error: 'Invalid token. Please authenticate.' });
        }

        req.token = token;
        req.teacher = teacher;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

const classTeacherAuthMiddleware = async (req, res, next) => {
    try {
        const teacher = req.teacher;
        
        if (!teacher.classTeacher || !teacher.classTeacher.class || !teacher.classTeacher.division) {
            return res.status(403).send({ error: 'Access denied. You are not a class teacher.' });
        }

        if (req.body.studentId || req.params.studentId) {
            const studentId = req.body.studentId || req.params.studentId;
            const student = await Student.findById(studentId);

            if (!student) {
                return res.status(404).send({ error: 'Student not found.' });
            }

            if (student.class !== teacher.classTeacher.class || 
                student.division !== teacher.classTeacher.division) {
                return res.status(403).send({ 
                    error: 'Access denied. You are not the class teacher of this student.' 
                });
            }
        }

        next();
    } catch (error) {
        console.error('Class teacher verification error:', error);
        res.status(500).send({ error: 'Error verifying class teacher authorization.' });
    }
};

const subjectTeacherAuthMiddleware = async (req, res, next) => {
    try {
        const teacher = req.teacher;
        const studentId = req.body.studentId || req.params.studentId;

        if (!studentId) {
            return res.status(400).send({ error: 'Student ID is required.' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

     
        const teachesClass = teacher.subjects.some(subject => 
            subject.class === student.class && 
            subject.division === student.division
        );

        if (!teachesClass) {
            return res.status(403).send({ 
                error: 'Access denied. You do not teach any subject to this class.' 
            });
        }

        req.student = student;
        req.teacherSubjects = teacher.subjects.filter(subject => 
            subject.class === student.class && 
            subject.division === student.division
        ).map(subject => subject.subject);

        next();
    } catch (error) {
        console.error('Subject teacher verification error:', error);
        res.status(500).send({ error: 'Error verifying subject teacher authorization.' });
    }
};

export { teacherAuthMiddleware, classTeacherAuthMiddleware, subjectTeacherAuthMiddleware };