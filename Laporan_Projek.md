# Laporan Final Projek: COKS EJS

Laporan ini disusun untuk memenuhi kriteria penilaian UAS Pemrograman Berbasis Platform. Kami menyajikan detail teknis dengan bahasa yang lugas, *to-the-point*, dan profesional ala mahasiswa teknik.

## 1. Struktur dan Kerapian Kode (0.25 Poin)
Kami menggunakan arsitektur **MVC (Model-View-Controller)** yang disiplin. Tidak ada kode yang campur aduk.
*   **Model (`/models`):** Khusus urusan database (SQL Query). File bersih, terpisah per entitas (`User.js`, `Game.js`, `Transaction.js`).
*   **View (`/views`):** Tampilan frontend menggunakan **EJS**. Folder tertata rapi (`/partials`, `/pages`, `/admin`).
*   **Controller (`/controllers`):** Logika bisnis ada di sini. Controller hanya menerima request, menyuruh Model bekerja, lalu melempar data ke View.
*   **Routes (`/routes`):** Pintu gerbang URL yang rapi. Segala request `/games` masuk `games.js`, `/auth` masuk `auth.js`.

## 2. Desain dan Tampilan Website (0.25 Poin)
Desain kami bukan kaleng-kaleng. Mengusung tema **"Dark Neon Gaming"** yang modern:
*   **Warna:** Dominasi Hitam (`#0b0c10`) dengan aksen Cyan (`#45a29e`) dan Emas untuk fitur premium.
*   **UI/UX:** Card layout yang responsif, hover effects yang halus, dan navigasi yang intuitif.
*   **Feedback:** Toast notification saat sukses/gagal, loading spinner saat pembayaran, dan modal konfirmasi untuk aksi destruktif.

## 3. Fungsionalitas dan Interaktivitas (0.3 Poin)
Web ini hidup, bukan sekadar brosur statis. Interaktivitasnya tinggi:
*   **CRUD Game Lengkap:** User bisa upload game, edit metadata, ganti thumbnail, hingga hapus game buatan sendiri.
*   **Sistem Pembayaran Canggih (DOKU):** Integrasi **Real-time** dengan Payment Gateway. Support QRIS (langsung scan!), Virtual Account (BCA/Mandiri/BRI), dan Gerai Retail.
*   **Logika Diskon Otomatis ("Daily Deal"):** Tiap jam 00:00, sistem secara otomatis mengacak 1 game untuk diskon 10% menggunakan algoritma RNG deterministik berdasarkan tanggal. Semua user melihat diskon yang sama.
*   **Flash Sale (Race Condition):** Logika "siapa cepat dia dapat" untuk diskon 99%. Sistem menangani rebutan slot user di level database.
*   **Interaksi Sosial:** Fitur Rating & Review game, serta profil user yang menampilkan statistik upload/play mereka.
*   **Search & Filter:** Pencarian game realtime dan filter berdasarkan kategori, tipe, atau popularitas.

## 4. Keamanan Data (0.4 Poin)
Kami paranoid soal keamanan. Data user adalah prioritas mutlak:
*   **Password Hashing (`bcryptjs`):** Kami TIDAK PERNAH menyimpan password asli (plain-text). Password di-hash dengan *salt* 10 putaran. Kalaupun database jebol, hacker hanya dapat string acak yang tidak bisa dibaca.
*   **Anti SQL Injection:** Semua query database menggunakan **Parameterized Queries** ($1, $2, dst). Input jahat seperti `' OR 1=1 --` akan dianggap string biasa, tidak akan dieksekusi sebagai perintah SQL.
*   **Session Management Aman:** Menggunakan `express-session` dengan opsi `httpOnly: true`. Cookie sesi tidak bisa dicuri lewat script jahat (XSS) di browser client.
*   **Middleware Protection:** Route sensitif diproteksi middleware `isAuthenticated` dan `isAdmin`. Orang iseng yang coba akses `/admin` tanpa login akan langsung ditendang ke login page.
*   **Validasi Server-Side:** Harga game saat pembayaran DIHITUNG ULANG di server. Kami tidak percaya harga yang dikirim dari browser user (karena bisa di-inspect element).

## 5. Website Adaptif (Responsive) (0.4 Poin)
Website ini "karet", bisa melar menyesuaikan layar:
*   **Grid System:** Menggunakan Bootstrap Grid. Di Desktop tampil 3 kolom, di Tablet 2 kolom, di HP 1 kolom.
*   **Mobile Experience:** Navbar otomatis menjadi "Hamburger Menu" di layar kecil. Tabel data yang lebar (seperti History Pembayaran) otomatis berubah menjadi tampilan "Card" di HP agar mudah dibaca tanpa zoom-in/zoom-out.
*   **Touch Friendly:** Tombol-tombol di HP dibuat lebih besar agar jempol-friendly.

## 6. Keunikan / Inovasi Fitur (0.4 Poin)
Kami punya fitur yang tidak dimiliki kelompok lain:
*   **"Daily Deal" Algorithm:** Algoritma unik kami yang merotasi diskon game setiap hari secara otomatis tanpa admin perlu login.
*   **OAuth Login (Hybrid):** Bisa login pakai Google/Discord (via Supabase) ATAU pakai email/password biasa. Dua-duanya jalan harmonis di satu tabel user.
*   **Game Embed & Download:** Mendukung dua tipe game sekaligus: Game yang dimainkan langsung di browser (Embed GitHub Pages) dan Game PC berat (Link Download External).

## 7. Hosting Online (1 Poin)
Projek ini SUDAH ONLINE dan bisa diakses publik!
*   **Domain:** `coks.site` (Domain TLD asli, bukan localhost).
*   **Server:** VPS (Virtual Private Server) Ubuntu di **Rumahweb**. Bukan sekadar shared hosting biasa, ini full server yang kami manage sendiri lewat terminal SSH.
*   **Process Manager:** Menggunakan **PM2** untuk menjaga server Node.js tetap nyala 24/7. Kalau app crash, PM2 otomatis restart dalam hitungan mili-detik.
*   **Reverse Proxy:** Menggunakan **Nginx** di depan Node.js untuk menangani traffic HTTP dengan efisien.
*   **Network Tuning:** Kami menginstall **Cloudflare WARP** di VPS untuk menstabilkan koneksi database Supabase yang sempat *intermittent* (putus-nyambung). Solusi teknis tingkat lanjut untuk masalah real-world.

---
*Demikian laporan ini dibuat. Semua kode yang ditulis dapat dipertanggungjawabkan logic dan fungsinya.*
*Berikut rangkuman logika project ini:*
https://github.com/coks-games/Logika-COK-S

