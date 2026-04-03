# SceleLite - Backend 🚀

SceleLite adalah core engine dari platform manajemen perkuliahan. Repositori ini menangani logika bisnis, autentikasi berbasis JWT, dan integritas data kursus serta pendaftaran mahasiswa.

## 🎯 Fitur Utama (Backend)
- **Role-Based Access Control (RBAC):** Pembedaan hak akses antara 'Dosen' dan 'Mahasiswa'.
- **Secure Authentication:** Menggunakan Access Token & Refresh Token (JWT).
- **Database Integrity:** Validasi kuota mata kuliah dan limit SKS (max 24) langsung di level database/query.
- **Transaction Safety:** Menggunakan database transaction untuk memastikan data enroll dan update SKS konsisten.

## 🛠️ Tech Stack
- Node.js & Express.js
- MySQL (with `mysql2/promise`)
- JWT (JsonWebToken)
- Bcrypt (Password Hashing)

## 📌 Future Updates & Disclaimer
> **Note**:rencananya, repo ini akan dilengkapi dokumentasi API via **Postman Collection**. But, saat ini i sedang memprioritaskan cicil matkul untuk persiapan **UTS**.. soo insyaAllah :D
> oh iya repo ini msh dalam tahap pengembangan (begitupula FEnya), meskipun projek ini adalah tugas khusus SE CF, aku mau lanjutin lagi untuk latihan full-stack lebih mendalam, maybe setelah pasca ujian 
