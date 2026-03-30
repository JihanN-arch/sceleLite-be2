import express from 'express';
import { hashedPassword } from '../../utils/bcryptHelpers.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { db } from '../../config/db.js';
const router = express.Router();

//!! DONE

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT u.id, u.username, u.role, m.max_sks, m.current_sks FROM users u LEFT JOIN mahasiswa_profile m ON u.id = m.user_id',
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// create
router.post('/users', async (req, res) => {
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

export default router;
