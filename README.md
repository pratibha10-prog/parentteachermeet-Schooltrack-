no of api links				
admin	parents	teacher	user	total
11	14	13	2	40
Admin API Documentation				
				
Method	Endpoint	Middleware	Purpose	Sample Input
POST	/admin/register	None	Register new admin	"json {
    ""email"": ""admin@school.com"",""password"": ""password123"",""adminKey"": ""your_admin_key_here""}"
POST	/admin/login	None	Admin login	json { "email": "admin@school.com", "password": "password123" }
POST	/admin/teacher	authMiddleware	Add new teacher	json { "fullName": "John Doe", "email": "john@school.com", "password": "pass123", "subjects": [{"class": 10, "division": "A", "subject": "Mathematics"}] }
DELETE	/admin/teacher/:id	authMiddleware	Remove teacher	Path: /admin/teacher/67d6a4df4e1a2b8c3e78d1a8
POST	/admin/parent	authMiddleware	Add new parent	json { "fullName": "Parent Name", "email": "parent@email.com", "password": "pass123", "phoneNo": "1234567890", "address": "123 St" }
DELETE	/admin/parent/:id	authMiddleware	Remove parent	Path: /admin/parent/67d6a4df4e1a2b8c3e78d1a8
POST	/admin/student	authMiddleware	Add new student	json { "fullName": "Student Name", "roll": 1, "class": 10, "division": "A", "gender": "Male", "dob": "2010-01-01", "parentId": "67d6a4df4e1a2b8c3e78d1a8" }
DELETE	/admin/student/:id	authMiddleware	Remove student	Path: /admin/student/67d6a4df4e1a2b8c3e78d1a8
GET	/admin/donations	authMiddleware	Get all donations	None
GET	/admin/donations/pending	authMiddleware	Get pending donations	None
POST	/admin/donations/assign	authMiddleware	Assign donation	json { "donationId": "67d6a4df4e1a2b8c3e78d1a8", "userId": "67d6a4df4e1a2b8c3e78d1a8", "quantity": 1 }
POST	/admin/donations/assign	authMiddleware	Assign donation	json { "donationId": "67d6a4df4e1a2b8c3e78d1a8", "userId": "67d6a4df4e1a2b8c3e78d1a8", "quantity": 1 }
Teacher API Documentation				
				
Method	Endpoint	Middleware	Purpose	Sample Input
POST	/teacher/login	None	Teacher login	json { "email": "teacher@school.com", "password": "pass123" }
POST	/teacher/assign-marksheet	teacherAuthMiddleware, classTeacherAuthMiddleware	Assign marks	json { "studentId": "67d6a4df4e1a2b8c3e78d1a8", "marks": { "examType": "Unit Test", "subjects": [{ "subject": "Math", "marks": 85, "totalMarks": 100 }] } }
POST	/teacher/assign-attendance	teacherAuthMiddleware, classTeacherAuthMiddleware	Mark attendance	json { "studentId": "67d6a4df4e1a2b8c3e78d1a8", "date": "2024-03-19", "status": "present" }
GET	/teacher/marksheet/:studentId	teacherAuthMiddleware, classTeacherAuthMiddleware	Get student marksheet	Path: /teacher/marksheet/67d6a4df4e1a2b8c3e78d1a8
GET	/teacher/form/:studentId	teacherAuthMiddleware, classTeacherAuthMiddleware	Get form assigned to student	Path: /teacher/form/67d6a4df4e1a2b8c3e78d1a8
POST	/teacher/give-note	teacherAuthMiddleware, subjectTeacherAuthMiddleware	Send note	json { "studentId": "67d6a4df4e1a2b8c3e78d1a8", "title": "Note Title", "content": "Note content" }
POST	/teacher/acknowledge-note/:noteId	teacherAuthMiddleware	Acknowledge received note	Path: /teacher/acknowledge-note/67d6a4df4e1a2b8c3e78d1a8
POST	/teacher/give-form	teacherAuthMiddleware, classTeacherAuthMiddleware	Create and assign form	json { "title": "Parent Teacher Meeting", "description": "Schedule for next PTM", "assignedTo": "class", "class": { "standard": 10, "division": "A" }, "fields": [{ "label": "Preferred Time", "type": "select", "options": ["9 AM", "10 AM", "11 AM"] }] }
GET	/teacher/form-responses/:formId	teacherAuthMiddleware, classTeacherAuthMiddleware	Get form responses	Path: /teacher/form-responses/67d6a4df4e1a2b8c3e78d1a8
GET	/teacher/attendance/:studentId	teacherAuthMiddleware, classTeacherAuthMiddleware	Get attendance report	Path: /teacher/attendance/67d6a4df4e1a2b8c3e78d1a8
GET	/teacher/class-students	teacherAuthMiddleware, classTeacherAuthMiddleware	Get list of students in class	None
POST	/teacher/chat/send	teacherAuthMiddleware, subjectTeacherAuthMiddleware	Send message to parent	json { "studentId": "67d6a4df4e1a2b8c3e78d1a8", "message": "Hello parent" }
POST	/teacher/chat/history	teacherAuthMiddleware, subjectTeacherAuthMiddleware	Get chat history with parent	json { "studentId": "67d6a4df4e1a2b8c3e78d1a8" }
				
				
				
				
Parent API Documentation				
				
Method	Endpoint	Middleware	Purpose	Sample Input
POST	/parent/login	None	Parent login	json { "email": "parent@example.com", "password": "password123" }
GET	/parent/children	parentAuthMiddleware	Get list of parent's children	None
GET	/parent/forms/:studentId	parentAuthMiddleware	Get forms assigned to child	Path: /parent/forms/67d6a4df4e1a2b8c3e78d1a8
GET	/parent/marksheet/:studentId	parentAuthMiddleware	View child's marksheet	Path: /parent/marksheet/67d6a4df4e1a2b8c3e78d1a8
GET	/parent/attendance/:studentId	parentAuthMiddleware	View child's attendance	Path: /parent/attendance/67d6a4df4e1a2b8c3e78d1a8
POST	/parent/send-note	parentAuthMiddleware	Send note to teacher	json { "teacherId": "67d6a4df4e1a2b8c3e78d1a8", "title": "Regarding Homework", "note": "My child needs clarification on today's homework" }
POST	/parent/acknowledge-note/:noteId	parentAuthMiddleware	Acknowledge received note	Path: /parent/acknowledge-note/67d6a4df4e1a2b8c3e78d1a8
GET	/parent/teacher-details/:studentId	parentAuthMiddleware	Get teachers info for child	Path: /parent/teacher-details/67d6a4df4e1a2b8c3e78d1a8
POST	/parent/fill-form	parentAuthMiddleware	Submit form responses	json { "formId": "67d6a4df4e1a2b8c3e78d1a8", "studentId": "67d6a4df4e1a2b8c3e78d1a8", "answers": [{ "field": "Preferred Time", "value": "9 AM" }] }
POST	/parent/chat/send	parentAuthMiddleware	Send message to teacher	json { "teacherId": "67d6a4df4e1a2b8c3e78d1a8", "studentId": "67d6a4df4e1a2b8c3e78d1a8", "message": "Regarding homework" }
GET	/parent/chat/history	parentAuthMiddleware	Get chat history with teacher	json { "teacherId": "67d6a4df4e1a2b8c3e78d1a8", "studentId": "67d6a4df4e1a2b8c3e78d1a8" }
POST	/parent/donations/create	parentAuthMiddleware	Create new donation	json { "items": [{ "item": "Books", "quantity": 5, "description": "Class 10 Science textbooks" }] }
GET	/parent/donations/pending	parentAuthMiddleware	View available donations	None
POST	/parent/donations/apply/:donationId	parentAuthMiddleware	Request donation item	Path: /parent/donations/apply/67d6a4df4e1a2b8c3e78d1a8
User API Documentation				
				
Method	Endpoint	Middleware	Purpose	Sample Input
POST	/user/change-password	authMiddleware	Change user password	json { "oldPassword": "currentPassword123", "newPassword": "newSecurePassword123" }
POST	/user/forgot-password	None	Reset user password	json { "email": "user@example.com" }
				
				
				
