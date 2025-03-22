import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Admin,Parent,Teacher,Student,Donation} from '../model.js';


const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};


const registerAdmin = async (req, res) => {
    try {
        const { email, password, adminKey } = req.body;


        if (adminKey !== process.env.ADMIN_KEY) {
            return res.status(403).json({ error: 'Invalid admin key' });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) return res.status(400).json({ error: 'Admin already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = new Admin({ email, password: hashedPassword });

        await admin.save();

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error registering admin' });
    }
};

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(400).json({ error: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

        const token = generateToken(admin._id);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};




const addTeacher = async (req, res) => {
    try {
        const { password, ...rest } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const teacher = new Teacher({ ...rest, password: hashedPassword });

        await teacher.save();
        res.status(201).json("SUCESSFULLY ADDED");
    } catch (error) {
        res.status(400).json({ error: 'Error adding teacher' });
    }
};


const removeTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

        res.json("teacher removed");
    } catch (error) {
        res.status(500).json({ error: 'Error removing teacher' });
    }
};

const addParent = async (req, res) => {
    try {
        const { password, ...rest } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const parent = new Parent({ ...rest, password: hashedPassword });

        await parent.save();
        res.status(201).json("SUCESSFULLY ADDED");
    } catch (error) {
        res.status(400).json({ error: 'Error adding parent' });
    }
};

const removeParent = async (req, res) => {
    try {
        const parent = await Parent.findByIdAndDelete(req.params.id);
        if (!parent) return res.status(404).json({ error: 'Parent not found' });

        res.json('SUCESSFULLY_REMOVED');
    } catch (error) {
        res.status(500).json({ error: 'Error removing parent' });
    }
};


const addStudent = async (req, res) => {
    try {
        const { parentId, fullName, roll, class: studentClass, division, gender, dob } = req.body;

        // Validate input
        if (!parentId || !fullName || !roll || !studentClass || !division || !gender || !dob) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if parent exists
        const parent = await Parent.findById(parentId);
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }

        // Create new student
        const student = new Student({
            fullName,
            roll,
            class: studentClass,
            division,
            gender,
            dob,
            parentId
        });

        await student.save();

        // Add student to parent's children array
        parent.children.push(student._id);
        await parent.save();

        res.status(201).json({ message: 'Successfully added student' });
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).json({ error: 'Error adding student' });
    }
};


const removeStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        res.json(SUCESSFULLY_REMOVED);
    } catch (error) {
        res.status(500).json({ error: 'Error removing Student' });
    }
};


const getAllDonations = async (req, res) => {
    try {
        const donations = await Donation.find()
            .populate('donorId', 'fullName')
            .populate('interestedUsers.userId', 'fullName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            donations: donations.map(donation => ({
                _id: donation._id,
                item: donation.item,
                quantity: donation.quantity,
                description: donation.description,
                donorName: donation.donorId.fullName,
                interestedUsers: donation.interestedUsers.map(user => ({
                    userId: user.userId._id,
                    userName: user.userId.fullName,
                    requestDate: user.requestDate,
                    status: user.status
                })),
                donationDate: donation.donationDate,
                status: donation.status
            }))
        });
    } catch (error) {
        console.error('Error getting all donations:', error);
        res.status(500).json({ error: 'Error getting all donations' });
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

const assignDonation = async (req, res) => {
    try {
        const { donationId, userId, quantity } = req.body;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        if (donation.status !== 'available') {
            return res.status(400).json({ error: 'This donation is not available' });
        }

        if (quantity > donation.quantity) {
            return res.status(400).json({ error: 'Requested quantity exceeds available quantity' });
        }

        // Find the interested user
        const interestedUser = donation.interestedUsers.find(
            user => user.userId.toString() === userId && user.status === 'pending'
        );

        if (!interestedUser) {
            return res.status(404).json({ error: 'User not found or request not pending' });
        }

        // Update the interested user's status and quantity
        interestedUser.status = 'approved';
        donation.quantity -= quantity;

        if (donation.quantity === 0) {
            donation.status = 'claimed';
        }

        await donation.save();

        res.status(200).json({
            message: 'Donation assigned successfully'

        });
    } catch (error) {
        console.error('Error assigning donation:', error);
        res.status(500).json({ error: 'Error assigning donation' });
    }
};

const updateTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const { password, addSubjects, removeSubjects, classTeacher, ...rest } = req.body;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            rest.password = hashedPassword;
        }

        const teacher = await Teacher.findById(id);
        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Add subjects to the teacher
        if (addSubjects && Array.isArray(addSubjects)) {
            teacher.subjects.push(...addSubjects);
        }

        // Remove subjects from the teacher
        if (removeSubjects && Array.isArray(removeSubjects)) {
            teacher.subjects = teacher.subjects.filter(sub => 
                !removeSubjects.some(rmSub => 
                    rmSub.class === sub.class && 
                    rmSub.division === sub.division && 
                    rmSub.subject === sub.subject
                )
            );
        }

        // Update classTeacher field if provided
        if (classTeacher) {
            teacher.classTeacher = classTeacher;
        }

        // Update other fields
        Object.assign(teacher, rest);

        await teacher.save();

        res.status(200).json({ message: 'Teacher updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating teacher' });
    }
};
const updateParent = async (req, res) => {
    try {
        const { id } = req.params;
        const { password, ...rest } = req.body;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            rest.password = hashedPassword;
        }

        const updatedParent = await Parent.findByIdAndUpdate(id, rest, { new: true });
        if (!updatedParent) return res.status(404).json({ error: 'Parent not found' });

        res.status(200).json({ message: 'Parent updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating parent' });
    }
};

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedStudent = await Student.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedStudent) return res.status(404).json({ error: 'Student not found' });

        res.status(200).json({ message: 'Student updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error updating student' });
    }
};

const searchParents = async (req, res) => {
    try {
        const { fullName, email, phoneNo } = req.body;
        const query = {};

        if (fullName) {
            query.fullName = { $regex: fullName, $options: 'i' };
        }
        if (email) {
            query.email = { $regex: email, $options: 'i' };
        }
        if (phoneNo) {
            query.phoneNo = { $regex: phoneNo, $options: 'i' };
        }

        const parents = await Parent.find(query).select('-password');
        res.status(200).json(parents);
    } catch (error) {
        console.error('Error searching parents:', error);
        res.status(500).json({ error: 'Error searching parents' });
    }
};

const searchTeachers = async (req, res) => {
    try {
        const { fullName, email } = req.body;
        const query = {};

        if (fullName) {
            query.fullName = { $regex: fullName, $options: 'i' };
        }
        if (email) {
            query.email = { $regex: email, $options: 'i' };
        }

        const teachers = await Teacher.find(query).select('-password');
        res.status(200).json(teachers);
    } catch (error) {
        console.error('Error searching teachers:', error);
        res.status(500).json({ error: 'Error searching teachers' });
    }
};

const searchStudents = async (req, res) => {
    try {
        const { fullName, roll, dob, class: studentClass, division } = req.body;
        const query = {};

        if (fullName) {
            query.fullName = { $regex: fullName, $options: 'i' };
        }
        if (roll) {
            query.roll = roll;
        }
        if (dob) {
            query.dob = new Date(dob);
        }
        if (studentClass) {
            query.class = studentClass;
        }
        if (division) {
            query.division = { $regex: division, $options: 'i' };
        }

        const students = await Student.find(query).select('-password');
        res.status(200).json(students);
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ error: 'Error searching students' });
    }
};
export {
    registerAdmin,
    loginAdmin,
    addTeacher,
    removeTeacher,
    addParent,
    removeParent,
    addStudent,
    removeStudent,
    getAllDonations,
    getPendingDonations,
    assignDonation,
    updateParent,
    updateTeacher,
    updateStudent,
    searchParents,
    searchTeachers,
    searchStudents
};
