import { Student, MarkSheet, Attendance, Note, DynamicForm, Teacher,Chat,SchoolWorkingDay } from '../model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import xlsx from 'xlsx';
import fs from 'fs';
import mongoose from 'mongoose';
const upload = multer({ storage: multer.memoryStorage() });

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
        const { studentId, month, presentDates } = req.body;
        if (!studentId || !month || !presentDates || !Array.isArray(presentDates)) {
            return res.status(400).send({ error: "studentId, month, and presentDates array are required." });
        }

        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: "Student not found." });
        }

        // Find working days for the student's class and division
        const schoolDoc = await SchoolWorkingDay.findOne({
            class: student.class,
            division: student.division
        });
        if (!schoolDoc) {
            return res.status(400).send({ error: "School working days are not set for the student's class." });
        }
        const monthWorkingRecord = schoolDoc.attendance.find(item => item.month === month);
        if (!monthWorkingRecord || !monthWorkingRecord.workingDays || monthWorkingRecord.workingDays.length === 0) {
            return res.status(400).send({ error: `Working days not set for ${month}.` });
        }

        const workingDays = monthWorkingRecord.workingDays.map(day => new Date(day));

        // Convert presentDates strings into Date objects
        const convertedPresentDates = presentDates.map(dateStr => new Date(dateStr));
        const presentSet = new Set(convertedPresentDates.map(d => d.toDateString()));
        const absentDates = workingDays.filter(day => !presentSet.has(day.toDateString()));
        const presentPercent = (convertedPresentDates.length / workingDays.length) * 100;

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
            monthRecordInAttendance.presentpercent = presentPercent;
        }

        await attendanceDoc.save();
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
        const { class: requestedClass, division: requestedDivision } = req.body;

        // If no class specified, return class teacher's class students with full details
        if (!requestedClass || !requestedDivision) {
            if (!teacher.classTeacher) {
                return res.status(400).json({
                    success: false,
                    error: "Please specify class and division or be a class teacher"
                });
            }

            const students = await Student.find({
                class: teacher.classTeacher.class,
                division: teacher.classTeacher.division
            }).populate('parentId', 'fullName email phone');

            return res.status(200).json({
                success: true,
                count: students.length,
                isClassTeacher: true,
                class: teacher.classTeacher.class,
                division: teacher.classTeacher.division,
                students
            });
        }

        // For specific class/division request
        const isSubjectTeacher = teacher.subjects.some(subject => 
            subject.class === parseInt(requestedClass) && 
            subject.division === requestedDivision
        );

        const isClassTeacher = teacher.classTeacher &&
            teacher.classTeacher.class === parseInt(requestedClass) && 
            teacher.classTeacher.division === requestedDivision;

        if (!isSubjectTeacher && !isClassTeacher) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to view students of this class'
            });
        }

        // If teacher is class teacher of requested class, return full details
        if (isClassTeacher) {
            const students = await Student.find({
                class: parseInt(requestedClass),
                division: requestedDivision
            }).populate('parentId', 'fullName email phone');

            return res.status(200).json({
                success: true,
                count: students.length,
                isClassTeacher: true,
                class: parseInt(requestedClass),
                division: requestedDivision,
                students
            });
        }

        // If only subject teacher, return limited details
        const students = await Student.find({
            class: parseInt(requestedClass),
            division: requestedDivision
        }).select('fullName class division rollNo');

        return res.status(200).json({
            success: true,
            count: students.length,
            isClassTeacher: false,
            class: parseInt(requestedClass),
            division: requestedDivision,
            students
        });

    } catch (error) {
        console.error('Error getting class students:', error);
        res.status(500).json({
            success: false,
            error: 'Error getting class students',
            details: error.message
        });
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


const setWorkingDaysFromExcel = async (req, res) => {
    try {
      const teacher = req.teacher;
      if (!teacher || !teacher.classTeacher) {
        return res.status(403).send({ error: "You are not authorized to set working days." });
      }
      
      if (!req.file) {
        return res.status(400).send({ error: "No file uploaded." });
      }
      
      // Read Excel file and convert it to JSON
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      
      // Expecting at least 4 rows: headers, month, workingDays header, and dates
      if (jsonData.length < 4) {
        return res.status(400).send({ error: "Invalid Excel format. Ensure correct structure!" });
      }
      
      // Expected Excel template format:
      // Row 1: Header row with titles (e.g., "month")
      // Row 2: Actual month values for each column (e.g., "March 2025")
      // Row 3: Working days header: each cell should contain "workingDays" (case-insensitive)
      // Row 4 onwards: Each column contains date entries (in DD-MM-YYYY format or Excel numeric dates) representing working days
      const headers = jsonData[0]; // e.g., ["month", "month", ...]
      const months = jsonData[1];  // e.g., ["March 2025", "March 2025", ...]
      const workingDaysHeader = jsonData[2]; // Should be "workingDays" in each column
      
      const attendanceData = [];
      
      months.forEach((month, col) => {
        if (
          !month ||
          !workingDaysHeader[col] ||
          typeof workingDaysHeader[col] !== "string" ||
          workingDaysHeader[col].trim().toLowerCase() !== "workingdays"
        ) {
          return; // Skip if no valid month or workingDays header in a column
        }
        
        // Get working day entries from row 4 onwards for current column
        const workingDays = jsonData
          .slice(3) // Rows 4 onwards
          .map(row => row[col])
          .filter(dateStr => dateStr) // Remove empty cells
          .map(dateStr => {
            if (typeof dateStr === "string" && dateStr.includes("-")) {
              // Expected format: DD-MM-YYYY -> Convert to YYYY-MM-DD
              const [day, m, year] = dateStr.split("-").map(Number);
              return new Date(`${year}-${m.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`);
            } else if (!isNaN(dateStr)) {
              // For Excel numeric dates; Excel date 1 equals 1900-01-01 but using epoch offset 1899,11,30
              const excelEpoch = new Date(1899, 11, 30);
              return new Date(excelEpoch.getTime() + (dateStr * 86400000));
            } else {
              console.warn(`Skipping invalid date: ${dateStr}`);
              return null;
            }
          })
          .filter(date => date instanceof Date && !isNaN(date));
        
        if (workingDays.length > 0) {
          attendanceData.push({ month, workingDays });
        }
      });
      
      if (attendanceData.length === 0) {
        return res.status(400).send({ error: "No valid working days found in the file. Check date format!" });
      }
      
      // Find or create the SchoolWorkingDay document for teacher's assigned class/division
      let schoolDoc = await SchoolWorkingDay.findOne({
        class: teacher.classTeacher.class,
        division: teacher.classTeacher.division
      });
      
      if (!schoolDoc) {
        schoolDoc = new SchoolWorkingDay({
          class: teacher.classTeacher.class,
          division: teacher.classTeacher.division,
          attendance: attendanceData
        });
      } else {
        // Update existing attendance data; add new month records or update existing ones
        attendanceData.forEach(({ month, workingDays }) => {
          let monthRecord = schoolDoc.attendance.find(item => item.month === month);
          if (!monthRecord) {
            schoolDoc.attendance.push({ month, workingDays });
          } else {
            monthRecord.workingDays = workingDays;
          }
        });
      }
      
      await schoolDoc.save();
      res.status(200).send({ message: "Working days set successfully." });
    } catch (error) {
      console.error("Error setting working days:", error);
      res.status(500).send({ error: "Error setting working days.", details: error.message });
    }
  };
  
  export { setWorkingDaysFromExcel };
const assignAttendanceFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded." });
    }

    // Read Excel file; sample expected format:
    // Row 1: Header "roll", "month", "presentDates", ...
    // Row 2: Roll numbers for students (one per column)
    // Row 3: Month header (e.g., "March 2025")
    // Row 4: Actual month value per student (or same value for all)
    // Row 5: "presentDates" header
    // Row 6+: Each column: present date entries
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (jsonData.length < 6) {
      return res.status(400).json({ error: "Invalid Excel format." });
    }

    const rollNumbers = jsonData[1]; // Row 2: Roll numbers
    const months = jsonData[3]; // Row 4: Month (e.g., "March 2025")
    const dateEntries = jsonData.slice(5); // Row 6 onwards: present dates per column

    let results = [];

    for (let col = 0; col < rollNumbers.length; col++) {
      const rollStr = rollNumbers[col]?.toString().trim();
      const month = months[col]?.toString().trim();
      if (!rollStr) continue;
      const roll = parseInt(rollStr);

      // Find student using teacher's assigned class/division and roll
      const student = await findStudentByRoll(roll, req.teacher);
      if (!student) {
        results.push({ roll, error: "Student not found in your class/division" });
        continue;
      }

      // Get school working days for student's class/division
      const schoolDoc = await SchoolWorkingDay.findOne({
        class: student.class,
        division: student.division
      });
      if (!schoolDoc) {
        results.push({ roll, error: "Working days not set for class" });
        continue;
      }
      const monthWorkingRecord = schoolDoc.attendance.find(item => item.month === month);
      if (!monthWorkingRecord) {
        results.push({ roll, error: "Working days not set for month" });
        continue;
      }
      const workingDays = monthWorkingRecord.workingDays;

      // Extract present dates for the student from each row (Excel column)
      const presentDates = dateEntries
        .map(row => row[col])
        .filter(dateStr => dateStr)
        .map(dateStr => {
          if (typeof dateStr === "string" && dateStr.includes("-")) {
            const [year, m, day] = dateStr.split("-").map(Number);
            return new Date(`${year}-${m.toString().padStart(2,"0")}-${day.toString().padStart(2,"0")}`);
          } else if (!isNaN(dateStr)) {
            const excelEpoch = new Date(1899, 11, 30);
            return new Date(excelEpoch.getTime() + (dateStr * 86400000));
          } else {
            console.warn(`Skipping invalid date: ${dateStr}`);
            return null;
          }
        })
        .filter(date => date instanceof Date && !isNaN(date));

      // Calculate absent dates by comparing with working days
      const presentSet = new Set(presentDates.map(d => d.toDateString()));
      const absentDates = workingDays
        .map(day => new Date(day))
        .filter(day => !presentSet.has(day.toDateString()));

      const presentPercent = (presentDates.length / workingDays.length) * 100;

      let attendanceDoc = await Attendance.findOne({ studentId: student._id });
      if (!attendanceDoc) {
        attendanceDoc = new Attendance({ studentId: student._id, attendance: [] });
      }
      let monthRecord = attendanceDoc.attendance.find(item => item.month === month);
      if (!monthRecord) {
        await Attendance.updateOne(
          { studentId: student._id },
          {
            $push: {
              attendance: {
                month,
                presentDates,
                absentDates,
                presentpercent: presentPercent
              }
            }
          },
          { upsert: true }
        );
      } else {
        await Attendance.updateOne(
          { studentId: student._id, "attendance.month": month },
          {
            $set: {
              "attendance.$.presentDates": presentDates,
              "attendance.$.absentDates": absentDates,
              "attendance.$.presentpercent": presentPercent
            }
          }
        );
      }

      results.push({
        roll,
        studentName: student.fullName,
        month,
        totalWorkingDays: workingDays.length,
        presentDays: presentDates.length,
        absentDays: absentDates.length,
        presentPercent: presentPercent.toFixed(2)
      });
    }

    res.status(200).json({
      message: "Attendance processed successfully",
      totalRecords: results.length,
      results
    });
  } catch (error) {
    console.error("Error processing attendance:", error);
    res.status(500).json({
      error: "Error processing attendance",
      details: error.message
    });
  }
};
import xlsx from 'xlsx';
import { MarkSheet } from '../model.js';
import { findStudentByRoll } from './findStudentByRoll.js';

const assignMarksheetFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    console.log("File received:", req.file.originalname);

    // Read Excel file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (jsonData.length < 2) {
      return res.status(400).json({ error: "Invalid Excel format." });
    }

    const headers = jsonData[0]; // Expected headers: [ "roll", "examType", "Subject1", "Marks1", "Total1", "Remarks1", ... ]

    const results = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row[0]) continue; // Skip empty rows

      // row[0] should be the roll number
      const roll = parseInt(row[0]);
      const examType = row[1];

      // Find student using teacher's assigned class/division and roll
      const student = await findStudentByRoll(roll, req.teacher);
      if (!student) {
        console.log(`Student with roll ${roll} not found in your class/division.`);
        results.push({ roll, error: "Student not found" });
        continue;
      }

      let subjects = [];
      let obtainedMarks = 0;
      let totalMarks = 0;

      // Process subjects dynamically (assume each subject takes 4 columns)
      for (let j = 2; j < headers.length; j += 4) {
        if (!row[j]) break;

        let subject = row[j];
        let marks = parseInt(row[j + 1]) || 0;
        let maxMarks = parseInt(row[j + 2]) || 100;
        let teacherRemarks = row[j + 3] || "No remark";

        obtainedMarks += marks;
        totalMarks += maxMarks;

        subjects.push({
          subject,
          marks,
          totalMarks: maxMarks,
          teacherRemarks,
        });
      }

      const percentage = (obtainedMarks / totalMarks) * 100;

      const marksheet = new MarkSheet({
        studentId: student._id,
        examType,
        subjects,
        totalMarks,
        obtainedMarks,
        percentage: percentage.toFixed(2),
        overallRemarks: "No overall remarks"
      });

      await marksheet.save();
      results.push({ roll, message: "Marksheet saved successfully" });
    }

    res.status(200).json({ message: "Excel data processed", results });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Error processing file.", details: error.message });
  }
};
import { Student } from '../model.js';

/**
 * Finds a student by roll number given a teacher's assigned class and division.
 * @param {Number} roll - The student's roll number.
 * @param {Object} teacher - The teacher object containing classTeacher details.
 * @returns {Promise<Object|null>} - The found student document or null if not found.
 */
export const findStudentByRoll = async (roll, teacher) => {
  if (!teacher.classTeacher) {
    throw new Error("Teacher does not have assigned classTeacher details.");
  }
  
  const student = await Student.findOne({
    roll: roll,
    class: teacher.classTeacher.class,
    division: teacher.classTeacher.division
  });
  return student;
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
    getNotes,getSentForms,setWorkingDaysFromExcel,assignMarksheetFromExcel,assignAttendanceFromExcel    
};

