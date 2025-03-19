API Routes Documentation
Admin Routes
Method	Endpoint	Middleware	Purpose
POST	/admin/register	None	Register new admin with admin key
POST	/admin/login	None	Admin login
POST	/admin/teacher	authMiddleware	Add new teacher
DELETE	/admin/teacher/:id	authMiddleware	Remove teacher
POST	/admin/parent	authMiddleware	Add new parent
DELETE	/admin/parent/:id	authMiddleware	Remove parent
POST	/admin/student	authMiddleware	Add new student
DELETE	/admin/student/:id	authMiddleware	Remove student
GET	/admin/donations	authMiddleware	Get all donations
GET	/admin/donations/pending	authMiddleware	Get pending donations
POST	/admin/donations/assign	authMiddleware	Assign donation to user
Teacher Routes
Method	Endpoint	Middleware	Purpose
POST	/teacher/login	None	Teacher login
POST	/teacher/assign-marksheet	teacherAuth, classTeacherAuth	Assign marksheet
POST	/teacher/assign-attendance	teacherAuth, classTeacherAuth	Mark attendance
GET	/teacher/marksheet/:studentId	teacherAuth, classTeacherAuth	Get student marksheet
POST	/teacher/give-note	teacherAuth, subjectTeacherAuth	Send note
POST	/teacher/acknowledge-note/:noteId	teacherAuth	Acknowledge note
POST	/teacher/give-form	teacherAuth, classTeacherAuth	Create and assign form
GET	/teacher/form-responses/:formId	teacherAuth, classTeacherAuth	Get form responses
GET	/teacher/attendance/:studentId	teacherAuth, classTeacherAuth	Get attendance report
GET	/teacher/class-students	teacherAuth, classTeacherAuth	Get class students list
POST	/teacher/chat/send	teacherAuth, subjectTeacherAuth	Send message to parent
POST	/teacher/chat/history	teacherAuth, subjectTeacherAuth	Get chat history
GET	/teacher/notes	teacherAuth	Get received notes
GET	/teacher/forms/sent	teacherAuth	Get sent forms
GET	/teacher/forms/analytics/:formId	teacherAuth, classTeacherAuth	Get form analytics
Parent API Routes Documentation
#	Method	Endpoint	Middleware	Description	Request Body/Params
1	POST	/parent/login	None	Login parent	{ email, password }
2	GET	/parent/children	parentAuth	Get children list	None
3	GET	/parent/forms/:studentId	parentAuth	Get forms for student	studentId (param)
4	GET	/parent/marksheet/:studentId	parentAuth	Get student marksheet	studentId (param)
5	GET	/parent/attendance/:studentId	parentAuth	Get attendance report	studentId (param)
6	POST	/parent/send-note	parentAuth	Send note to teacher	{ teacherId, title, content }
7	POST	/parent/acknowledge-note/:noteId	parentAuth	Acknowledge received note	noteId (param)
8	GET	/parent/teacher-details/:studentId	parentAuth	Get teachers info	studentId (param)
9	POST	/parent/fill-form	parentAuth	Submit form response	{ formId, answers }
10	POST	/parent/chat/send	parentAuth	Message teacher	{ teacherId, message }
11	GET	/parent/chat/history	parentAuth	Get chat history	{ teacherId }
12	GET	/parent/forms/not-filled	parentAuth	Get pending forms	None
13	GET	/parent/notes	parentAuth	Get received notes	None
14	POST	/parent/donations/create	parentAuth	Create donation	{ item, quantity, description }
15	GET	/parent/donations/pending	parentAuth	View available donations	None
16	POST	/parent/donations/apply/:donationId	parentAuth	Apply for donation	donationId (param)


Total Routes: 44

Admin Routes: 11
Teacher Routes: 15
Parent Routes: 16
User Routes: 2
