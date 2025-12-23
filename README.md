# COK'S (Circle of Knights) - Fufufafagames

> **Platform Distribusi Game Digital Modern berbasis Web.**
> Project ini dibuat untuk memenuhi tugas akhir mata kuliah Pemrograman Berbasis Platform (PBP).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v20.19.0-green.svg)
![Express](https://img.shields.io/badge/express-v4.17.1-lightgrey.svg)
![PostgreSQL](https://img.shields.io/badge/database-Supabase-green.svg)

## Deskripsi

**COK'S (Fufufafagames)** adalah platform e-commerce khusus game digital yang memungkinkan pengguna untuk membeli, mengunduh, dan memberikan ulasan pada game. Dilengkapi dengan dashboard admin yang powerful untuk manajemen konten dan gateway pembayaran DOKU untuk transaksi yang aman.

Website ini sudah live di: **[https://coks.site](https://coks.site)**

---

## Fitur Utama

### User Features:
- **Authentication**: Login, Register, Forgot Password (Email), Google OAuth.
- **Game Catalog**: Jelajahi game dengan fitur Search, Sort, dan Filter Categories.
- **Game Details**: Lihat deskripsi, spesifikasi, dan *Trailer Video*.
- **Reviews & Ratings**: Berikan bintang dan komentar pada game yang sudah dibeli.
- **Shopping Cart & Wishlist**: Simpan game favorit atau masukkan keranjang belanja.
- **Secure Payment**: Pembayaran otomatis via **DOKU Payment Gateway** (QRIS, VA, Credit Card).
- **Library**: Akses dan download game yang sudah dibeli.
- **Community**: Forum diskusi sederhana antar pengguna.

### Admin Features:
- **Dashboard**: Statistik penjualan, total user, dan game terpopuler.
- **Manage Games**: CRUD Game (Upload poster, file game, set harga/diskon).
- **Manage Users**: Lihat daftar user, Ban/Unban user.
- **Manage Transactions**: Pantau status pembayaran real-time.

---

## Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Frontend**: EJS (Templating Engine), CSS (Custom + Bootstrap)
- **Database**: PostgreSQL (Hosted on **Supabase**)
- **Payment Gateway**: DOKU (Sandbox/Production)
- **Deployment**: VPS (Ubuntu), Nginx (Reverse Proxy), PM2 (Process Manager), Certbot (SSL).

---

## Cara Menjalankan (Local Setup)

Ikuti langkah ini untuk menjalankan project di komputer lokal Anda:

### 1. Clone Repository
```bash
git clone https://github.com/fufufafagames/Fufufafagames.git
cd Fufufafagames
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment (.env)
Buat file `.env` dan sesuaikan isinya (lihat `.env.example`):
```env
APP_NAME=Fufufafagames
PORT=3000
NODE_ENV=development

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres

# Authentication
SESSION_SECRET=rahasia_anda_disini

# Email Service (Nodemailer)
EMAIL_USER=email_anda@gmail.com
EMAIL_PASSWORD=app_password_google

# DOKU Payment
DOKU_CLIENT_ID=...
DOKU_SECRET_KEY=...
```

### 4. Jalankan Server
```bash
# Mode Development (Nodemon)
npm run dev

# Mode Production
npm start
```
Buka browser dan akses: `http://localhost:3000`

---

## Screenshot Tampilan

### Home Page
![Homepage](public/img/screenshoot-homepage.png)

### Halaman Games
![Halaman Games](public/img/screenshoot-games.png)

### Halaman About
![About](public/img/screenshoot-about.png)

### Halaman Community
![Community](public/img/screenshoot-community.png)

### Halaman FAQ
![FAQ](public/img/screenshoot-faq.png)

### Halaman Search
![Search](public/img/screenshoot-searchgames.png)

### Halaman Login/Register
![Login](public/img/screenshoot-login.png)
![Register](public/img/screenshoot-register.png)
![Forgot Password](public/img/screenshoot-forgotpassword.png)

### Halaman Kontak
![Kontak](public/img/screenshoot-kontakpengaduan.png)

### Halaman Event
![Event](public/img/screenshoot-event.png)

### Halaman Upload Games
![Upload Games](public/img/screenshoot-uploadgame.png)

### Halaman Edit Games
![Edit Games](public/img/screenshoot-editgame.png)

### Halaman Profile
![Profile](public/img/screenshoot-profile.png)

### Halaman Setting Profile
![Setting Profile](public/img/screenshoot-editprofile.png)

### Halaman Detail Game
![Detail Game](public/img/screenshoot-detailgame.png)

### Halaman Pembayaran
![Pembayaran](public/img/screenshoot-metodepembayaran.png)
![Pembayaran](public/img/screenshoot-metodepembayaran2.png)
![Pembayaran](public/img/screenshoot-myorder.png)

### Admin Dashboard
![Admin Dashboard](public/img/screenshot-admin-panel1.png)
![Admin Dashboard](public/img/screenshot-admin-panel2.png)
![Admin Dashboard](public/img/screenshot-admin-panel3.png)
![Admin Dashboard](public/img/screenshot-admin-panel4.png)
![Admin Dashboard](public/img/screenshot-admin-panel5.png)

---

## Kontributor/Team
- **Adam Rahmatulloh** (Front End Engineer)
- **Ahmad Ramadhan Sobrunjamil** (Lead Developer)
- **Muhammad Anwar Ismail** (Bakcend Engineer)
- **Muhammad Ilham Jazuli** (Community Manager)

---
© 2024 COK'S Team. All Rights Reserved.
