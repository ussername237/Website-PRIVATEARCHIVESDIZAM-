# Hosting PrivateArchivesDizam di Cloudflare

Gunakan **Cloudflare Workers** (bukan static-only Pages): aplikasi ini memakai
Worker untuk API login/logout dan sinkronisasi koleksi, dengan D1 untuk akun,
pembatasan percobaan login, dan daftar film setiap pengguna.

## Langkah deploy pertama

1. Pasang Node.js versi LTS, buka terminal di folder proyek, lalu jalankan:

   ```sh
   npm install
   npx wrangler login
   ```

   Login ke akun Cloudflare yang akan dipakai.

2. Buat database D1. Perintah ini menulis ID database ke `wrangler.jsonc`:

   ```sh
   npm run db:create
   ```

3. Terapkan semua migrasi database di Cloudflare:

   ```sh
   npm run db:migrate:remote
   ```

4. Buat dua secret berbeda, masing-masing minimal 32 karakter. Buat nilainya
   secara lokal dengan perintah ini (jalankan dua kali):

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

   Daftarkan ke Worker satu per satu. Wrangler akan meminta nilainya secara
   interaktif:

   ```sh
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put REGISTRATION_SECRET
   ```

   Jangan masukkan secret ke `VITE_` variable, source code, atau chat. Simpan
   `REGISTRATION_SECRET` untuk pembuatan akun pertama.

5. Deploy aplikasi dan API:

   ```sh
   npm run deploy
   ```

   Perintah akan memeriksa ID D1, membangun frontend, membersihkan file secret
   lokal dari hasil build, lalu deploy Worker dan asset statis. Buka URL
   `*.workers.dev` yang ditampilkan Wrangler dan masuk ke `/login`.

6. Pilih **Buat akun**, masukkan `REGISTRATION_SECRET`, lalu buat akun.
   Untuk domain sendiri, tambahkan domain dari pengaturan Worker di dashboard
   Cloudflare setelah deploy.

## Deploy berikutnya

Setelah perubahan kode:

```sh
npm run deploy
```

Jangan jalankan `npm run db:create` lagi untuk deploy berikutnya. Jika ada file
migrasi database baru, jalankan `npm run db:migrate:remote` sebelum deploy.

## Menjalankan lokal

```sh
Copy-Item .dev.vars.example .dev.vars
```

Isi `.dev.vars` dengan dua secret lokal yang terpisah dari secret produksi,
kemudian jalankan:

```sh
npm run dev
```

Biarkan proses ini tetap berjalan saat membuka situs lokal. Jika server
berhenti, permintaan API login/logout akan gagal. `.dev.vars` bersifat rahasia
dan tidak boleh diunggah atau dikomit.

## Opsional: API film

TMDB/OMDb key dapat dimasukkan ke `.env.local` sebelum build. Key `VITE_`
ditanam di frontend dan dapat dilihat pengunjung, jadi jangan taruh password
atau secret autentikasi di sana.
OMDb dapat menggunakan `VITE_OMDB_KEY` sebagai kunci utama dan
`VITE_OMDB_KEY_2` sebagai cadangan otomatis saat kunci utama ditolak atau
mencapai limit. Pencarian OMDb mencakup film dan series.

## Catatan data

Akun, percobaan login, dan koleksi film disimpan di D1. `localStorage` hanya
menjadi cache per browser. Saat pertama kali masuk setelah fitur sinkronisasi
aktif, koleksi lama di browser akan digabungkan ke akun; masuk dengan akun yang
sama di perangkat lain akan memuat koleksi tersebut. Jangan hapus data browser
lama sampai status koleksi menunjukkan **Tersimpan**.
