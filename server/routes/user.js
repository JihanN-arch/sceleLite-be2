import express from 'express';
import { hashedPassword } from '../../utils/bcryptHelpers.js';
import { authenticateToken } from '../../middleWare/authMiddleware.js';
import { db } from '../../config/db.js';
const router = express.Router();

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  const { password, username, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  const [existing] = await db.execute(
    'SELECT * FROM users WHERE username = ?',
    [username],
  );

  if (existing.length > 0) {
    return res.status(400).json({ message: 'Username already exists!' });
  }

  if (!['dosen', 'mahasiswa'].includes(role)) {
    return res.status(400).json({ message: 'Role harus dosen/mahasiswa' });
  }

  // hast pw
  const hashedPw = await hashedPassword(password);

  await db.execute(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPw, role],
  );

  res.status(201).json({ message: 'User created!' });
});

export default router;
