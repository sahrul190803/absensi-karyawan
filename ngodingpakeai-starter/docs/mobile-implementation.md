# Implementasi Mobile — Hadirku Lecarassa

Tanggal: 17 November 2026  
Branch: `mobile/opsi-b`  
Strategi: **Opsi B — frontend mobile terpisah + Capacitor**  
Status: fondasi, modul karyawan, seluruh modul admin/HOD, dan backend production selesai.

---

## 1. Hasil yang Sudah Ada

### Aplikasi mobile

Lokasi: `mobile-app/`

Stack:

- Vite 8 + React 19.2.8 + TypeScript 5.9.3
- Tailwind CSS 4
- React Router 7 (HashRouter)
- TanStack Query
- Capacitor 8.6.2
- Secure storage: `@aparajita/capacitor-secure-storage`

Layar karyawan:

- Login, registrasi, pending verifikasi.
- Beranda absensi: kamera native + fallback web, GPS, watermark, check-in/check-out.
- Riwayat absensi + foto absensi terautentikasi.
- Jadwal shift.
- Pengajuan izin/sakit/cuti/tukar shift: buat, lihat, batalkan, lampiran.
- Klaim makan + riwayat.
- Daftar training.
- Notifikasi in-app: tandai dibaca, hapus.
- Profil: data kepegawaian, kontak, rekening, jatah cuti, ubah data pribadi, logout.

Layar admin:

- Shell navigasi admin/HOD.
- Dashboard dengan ringkasan kehadiran hari ini, pengajuan menunggu, absensi terbaru, dan kartu modul.
- Persetujuan: filter status, setujui/tolak dengan catatan, buka lampiran.
- Laporan: rekap harian/bulanan/tahunan, detail kehadiran + foto, export CSV/XLS/PDF.
- Data karyawan: cari/filter, detail kepegawaian, verifikasi akun, foto profil/KTP, data gaji untuk HRD/Admin.
- Klaim makan: rekap per sesi, daftar belum klaim, hapus klaim (HRD/Admin).
- Attendant: jadwal per rentang tanggal, buat/ubah jadwal, hapus jadwal.
- Training: buat training, pilih peserta, hapus training.
- Master data: departemen (termasuk kepala divisi), jabatan, lokasi & radius (termasuk ambil koordinat GPS).
- Pengaturan: profil perusahaan, aturan absensi, potongan penggajian, kebijakan verifikasi wajah.
- Penggajian: hitung periode bulanan, rincian gaji per karyawan, penyesuaian, finalisasi, pembayaran, export, gaji harian, dan riwayat pembayaran.
- Notifikasi admin memakai layar notifikasi yang sama.
- Layar admin dimuat sebagai chunk terpisah (lazy) agar startup aplikasi karyawan tetap ringan.

### Backend

Perubahan minimal, tanpa mengubah schema database:

- `src/lib/auth.ts`: plugin `bearer()` Better Auth untuk mobile.
- `src/lib/mobile-origins.ts`: origin Android/iOS dan Vite dev.
- `src/lib/origins.ts`: trusted origins mobile + dev (hanya non-production).
- `src/lib/api.ts`: bearer request tidak memakai CSRF origin check; cookie web tetap memakai.
- `src/proxy.ts`: CORS + preflight untuk `/api/*`.

### Produksi

Backend sudah dideploy ke Vercel pada 17 November 2026:

- URL production: `https://absensi-karyawan-gray.vercel.app`
- Deployment terbaru: `dpl_5f1fUhLMhD4mTNya8eBM3BE5eijT`
- `BETTER_AUTH_URL` sudah menunjuk URL tersebut.
- Health check: **200**, database **up**.
- Preflight `OPTIONS` dari origin mobile `https://localhost`: **204**.
- Sign-in bearer dari origin mobile: **200** + header `set-auth-token`.
- `GET /api/attendance/today` dengan bearer: **200**; tanpa token: **401**.
- `GET /api/admin/requests` dan `/api/admin/reports/attendance` dengan bearer HRD: **200**.
- Origin web production dan deployment alias juga dipercaya.

Catatan: laporan bulanan sempat gagal (500) karena service memakai akhir bulan
`-31`; sudah diperbaiki memakai tanggal akhir bulan yang valid.

APK production sudah dibuild ulang dengan:

```dotenv
VITE_API_URL=https://absensi-karyawan-gray.vercel.app
```

### Native

- Android project: `mobile-app/android/`
- iOS project: `mobile-app/ios/`
- App ID: `id.lecarassa.hadirku`
- Nama: Hadirku Lecarassa
- Icon + splash: `mobile-app/resources/`, sudah digenerate ke Android/iOS.
- Izin Android: CAMERA, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, INTERNET.
- Izin iOS: kamera, galeri, lokasi saat digunakan.
- Cleartext/mixed content dimatikan untuk release.

---

## 2. Pengujian yang Dilakukan

### Backend

- `npx tsc --noEmit`: lulus.
- `npm run lint`: lulus.
- Build Vercel production: **berhasil**.
- Sign-in bearer dari origin `https://localhost`: **200**, `set-auth-token` ada, CORS headers benar.
- `GET /api/attendance/today` dengan bearer: **200**.
- Tanpa token: **401**.
- Preflight `OPTIONS` dari `https://localhost`: **204**.
- Preflight `OPTIONS` dari `capacitor://localhost`: **204** (diuji di lokal).

### Mobile UI

Diuji dengan Playwright (Chromium headless, viewport 390×844):

- Login karyawan dan HRD.
- Landing HRD ke `/admin`.
- Beranda, riwayat, jadwal, pengajuan, makan, training, notifikasi, profil.
- Tidak ada console error atau horizontal overflow pada halaman yang diuji.
- Form pengajuan + lampiran mengirim payload yang benar.
- Alur absensi dengan kamera palsu + GPS palsu:
  - Foto JPEG valid.
  - GPS dan akurasi terkirim.
  - Device key dan idempotency key terkirim.
  - POST check-in diuji dengan intercept (tidak membuat data absensi nyata).

### Admin/HOD UI

Diuji dengan Playwright (Chromium headless, viewport 390×844), login HRD dan HOD:

- Dashboard, persetujuan, laporan (rekap + harian), data karyawan, klaim makan,
  notifikasi, attendant, training, departemen, jabatan, lokasi, pengaturan, dan
  penggajian.
- Form persetujuan dibuka tanpa menyimpan keputusan nyata.
- Form jadwal, training, departemen, jabatan, lokasi, dan pengaturan diuji dengan
  intercept request tulis (tidak mengubah data produksi).
- Alur penggajian draft → final → bayar diuji dengan data mock dan intercept;
  tidak ada pembayaran nyata yang tercatat.
- Tab gaji harian dan riwayat pembayaran diuji dengan data produksi (baca saja).
- Pengambilan koordinat GPS untuk lokasi diuji di browser.
- HOD tidak melihat gaji pokok dan tidak bisa menghapus klaim makan.
- HOD diarahkan keluar dari halaman khusus HRD/Admin (pengaturan).
- Tidak ada console error, page error, request API gagal, atau horizontal
  overflow pada layar yang diuji.
- Screenshot: `ngodingpakeai-starter/screenshots/admin-batch1..3/` (lokal).

### Build

- `npm run build` mobile: **berhasil**, memakai URL production (tidak ada `localhost` di bundle).
- Bundle utama 417.52 kB (gzip 128.67 kB); 12 layar admin dimuat sebagai chunk terpisah.
- `npx cap sync`: **berhasil** untuk Android dan iOS.
- Android debug APK production: **berhasil**.
  - Path: `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`
  - Ukuran: 10.410.600 byte (±10.4 MB)
  - Dibangun: 17 November 2026 20:43
  - Package: `id.lecarassa.hadirku`
  - Version: **1.2 (versionCode 3)**
  - `VITE_API_URL`: `https://absensi-karyawan-gray.vercel.app`
- Android release: **berhasil**.
  - AAB: `mobile-app/android/app/build/outputs/bundle/release/app-release.aab`
  - APK: `mobile-app/android/app/build/outputs/apk/release/app-release.apk`
  - Ditandatangani dengan keystore release lokal.
  - Certificate SHA-256: `09:58:35:A5:EA:E2:A5:4D:14:90:E6:7C:A8:7F:04:32:D9:3B:C0:94:15:D0:9C:52:1F:0D:44:66:92:36:37:A0`
  - Panduan: `ngodingpakeai-starter/docs/mobile-release-signing.md`
- iOS: project berhasil digenerate dan disync, version 1.2 (build 3). Build
  unsigned berhasil di GitHub Actions macOS 26 (Xcode 26); IPA tersedia sebagai
  artifact/release unsigned. Belum ditandatangani untuk TestFlight/App Store.

---

## 3. Yang Belum Selesai / Blocker

### URL API production — selesai

Backend sudah dideploy ke `https://absensi-karyawan-gray.vercel.app`, dan APK
sudah dibuild ulang dengan URL tersebut. Blocker lama (`localhost` dan Vercel
belum login) tidak berlaku lagi.

### Build release

- Keystore release sudah dibuat dan disimpan lokal (tidak di-commit).
- AAB dan APK release sudah dibuild serta diverifikasi.
- Detail path, fingerprint, dan langkah upload ada di
  `docs/mobile-release-signing.md`.
- iOS signing/provisioning belum diatur. Build unsigned sudah tersedia lewat
  `.github/workflows/ios-build.yml`; untuk TestFlight/App Store tetap butuh
  Apple Developer Program dan signing di macOS/Xcode.

### Modul yang belum dibangun

- Push notification (butuh FCM/APNs + backend token).
- Face enrollment/verification di mobile (provider belum dikonfigurasi).

### Emulator

Emulator `Hadirku_API36` akhirnya berhasil boot setelah ±7 menit. Instalasi APK
dan pengujian interaktif di emulator belum tuntas karena sesi pengujian
terganggu resource mesin; APK production sudah tersedia untuk diuji di perangkat
fisik. Pengujian UI sebelumnya dilakukan dengan Playwright di viewport ponsel.

---

## 4. Struktur File Penting

| File | Fungsi |
|---|---|
| `mobile-app/src/lib/api.ts` | Base URL API, bearer token, error handling |
| `mobile-app/src/lib/auth.tsx` | Auth provider, sign-in/up/out, role |
| `mobile-app/src/lib/storage.ts` | Secure token storage + device key |
| `mobile-app/src/lib/camera.ts` | Kamera native |
| `mobile-app/src/lib/geolocation.ts` | GPS native + fallback web |
| `mobile-app/src/lib/watermark.ts` | Watermark foto absensi |
| `mobile-app/src/lib/files.ts` | Unduh lampiran + share native |
| `mobile-app/src/components/AppShell.tsx` | Header, drawer, bottom nav |
| `mobile-app/src/screens/Home.tsx` | Absensi |
| `mobile-app/src/screens/Requests.tsx` | Izin/cuti |
| `mobile-app/src/screens/Meals.tsx` | Klaim makan |
| `mobile-app/src/screens/Training.tsx` | Training |
| `mobile-app/src/screens/AdminDashboard.tsx` | Dashboard admin/HOD |
| `mobile-app/src/screens/AdminRequests.tsx` | Persetujuan pengajuan |
| `mobile-app/src/screens/AdminReports.tsx` | Laporan + export |
| `mobile-app/src/screens/AdminEmployees.tsx` | Data karyawan + verifikasi |
| `mobile-app/src/screens/AdminMeals.tsx` | Rekap klaim makan |
| `mobile-app/src/screens/AdminSchedule.tsx` | Jadwal/attendant |
| `mobile-app/src/screens/AdminTraining.tsx` | Training admin |
| `mobile-app/src/screens/AdminDepartments.tsx` | Master departemen |
| `mobile-app/src/screens/AdminPositions.tsx` | Master jabatan |
| `mobile-app/src/screens/AdminLocations.tsx` | Lokasi & radius |
| `mobile-app/src/screens/AdminSettings.tsx` | Pengaturan perusahaan |
| `mobile-app/src/screens/AdminPayroll.tsx` | Penggajian periode, harian, riwayat |
| `mobile-app/android/app/src/main/AndroidManifest.xml` | Izin Android |
| `mobile-app/ios/App/App/Info.plist` | Izin iOS |
| `ngodingpakeai-starter/src/proxy.ts` | CORS API |
| `ngodingpakeai-starter/src/lib/auth.ts` | Bearer plugin |
| `.github/workflows/ios-build.yml` | Build IPA unsigned di macOS 26 |

---

## 5. Perintah Build Android

Pastikan `mobile-app/.env.production` berisi URL production (file ini diabaikan
Git):

```dotenv
VITE_API_URL=https://absensi-karyawan-gray.vercel.app
```

Build:

```powershell
$env:JAVA_HOME = "C:\Users\user\orca\tools\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

cd mobile-app
npm run build
npx cap sync
cd android
.\gradlew.bat assembleDebug --no-daemon
```

APK:
`android/app/build/outputs/apk/debug/app-debug.apk`

Deploy backend dijalankan dari **root repo**, bukan dari folder
`ngodingpakeai-starter`, karena Root Directory project Vercel diset ke
`ngodingpakeai-starter`:

```powershell
cd "C:\Users\user\orca\projects\absensi-karyawan - mobile"
npx vercel deploy --prod
```

Untuk release AAB/APK, pastikan `android/keystore.properties` dan keystore
release tersedia, lalu:

```powershell
.\gradlew.bat bundleRelease assembleRelease --no-daemon
```

Hasil:

- `android/app/build/outputs/bundle/release/app-release.aab`
- `android/app/build/outputs/apk/release/app-release.apk`

Panduan signing lengkap: `docs/mobile-release-signing.md`.

---

## 6. Perintah Build iOS (di Mac)

```sh
cd mobile-app
npm run build
npx cap sync ios
npx cap open ios
```

Di Xcode:

1. Pilih team signing.
2. Pastikan bundle identifier `id.lecarassa.hadirku`.
3. Pilih perangkat/simulator.
4. Archive untuk TestFlight/App Store.

---

## 7. Catatan Keamanan

- Jangan commit `.env.local`, `.env.production`, keystore, atau token.
- Jangan aktifkan cleartext/mixed content untuk release.
- Bearer token disimpan di Keychain/KeyStore.
- Backend tetap menjadi sumber kebenaran untuk auth, role, GPS, dan absensi.
- `server.url` tidak dipakai; aplikasi dibundel, jadi tidak ada remote code
  loading di WebView.
