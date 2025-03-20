import { Student, MarkSheet, Attendance, Note, DynamicForm, Teacher,Chat,SchoolWorkingDay } from '../model.js';
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

const getNotes = async (req, res) => {
    try {
        const teacherId = req.teacher._id;
        const notes = await Note.find({ receiverId: teacherId }).populate('senderId', 'fullName');

        res.status(200).json({ success: true, notes });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ success: false, message: 'Error fetching notes', error: error.message });
    }
};

// 1. Set Working Days for a Month (School side)
const setWorkingDays = async (req, res) => {
    try {
        const teacher = req.teacher;
        if (!teacher || !teacher.classTeacher) {
            return res.status(403).send({ error: "You are not authorized to set working days." });
        }
        const { month, workingDays } = req.body;
        if (!month || !workingDays || !Array.isArray(workingDays)) {
            return res.status(400).send({ error: "Month and workingDays array are required." });
        }
        // Convert workingDays strings into Date objects
        const workingDaysDates = workingDays.map(day => new Date(day));

        // Find the working days record for the teacher's assigned class and division
        let schoolDoc = await SchoolWorkingDay.findOne({
            class: teacher.classTeacher.class,
            division: teacher.classTeacher.division
        });

        if (!schoolDoc) {
            // Create a new document if not exists
            schoolDoc = new SchoolWorkingDay({
                class: teacher.classTeacher.class,
                division: teacher.classTeacher.division,
                attendance: [{
                    month,
                    workingDays: workingDaysDates
                }]
            });
        } else {
            // Check if a month record already exists
            let monthRecord = schoolDoc.attendance.find(item => item.month === month);
            if (!monthRecord) {
                schoolDoc.attendance.push({ month, workingDays: workingDaysDates });
            } else {
                monthRecord.workingDays = workingDaysDates;
            }
        }

        await schoolDoc.save();
        res.status(200).send({ message: "Working days set successfully." });
    } catch (error) {
        console.error("Error setting working days: ", error);
        res.status(500).send({ error: "Error setting working days.", details: error.message });
    }
};

const assignAttendance = async (req, res) => {
    try {
        const teacher = req.teacher;
        if (!teacher || !teacher.classTeacher) {
            return res.status(403).send({ error: "You are not authorized to assign attendance." });
        }

        const { month, attendanceRecords } = req.body;
        if (!month || !attendanceRecords || !Array.isArray(attendanceRecords)) {
            return res.status(400).send({ error: "Month and attendanceRecords array are required." });
        }

        // Find working days for teacher's assigned class and division
        const schoolDoc = await SchoolWorkingDay.findOne({
            class: teacher.classTeacher.class,
            division: teacher.classTeacher.division
        });
        if (!schoolDoc) {
            return res.status(400).send({ error: "School working days are not set for your class." });
        }
        const monthWorkingRecord = schoolDoc.attendance.find(item => item.month === month);
        if (!monthWorkingRecord || !monthWorkingRecord.workingDays || monthWorkingRecord.workingDays.length === 0) {
            return res.status(400).send({ error: `Working days not set for ${month}.` });
        }
       
        const workingDays = monthWorkingRecord.workingDays.map(day => new Date(day));

        // Process each attendance record provided
        for (const record of attendanceRecords) {
            const { studentId, presentDates } = record;
            if (!studentId || !presentDates || !Array.isArray(presentDates)) {
                continue; 
            }
            
            // Check if the student belongs to teacher’s class and division
            const student = await Student.findById(studentId);
            if (!student) {
                continue;
            }
            if (student.class !== teacher.classTeacher.class || student.division !== teacher.classTeacher.division) {
                // Skip students not in teacher's assigned class/division
                continue;
            }

            const convertedPresentDates = presentDates.map(dateStr => new Date(dateStr));
            const presentSet = new Set(convertedPresentDates.map(d => d.toDateString()));
            const absentDates = workingDays.filter(day => !presentSet.has(day.toDateString()));
            const presentPercent = (presentDates.length / workingDays.length) * 100;

            let attendanceDoc = await Attendance.findOne({ studentId });
            if (!attendanceDoc) {
                attendanceDoc = new Attendance({ studentId, attendance: [] });
            }

            let monthRecordInAttendance = attendanceDoc.attendance.find(item => item.month === month);
            if (!monthRecordInAttendance) {
                attendanceDoc.attendance.push({
                    month,
                    presentDates: convertedPresentDates,
                    absentDates,
                    presentpercent: presentPercent
                });
            } else {
                monthRecordInAttendance.presentDates = convertedPresentDates;
                monthRecordInAttendance.absentDates = absentDates;
                monthRecordInAttendance.absentpercent = absentPercent;
            }

            await attendanceDoc.save();
        }
        res.status(200).send({ message: "Attendance sheet assigned successfully." });
    } catch (error) {
        console.error("Error assigning attendance sheet:", error);
        res.status(500).send({ error: "Error assigning attendance sheet.", details: error.message });
    }
};
// 3. Get Attendance Sheet for a Student for a Given Month
// Query parameters: studentId and month (e.g., /api/teacher/getAttendanceSheet?studentId=xxx&month=March%202025)
const getAttendance = async (req, res) => {
    try {
        const { studentId, month } = req.body;
        if (!studentId || !month) {
            return res.status(400).send({ error: "studentId and month are required." });
        }

        const attendanceDoc = await Attendance.findOne({ studentId });
        if (!attendanceDoc) {
            return res.status(404).send({ error: "No attendance record found for this student." });
        }

        const monthRecord = attendanceDoc.attendance.find(item => item.month === month);
        if (!monthRecord) {
            return res.status(404).send({ error: `Attendance record for ${month} not found.` });
        }

        res.status(200).send(monthRecord);
    } catch (error) {
        console.error("Error getting attendance sheet:", error);
        res.status(500).send({ error: "Error getting attendance sheet.", details: error.message });
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
                fields,
                createdBy: teacher._id
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
const getSentForms = async (req, res) => {
    try {
        const teacherId = req.teacher._id;

        // Get all forms created by this teacher
        const forms = await DynamicForm.find({
            createdBy: teacherId
        })
        .select('title description assignedTo class studentIds fields responses createdAt')
        .populate('studentIds', 'fullName class division')
        .lean();

        if (!forms || forms.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No forms found'
            });
        }

        // Format response data
        const formattedForms = forms.map(form => ({
            _id: form._id,
            title: form.title,
            description: form.description,
            assignedTo: form.assignedTo,
            class: form.assignedTo === 'class' ? form.class : null

        }));

        return res.status(200).json({
            success: true,
            forms: formattedForms
        });

    } catch (error) {
        console.error('Error fetching sent forms:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching sent forms',
            error: error.message
        });
    }
};
const getFormAnalytics = async (req, res) => {
    try {
        const { formId } = req.params;
        const teacherId = req.teacher._id;

        const form = await DynamicForm.findOne({
            _id: formId,
            createdBy: teacherId
        })
        .populate('responses.parentId', 'fullName')
        .populate('responses.studentId', 'fullName class division')
        .lean();

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        // Calculate statistics for each field
        const fieldStats = form.fields.map(field => {
            let stats = {
                label: field.label,
                type: field.type,
                totalResponses: form.responses.length
            };

            if (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') {
                const optionCounts = {};
                field.options.forEach(option => {
                    optionCounts[option] = 0;
                });

                form.responses.forEach(response => {
                    const answer = response.answers.find(a => a.field === field.label);
                    if (answer) {
                        optionCounts[answer.value] = (optionCounts[answer.value] || 0) + 1;
                    }
                });

                stats.optionStats = Object.entries(optionCounts).map(([option, count]) => ({
                    option,
                    count,
                    percentage: ((count / form.responses.length) * 100).toFixed(1)
                }));
            }

            if (field.type === 'text' || field.type === 'email') {
                stats.responses = form.responses.map(response => {
                    const answer = response.answers.find(a => a.field === field.label);
                    return {
                        response: answer ? answer.value : '',
                        parent: response.parentId.fullName,
                        student: response.studentId.fullName,
                        class: `${response.studentId.class}-${response.studentId.division}`
                    };
                });
            }

            return stats;
        });

        // Overall statistics
        const overallStats = {
            totalAssigned: form.assignedTo === 'class' ? 
                await Student.countDocuments({
                    class: form.class.standard,
                    division: form.class.division
                }) : 
                form.studentIds.length,
            responseCount: form.responses.length,
            responseRate: 0,
            lastResponse: form.responses.length > 0 ? 
                new Date(Math.max(...form.responses.map(r => r.createdAt))) : null
        };

        overallStats.responseRate = ((overallStats.responseCount / overallStats.totalAssigned) * 100).toFixed(1);

        return res.status(200).json({
            success: true,
            formTitle: form.title,
            formDescription: form.description,
            createdAt: form.createdAt,
            overallStats,
            fieldStats
        });

    } catch (error) {
        console.error('Error getting form analytics:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting form analytics',
            error: error.message
        });
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
    setWorkingDays,
    assignAttendance, 
    getAttendance,
    getMarksheet, 
    getFormAnalytics,
    giveNote, 
    acknowledgeNote, 
    giveForm, 
    getFormResponses, 
    getAttendanceReport,
    getClassStudents,
    sendMessageToParent,
    getChatHistory,
    getNotes,getSentForms
};

