import express from 'express';
import jwt from 'jsonwebtoken';
import { hashedPassword } from '../../utils/bcryptHelpers.js';
import { comparePassword } from '../../utils/bcryptHelpers.js';
import { db } from '../../config/db.js';

const router = express.Router();

//register
// create
router.post('/registrasi', async (req, res) => {
  const connection = await db.getConnection();

  try {
    let { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }

    role = role.trim().toLowerCase();

    if (!['dosen', 'mahasiswa'].includes(role)) {
      return res
        .status(400)
        .json({ message: 'Role harus "dosen" atau "mahasiswa"' });
    }

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username],
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username sudah terpakai!' });
    }

    const hashedPw = await hashedPassword(password);

    await connection.beginTransaction();

    const [userResult] = await connection.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPw, role],
    );

    const newUserId = userResult.insertId;

    if (role === 'mahasiswa') {
      await connection.execute(
        'INSERT INTO mahasiswa_profile (user_id) VALUES (?)',
        [newUserId],
      );
    } else if (role === 'dosen') {
      await connection.execute(
        'INSERT INTO dosen_profile (user_id) VALUES (?)',
        [newUserId],
      );
    }

    await connection.commit();
    return res.status(201).json({ message: 'User created!' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

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
  } // generate JWT

  const accessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' },
  ); // simpan ke DB

  await db.execute('UPDATE users SET refresh_token=? WHERE username=?', [
    refreshToken,
    user.username,
  ]);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.sendStatus(401);

  const [rows] = await db.execute('SELECT * FROM users WHERE refresh_token=?', [
    refreshToken,
  ]);

  if (rows.length === 0) return res.sendStatus(403);

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' },
    );

    res.json({ accessToken: newAccessToken });
  });
});

export default router;
