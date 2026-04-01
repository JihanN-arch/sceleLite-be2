import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { authorizeRole } from '../../middleware/roleMiddleware.js';
import { db } from '../../config/db.js';

const router = express.Router();

//!! DONE

// GET (mhswa dn dosn)
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.code, 
        c.sks, 
        c.capacity,
        u.username AS nama_pengajar,
        COUNT(e.id) AS terisi,
        (c.capacity - COUNT(e.id)) AS sisa_kuota
      FROM courses c
      JOIN users u ON c.dosen_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id, u.username
    `;

    const [rows] = await db.execute(query);
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

// dashbord dosen dan mahasiwa
router.get('/myDashboard', authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'dosen') {
      // matkul yg dia buat
      const queryDosen = `
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

      const [rows] = await db.execute(queryDosen, [id]);
      return res.json({
        message: 'Dashboard Dosen: Mata kuliah yang Anda ampu',
        role: role,
        data: rows,
      });
    } else if (role === 'mahasiswa') {
      // lihat matkul y diambil
      const queryMahasiswa = `
          SELECT 
            c.id, 
            c.name, 
            c.code, 
            c.sks, 
            u.username AS nama_dosen
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          JOIN users u ON c.dosen_id = u.id
          WHERE e.user_id = ?`;

      const [rows] = await db.execute(queryMahasiswa, [id]);
      return res.json({
        message: 'Dashboard Mahasiswa: Mata kuliah yang Anda ambil',
        role: role,
        data: rows,
      });
    }

    return res.status(403).json({ message: 'Role tidak valid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Lihat mahasiswa yg terdaftar di matkul
router.get(
  '/courses/:id/students',
  authenticateToken,
  authorizeRole('dosen'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const loggedInDosenId = req.user.id;

      const [courseCheck] = await db.execute(
        'SELECT id FROM courses WHERE id = ? AND dosen_id = ?',
        [id, loggedInDosenId],
      );

      if (courseCheck.length === 0) {
        return res.status(403).json({
          message:
            'Anda tidak memiliki akses ke data mata kuliah ini atau matkul tidak ditemukan',
        });
      }

      const query = `
      SELECT 
        u.id AS student_id, 
        u.username, 
        m.current_sks,
        e.enrolled_at -- Asumsi kamu punya kolom created_at di tabel enrollments
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN mahasiswa_profile m ON u.id = m.user_id
      WHERE e.course_id = ?
    `;

      const [students] = await db.execute(query, [id]);

      res.json({
        course_id: id,
        total_students: students.length,
        students: students,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
