import express from 'express';
import { authenticateToken } from '../../middleWare/authMiddleware.js';
import { authorizeRole } from '../../middleware/roleMiddleware.js';
import { db } from '../../config/db.js';

const router = express.Router();

// GET (mhswa dn dosn)
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM courses');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//CREATE (dsn)
router.post(
  '/courses',
  authenticateToken,
  authorizeRole('dosen'),
  async (req, res) => {
    try {
      const { name, code, sks } = req.body;

      if (!name || !code || !sks) {
        return res.status(400).json({ message: 'Semua field wajib diisi' });
      }

      await db.execute(
        'INSERT INTO courses (name, code, sks) VALUES (?, ?, ?)',
        [name, code, sks],
      );

      res.status(201).json({ message: 'Course created!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// UPDATE (dsn)
router.put(
  '/courses/:id',
  authenticateToken,
  authorizeRole('dosen'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code, sks } = req.body;

      const [rows] = await db.execute('SELECT * FROM courses WHERE id = ?', [
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'Not Found' });
      }

      const course = rows[0];

      const updatedName = name ?? course.name;
      const updatedCode = code ?? course.code;
      const updatedSks = sks ?? course.sks;

      await db.execute('UPDATE courses SET name=?, code=?, sks=? WHERE id=?', [
        updatedName,
        updatedCode,
        updatedSks,
        id,
      ]);

      res.json({ message: 'Course updated!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// delate
router.delete(
  '/courses/:id',
  authenticateToken,
  authorizeRole('dosen'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const [result] = await db.execute('DELETE FROM courses WHERE id=?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Not Found' });
      }

      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
export default router;
