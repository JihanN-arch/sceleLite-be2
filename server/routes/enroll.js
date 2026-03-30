import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { db } from '../../config/db.js';

const router = express.Router();

//!! DONE

// enroll matkul
router.post('/enroll', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { course_id } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'mahasiswa') {
      return res
        .status(403)
        .json({ message: 'Hanya mahasiswa yang bisa enroll' });
    }

    const [profileRows] = await connection.execute(
      'SELECT max_sks, current_sks FROM mahasiswa_profile WHERE user_id = ?',
      [userId],
    );
    const profile = profileRows[0];

    const [courseRows] = await connection.execute(
      'SELECT sks, capacity FROM courses WHERE id = ?',
      [course_id],
    );
    const course = courseRows[0];

    if (!course)
      return res.status(404).json({ message: 'Matkul tidak ditemukan' });

    const [existing] = await connection.execute(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, course_id],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'Sudah ambil matkul ini' });

    if (profile.current_sks + course.sks > profile.max_sks) {
      return res.status(400).json({ message: 'Melebihi batas SKS' });
    }

    const [countRows] = await connection.execute(
      'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?',
      [course_id],
    );
    if (countRows[0].total >= course.capacity) {
      return res.status(400).json({ message: 'Kelas penuh' });
    }

    await connection.beginTransaction();

    await connection.execute(
      'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, course_id],
    );

    await connection.execute(
      'UPDATE mahasiswa_profile SET current_sks = current_sks + ? WHERE user_id = ?',
      [course.sks, userId],
    );

    await connection.commit();
    res.status(201).json({ message: 'Berhasil ambil mata kuliah' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// drop matkul
router.delete('/enroll/:course_id', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { course_id } = req.params;
    const userId = req.user.id;

    const [courseRows] = await connection.execute(
      'SELECT sks FROM courses WHERE id = ?',
      [course_id],
    );

    if (courseRows.length === 0) {
      return res.status(404).json({ message: 'Matkul tidak ditemukan' });
    }

    await connection.beginTransaction();

    const [result] = await connection.execute(
      'DELETE FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, course_id],
    );

    if (result.affectedRows > 0) {
      await connection.execute(
        'UPDATE mahasiswa_profile SET current_sks = current_sks - ? WHERE user_id = ?',
        [courseRows[0].sks, userId],
      );
    } else {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: 'Kamu belum mengambil mata kuliah ini' });
    }

    await connection.commit();
    res.json({ message: 'Berhasil drop mata kuliah' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// liat mahasiswa (untuk dosen)
router.get('/courses/:id/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'dosen') {
      return res.status(403).json({
        message: 'Hanya dosen',
      });
    }

    const { id } = req.params;

    const [rows] = await db.execute(
      `
      SELECT u.id, u.username
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = ?
    `,
      [id],
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;
