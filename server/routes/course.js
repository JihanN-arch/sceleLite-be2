import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { authorizeRole } from '../../middleware/roleMiddleware.js';
import { db } from '../../config/db.js';

const router = express.Router();

//!! DONE

// GET (mhswa dn dosn)
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM courses');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//CREATE (dosen)
router.post(
  '/courses',
  authenticateToken,
  authorizeRole('dosen'),
  async (req, res) => {
    try {
      const { name, code, sks, capacity } = req.body;
      const dosen_id = req.user.id;

      if (!name || !code || !sks || !capacity) {
        return res.status(400).json({ message: 'Semua field wajib diisi' });
      }

      await db.execute(
        'INSERT INTO courses (name, code, sks, capacity, dosen_id) VALUES (?, ?, ?, ?, ?)',
        [name, code, sks, capacity, dosen_id],
      );

      res.status(201).json({ message: 'Course created!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// buat dashbord lihat matkul
router.get(
  '/courses/my',
  authenticateToken,
  authorizeRole('dosen'),
  async (req, res) => {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM courses WHERE dosen_id = ?',
        [req.user.id],
      );
      res.json(rows);
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
      const { name, code, sks, capacity } = req.body;
      const loggedInDosenId = req.user.id;

      const [rows] = await db.execute(
        'SELECT * FROM courses WHERE id = ? AND dosen_id = ?',
        [id, loggedInDosenId],
      );

      if (rows.length === 0) {
        return res
          .status(403)
          .json({ message: 'Anda tidak berhak mengedit matkul ini' });
      }

      const course = rows[0];

      const updatedName = name ?? course.name;
      const updatedCode = code ?? course.code;
      const updatedSks = sks ?? course.sks;
      const updatedCapacity = capacity ?? course.capacity;

      await db.execute(
        'UPDATE courses SET name=?, code=?, sks=?, capacity=? WHERE id=? AND dosen_id=?',
        [
          updatedName,
          updatedCode,
          updatedSks,
          updatedCapacity,
          id,
          loggedInDosenId,
        ],
      );

      res.json({ message: 'Course updated successfully!' });
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
      const dosen_id = req.user.id;

      const [result] = await db.execute(
        'DELETE FROM courses WHERE id = ? AND dosen_id = ?',
        [id, dosen_id],
      );

      if (result.affectedRows === 0) {
        return res
          .status(403)
          .json({ message: 'Bukan matkul anda atau tidak ditemukan' });
      }

      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// dashbord dosen
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRole('dosen'),
  async (req, res) => {
    try {
      const query = `
SELECT 
  c.id, 
  c.name, 
  c.code, 
  c.sks, 
  c.capacity,
  COUNT(e.id) AS total_pendaftar
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
WHERE c.dosen_id = ?
GROUP BY c.id`;

      const [rows] = await db.execute(query, [req.user.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
