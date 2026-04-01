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
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(mainRouter);

app.get('/', (req, res) => {
  res.send('Welcome to the Modular Node.js App!');
});

export const startServer = () => {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
};
