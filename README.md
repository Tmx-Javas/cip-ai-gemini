# CIP - AI (JAVAS · VortexCipher)

Website chat AI dengan Next.js, endpoint proxy, pilihan Gemini 2.5 Flash/Pro, tema dan warna yang bisa diatur, riwayat chat browser, status “Berpikir…”, pencarian grounding (jika API mendukung), dan ekstraksi teks dari PDF/DOCX/TXT/MD/CSV.

## Menjalankan lokal

Butuh Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke GitHub lalu Vercel

1. Buat repository GitHub bernama `cip-ai`.
2. Upload seluruh isi folder proyek ini (termasuk `app/`, `package.json`, `next.config.mjs`, dan `tsconfig.json`) ke root repository. Jangan upload `node_modules`.
3. Login ke Vercel, pilih **Add New → Project**, impor repository GitHub.
4. Framework Preset: **Next.js**. Build command: `npm run build`.
5. (Opsional) di Settings → Environment Variables, tambahkan `GEMINI_PROXY_URL` dengan nilai `https://api.iroha-api.web.id/v1/gemini/s`.
6. Klik Deploy. Uji chat setelah deployment selesai.

## Batasan penting API pihak ketiga

- Endpoint berdasarkan dokumentasi pengguna: `POST /v1/gemini/s` dengan `prompt`, `model`, `messages`, `search`, dan `image`.
- API harus mengembalikan JSON dengan `data.result` dan idealnya `data.messages`. Format respons berbeda akan menghasilkan pesan error yang jelas.
- API hanya mendokumentasikan `image` sebagai URL gambar yang dapat diakses publik. Lampiran gambar lokal ditampilkan namanya, tetapi tidak bisa dianalisis oleh endpoint ini tanpa URL publik. Jangan berpura-pura file lokal sudah dianalisis. Untuk dukungan gambar upload langsung, gunakan layanan penyimpanan gambar dengan API key di server atau backend AI yang menerima file.
- PDF/DOCX/TXT/MD/CSV diproses untuk mengambil teks, lalu teks disertakan di prompt (maks. 18.000 karakter). PDF hasil scan memerlukan OCR, yang belum disertakan.
- “Mengingat” di versi ini berarti konteks percakapan aktif melalui `messages` dari API serta riwayat lokal di browser. Tidak ada memori akun lintas perangkat atau database cloud.
- Fitur Search mengirim `search: true`; efektivitasnya bergantung pada dukungan endpoint.
- Endpoint adalah layanan pihak ketiga; ketersediaan dan kebijakan privasinya bukan kendali aplikasi ini. Hindari mengirim rahasia atau dokumen sensitif.

## Logo

URL logo VortexCipher yang diberikan disimpan di `app/page.tsx`. Jika host gambar memblokir hotlink atau URL tidak tersedia, fallback huruf “V” muncul. Untuk hasil stabil, salin gambar logo ke folder `public/` dan ubah `LOGO` ke `/vortexcipher-logo.jpg`.
