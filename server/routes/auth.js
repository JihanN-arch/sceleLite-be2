import express from 'express';
import jwt from 'jsonwebtoken';
import { comparePassword } from '../../utils/bcryptHelpers.js';
import { users } from '../../users.js';
import { db } from '../../config/db.js';

const router = express.Router();

// login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [
    username,
  ]);

  const user = rows[0];

  if (!user) {
    return res.status(400).json({ message: 'User not found!' });
  }

  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    return res.status(403).json({ message: 'Invalid credentials!' });
  }

  // generate JWT
  const accessToken = jwt.sign(
    { username: user.username, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    { username: user.username },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  );

  // simpan ke DB
  await db.execute('UPDATE users SET refresh_token=? WHERE username=?', [
    refreshToken,
    user.username,
  ]);

  res.json({ accessToken, refreshToken });
});

router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.sendStatus(401);
  }

  const [rows] = await db.execute('SELECT * FROM users WHERE refresh_token=?', [
    refreshToken,
  ]);

  if (rows.length === 0) return res.sendStatus(403);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    const newAccessToken = jwt.sign(
      { username: user.username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' },
    );

    res.json({ accessToken: newAccessToken });
  });
});

export default router;
