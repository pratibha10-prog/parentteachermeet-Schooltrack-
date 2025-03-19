import { Parent, Student, MarkSheet, Attendance, Note, DynamicForm, Teacher ,Chat,Donation} from '../model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const login = async (req, res) => {
    try {
        const { email, password } = req.body;

     
        const parent = await Parent.findOne({ email });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }


        const isMatch = await bcrypt.compare(password, parent.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }


        const token = jwt.sign(
            { id: parent._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            token});
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
};


const getChildren = async (req, res) => {
    try {
        const parent = req.parent;
        const children = await Student.find({ _id: { $in: parent.children } });

        res.status(200).send(children);
    } catch (error) {
        console.error('Error getting children:', error);
        res.status(500).send({ error: 'Error getting children.' });
    }
};

const getForms = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const parentId = req.parent._id;

        // Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Validate parent's access
        const parent = await Parent.findById(parentId);
        if (!parent.children.includes(studentId)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this student\'s forms'
            });
        }

        // Find forms with specific fields
        const forms = await DynamicForm.find({
            $or: [
                {
                    assignedTo: 'specific',
                    studentIds: studentId
                },
                {
                    assignedTo: 'class',
                    'class.standard': student.class,
                    'class.division': student.division
                }
            ]
        })
        .select('title description fields createdAt responses')
        .lean();

        if (!forms || forms.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No forms found for this student'
            });
        }

        // Format the response and check response status
        const formattedForms = forms.map(form => ({
            _id: form._id,
            title: form.title,
            description: form.description,
            fields: form.fields,
            createdAt: form.createdAt,
            isResponded: form.responses?.some(response => 
                response.parentId?.toString() === parentId.toString() && 
                response.studentId?.toString() === studentId
            ) || false
        }));

        // Send single response
        return res.status(200).json({
            success: true,
            forms: formattedForms
        });

    } catch (error) {
        console.error('Error fetching forms:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching forms',
            error: error.message
        });
    }
};

const getMarksheet = async (req, res) => {
    try {
        const { studentId } = req.params;
        const parent = req.parent;

        const student = await Student.findById(studentId);
        if (!student || !parent.children.includes(studentId)) {
            return res.status(404).send({ error: 'Student not found or not your child.' });
        }

        const marksheet = await MarkSheet.findOne({ studentId: studentId });

        res.status(200).send(marksheet);
    } catch (error) {
        console.error('Error getting marksheet:', error);
        res.status(500).send({ error: 'Error getting marksheet.' });
    }
};

const getAttendanceReport = async (req, res) => {
    try {
        const { studentId } = req.params;
        const parent = req.parent;

        const student = await Student.findById(studentId);
        if (!student || !parent.children.includes(studentId)) {
            return res.status(404).send({ error: 'Student not found or not your child.' });
        }

        const attendance = await Attendance.findOne({ studentId });

        res.status(200).send(attendance);
    } catch (error) {
        console.error('Error getting attendance report:', error);
        res.status(500).send({ error: 'Error getting attendance report.' });
    }
};

const sendNoteToTeacher = async (req, res) => {
    try {
        const { teacherId, note } = req.body;
        const parent = req.parent;

        const newNote = new Note({
            senderId: parent._id,
            receiverId: teacherId,
            title: req.body.title,
            note: note
        });

        await newNote.save();

        res.status(201).send(newNote);
    } catch (error) {
        console.error('Error sending note to teacher:', error);
        res.status(500).send({ error: 'Error sending note to teacher.' });
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

        // Find student associated with this note (if it's from teacher to student)
        const student = await Student.findById(note.receiverId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        // Check if the student belongs to this parent
        if (!parent.children.includes(student._id)) {
            return res.status(403).send({ error: 'You can only acknowledge notes for your children.' });
        }

        // Check if note is from a teacher
        const teacher = await Teacher.findById(note.senderId);
        if (!teacher) {
            return res.status(404).send({ error: 'Teacher not found.' });
        }

        note.acknowledged = true;
        note.acknowledgedAt = new Date();
        await note.save();

        res.status(200).send({
            message: 'Note acknowledged successfully' });
    } catch (error) {
        console.error('Error acknowledging note:', error);
        res.status(500).send({ error: 'Error acknowledging note.' });
    }
};
const getTeacherDetails = async (req, res) => {
    try {
        const { studentId } = req.params;
        const parent = req.parent;

        const student = await Student.findById(studentId);
        if (!student || !parent.children.includes(studentId)) {
            return res.status(404).send({ error: 'Student not found or not your child.' });
        }

        const teachers = await Teacher.find({
            $or: [
                { 'classTeacher.class': student.class, 'classTeacher.division': student.division },
                { 'subjects.class': student.class, 'subjects.division': student.division }
            ]
        });

        const teacherDetails = teachers.map(teacher => ({
            fullName: teacher.fullName,
            subjects: teacher.subjects.filter(subject => subject.class === student.class && subject.division === student.division).map(subject => subject.subject),
            isClassTeacher: teacher.classTeacher.class === student.class && teacher.classTeacher.division === student.division ? 'Class Teacher' : ''
        }));

        res.status(200).send(teacherDetails);
    } catch (error) {
        console.error('Error getting teacher details:', error);
        res.status(500).send({ error: 'Error getting teacher details.' });
    }
};
const fillForm = async (req, res) => {
    try {
        const { formId, studentId, answers } = req.body;
        const parent = req.parent;

        // Check if form exists
        const form = await DynamicForm.findById(formId);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Check if student belongs to parent
        if (!parent.children.includes(studentId)) {
            return res.status(403).json({ error: 'Access denied. This student is not your child.' });
        }

        // Check if student is assigned to this form
        if (!form.studentIds.includes(studentId)) {
            return res.status(403).json({ error: 'This form is not assigned to your child.' });
        }

        // Validate answers against form fields
        const isValidAnswers = form.fields.every(field => {
            const answer = answers.find(a => a.field === field.label);
            if (!answer) return false;

            if (field.type === 'select' || field.type === 'radio') {
                return field.options.includes(answer.value);
            }
            return true;
        });

        if (!isValidAnswers) {
            return res.status(400).json({ error: 'Invalid answers provided.' });
        }

        // Add response to form
        form.responses.push({
            parentId: parent._id,
            studentId: studentId,
            answers: answers
        });

        await form.save();

        res.status(201).json({
            message: 'Form filled successfully'
          
        });

    } catch (error) {
        console.error('Error filling form:', error);
        res.status(500).json({ error: 'Error filling form', details: error.message });
    }
};

const sendMessageToTeacher = async (req, res) => {
    try {
        const { teacherId, studentId, message } = req.body;
        const parent = req.parent;

        // Verify if student belongs to parent
        if (!parent.children.includes(studentId)) {
            return res.status(403).send({ error: 'You can only send messages about your children' });
        }

        // Verify if teacher teaches the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).send({ error: 'Teacher not found.' });
        }

        // Check if teacher teaches this student's class
        const teachesClass = teacher.subjects.some(subject => 
            subject.class === student.class && 
            subject.division === student.division
        );

        if (!teachesClass) {
            return res.status(403).send({ error: 'You can only chat with teachers who teach your child' });
        }

        const chat = new Chat({
            senderId: parent._id,
            receiverId: teacherId,
            senderModel: 'Parent',
            receiverModel: 'Teacher',
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
        const { teacherId, studentId } = req.body;
        const parent = req.parent;

        // Validate input
        if (!teacherId || !studentId) {
            return res.status(400).send({ error: 'Teacher ID and Student ID are required' });
        }

        // Verify if student belongs to parent
        if (!parent.children.includes(studentId)) {
            return res.status(403).send({ error: 'You can only view chats about your children' });
        }

        // Verify if student exists
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send({ error: 'Student not found.' });
        }

        // Get chat messages
        const messages = await Chat.find({
            studentId: studentId,
            $or: [
                { senderId: parent._id, receiverId: teacherId },
                { senderId: teacherId, receiverId: parent._id }
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
            isSender: msg.senderId.toString() === parent._id.toString()
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

const getAllFormsNotFilled = async (req, res) => {
    try {
        const parentId = req.parent._id;
        const parent = await Parent.findById(parentId).populate('children');

        if (!parent) {
            return res.status(404).json({ 
                success: false, 
                message: 'Parent not found' 
            });
        }

        // Get all forms assigned to the parent's children
        const forms = await DynamicForm.find({
            $or: [
                {
                    assignedTo: 'class',
                    'class.standard': { 
                        $in: parent.children.map(child => child.class) 
                    },
                    'class.division': { 
                        $in: parent.children.map(child => child.division) 
                    }
                },
                {
                    assignedTo: 'specific',
                    studentIds: { 
                        $in: parent.children.map(child => child._id) 
                    }
                }
            ],
            // Check if form hasn't been filled by this parent
            'responses.parentId': { 
                $ne: parentId 
            }
        }).populate('studentIds', 'fullName class division');

        res.status(200).json({ 
            success: true, 
            forms: forms.map(form => ({
                _id: form._id,
                title: form.title,
                description: form.description,
                assignedTo: form.assignedTo,
                class: form.class,
                fields: form.fields,
                createdAt: form.createdAt,
                students: form.studentIds
            }))
        });
    } catch (error) {
        console.error('Error fetching forms not filled:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching forms not filled', 
            error: error.message 
        });
    }
};

const getNotes = async (req, res) => {
    try {
        const parent = req.parent;
        const notes = await Note.find({ receiverId: { $in: parent.children } }).populate('senderId', 'fullName');

        res.status(200).json({ success: true, notes });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ success: false, message: 'Error fetching notes', error: error.message });
    }
};
const createDonation = async (req, res) => {
    try {
        const donorId = req.parent._id;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Invalid donation format" });
        }

        // Create separate donation entries for each item
        const donations = items.map(({ item, quantity, description }) => ({
            donorId,
            item,
            quantity,
            description,
            interestedUsers: [],
            status: "available",
        }));

        await Donation.insertMany(donations);
        res.json({ message: "Donations added successfully" });
    } catch (error) {
        console.error('Error creating donation:', error);
        res.status(500).json({ error: 'Error creating donation' });
    }
};

const getPendingDonations = async (req, res) => {
    try {
        const donations = await Donation.find({ status: 'available' })
            .populate('donorId', 'fullName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            donations: donations.map(donation => ({
                _id: donation._id,
                item: donation.item,
                quantity: donation.quantity,
                description: donation.description,
                donorName: donation.donorId.fullName,
                donationDate: donation.donationDate,
                status: donation.status
            }))
        });
    } catch (error) {
        console.error('Error getting pending donations:', error);
        res.status(500).json({ error: 'Error getting pending donations' });
    }
};

const applyForDonation = async (req, res) => {
    try {
        const { donationId } = req.params;
        const parent = req.parent;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        if (donation.status !== 'available') {
            return res.status(400).json({ error: 'This donation is not available' });
        }

        // Check if parent already requested this donation
        const alreadyRequested = donation.interestedUsers.some(
            user => user.userId.toString() === parent._id.toString()
        );

        if (alreadyRequested) {
            return res.status(400).json({ error: 'You have already requested this donation' });
        }

        // Add parent to interested users
        donation.interestedUsers.push({
            userId: parent._id,
            requestDate: new Date(),
            status: 'pending'
        });

        await donation.save();

        res.status(200).json({
            message: 'Request submitted successfully',

        });
    } catch (error) {
        console.error('Error applying for donation:', error);
        res.status(500).json({ error: 'Error applying for donation' });
    }
};
export { login,getChildren,fillForm, getForms, getMarksheet, getAttendanceReport, sendNoteToTeacher, acknowledgeNote, getTeacherDetails,sendMessageToTeacher, getChatHistory ,    createDonation,
    getPendingDonations,
    applyForDonation,getAllFormsNotFilled,
    getNotes};