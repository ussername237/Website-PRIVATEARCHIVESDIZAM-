# PrivateArchivesDizam — Website Penyimpanan Film Pribadi

![Status](https://img.shields.io/badge/status-aktif-brightgreen?style=flat-square)
![Lisensi](https://img.shields.io/badge/lisensi-MIT-blue?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white&style=flat-square)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white&style=flat-square)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_%26_D1-f38020?logo=cloudflare&logoColor=white&style=flat-square)

Website aplikasi penyimpanan film pribadi (*personal movie vault & archive*) yang dirancang eksklusif untuk mendokumentasikan, mengelola, menilai, dan mengelompokkan koleksi film, daftar tontonan (*watchlist*), serta film favorit kamu.

*Curated by Dizam — LAZIR LAZIAF DIZAM.*

---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Folder](#struktur-folder)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
  - [Prasyarat](#prasyarat)
  - [Langkah-langkah Instalasi](#langkah-langkah-instalasi)
  - [Perintah yang Tersedia](#perintah-yang-tersedia)
- [Konfigurasi Lingkungan (Environment Variables)](#konfigurasi-lingkungan-environment-variables)
  - [Variabel Frontend (`.env.local`)](#variabel-frontend-envlocal)
  - [Secret Worker Lokal (`.dev.vars`)](#secret-worker-lokal-devvars)
  - [Secret Cloudflare Production](#secret-cloudflare-production)
- [Panduan Deploy](#panduan-deploy)
  - [Deploy ke Cloudflare Workers & D1](#deploy-ke-cloudflare-workers--d1)
  - [Alternatif: Deploy ke Web Hosting cPanel](#alternatif-deploy-ke-web-hosting-cpanel)
- [Kredit & Sumber Daya](#kredit--sumber-daya)
- [Lisensi](#lisensi)
- [Kontak](#kontak)

---

## Tentang Proyek

**PrivateArchivesDizam** adalah aplikasi web modern tempat kamu dapat menyimpan arsip film pribadi tanpa bergantung pada platform sosial pihak ketiga. Dilengkapi integrasi database film internasional (The Movie Database / TMDB dan OMDb), website ini secara otomatis menyajikan metadata film lengkap seperti poster berkualitas tinggi, tahun rilis, sinopsis resmi multi-bahasa, daftar pemeran (*cast*), dan cuplikan trailer YouTube resmi.

Aplikasi ini menggunakan arsitektur **Hybrid Storage**: data disimpan secara lokal (*offline-first* di browser via LocalStorage) dan disinkronkan secara aman ke server Cloudflare D1 Database sehingga koleksi film kamu tetap aman dan dapat diakses dari perangkat mana pun.

---

## Fitur Utama

- **🔐 Autentikasi Eksklusif & Aman:**
  - Registrasi terkunci dengan kode rahasia (`REGISTRATION_SECRET`) agar website tetap privat dan hanya dapat didaftarkan oleh pemilik atau orang yang diizinkan.
  - Sesi login aman berbasis Cookie `HttpOnly` dengan enkripsi HMAC SHA-256 dan perlindungan terhadap *brute-force login*.
- **🎬 Dashboard Koleksi Interaktif:**
  - **Spotlight 3D Carousel:** Banner interaktif dengan kartu film 3D yang bisa digeser (*drag & snap*) dan tombol putar acak (*dice roll*) untuk rekomendasi tontonan.
  - **Statistik Tontonan Lengkap:** Penghitung total film, sudah ditonton (*watched*), belum ditonton (*watchlist*), favorit, serta persentase progres tontonan.
  - **Filter & Sorting Fleksibel:** Filter film berdasarkan status tontonan, favorit, genre, atau urutkan berdasarkan judul (A-Z/Z-A) dan tahun rilis.
  - **Pencarian Realtime:** Pencarian instan berdasarkan judul film, tahun, genre, atau catatan pribadi.
- **↩️ Fitur Undo Notifikasi 4 Detik (Anti Salah Hapus):**
  - Ketika kamu menghapus film dari koleksi atau dari daftar favorit, muncul notifikasi mengambang dengan hitungan mundur **4 detik** dinamis dan *progress bar* animasi.
  - Cukup klik tombol **"Urungkan"** untuk mengembalikan film yang terhapus ke posisi urutan asalnya secara instan.
- **⭐ Manajemen Favorit & Watchlist:**
  - Tandai film favorit dengan satu klik bintang.
  - Berikan rating pribadi (*personal rating*) dengan slider halus dari skor 1 hingga 10.
  - Tambahkan catatan pribadi (*personal notes*) untuk menulis kesan atau pengingat tentang film tersebut.
- **🔍 Eksplorasi & Tambah Film Online (`/explore`):**
  - Jelajahi film-film terbaru dan trending.
  - Pencarian online langsung via TMDB API & OMDb API dengan paginasi (*load more*).
  - Tambahkan film langsung ke koleksi hanya dengan satu klik.
- **📑 Detail Lengkap Film (`/movie/:id`):**
  - Sinopsis resmi dengan pilihan bahasa (Indonesia, Inggris, Spanyol).
  - Profil pemeran (*cast*) lengkap dengan foto karakter dan tautan profil/Instagram.
  - Cuplikan video trailer resmi langsung dari YouTube.
  - Durasi penayangan (*runtime*) dan tanggal rilis resmi.
- **📂 Pengelompokan Otomatis per Genre (`/genres` & `/favorites`):**
  - Halaman khusus yang mengelompokkan koleksi film berdasarkan genre (Action, Drama, Sci-Fi, Horror, Animation, dsb.) dengan memori posisi scroll.
- **📱 Desain Modern & Responsif:**
  - Tampilan bertema gelap (*dark mode*) mewah dengan palet *Deep Navy*, *Panel Blue*, *Coral Wine*, dan *Warm Sand*.
  - Dilengkapi *Bottom Navigation Bar* yang nyaman dan ergonomis untuk penggunaan di ponsel pintar.

---

## Teknologi yang Digunakan

### Frontend
- **Framework:** [React 19](https://react.dev/) + [React DOM 19](https://react.dev/)
- **Build Tool:** [Vite 8](https://vitejs.dev/)
- **Routing:** [React Router DOM v7](https://reactrouter.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) dengan `@tailwindcss/vite`
- **Tipografi:** Google Fonts *Plus Jakarta Sans* & sistem font modern

### Backend & Database (Cloudflare Serverless)
- **Runtime API:** [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless SQL Database)
- **Deployment Tool:** [Wrangler CLI v4](https://developers.cloudflare.com/workers/wrangler/)

### Sumber Data Eksternal
- **[TMDB API](https://www.themoviedb.org/settings/api)** — Poster, metadata film, sinopsis multi-bahasa, pemeran, dan trailer.
- **[OMDb API](https://www.omdbapi.com/)** — Data alternatif dan pencarian film cadangan.

---

## Struktur Folder

```text
movie-vault/
├── migrations/               # Skrip migrasi database SQL (D1 Database)
│   ├── 0001_initial.sql
│   └── 0002_user_collections.sql
├── public/                   # Aset publik statis
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── logo-512x512.png
│   ├── logo-social.png
│   ├── site.webmanifest
│   └── _headers              # Pengaturan security headers & caching Cloudflare
├── scripts/                  # Skrip utilitas deployment & pembersihan rahasia
│   ├── check-deploy-config.js
│   └── clean-build-secrets.js
├── src/                      # Kode sumber aplikasi React
│   ├── components/           # Komponen UI reusable
│   │   ├── AppNavigation.jsx # Navigasi atas dan bawah (mobile bottom nav)
│   │   ├── ArrowIcon.jsx     # Komponen ikon panah SVG
│   │   ├── MovieCarousel.jsx # Komponen carousel spotlight film
│   │   └── UndoToast.jsx     # Notifikasi floating Undo 4 detik
│   ├── lib/                  # Logika aplikasi, API, & autentikasi
│   │   ├── auth.js           # Fungsi autentikasi & sesi pengguna
│   │   ├── fetchJson.js      # Wrapper HTTP fetch dengan penanganan error
│   │   ├── genres.js         # Pengelompokan dan pemetaan slug genre
│   │   └── movies.js         # Manajemen koleksi & integrasi TMDB/OMDb
│   ├── pages/                # Halaman aplikasi
│   │   ├── Dashboard.jsx     # Dashboard koleksi film & manajemen tontonan
│   │   ├── Explore.jsx       # Halaman pencarian & jelajah film online
│   │   ├── Favorites.jsx     # Halaman film yang difavoritkan per genre
│   │   ├── GenreCollection.jsx # Halaman daftar genre & koleksi per genre
│   │   ├── Landing.jsx       # Halaman beranda minimalis
│   │   ├── Login.jsx         # Halaman login & pendaftaran akun
│   │   └── MovieDetails.jsx  # Halaman detail sinopsis, cast, & trailer film
│   ├── App.jsx               # Router utama & proteksi rute (RequireAuth)
│   ├── index.css             # Desain global Tailwind v4 & keyframes animasi
│   ├── main.jsx              # Titik masuk utama React DOM
│   └── site.css              # Gaya tambahan landing page & tema Dizam
├── worker/                   # Kode Worker API Cloudflare (Backend Serverless)
│   └── index.js              # Endpoint login, sesi, registrasi, & koleksi
├── .dev.vars.example         # Contoh secret lokal untuk Cloudflare Worker
├── .env.example              # Contoh API key TMDB dan OMDb
├── AUTH_SETUP.md             # Panduan rinci pengaturan autentikasi Cloudflare
├── package.json              # Daftar dependensi & script proyek
├── vite.config.js            # Konfigurasi bundler Vite + Cloudflare Plugin
└── wrangler.jsonc            # Konfigurasi deployment Cloudflare Workers & D1
```

---

## Menjalankan Secara Lokal

### Prasyarat

Pastikan perangkat kamu sudah terpasang:
- **[Node.js](https://nodejs.org)** (versi 18 LTS atau 20 LTS atau lebih baru)
- **npm** (bawaan dari instalasi Node.js)
- Akun gratis di **[Cloudflare](https://dash.cloudflare.com/)** (opsional untuk D1 lokal via Wrangler)
- API Key gratis dari **[TMDB](https://www.themoviedb.org/settings/api)** (opsional untuk data poster dan film)

### Langkah-langkah Instalasi

1. **Clone repositori:**
   ```bash
   git clone https://github.com/username/movie-vault.git
   cd movie-vault
   ```

2. **Pasang dependensi:**
   ```bash
   npm install
   ```

3. **Buat file konfigurasi rahasia lokal:**
   Salin `.dev.vars.example` menjadi `.dev.vars`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   Isi nilai rahasia acak (minimal 32 karakter) untuk `SESSION_SECRET` dan `REGISTRATION_SECRET`.

4. **Konfigurasi API Key Film (Opsional):**
   Salin `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Masukkan API key TMDB kamu di baris `VITE_TMDB_KEY`.

5. **Jalankan server pengembangan (Development):**
   ```bash
   npm run dev
   ```
   Buka URL lokal yang muncul di terminal (biasanya `http://localhost:5173`) pada browser kamu.

---

### Perintah yang Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan Vite dev server beserta Worker runtime lokal |
| `npm run build` | Melakukan build frontend dan Worker untuk Cloudflare |
| `npm run preview` | Meninjau hasil build lokal di browser sebelum deploy |
| `npm run db:create` | Membuat D1 database baru di akun Cloudflare |
| `npm run db:migrate:local` | Menerapkan migrasi database ke SQLite D1 lokal |
| `npm run db:migrate:remote`| Menerapkan migrasi database ke Cloudflare D1 production |
| `npm run deploy` | Menjalankan pengecekan konfigurasi, build, dan deploy ke Cloudflare |
| `npm run build:cpanel` | Membuat paket build khusus untuk hosting cPanel (PHP + SQLite) |

---

## Konfigurasi Lingkungan (Environment Variables)

### Variabel Frontend (`.env.local`)

Variabel yang diawali `VITE_` akan disertakan ke dalam bundel frontend:

| Variabel | Deskripsi | Diperlukan? |
| :--- | :--- | :---: |
| `VITE_TMDB_KEY` | API Key dari The Movie Database (v3 auth) | Ya (untuk data film & poster online) |
| `VITE_OMDB_KEY` | API Key utama dari OMDb API | Opsional (cadangan pencarian) |
| `VITE_OMDB_KEY_2` | API Key kedua dari OMDb API (fallback kuota limit) | Opsional |

### Secret Worker Lokal (`.dev.vars`)

File ini hanya dipakai di komputer kamu saat menjalankan `npm run dev`:

| Variabel | Deskripsi |
| :--- | :--- |
| `SESSION_SECRET` | String acak minimal 32 karakter untuk enkripsi token sesi cookie |
| `REGISTRATION_SECRET` | Kunci otorisasi rahasia untuk pendaftaran akun baru |

> ⚠️ **Penting:** Jangan pernah mengunggah file `.dev.vars` atau `.env.local` ke repositori publik Git!

---

## Panduan Deploy

### Deploy ke Cloudflare Workers & D1

Aplikasi ini dirancang untuk berjalan di atas **Cloudflare Workers** dengan database **Cloudflare D1**:

1. **Login ke Cloudflare CLI:**
   ```bash
   npx wrangler login
   ```

2. **Buat database Cloudflare D1:**
   ```bash
   npm run db:create
   ```
   Perintah ini akan membuat database D1 `privatearchivesdizam-auth` dan mencatat ID-nya otomatis ke `wrangler.jsonc`.

3. **Jalankan migrasi database di Cloudflare:**
   ```bash
   npm run db:migrate:remote
   ```

4. **Daftarkan Secret Produksi ke Cloudflare Worker:**
   Jalankan perintah ini satu per satu dan masukkan string acak minimal 32 karakter saat diminta:
   ```bash
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put REGISTRATION_SECRET
   ```

5. **Deploy aplikasi:**
   ```bash
   npm run deploy
   ```
   Wrangler akan mengompilasi kode frontend, membersihkan secret lokal, mengunggah aset ke Cloudflare, dan memberikan tautan domain publik (`*.workers.dev`).

6. **Buat Akun Pertama:**
   Buka halaman `/login`, pilih menu **Buat akun**, masukkan `REGISTRATION_SECRET` yang telah kamu buat, lalu daftarkan email dan kata sandi kamu.

---

### Alternatif: Deploy ke Web Hosting cPanel

Jika kamu ingin meng-hosting website ini di web hosting tradisional (cPanel Apache/Nginx + PHP):

1. Jalankan build cPanel:
   ```bash
   npm run build:cpanel
   ```
2. Salin isi folder hasil build ke direktori `public_html` di cPanel kamu.
3. Pastikan modul PHP SQLite (`pdo_sqlite`) aktif pada server hosting.

---

## Kredit & Sumber Daya

- **Desain & Kurasi:** Dizam (*Curated by Dizam — LAZIR LAZIAF DIZAM*)
- **Penyedia Data Film:** [The Movie Database (TMDB)](https://www.themoviedb.org/) & [OMDb API](https://www.omdbapi.com/)
- **Ikon & Tipografi:** SVG kustom terintegrasi & [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
- **Infrastruktur Cloud:** [Cloudflare Workers](https://workers.cloudflare.com/) & [Cloudflare D1](https://developers.cloudflare.com/d1/)

---

## Lisensi

Proyek ini dirilis di bawah lisensi **[MIT License](LICENSE)**.

Hak cipta metadata, sinopsis, dan poster film merupakan hak milik dari masing-masing studio, pembuat film, dan kontributor TMDB / OMDb.

---

## Kontak

Untuk pertanyaan, saran, atau kolaborasi seputar proyek ini:

- 🌐 **Website:** [PrivateArchivesDizam](https://privatearchivesdizam.workers.dev)
- 📧 **Email:** [kontak@dizam.my.id](mailto:kontak@dizam.my.id)
- 🐙 **GitHub:** [@dizam](https://github.com/)
#   W e b s i t e - P R I V A T E A R C H I V E S D I Z A M -  
 