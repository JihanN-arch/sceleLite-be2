import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { db } from '../../config/db.js';
const router = express.Router();

//!! DONE

router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    let query;
    if (role === 'dosen') {
      // dosen
      query = `
        SELECT u.id, u.username, u.role, m.max_sks, m.current_sks 
        FROM users u 
        LEFT JOIN mahasiswa_profile m ON u.id = m.user_id`;
    } else {
      //mahasiswa
      query = `SELECT id, username, role FROM users`;
    }

    const [rows] = await db.execute(query);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// lihat profile pribadi
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;

    let query;
    if (role === 'mahasiswa') {
      query = `
        SELECT u.id, u.username, u.role, m.max_sks, m.current_sks 
        FROM users u 
        JOIN mahasiswa_profile m ON u.id = m.user_id 
        WHERE u.id = ?`;
    } else {
      query = `SELECT id, username, role FROM users WHERE id = ?`;
    }

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
