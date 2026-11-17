# Audit Konversi Mobile — Hadirku Lecarassa

Tanggal audit: 17 November 2026  
Status: **audit selesai, belum ada perubahan kode**  
Target: Android (APK/AAB) dan iOS (IPA) dengan Capacitor

---

## 1. Ringkasan Eksekutif

Project ini **bukan website statis**. Ini adalah aplikasi full-stack Next.js App Router dengan:

- Server Components, SSR, dan redirect server-side.
- 74 API route handler.
- Autentikasi server-side berbasis cookie (Better Auth).
- Database PostgreSQL (Neon) melalui Drizzle ORM.
- File foto/dokumen disimpan di PostgreSQL, bukan di filesystem lokal.
- Sesi, hak akses, dan validasi lokasi dilakukan di server.

Karena itu **`output: "export"` tidak bisa dipakai** tanpa menulis ulang lapisan auth, data, dan API. Rekomendasi utama adalah **Capacitor dengan remote URL ke aplikasi Next.js yang di-hosting**, ditambah integrasi native dan perbaikan UX mobile. Pendekatan ini mempertahankan hampir seluruh kode dan backend.

Namun ada tiga catatan penting yang harus disetujui sebelum eksekusi:

1. Dokumentasi resmi Capacitor menyebut `server.url` **ditujukan untuk live-reload dan bukan untuk produksi**. Pendekatan remote URL tetap bisa dipakai untuk aplikasi internal, tetapi berisiko saat review App Store/Play Store.
2. Build Android belum bisa dilakukan di mesin ini karena **Android Studio, JDK, dan Android SDK belum terpasang**.
3. Build iOS **tidak mungkin dilakukan di Windows**. Diperlukan macOS + Xcode 26 (syarat Capacitor 8).

Belum ada APK, AAB, atau IPA yang dibuat atau diuji pada audit ini.

---

## 2. Metode Audit

Yang dilakukan:

- Membaca struktur project, `package.json`, `next.config.ts`, `tsconfig.json`, `.env.example`, dan dokumentasi project.
- Menelusuri 257 file di `src/`.
- Memeriksa seluruh route API, layout, komponen, service, schema database, dan validator.
- Menjalankan `npm run doctor` (read-only) untuk memastikan koneksi database dan tabel auth.
- Memeriksa toolchain lokal: Node, npm, Java, Android SDK, Android Studio, Xcode.
- Memeriksa dokumentasi resmi Capacitor 8 untuk requirement dan konfigurasi `server.url`.
- Tidak menjalankan build, E2E, atau pengujian perangkat pada tahap audit.

Yang tidak dilakukan:

- Tidak mengubah file project.
- Tidak menginstal dependency baru.
- Tidak menjalankan migrasi atau mengubah schema.
- Tidak melakukan deployment.
- Tidak melakukan build Android/iOS.

---

## 3. Teknologi dan Versi

| Area | Temuan |
|---|---|
| Framework | Next.js **16.3.4** (App Router) |
| UI runtime | React **19.2.8**, React DOM **19.2.8** |
| Bahasa | TypeScript **5.9.3**, strict mode |
| Node.js | Engine `>=22.12.0`; mesin lokal **v24.20.0** |
| Package manager | npm **11.19.0**, lockfile `package-lock.json` |
| Styling | Tailwind CSS **4.3.3**, shadcn/ui, Radix UI |
| Animasi | Motion **13.2.0** |
| Auth | Better Auth **1.7.3** + admin plugin |
| ORM | Drizzle ORM **0.45.2**, drizzle-kit **0.31.10** |
| Database | PostgreSQL (Neon di `.env.local` production), driver `pg` **8.23.0** |
| Validasi | Zod **4.5.4** |
| Peta | Leaflet **1.9.4** + react-leaflet **5.0.0** |
| Ikon | lucide-react |
| Deploy | Vercel / Node.js / Docker; `next.config.ts` memakai `output: "standalone"` kecuali di Vercel |
| Region Vercel | `sin1` (Singapura) |

Jumlah kode/komponen utama:

- 28 halaman (`page.tsx`).
- 74 API route (`route.ts`).
- 26 service domain.
- 23 validator.
- 32 tabel database.
- 21 file migrasi SQL.
- Tidak ada Server Actions (`"use server"`).
- Tidak ada middleware/proxy.
- Tidak ada route dengan `runtime = "edge"`.

---

## 4. Arsitektur Aplikasi Saat Ini

```text
Browser / WebView
      |
      | HTTPS, cookie sesi httpOnly
      v
Next.js 16 App Router (Vercel / Node)
  |-- Server Components + layout guard
  |-- 74 API route handlers
  |-- Better Auth (session, role, cookie)
  |-- Drizzle ORM
  v
PostgreSQL (Neon)
  |-- 32 tabel, termasuk user/session/employee/attendance/stored_files
  |
  +--> Provider face verification eksternal (opsional, HTTP)
```

### 4.1 Autentikasi

- Implementasi: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/lib/api.ts`.
- Better Auth memakai Drizzle adapter dan PostgreSQL.
- Sesi disimpan di server dan dikirim lewat cookie httpOnly.
- Plugin `admin` mengatur role; role tidak bisa di-set dari signup.
- `nextCookies()` berada di urutan terakhir (sesuai aturan Better Auth).
- Origin yang dipercaya diatur di `src/lib/origins.ts` dari `BETTER_AUTH_URL` + alias Vercel.
- Mutasi cookie-authenticated di API wajib berasal dari origin yang diizinkan (`withApiSession`).
- Role yang tersedia: `user`, `marketing`, `hod`, `hrd`, `admin`. Satu akun bisa punya beberapa role.

Implikasi mobile: selama WebView memuat aplikasi dari origin yang sama dengan backend, cookie dan proteksi origin tetap bekerja tanpa perubahan.

### 4.2 API dan data

- Semua route bisnis memakai `withApiSession` atau `withApiPermission`.
- Pengecualian yang memang publik: `/api/health` dan handler Better Auth `/api/auth/[...all]`.
- Query domain berada di `src/services/`, bukan di route atau komponen.
- Validasi input memakai Zod di `src/validators/`.
- Endpoint health sudah tersedia dan mengecek koneksi database.

### 4.3 Penyimpanan file

- Foto absensi, dokumen karyawan, lampiran pengajuan, dan foto profil disimpan di tabel `stored_files` (PostgreSQL) melalui `src/lib/file-store.ts`.
- File dibaca melalui route terautentikasi:
  - `/api/attendance/photos/[id]`
  - `/api/employees/[id]/documents/[type]`
  - `/api/requests/[id]/attachment`
- Tidak ada ketergantungan pada filesystem lokal, sehingga aman untuk Vercel/serverless.
- Ini juga berarti **tidak perlu** memindahkan storage ke perangkat atau object storage untuk fase awal.

### 4.4 Verifikasi wajah

- Provider eksternal opsional melalui `FACE_PROVIDER`, `FACE_API_URL`, `FACE_API_KEY`.
- Default perusahaan: `faceVerificationEnabled = false`.
- Jika diaktifkan tanpa provider, sistem menolak absensi (fail-closed).
- Bukan blocker untuk mobile karena tidak aktif secara default.

### 4.5 Notifikasi

- Notifikasi yang ada saat ini adalah **in-app notification** dan email opsional (Resend).
- Tidak ada push notification (FCM/APNs), tidak ada service worker, dan tidak ada tabel device token.
- Push notification memerlukan pekerjaan backend + Firebase/APNs jika nanti diinginkan.

---

## 5. Fitur dan Kesiapan Mobile

| Fitur | Kondisi saat ini | Kesiapan mobile | Catatan |
|---|---|---|---|
| Login/logout | Better Auth, cookie httpOnly | Siap | Origin sama jika memakai remote URL |
| Registrasi/pending | Server-side | Siap | — |
| Dashboard karyawan | Server Component + client widget | Siap | Sudah ada bottom nav |
| Dashboard admin | Server Component + client widget | Perlu uji | Tabel lebar perlu dicek di layar kecil |
| Absen masuk/pulang | `getUserMedia` + geolocation + watermark canvas | Perlu integrasi native | Web API bisa jalan di WebView, tetapi plugin native lebih andal |
| Foto profil | `getUserMedia` | Perlu integrasi native | Sama seperti kamera absensi |
| GPS/radius | `navigator.geolocation`, validasi ulang di server | Perlu integrasi native | Server tetap sumber kebenaran |
| Riwayat absensi | API + tabel | Siap | — |
| Jadwal/shift | API + komponen | Siap | — |
| Izin/cuti + lampiran | Upload base64 + link lampiran | Perlu perbaikan | Lampiran dibuka via `target="_blank"` |
| Klaim makan | API | Siap | — |
| Training | API | Siap | — |
| Notifikasi in-app | API + polling/refresh | Siap | Push belum ada |
| Laporan | CSV/XLS/PDF via API | Perlu perbaikan | Download di WebView tidak konsisten |
| Penggajian | CSV/XLS/PDF via API | Perlu perbaikan | Sama seperti laporan |
| Impor CSV | File input | Siap | File picker native didukung |
| Peta lokasi | Leaflet + tile OpenStreetMap | Siap | Butuh internet |
| Dark mode | localStorage | Siap | Perlu warna status bar |
| Deep link | Tidak ada | Belum perlu | Reset password via email membuka browser |
| Offline | Tidak ada | Perlu ditambahkan | Minimal halaman error/offline |
| Push notification | Tidak ada | Opsional fase berikut | Butuh FCM/APNs + backend |
| Biometric login | Tidak ada | Opsional | Perlu keputusan keamanan |

---

## 6. Temuan Kompatibilitas

### 6.1 Blocker / P0

#### A. Static export tidak kompatibel

`output: "export"` tidak dapat dipakai karena aplikasi bergantung pada:

- Server Components dan `headers()`/cookie.
- Redirect server-side (`requireSession`, layout guard).
- API route handlers.
- Better Auth dan session database.
- Streaming file dari PostgreSQL.
- `next/font` dan render server-side lainnya.

Memaksakan static export akan memutus login, API, dan hampir semua fitur. **Tidak direkomendasikan.**

#### B. `server.url` resmi tidak ditujukan untuk produksi

Dokumentasi Capacitor 8 menyatakan `server.url`:

> "Load an external URL in the Web View. This is intended for use with live-reload servers. **This is not intended for use in production.**"

Pendekatan ini tetap banyak dipakai untuk aplikasi internal, tetapi konsekuensinya:

- Aplikasi tidak bisa dibuka tanpa internet.
- Konten remote mendapat akses ke native bridge. Origin harus dikunci.
- Review App Store berisiko di bawah guideline 4.2 (minimum functionality) jika hanya wrapper website.
- Perlu strategi distribusi internal (Managed Google Play / Apple Business Manager) atau penambahan fitur native yang cukup.

#### C. Toolchain Android belum tersedia

Hasil pemeriksaan mesin:

- Java: **tidak ditemukan**.
- Android Studio: **tidak ditemukan**.
- `ANDROID_HOME` / `ANDROID_SDK_ROOT`: **kosong**.
- `adb`: **tidak ditemukan**.

Capacitor 8 membutuhkan Android Studio minimal **2025.2.1** dan Android SDK API 24+. Tanpa itu, `npx cap add android` bisa dibuat, tetapi APK/AAB tidak bisa di-build.

#### D. Build iOS tidak mungkin di Windows

Capacitor 8 membutuhkan **macOS + Xcode 26.0**. Di mesin Windows ini tidak ada Xcode. Project iOS bisa di-generate dan di-commit, tetapi build, signing, simulator, dan IPA harus dilakukan di Mac.

#### E. URL produksi Next.js belum terkonfirmasi

`https://absensi-karyawan.vercel.app` **bukan aplikasi ini**. Saat diperiksa, URL tersebut menampilkan aplikasi absensi lama dan `/api/health` mengembalikan 404. URL production dari project Next.js ini perlu dipastikan sebelum konfigurasi `server.url`.

#### F. Download/export dan lampiran tidak andal di WebView

Beberapa bagian memakai link yang membuka tab baru atau mengunduh file:

- `src/app/(protected)/admin/laporan/report-view.tsx` — `link.download`.
- `src/app/(protected)/admin/penggajian/*` — `<a href="/api/...export...">`.
- `src/app/(protected)/app/attendant/requests-view.tsx` — `target="_blank"` untuk lampiran.
- `src/app/(protected)/admin/izin-cuti/izin-cuti-view.tsx` — `target="_blank"`.
- `src/components/master-data-admin.tsx` — `target="_blank"` untuk dokumen.

Di WebView:

- `Content-Disposition: attachment` tidak selalu ditangani.
- Tab baru bisa membuka browser eksternal yang **tidak memiliki cookie sesi** sehingga hasilnya 401/redirect login.
- Android WebView tidak merender PDF secara native.

Perlu lapisan native: fetch file dengan cookie → simpan sementara → buka/share melalui plugin Filesystem/Share.

### 6.2 Penting / P1

| Temuan | Dampak | Rencana |
|---|---|---|
| `viewport` belum `viewport-fit=cover` | `env(safe-area-inset-*)` tidak akurat; konten bisa tertutup notch/status bar | Tambah `viewportFit: "cover"` |
| Header mobile belum memberi padding safe-area atas | Header bisa masuk area status bar | Padding `env(safe-area-inset-top)` |
| Input memakai `text-sm` (14px) | iOS auto-zoom saat fokus | Naikkan ke 16px di mobile |
| Keyboard belum dikelola plugin | Input di bawah keyboard bisa tertutup | `@capacitor/keyboard`, resize body, scroll into view |
| Tombol ikon 32px | Di bawah rekomendasi touch target 44px | Perbesar area sentuh di mobile |
| Tidak ada indikator offline | Absen gagal tanpa penjelasan jelas | Plugin Network + banner/retry |
| Kamera memakai `getUserMedia` | Bisa gagal/berat di WebView tertentu | Plugin Camera dengan fallback web |
| GPS memakai Web API | Akurasi/izin bisa tidak konsisten | Plugin Geolocation dengan fallback web |
| Belum ada app icon/splash | Tidak siap build/store | Asset dari brand, `@capacitor/assets` |
| Belum ada privacy manifest iOS | Berisiko saat submit App Store | Tambah `PrivacyInfo.xcprivacy` dan usage description |
| Tidak ada penanganan tombol back Android | Bisa keluar aplikasi saat berada di halaman dalam | Plugin App + handler history |
| Rate limit in-memory | Di Vercel multi-instance tidak konsisten | Catatan keamanan, bukan blocker mobile |

### 6.3 UX mobile yang sudah baik

- `AppShell` sudah punya drawer mobile dan bottom navigation.
- Bottom nav sudah memakai `env(safe-area-inset-bottom)`.
- Layout konten sudah responsif (`max-w-6xl`, grid adaptif).
- Dialog absensi sudah berubah menjadi bottom sheet di layar kecil.
- Tabel admin sudah memakai `overflow-x-auto` di beberapa halaman.
- Tema visual konsisten: aksen `#E4F222`, dark mode, font Plus Jakarta Sans.
- Login dan dashboard sudah memakai layout yang bisa menyempit.

---

## 7. Analisis Opsi Arsitektur

| Opsi | Perubahan kode | Kelebihan | Kekurangan | Putusan |
|---|---|---|---|---|
| **A. Capacitor remote URL** | Sangat kecil | Semua fitur server, auth, API, DB, upload tetap; cepat; update web tanpa rilis app | Butuh internet; `server.url` resmi untuk live-reload; risiko review store; bridge harus dikunci | **Rekomendasi fase 1** |
| **B. Frontend mobile terpisah + API remote** | Besar | App-store friendly; startup/offline lebih baik; native penuh | Perlu menulis ulang UI mobile atau menjadikan semua halaman client-side; auth lintas origin; duplikasi kode | Fase lanjutan jika store publik/offline wajib |
| **C. Static export Next.js** | Sangat besar | Aset lokal | Memutus auth, API, DB, SSR | **Ditolak** |
| **D. Rewrite native (React Native/Flutter)** | Sangat besar | Performa native | Tidak mempertahankan kode | **Ditolak** |

### Rekomendasi

**Fase 1: Opsi A** — Capacitor shell yang memuat aplikasi Next.js HTTPS yang sudah di-hosting, dengan:

- `server.url` dikunci ke satu origin produksi.
- `allowNavigation` kosong; link eksternal keluar ke browser.
- `errorPath` untuk halaman offline.
- Plugin native resmi untuk kamera, GPS, file/share, network, status bar, splash, keyboard, dan back button.
- Perbaikan safe area dan UX mobile.
- Distribusi internal dulu (APK/AAB internal, TestFlight/Apple Business Manager), bukan langsung publik.

**Fase 2 (opsional):** jika targetnya App Store publik dan offline serius, evaluasi Opsi B: frontend mobile terpisah yang dibundel, memakai API Next.js yang sama. Ini pekerjaan besar dan tidak boleh dicampur dengan fase 1.

---

## 8. Rancangan Teknis Fase 1 (belum dikerjakan)

### 8.1 Struktur baru

```text
ngodingpakeai-starter/
  capacitor.config.ts          # konfigurasi Capacitor
  mobile/
    www/
      index.html               # halaman loading/offline lokal
      offline.html             # fallback errorPath
  android/                     # dihasilkan npx cap add android
  ios/                         # dihasilkan npx cap add ios
  src/
    lib/mobile/
      capacitor.ts             # deteksi native + helper
      files.ts                 # fetch + simpan + share export
      camera.ts                # kamera native + fallback web
      geolocation.ts           # GPS native + fallback web
```

### 8.2 Konfigurasi awal yang diusulkan

```ts
// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "id.lecarassa.hadirku", // perlu persetujuan
  appName: "Hadirku Lecarassa",
  webDir: "mobile/www",
  backgroundColor: "#f7f7f2",
  server: {
    url: "https://<domain-produksi>", // wajib HTTPS
    cleartext: false,
    allowNavigation: [],
    errorPath: "offline.html",
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#f7f7f2",
      showSpinner: false,
    },
  },
};

export default config;
```

Catatan: `webDir` tidak memakai `.next` karena aplikasi dijalankan dari remote URL. Folder `mobile/www` hanya untuk halaman loading/offline.

### 8.3 Dependency yang direncanakan

Runtime:

- `@capacitor/core`
- `@capacitor/android`
- `@capacitor/ios`
- `@capacitor/app`
- `@capacitor/camera`
- `@capacitor/geolocation`
- `@capacitor/filesystem`
- `@capacitor/share`
- `@capacitor/network`
- `@capacitor/status-bar`
- `@capacitor/splash-screen`
- `@capacitor/keyboard`

Dev:

- `@capacitor/cli`
- `@capacitor/assets`

Versi mengikuti rilis stabil saat instalasi (saat audit: `@capacitor/core` 8.6.2). Semua plugin harus satu major dengan core.

### 8.4 Perubahan Next.js yang direncanakan

- `src/app/layout.tsx`: tambah `viewportFit: "cover"`.
- `src/components/app-shell.tsx`: padding safe-area atas, touch target, status bar.
- `src/app/globals.css`: util safe area, font-size input mobile, keyboard scroll.
- `src/app/(protected)/app/attendance-home.tsx`: kamera/GPS native dengan fallback web; tidak mengubah aturan bisnis.
- `src/app/(protected)/app/profil/profile-view.tsx`: kamera native untuk foto profil.
- Link lampiran/ekspor: helper native download/share, fallback `<a>` di web.
- Komponen baru: banner offline, indikator loading/retry, handler back button.
- Tidak mengubah schema database, auth, API, atau hak akses.

### 8.5 Android

- `npx cap add android`.
- `AndroidManifest.xml`: izin `INTERNET`, `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`.
- `network_security_config`: hanya HTTPS.
- App icon + splash dari brand.
- `versionCode` / `versionName`.
- Keystore release dibuat lokal, **tidak di-commit**.
- Build:
  - Debug APK untuk pengujian.
  - Release AAB untuk Play Console.
  - Release APK untuk distribusi internal.

### 8.6 iOS

- `npx cap add ios`.
- `Info.plist`:
  - `NSCameraUsageDescription`
  - `NSPhotoLibraryUsageDescription` (jika galeri dipakai)
  - `NSLocationWhenInUseUsageDescription`
  - `NSLocationAlwaysAndWhenInUseUsageDescription` (hanya jika benar-benar perlu)
- `PrivacyInfo.xcprivacy`.
- Bundle Identifier, signing, provisioning profile.
- Build dan test wajib di macOS + Xcode 26.

---

## 9. Rencana Pengujian

### Otomatis (di mesin ini, setelah perubahan)

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e` (butuh Docker + Chromium)

### Manual Android

- Login karyawan, HRD, HOD, marketing.
- Logout dan login ulang; sesi bertahan setelah app ditutup.
- Absen masuk/pulang dengan kamera dan GPS.
- Izin lokasi ditolak → pesan jelas, absen gagal dengan aman.
- GPS akurasi rendah / di luar radius → pesan server.
- Foto absensi tersimpan dan bisa dilihat.
- Riwayat, jadwal, pengajuan, klaim makan, training, notifikasi.
- Admin: dashboard, karyawan, jadwal, laporan, penggajian.
- Ekspor CSV/XLS/PDF dan buka lampiran.
- Impor CSV.
- Rotasi layar, keyboard, safe area, dark mode.
- Koneksi putus → banner offline dan retry.
- Tombol back Android.
- App di-background lalu dibuka lagi.

### Manual iOS (di Mac)

Sama seperti Android, ditambah:

- Kamera/galeri pada WKWebView.
- Geolocation prompt.
- Safe area notch/Dynamic Island.
- Keyboard tidak menutup input.
- Download/share file.
- TestFlight.

### Yang belum bisa diklaim

Belum ada bukti build/run di perangkat. Semua status di atas adalah hasil audit statis.

---

## 10. Keamanan

### Sudah baik

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `FACE_API_KEY` hanya di server.
- Tidak ada `NEXT_PUBLIC_*` yang berisi rahasia.
- Cookie sesi httpOnly; tidak ada token sesi di localStorage.
- `withApiPermission` memeriksa hak akses di server, bukan hanya UI.
- Mutasi memeriksa origin.
- Validasi input Zod dan pembatasan ukuran upload.
- File dilayani melalui endpoint terautentikasi.
- Validasi lokasi diulang di server.
- Health check tidak membocorkan detail internal.

### Yang harus dijaga saat mobile

- `server.url` harus HTTPS dan origin tetap; jangan pernah memuat URL dari input pengguna.
- Jangan aktifkan `allowNavigation` untuk domain pihak ketiga.
- Jangan aktifkan `allowMixedContent`.
- Jangan menaruh API key di kode mobile.
- Jangan menonaktifkan pengecekan origin di `withApiSession`.
- Bridge Capacitor memberi akses native ke halaman yang dimuat; konten harus origin sendiri.
- Siapkan privacy policy, data safety form, dan alasan izin kamera/lokasi untuk store.
- Rate limit in-memory perlu ditingkatkan jika trafik produksi tinggi.
- GPS palsu (mock location) tidak bisa sepenuhnya dicegah dari web; pertimbangkan deteksi tambahan jika risiko tinggi.

---

## 11. Kesiapan Lingkungan

| Kebutuhan | Status |
|---|---|
| Node.js 22+ | ✅ v24.20.0 |
| npm | ✅ 11.19.0 |
| Docker Desktop | ✅ terpasang (opsional karena DB memakai Neon) |
| Koneksi PostgreSQL + tabel auth | ✅ `npm run doctor` lulus |
| Git + remote GitHub | ✅ `sahrul190803/absensi-karyawan` |
| GitHub CLI | ✅ login |
| Vercel CLI | ✅ terpasang, belum login |
| Android Studio 2025.2.1+ | ❌ belum ada |
| JDK | ❌ belum ada |
| Android SDK / adb | ❌ belum ada |
| macOS + Xcode 26 | ❌ tidak tersedia (Windows) |
| URL produksi Next.js | ❓ belum dikonfirmasi |

---

## 12. Risiko dan Mitigasi

| Risiko | Tingkat | Mitigasi |
|---|---|---|
| App Store menolak wrapper website (guideline 4.2) | Sedang–tinggi | Distribusi internal dulu; tambah fitur native; siapkan opsi B |
| `server.url` dianggap bukan praktik produksi | Sedang | Dokumentasikan; kunci origin; offline page; evaluasi opsi B untuk publik |
| Aplikasi butuh internet | Sedang | Deteksi offline, pesan jelas; offline queue absensi hanya jika diminta |
| Download/lampiran gagal | Tinggi | Implementasi native file/share |
| Kamera/GPS tidak konsisten | Sedang | Plugin native + fallback web + uji perangkat |
| Build Android belum bisa | Tinggi | Instal Android Studio/JDK/SDK |
| Build iOS tidak bisa di Windows | Tinggi | Serahkan ke Mac; siapkan project dan dokumentasi signing |
| Sesi cookie hilang | Rendah | Remote URL same-origin; uji app restart |
| Perubahan UI desktop | Rendah | Perubahan mobile-only dengan breakpoint; uji desktop |
| Data/DB rusak | Rendah | Backup + branch + migrasi tidak diubah |

---

## 13. Rencana Tahapan Setelah Persetujuan

### Tahap 0 — Backup dan baseline

- Buat branch `mobile/capacitor`.
- Buat arsip backup tanpa `node_modules`, `.next`, dan `.env*`.
- Catat commit baseline.
- Jangan menyentuh perubahan lokal yang sudah ada:
  - `src/app/(protected)/app/attendance-home.tsx`
  - `src/app/(protected)/app/page.tsx`

### Tahap 1 — Scaffold Capacitor

- Install dependency.
- Buat `capacitor.config.ts`.
- Buat `mobile/www/index.html` dan `offline.html`.
- `npx cap add android` dan `npx cap add ios`.
- `npx cap sync`.
- Uji load remote URL di Android emulator (jika toolchain siap).

### Tahap 2 — Native dan UX mobile

- Plugin kamera, GPS, file/share, network, status bar, splash, keyboard, app.
- Safe area, input 16px, touch target, offline banner, back button.
- Perbaikan download/lampiran.
- Icon dan splash.

### Tahap 3 — Android build dan test

- Manifest dan izin.
- Debug APK.
- Uji di emulator/perangkat.
- Release keystore, AAB, APK.
- Play Console internal testing.

### Tahap 4 — iOS handoff

- Generate project iOS.
- Info.plist, privacy manifest, icon, splash.
- Dokumentasi signing.
- Build dan test di Mac.
- TestFlight.

### Tahap 5 — Kesiapan store

- Privacy policy.
- Data safety form.
- Screenshot dan metadata.
- Catatan review untuk menjelaskan nilai native aplikasi.

---

## 14. Keputusan yang Dibutuhkan

1. **Arsitektur:** setuju memakai Opsi A (remote URL) untuk fase 1?
2. **URL produksi:** alamat HTTPS aplikasi Next.js yang akan dimuat?
3. **Distribusi:** internal perusahaan, Play Store/App Store publik, atau keduanya?
4. **App ID:** `id.lecarassa.hadirku` atau nama lain?
5. **Android:** boleh memasang Android Studio + JDK + SDK di mesin ini, atau akan disiapkan sendiri?
6. **iOS:** apakah ada Mac + Xcode 26 untuk build dan signing?
7. **Push notification:** sekarang, nanti, atau tidak perlu?
8. **Aset brand:** apakah ada logo PNG/SVG resolusi tinggi untuk icon dan splash?

---

## 15. Kesimpulan

Project ini layak dikonversi ke mobile tanpa membangun ulang aplikasi. Kode dan backend yang ada sudah mendukung:

- Sesi server-side.
- API yang aman.
- Upload dan penyimpanan file di database.
- Layout mobile dasar dengan drawer dan bottom nav.

Yang benar-benar perlu dikerjakan adalah **lapisan Capacitor, integrasi native, perbaikan UX mobile, dan build toolchain** — bukan penulisan ulang aplikasi.

Rekomendasi tegas: **jangan memakai static export**. Gunakan remote URL untuk fase internal, lalu putuskan apakah perlu frontend mobile terpisah untuk store publik.

Setelah persetujuan, pekerjaan dimulai dari Tahap 0 (backup) dan Tahap 1 (scaffold Capacitor), bukan langsung mengubah seluruh UI.
