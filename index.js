import express from 'express';
import mongoose from 'mongoose';
import adminRoutes from './admin/admin_route.js';
import parerentroutes from './parents/parents_routes.js';
import teacherRoutes from './teacher/teacher_routes.js';
import userRoutes from './user.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI, {

});

app.use(express.json());
app.use('/admin', adminRoutes);
app.use('/parent', parerentroutes);
app.use('/teacher', teacherRoutes);
app.use('/user', userRoutes);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});