# Hadirku Lecarassa — Mobile App

Frontend mobile terpisah untuk aplikasi absensi Hadirku Lecarassa.
Dibangun dengan **Vite + React 19 + TypeScript + Tailwind CSS 4 + Capacitor 8**.

Backend tetap memakai aplikasi Next.js di folder `../ngodingpakeai-starter`:

- API: `/api/*`
- Auth: Better Auth (cookie untuk web, **bearer token** untuk mobile)
- Database: PostgreSQL/Neon
- File: PostgreSQL `stored_files`
- UI web admin tetap berjalan seperti biasa

Backend production: **https://absensi-karyawan-gray.vercel.app**

## Status

Sudah tersedia:

- Login, registrasi, halaman pending verifikasi.
- Session bearer token dengan penyimpanan aman (Keychain iOS / KeyStore Android).
- Beranda absensi: kamera native + fallback web, GPS, watermark, check-in/check-out.
- Riwayat absensi + foto absensi terautentikasi.
- Jadwal shift.
- Pengajuan izin, sakit, cuti, dan tukar shift: buat, lihat, batalkan, lampiran.
- Klaim makan + riwayat klaim.
- Daftar training.
- Notifikasi in-app.
- Profil + ubah data pribadi + jatah cuti.
- Shell navigasi mobile (drawer + bottom nav, safe area, dark mode).
- Dashboard admin/HOD dengan ringkasan kehadiran dan pengajuan menunggu.
- Persetujuan izin/cuti/tukar shift dengan catatan keputusan.
- Laporan kehadiran + export CSV/Excel/PDF dan detail foto harian.
- Data karyawan, verifikasi akun, dokumen, dan data gaji untuk HRD/Admin.
- Rekap klaim makan dan daftar belum klaim.
- Jadwal/attendant, training admin, departemen, jabatan, lokasi & radius.
- Pengaturan perusahaan, aturan absensi, dan kebijakan penggajian.
- Penggajian: hitung periode, rincian & penyesuaian gaji, finalisasi,
  pembayaran, export, gaji harian, dan riwayat pembayaran.

APK debug dan AAB/APK release (versi 1.2) sudah dibuild dengan API Vercel
HTTPS. Layar admin dimuat sebagai chunk terpisah agar startup karyawan tetap
ringan. Modul yang belum dibangun di mobile: push notification dan verifikasi
wajah. Panduan signing/upload ada di
`../ngodingpakeai-starter/docs/mobile-release-signing.md`.

## Prasyarat

- Node.js 22+
- Android Studio 2025.2.1+ (sudah terpasang)
- Android SDK API 36 + build-tools 36.0.0 (sudah terpasang)
- JDK 21 untuk Gradle: `C:\Users\user\orca\tools\jdk-21`
- macOS + Xcode 26 untuk iOS

## Environment

Untuk pengembangan browser di mesin ini, buat `.env.local`:

```dotenv
VITE_API_URL=http://localhost:3000
```

Untuk build production, buat `.env.production` (diabaikan Git):

```dotenv
VITE_API_URL=https://absensi-karyawan-gray.vercel.app
```

Catatan:

- `.env.production` menimpa `.env.local` saat `npm run build`.
- `VITE_API_URL` ditanam saat build. Ganti nilainya lalu build ulang untuk
  mengarah ke API lain.
- Build release wajib HTTPS. `capacitor.config.ts` menonaktifkan cleartext dan
  mixed content.
- Untuk menguji di HP fisik dengan server lokal, gunakan HTTPS tunnel
  (misalnya Cloudflare Tunnel), bukan HTTP LAN.

## Menjalankan

Terminal 1 — backend:

```sh
cd ../ngodingpakeai-starter
npm run dev
```

Terminal 2 — mobile UI:

```sh
npm run dev
```

Buka `http://localhost:5173`.

Backend Next.js mengizinkan origin `http://localhost:5173` hanya saat
`NODE_ENV !== "production"` (lihat `src/proxy.ts` di backend).

## Build

```sh
npm run build
npx cap sync
```

Build production memakai `.env.production`. Hasil APK debug:
`android/app/build/outputs/apk/debug/app-debug.apk`.

Android:

```sh
npx cap add android     # sekali saja
npx cap sync android
npx cap open android
```

iOS (di macOS):

```sh
npx cap add ios         # sekali saja
npx cap sync ios
npx cap open ios
```

## Arsitektur auth mobile

1. `POST /api/auth/sign-in/email` dari aplikasi mobile.
2. Better Auth mengembalikan header `set-auth-token`.
3. Token disimpan di secure storage perangkat.
4. Setiap request API mengirim `Authorization: Bearer <token>`.
5. Backend memakai plugin `bearer()` Better Auth; session tetap dicek di server.
6. `401` otomatis menghapus token lokal dan kembali ke halaman login.

Tidak ada cookie lintas origin, tidak ada token di URL, dan tidak ada API key
rahasia di aplikasi.

## Catatan keamanan

- Jangan aktifkan `allowMixedContent` atau `cleartext` untuk release.
- Jangan menaruh service role/database URL/API key di aplikasi mobile.
- Token disimpan di Keychain/KeyStore, bukan localStorage (kecuali saat
  pengembangan browser).
- Halaman web eksternal dibuka lewat browser sistem, bukan di dalam WebView.

## Troubleshooting

- **CORS error di browser:** pastikan backend berjalan dan origin
  `http://localhost:5173` atau `http://127.0.0.1:5173` diizinkan (mode
  development).
- **Login menggantung di Windows:** jika `localhost` tidak bisa dihubungi,
  ganti `VITE_API_URL` menjadi `http://127.0.0.1:3000` lalu restart Vite.
- **401 setelah login:** periksa `VITE_API_URL` dan pastikan backend memakai
  plugin `bearer()`.
- **Kamera tidak terbuka di emulator:** emulator perlu kamera virtual
  (Settings → Camera → VirtualScene) atau gunakan HP fisik.
- **GPS tidak akurat di emulator:** set lokasi emulator lewat Extended Controls.
- **Build Android gagal:** pastikan `JAVA_HOME` mengarah ke JBR Android Studio
  dan Android SDK sudah terpasang.
