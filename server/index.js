import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { config } from '../config/env.js';
import mainRouter from './routes/main.js';

dotenv.config();

const app = express();

// middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(mainRouter);

app.get('/', (req, res) => {
  res.send('Welcome to the Modular Node.js App!');
});

export const startServer = () => {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Network access: http://0.0.0.0:${PORT}`);
  });
};
