import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { authorizeRole } from '../../middleware/roleMiddleware.js';
import { db } from '../../config/db.js';

const router = express.Router();

//!! DONE

// GET (mhswa dn dosn)
// ini untuk dashboard all courses
router.get('/courses', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, c.name, c.code, c.sks, c.capacity,
        u.username AS nama_dosen,
        COUNT(e.id) AS terisi,
        (c.capacity - COUNT(e.id)) AS sisa_kuota
      FROM courses c
      JOIN users u ON c.dosen_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.deleted_at IS NULL 
      WHERE c.deleted_at IS NULL 
      GROUP BY c.id, u.username
    `;
    const [rows] = await db.execute(query);
    res.json({ data: rows });
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
      const updatedSks = sks !== undefined ? Number(sks) : course.sks;
      const updatedCapacity =
        capacity !== undefined ? Number(capacity) : course.capacity;

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
      console.error('SQL Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  },
);
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
      const updatedSks = sks !== undefined ? Number(sks) : course.sks;
      const updatedCapacity =
        capacity !== undefined ? Number(capacity) : course.capacity;

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
      console.error('SQL Error:', err.message);
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
    const connection = await db.getConnection(); // Ambil koneksi manual untuk transaksi
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const dosen_id = req.user.id;

      const [result] = await connection.execute(
        'UPDATE courses SET deleted_at = NOW() WHERE id = ? AND dosen_id = ? AND deleted_at IS NULL',
        [id, dosen_id],
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ message: 'Matkul tidak ditemukan atau bukan milik Anda' });
      }

      await connection.execute(
        'UPDATE enrollments SET deleted_at = NOW() WHERE course_id = ? AND deleted_at IS NULL',
        [id],
      );

      await connection.commit();
      res.json({
        message: 'Course and all enrollments soft-deleted successfully',
      });
    } catch (err) {
      await connection.rollback();
      res.status(500).json({ error: err.message });
    } finally {
      connection.release();
    }
  },
);

// dashbord dosen dan mahasiwa
// my dahsboard
router.get('/myDashboard', authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'dosen') {
      const queryDosen = `
          SELECT 
            c.id, c.name, c.code, c.sks, c.capacity,
            COUNT(e.id) AS total_pendaftar
          FROM courses c
          LEFT JOIN enrollments e ON c.id = e.course_id AND e.deleted_at IS NULL
          WHERE c.dosen_id = ? AND c.deleted_at IS NULL -- Filter matkul aktif
          GROUP BY c.id`;

      const [rows] = await db.execute(queryDosen, [id]);
      return res.json({ role, data: rows });
    } else if (role === 'mahasiswa') {
      const queryMahasiswa = `
          SELECT 
            c.id, c.name, c.code, c.sks, 
            u.username AS nama_dosen
          FROM enrollments e
          JOIN courses c ON e.course_id = c.id
          JOIN users u ON c.dosen_id = u.id
          WHERE e.user_id = ? 
            AND e.deleted_at IS NULL -- Filter enrollment aktif
            AND c.deleted_at IS NULL -- Pastikan matkulnya juga belum dihapus dosen
      `;
      const [rows] = await db.execute(queryMahasiswa, [id]);
      return res.json({ role, data: rows });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// untuk view detail course
router.get('/courses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const query = `
      SELECT 
        c.*, 
        u.username AS nama_dosen,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND deleted_at IS NULL) AS terisi,
        (c.capacity - (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND deleted_at IS NULL)) AS sisa_kuota, 
        EXISTS(SELECT 1 FROM enrollments WHERE course_id = c.id AND user_id = ? AND deleted_at IS NULL) AS is_enrolled
      FROM courses c
      JOIN users u ON c.dosen_id = u.id
      WHERE c.id = ? AND c.deleted_at IS NULL -- Kunci utama
    `;

    const [rows] = await db.execute(query, [userId, id]);
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: 'Mata kuliah tidak ditemukan atau sudah dihapus' });

    res.json({ data: rows[0] });
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

      // Pastikan matkulnya ada dan milik dosen tsb
      const [courseCheck] = await db.execute(
        'SELECT id FROM courses WHERE id = ? AND dosen_id = ? AND deleted_at IS NULL',
        [id, loggedInDosenId],
      );

      if (courseCheck.length === 0)
        return res.status(403).json({ message: 'Akses ditolak' });

      const query = `
      SELECT 
        u.id AS student_id, u.username, m.current_sks
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN mahasiswa_profile m ON u.id = m.user_id
      WHERE e.course_id = ? AND e.deleted_at IS NULL -- Hanya yang aktif
    `;
      const [students] = await db.execute(query, [id]);
      res.json({ total_students: students.length, students });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;

// kita buat untuk detail page isinya detail matkul dan jumlah pendaftar, itu kalo dia klik dari myDashboard (untuk dosen) jdi tmabahan getCourse dgn
// note jdi kita bakal buat dashboard dmn kalo dia klik dia bkn muncul detail peserta aja, utnuk kek detail
