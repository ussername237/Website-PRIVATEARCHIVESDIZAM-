# 🎬 PrivateArchivesDizam
### Website Penyimpanan Film Pribadi

<p align="center">
  <img src="https://img.shields.io/badge/status-aktif-brightgreen?style=flat-square" alt="Status Aktif">
  <img src="https://img.shields.io/badge/lisensi-MIT-blue?style=flat-square" alt="Lisensi MIT">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black&style=flat-square" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white&style=flat-square" alt="Vite 8">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white&style=flat-square" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Cloudflare-Workers_&_D1-f38020?logo=cloudflare&logoColor=white&style=flat-square" alt="Cloudflare Workers and D1">
</p>

<p align="center">
  Aplikasi web pribadi untuk mengarsipkan, mengelola, menilai, dan mengelompokkan koleksi film.
</p>

<p align="center">
  <strong>Curated by Dizam — LAZIR LAZIAF DIZAM.</strong>
</p>

---

## 📑 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Folder](#-struktur-folder)
- [Menjalankan Secara Lokal](#-menjalankan-secara-lokal)
  - [Prasyarat](#prasyarat)
  - [Instalasi](#langkah-langkah-instalasi)
  - [Perintah yang Tersedia](#perintah-yang-tersedia)
- [Konfigurasi Environment](#-konfigurasi-environment)
  - [Variabel Frontend](#variabel-frontend-envlocal)
  - [Secret Worker Lokal](#secret-worker-lokal-devvars)
  - [Secret Cloudflare Production](#secret-cloudflare-production)
- [Panduan Deploy](#-panduan-deploy)
  - [Cloudflare Workers dan D1](#deploy-ke-cloudflare-workers--d1)
  - [Hosting cPanel](#alternatif-deploy-ke-web-hosting-cpanel)
- [Kredit dan Sumber Daya](#-kredit-dan-sumber-daya)
- [Lisensi](#-lisensi)
- [Kontak](#-kontak)

---

## 📌 Tentang Proyek

**PrivateArchivesDizam** adalah aplikasi web modern untuk menyimpan arsip film pribadi tanpa bergantung pada platform sosial pihak ketiga.

Aplikasi ini terintegrasi dengan database film internasional **The Movie Database (TMDB)** dan **OMDb**. Integrasi tersebut membantu menampilkan metadata film, seperti poster, tahun rilis, sinopsis multi-bahasa, daftar pemeran (*cast*), dan cuplikan trailer resmi dari YouTube.

Aplikasi menggunakan arsitektur **Hybrid Storage**. Data dapat disimpan secara lokal di browser melalui LocalStorage (*offline-first*) dan disinkronkan ke Cloudflare D1 Database. Dengan pendekatan ini, koleksi film dapat dikelola secara lebih fleksibel.

## ✨ Fitur Utama

### 🔐 Autentikasi Eksklusif dan Keamanan
- Registrasi menggunakan kode rahasia `REGISTRATION_SECRET` agar pendaftaran tetap terbatas.
- Sesi login menggunakan cookie `HttpOnly`.
- Menggunakan HMAC SHA-256 dan perlindungan terhadap percobaan *brute-force login*.

### 🎬 Dashboard Koleksi Interaktif
- **Spotlight 3D Carousel:** kartu film 3D yang dapat digeser dengan mekanisme *drag & snap*.
- **Rekomendasi Acak:** tombol *dice roll* untuk memilih rekomendasi tontonan.
- **Statistik Tontonan:** menampilkan total film, film yang sudah ditonton, watchlist, favorit, dan persentase progres.
- **Filter dan Sorting:** menyaring film berdasarkan status tontonan, favorit, dan genre; serta mengurutkan berdasarkan judul atau tahun rilis.
- **Pencarian Realtime:** mencari berdasarkan judul, tahun, genre, atau catatan pribadi.

### ↩️ Undo Notifikasi 4 Detik
- Notifikasi muncul ketika film dihapus dari koleksi atau daftar favorit.
- Dilengkapi hitung mundur empat detik dan *progress bar* animasi.
- Tombol **Urungkan** dapat digunakan untuk mengembalikan film ke posisi urutan sebelumnya.

### ⭐ Manajemen Favorit dan Watchlist
- Menandai film favorit dengan satu klik.
- Memberikan rating pribadi menggunakan skala 1–10.
- Menambahkan catatan pribadi untuk menyimpan kesan atau pengingat.

### 🔍 Eksplorasi dan Penambahan Film Online (`/explore`)
- Menjelajahi film terbaru dan trending.
- Mencari film melalui TMDB API dan OMDb API.
- Menampilkan hasil dengan paginasi atau fitur *load more*.
- Menambahkan film ke koleksi dengan satu klik.

### 📑 Detail Film (`/movie/:id`)
- Menampilkan sinopsis dengan pilihan bahasa Indonesia, Inggris, dan Spanyol.
- Menampilkan profil pemeran, foto, serta tautan profil atau Instagram jika tersedia.
- Menampilkan trailer resmi dari YouTube.
- Menampilkan durasi film (*runtime*) dan tanggal rilis.

### 📂 Pengelompokan Genre (`/genres` dan `/favorites`)
- Mengelompokkan koleksi berdasarkan genre, seperti Action, Drama, Sci-Fi, Horror, dan Animation.
- Menyediakan halaman khusus untuk koleksi berdasarkan genre.
- Mempertahankan posisi scroll saat berpindah halaman sesuai implementasi aplikasi.

### 📱 Desain Modern dan Responsif
- Menggunakan tampilan gelap (*dark mode*).
- Palet warna: **Deep Navy**, **Panel Blue**, **Coral Wine**, dan **Warm Sand**.
- Dilengkapi *Bottom Navigation Bar* untuk pengalaman penggunaan di perangkat seluler.

## 🛠️ Teknologi yang Digunakan

### Frontend

| Teknologi | Keterangan |
|---|---|
| [React 19](https://react.dev/) dan React DOM | Library antarmuka pengguna |
| [Vite 8](https://vite.dev/) | Build tool dan development server |
| [React Router DOM v7](https://reactrouter.com/) | Routing aplikasi |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling dengan `@tailwindcss/vite` |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | Tipografi |

### Backend dan Database

| Teknologi | Keterangan |
|---|---|
| [Cloudflare Workers](https://workers.cloudflare.com/) | Runtime API dan backend serverless |
| [Cloudflare D1](https://developers.cloudflare.com/d1/) | Database SQL serverless |
| [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) | Pengelolaan dan deployment Cloudflare |

### Sumber Data Eksternal

| Layanan | Kegunaan |
|---|---|
| [TMDB API](https://www.themoviedb.org/settings/api) | Poster, metadata, sinopsis, pemeran, dan trailer film |
| [OMDb API](https://www.omdbapi.com/) | Data alternatif dan pencarian film cadangan |

## 📂 Struktur Folder

```text
movie-vault/
├── migrations/                  # Migrasi database D1
│   ├── 0001_initial.sql
│   └── 0002_user_collections.sql
├── public/                      # Aset publik
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── logo-512x512.png
│   ├── logo-social.png
│   ├── site.webmanifest
│   └── _headers                 # Security headers dan caching
├── scripts/                     # Skrip utilitas deployment
│   ├── check-deploy-config.js
│   └── clean-build-secrets.js
├── src/
│   ├── components/              # Komponen UI
│   │   ├── AppNavigation.jsx
│   │   ├── ArrowIcon.jsx
│   │   ├── MovieCarousel.jsx
│   │   └── UndoToast.jsx
│   ├── lib/                     # Logika aplikasi dan API
│   │   ├── auth.js
│   │   ├── fetchJson.js
│   │   ├── genres.js
│   │   └── movies.js
│   ├── pages/                   # Halaman aplikasi
│   │   ├── Dashboard.jsx
│   │   ├── Explore.jsx
│   │   ├── Favorites.jsx
│   │   ├── GenreCollection.jsx
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   └── MovieDetails.jsx
│   ├── App.jsx                  # Router dan proteksi rute
│   ├── index.css                # Style global dan animasi
│   ├── main.jsx                 # Entry point React
│   └── site.css                 # Style tambahan
├── worker/
│   └── index.js                 # Endpoint Worker API
├── .dev.vars.example            # Contoh secret Worker lokal
├── .env.example                 # Contoh konfigurasi API key
├── AUTH_SETUP.md                # Panduan autentikasi
├── package.json                 # Dependensi dan scripts
├── vite.config.js               # Konfigurasi Vite
└── wrangler.jsonc               # Konfigurasi Cloudflare
```

## 🚀 Menjalankan Secara Lokal

### Prasyarat

Pastikan perangkat sudah memiliki:

- [Node.js](https://nodejs.org/) versi 18 LTS, 20 LTS, atau versi lebih baru.
- npm, yang disertakan bersama instalasi Node.js.
- Akun [Cloudflare](https://dash.cloudflare.com/) jika ingin menggunakan D1 lokal melalui Wrangler.
- API key [TMDB](https://www.themoviedb.org/settings/api) jika ingin mengambil data film dan poster secara online.

### Langkah-langkah Instalasi

1. **Clone repository**

   ```bash
   git clone https://github.com/ussername237/Website-PRIVATEARCHIVESDIZAM-.git
   cd Website-PRIVATEARCHIVESDIZAM-
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Buat konfigurasi secret lokal**

   Salin `.dev.vars.example` menjadi `.dev.vars`:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   Isi `SESSION_SECRET` dan `REGISTRATION_SECRET` dengan nilai acak yang kuat (minimal 32 karakter).

4. **Konfigurasi API key film (opsional)**

   Salin `.env.example` menjadi `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Isi `VITE_TMDB_KEY` dengan API key TMDB. Jika digunakan, isi juga variabel OMDb sesuai kebutuhan.

5. **Jalankan development server**

   ```bash
   npm run dev
   ```

   Buka alamat lokal yang ditampilkan di terminal. Umumnya alamatnya adalah `http://localhost:5173`.

### Perintah yang Tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan Vite development server dan Worker runtime lokal |
| `npm run build` | Melakukan build frontend dan Worker untuk Cloudflare |
| `npm run preview` | Meninjau hasil build secara lokal |
| `npm run db:create` | Membuat database D1 di akun Cloudflare |
| `npm run db:migrate:local` | Menjalankan migrasi pada database D1 lokal |
| `npm run db:migrate:remote` | Menjalankan migrasi pada database D1 production |
| `npm run deploy` | Memeriksa konfigurasi, melakukan build, dan deploy ke Cloudflare |
| `npm run build:cpanel` | Membuat paket build untuk hosting cPanel (PHP dan SQLite) |

## ⚙️ Konfigurasi Environment

### Variabel Frontend (`.env.local`)

Variabel yang diawali `VITE_` akan disertakan ke dalam bundel frontend. Jangan menaruh secret server di variabel frontend.

| Variabel | Keterangan | Kebutuhan |
|---|---|---|
| `VITE_TMDB_KEY` | API key The Movie Database | Diperlukan untuk data film dan poster online |
| `VITE_OMDB_KEY` | API key OMDb utama | Opsional |
| `VITE_OMDB_KEY_2` | API key OMDb kedua sebagai cadangan kuota | Opsional |

### Secret Worker Lokal (`.dev.vars`)

File `.dev.vars` digunakan secara lokal ketika menjalankan `npm run dev`.

| Variabel | Keterangan |
|---|---|
| `SESSION_SECRET` | String acak minimal 32 karakter untuk penandatanganan token sesi cookie |
| `REGISTRATION_SECRET` | Kode rahasia untuk mengotorisasi pendaftaran akun baru |

> ⚠️ **Penting:** Jangan pernah mengunggah file `.dev.vars` atau `.env.local` yang berisi nilai rahasia ke repository publik. Unggah hanya file contoh seperti `.dev.vars.example` dan `.env.example`.

### Secret Cloudflare Production

Tambahkan secret ke Cloudflare Worker menggunakan perintah berikut. Jalankan satu per satu dan masukkan nilai rahasia saat diminta:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put REGISTRATION_SECRET
```

Gunakan nilai acak yang kuat dan jangan membagikannya kepada siapa pun.

## ☁️ Panduan Deploy

### Deploy ke Cloudflare Workers & D1

Aplikasi ini dirancang untuk berjalan menggunakan Cloudflare Workers dan Cloudflare D1.

1. **Login ke Cloudflare**

   ```bash
   npx wrangler login
   ```

2. **Buat database D1**

   ```bash
   npm run db:create
   ```

   Berdasarkan konfigurasi proyek, perintah ini membuat database D1 `privatearchivesdizam-auth` dan mencatat ID database ke `wrangler.jsonc`.

3. **Jalankan migrasi database production**

   ```bash
   npm run db:migrate:remote
   ```

4. **Tambahkan secret production**

   ```bash
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put REGISTRATION_SECRET
   ```

5. **Deploy aplikasi**

   ```bash
   npm run deploy
   ```

   Wrangler akan menjalankan proses build dan deployment sesuai konfigurasi proyek. Setelah selesai, terminal akan menampilkan alamat deployment.

6. **Buat akun pertama**

   Buka halaman `/login`, pilih **Buat akun**, masukkan `REGISTRATION_SECRET`, lalu daftarkan email dan kata sandi.

### Alternatif: Deploy ke Web Hosting cPanel

Jika ingin menggunakan hosting tradisional dengan cPanel (Apache/Nginx dan PHP):

1. Jalankan build khusus cPanel:

   ```bash
   npm run build:cpanel
   ```

2. Salin isi folder hasil build ke direktori `public_html` melalui cPanel.
3. Pastikan ekstensi PHP SQLite (`pdo_sqlite`) aktif pada server hosting.

## 🙌 Kredit dan Sumber Daya

- **Desain dan kurasi:** Dizam — *Curated by Dizam — LAZIR LAZIAF DIZAM.*
- **Penyedia data film:** [The Movie Database (TMDB)](https://www.themoviedb.org/) dan [OMDb API](https://www.omdbapi.com/).
- **Ikon dan tipografi:** SVG kustom dan [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans).
- **Infrastruktur cloud:** [Cloudflare Workers](https://workers.cloudflare.com/) dan [Cloudflare D1](https://developers.cloudflare.com/d1/).

## 📄 Lisensi

Proyek ini dirilis di bawah [MIT License](LICENSE).

Hak cipta metadata, sinopsis, dan poster film merupakan hak milik studio, pembuat film, dan kontributor terkait, termasuk TMDB dan OMDb.

## 📬 Kontak

Untuk pertanyaan, saran, atau kolaborasi terkait proyek ini:

- **Website:** [PrivateArchivesDizam](https://privatearchivesdizam.rizalmazid1.workers.dev/dashboard)
- **Email:** [rizalmazid1@gmail.com](mailto:rizalmazid1@gmail.com)
- **GitHub:** [ussername237](https://github.com/ussername237)

---

<p align="center">
  <strong>Made with ❤️ by Dizam</strong>
</p>
