import express from 'express';
import usersRouter from './user.js';
import courseRouter from './course.js';
import authRouter from './auth.js';
import enrollRouter from './enroll.js';

const router = express.Router();

router.use('/api', usersRouter);
router.use('/api', courseRouter);
router.use('/auth', authRouter);
router.use('/api', enrollRouter);

// test api jln or not
router.get('/test', (req, res) => {
  res.send('OK');
});

export default router;
