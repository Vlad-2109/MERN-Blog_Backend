import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import upload from 'express-fileupload';
import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import { errorHandler, notFound } from './middleware/errorMiddleware';

dotenv.config();

const mongo_uri = process.env.MONGO_URI || '';
const port = process.env.PORT || 5000;

const app = express();

mongoose
  .connect(mongo_uri)
  .then(() => console.log('Database is connected'))
  .catch((err) => console.log('DB error', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));
app.use(upload());
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
