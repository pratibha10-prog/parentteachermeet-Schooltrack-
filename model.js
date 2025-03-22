import mongoose from 'mongoose';

// Parent Schema
const ParentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phoneNo: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }]
}, { timestamps: true });

// Student Schema
const StudentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  roll: { type: Number, required: true },
  class: { type: Number, required: true },
  division: { type: String, required: true },
  gender: { type: String, required: true },
  dob: { type: Date, required: true },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    required: true
},
}, { timestamps: true });

// Teacher Schema
const TeacherSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subjects: [{
    class: { type: Number, required: true },
    division: { type: String, required: true },
    subject: { type: String, required: true }
  }],
  classTeacher: {
    class: { type: Number },
    division: { type: String }
  }
}, { timestamps: true });

// Admin Schema
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });


const MarkSheetSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  examType: { type: String, required: true },
  subjects: [{
    subject: { type: String, required: true },
    marks: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    teacherRemarks: String
  }],
  totalMarks: { type: Number, required: true },
  obtainedMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  overallRemarks: String
}, { timestamps: true });



const BehaviorReportSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  remarks: [{
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Parent" },
    remark: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }]
});

// Attendance Schema
const AttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  attendance: [{
    month: { type: String, required: true }, // e.g., "March 2025"
    presentDates: [{ type: Date }],
    absentDates: [{ type: Date }],
    presentpercent:{type:Number}
  }]
});


const SchoolWorkingDaySchema = new mongoose.Schema({
  class: { type: Number, required: true },
  division: { type: String, required: true },
  attendance: [{
      month: { type: String, required: true }, // e.g., "March 2025"
      workingDays: [{ type: Date }]
  }]
});

const DonationSchema = new mongoose.Schema({
  donorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Parent", 
      required: true 
  },
  item: {
      type: String,
      required: true,
      enum: ["Books", "Stationary", "Uniforms", "Other"]
  },
  quantity: {
      type: Number,
      required: true
  },
  description: {
      type: String,
      required: true
  },
  interestedUsers: [{
      userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Parent'
      },
      requestDate: {
          type: Date,
          default: Date.now
      },
      status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending'
      }
  }],
  status: { 
      type: String, 
      enum: ['available', 'claimed'], 
      default: 'available' 
  },
  donationDate: { 
      type: Date, 
      default: Date.now 
  }
}, { 
  timestamps: true 
});


const DynamicFormSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: {
    type: String,
    enum: ['class', 'specific'],
    required: true
  },
  class: {
    standard: { type: Number },
    division: { type: String }
  },
  studentIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Student" 
  }],
  fields: [{
    label: { type: String, required: true },
    type: { type: String, required: true, enum: ["text", "number", "date", "email", "select", "checkbox", "radio"] },
    options: [{ type: String }] // For select, radio, checkbox
  }],
  responses: [{
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Parent" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    answers: [{ field: String, value: String }]
  }],
  createdAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
}
});

// Chat Schema
const ChatSchema = new mongoose.Schema({
  senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      refPath: 'senderModel'
  },
  receiverId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
      refPath: 'receiverModel'
  },
  senderModel: {
      type: String,
      required: true,
      enum: ['Teacher', 'Parent']
  },
  receiverModel: {
      type: String,
      required: true,
      enum: ['Teacher', 'Parent']
  },
  message: { 
      type: String, 
      required: true 
  },
  studentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student',
      required: true 
  }
}, { 
  timestamps: true 
});

const NoteSchema = new mongoose.Schema({
  senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Teacher', 
      required: true 
  },
  receiverId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student', 
      required: true 
  },
  title: { 
      type: String, 
      required: true,
      trim: true
  },
  note: { 
      type: String, 
      required: true 
  },
  acknowledged: {
      type: Boolean,
      default: false
  },
  acknowledgedAt: {
      type: Date,
      default: null
  },
  createdAt: { 
      type: Date, 
      default: Date.now 
  }
});

const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

const OTP = mongoose.model('OTP', OTPSchema);


const Parent = mongoose.model("Parent", ParentSchema);
const Student = mongoose.model("Student", StudentSchema);
const Teacher = mongoose.model("Teacher", TeacherSchema);
const Admin = mongoose.model("Admin", AdminSchema);
const MarkSheet = mongoose.model("MarkSheet", MarkSheetSchema);
const BehaviorReport = mongoose.model("BehaviorReport", BehaviorReportSchema);
const Attendance = mongoose.model("Attendance", AttendanceSchema);
const Donation = mongoose.model("Donation", DonationSchema);
const DynamicForm = mongoose.model("DynamicForm", DynamicFormSchema);
const Chat = mongoose.model("Chat", ChatSchema);
const SchoolWorkingDay=mongoose.model("SchoolWorkingDay",SchoolWorkingDaySchema);
const Note = mongoose.model('Note', NoteSchema)



export {
  Parent,
  Student,
  Teacher,
  Admin,
  MarkSheet,
  BehaviorReport,
  Attendance,
  Donation,
  DynamicForm,
  Chat,
  SchoolWorkingDay,Note,OTP
};