import { Student, MarkSheet, Attendance, Note, DynamicForm, Teacher,Chat } from '../model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const teacher = await Teacher.findOne({ email });

        if (!teacher) {
            return res.status(404).send({ error: 'Teacher not found.' });
        }

        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            return res.status(400).send({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: teacher._id }, process.env.JWT_SECRET, { expiresIn: '3h' });
        res.status(200).send({ token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send({ error: 'Error logging in.' });
    }
};

const getAttendanceReport = async (req, res) => {
    try {
        const { studentId } = req.params;
        const teacher = req.teacher;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        const attendance = await Attendance.findOne({ studentId });
        if (!attendance) {
            return res.status(404).send({ error: 'Attendance not found.' });
        }

        res.status(200).send(attendance);
    } catch (error) {
        console.error('Error getting attendance report:', error);
        res.status(500).send({ error: 'Error getting attendance report.' });
    }
};

const assignMarksheet = async (req, res) => {
    try {
        const { studentId, marks } = req.body;
        const teacher = req.teacher;

        
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        const obtainedMarks = marks.subjects.reduce((total, subject) => total + subject.marks, 0);
        const totalPossibleMarks = marks.subjects.reduce((total, subject) => total + subject.totalMarks, 0);
        const percentage = (obtainedMarks / totalPossibleMarks) * 100;

        const marksheet = new MarkSheet({
            studentId: studentId,
            examType: marks.examType,
            subjects: marks.subjects,
            totalMarks: totalPossibleMarks,
            obtainedMarks: obtainedMarks,
            percentage: percentage.toFixed(2),
            overallRemarks: marks.overallRemarks
        });

        await marksheet.save();

        res.status(201).send("marksheet assigned");
    } catch (error) {
        console.error('Error assigning marksheet:', error);
        res.status(500).send({ error: 'Error assigning marksheet.' });
    }
};

const assignAttendance = async (req, res) => {
    try {
        const { studentId, month, presentDates } = req.body;
        const teacher = req.teacher;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        let attendance = await Attendance.findOne({ studentId });
        if (!attendance) {
            attendance = new Attendance({ studentId, attendance: [{ month, presentDates }] });
        } else {
            const monthIndex = attendance.attendance.findIndex(att => att.month === month);
            if (monthIndex > -1) {
                attendance.attendance[monthIndex].presentDates = presentDates;
            } else {
                attendance.attendance.push({ month, presentDates });
            }
        }

        await attendance.save();

        res.status(201).send("attendance assigned");
    } catch (error) {
        console.error('Error assigning attendance:', error);
        res.status(500).send({ error: 'Error assigning attendance.' });
    }
};

const getMarksheet = async (req, res) => {
    try {
        const { studentId } = req.params;
        const teacher = req.teacher;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        const marksheet = await MarkSheet.findOne({ student: studentId, teacher: teacher._id });
        if (!marksheet) {
            return res.status(404).send({ error: 'Marksheet not found.' });
        }

        res.status(200).send(marksheet);
    } catch (error) {
        console.error('Error getting marksheet:', error);
        res.status(500).send({ error: 'Error getting marksheet.' });
    }
};

const getForm = async (req, res) => {
    try {
        const { studentId } = req.params;
        const teacher = req.teacher;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        res.status(200).send(student);
    } catch (error) {
        console.error('Error getting form:', error);
        res.status(500).send({ error: 'Error getting form.' });
    }
};

const giveNote = async (req, res) => {
    try {
        const { studentId, note } = req.body;
        const teacher = req.teacher;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        const newNote = new Note({
            senderId: teacher._id,
            receiverId: studentId,
            title: req.body.title,
            note: note
        });

        await newNote.save();

        res.status(201).send("note given");
    } catch (error) {
        console.error('Error giving note:', error);
        res.status(500).send({ error: 'Error giving note.' });
    }
};

const acknowledgeNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const parent = req.parent;

        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).send({ error: 'Note not found.' });
        }

        note.acknowledged = true;
        note.acknowledgedAt = new Date();
        await note.save();

        res.status(200).send(note);
    } catch (error) {
        console.error('Error acknowledging note:', error);
        res.status(500).send({ error: 'Error acknowledging note.' });
    }
};

const giveForm = async (req, res) => {
    try {
        const { title, description, fields, assignedTo, class: classInfo, studentIds } = req.body;
        const teacher = req.teacher;

        // Validate if teacher is class teacher when assigning to class
        if (assignedTo === 'class') {
            if (!teacher.classTeacher || 
                teacher.classTeacher.class !== classInfo.standard || 
                teacher.classTeacher.division !== classInfo.division) {
                return res.status(403).send({ 
                    error: 'You can only assign class forms to your own class' 
                });
            }

            // Get all students from the class
            const classStudents = await Student.find({
                class: classInfo.standard,
                division: classInfo.division
            });

            // Create form with class students
            const form = new DynamicForm({
                title,
                description,
                assignedTo,
                class: {
                    standard: classInfo.standard,
                    division: classInfo.division
                },
                studentIds: classStudents.map(student => student._id),
                fields
            });

            await form.save();
            res.status(201).send(form);

        } else if (assignedTo === 'specific') {
            // Validate if students exist and are in teacher's class
            const students = await Student.find({
                _id: { $in: studentIds },
                class: teacher.classTeacher.class,
                division: teacher.classTeacher.division
            });

            if (students.length !== studentIds.length) {
                return res.status(400).send({ 
                    error: 'Some students not found or not in your class' 
                });
            }

            // Create form for specific students
            const form = new DynamicForm({
                title,
                description,
                assignedTo,
                studentIds,
                fields
            });

            await form.save();
            res.status(201).send("successfully form assigned");
        }

    } catch (error) {
        console.error('Error giving form:', error);
        res.status(500).send({ error: 'Error giving form.' });
    }
};

const getFormResponses = async (req, res) => {
    try {
        const { formId } = req.params;
        const teacher = req.teacher;

        const form = await DynamicForm.findById(formId);
        if (!form) {
            return res.status(404).send({ error: 'Form not found.' });
        }

        res.status(200).send(form.responses);
    } catch (error) {
        console.error('Error getting form responses:', error);
        res.status(500).send({ error: 'Error getting form responses.' });
    }
};
const getClassStudents = async (req, res) => {
    try {
        const teacher = req.teacher;

        const students = await Student.find({
            class: teacher.classTeacher.class,
            division: teacher.classTeacher.division
        });

        res.status(200).send(students);
    } catch (error) {
        console.error('Error getting class students:', error);
        res.status(500).send({ error: 'Error getting class students.' });
    }
};
const sendMessageToParent = async (req, res) => {
    try {
        const { studentId, message } = req.body;
        const teacher = req.teacher;

        // Verify if teacher teaches the student
        const student = await Student.findById(studentId).populate('parentId');
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        // Check if teacher teaches this student's class
        const teachesClass = teacher.subjects.some(subject => 
            subject.class === student.class && 
            subject.division === student.division
        );

        if (!teachesClass) {
            return res.status(403).send({ error: 'You can only chat with parents of students you teach' });
        }

        const parentId = student.parentId._id;

        const chat = new Chat({
            senderId: teacher._id,
            receiverId: parentId,
            senderModel: 'Teacher',
            receiverModel: 'Parent',
            message,
            studentId
        });

        await chat.save();

        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send({ error: 'Error sending message.' });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const { studentId } = req.body;
        const teacher = req.teacher;

        // Validate input
        if (!studentId) {
            return res.status(400).send({ error: 'Student ID is required' });
        }

        // Verify if teacher teaches the student
        const student = await Student.findById(studentId).populate('parentId');
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        const parentId = student.parentId._id;

        // Get chat messages
        const messages = await Chat.find({
            studentId: studentId,
            $or: [
                { senderId: teacher._id, receiverId: parentId },
                { senderId: parentId, receiverId: teacher._id }
            ]
        })
        .sort({ createdAt: 1 })
        .populate('senderId', 'fullName')
        .populate('receiverId', 'fullName');

        // Format messages
        const formattedMessages = messages.map(msg => ({
            _id: msg._id,
            message: msg.message,
            senderName: msg.senderId.fullName,
            receiverName: msg.receiverId.fullName,
            senderModel: msg.senderModel,
            timestamp: msg.createdAt,
            isSender: msg.senderId.toString() === teacher._id.toString()
        }));

        res.status(200).json({
            success: true,
            count: messages.length,
            messages: formattedMessages
        });
    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).send({ error: 'Error getting chat history.', details: error.message });
    }
};

export { 
    login, 
    assignMarksheet, 
    assignAttendance, 
    getMarksheet, 
    getForm, 
    giveNote, 
    acknowledgeNote, 
    giveForm, 
    getFormResponses, 
    getAttendanceReport,
    getClassStudents,
    sendMessageToParent,
    getChatHistory
};

