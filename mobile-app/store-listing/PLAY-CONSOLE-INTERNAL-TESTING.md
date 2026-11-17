# Play Console — Internal Testing Checklist

Panduan operasional untuk merilis Hadirku Lecarassa ke Internal Testing.

## Yang harus siap

| Item | Nilai / Lokasi |
|---|---|
| Nama aplikasi | Hadirku Lecarassa |
| Package name | `id.lecarassa.hadirku` |
| AAB release | `mobile-app/android/app/build/outputs/bundle/release/app-release.aab` |
| APK release | `mobile-app/android/app/build/outputs/apk/release/app-release.apk` |
| Version | 1.2 (versionCode 3) |
| App icon | `mobile-app/store-listing/icon-512.png` |
| Feature graphic | `mobile-app/store-listing/feature-graphic.png` |
| Screenshot | `mobile-app/store-listing/screenshots/01..08-*.png` |
| Privacy policy | `https://absensi-karyawan-gray.vercel.app/privacy` |
| Release notes | `mobile-app/store-listing/release-notes-1.2.txt` |
| Akun demo | lihat bagian App access di bawah |
| Keystore + kredensial | backup lokal, jangan di-commit |

## 1. Buat aplikasi

1. Buka [Google Play Console](https://play.google.com/console).
2. Pilih **All apps → Create app**.
3. Isi:
   - App name: **Hadirku Lecarassa**
   - Default language: **Indonesian (id-ID)**
   - App or game: **App**
   - Free or paid: **Free**
4. Centang deklarasi kebijakan Play dan ekspor AS.
5. Klik **Create app**.

## 2. Selesaikan App content

Buka **Dashboard → App content** dan isi satu per satu.

### App access

- Pilih **All or some functionality is restricted**.
- Isi petunjuk akses:

```
Aplikasi memerlukan login.

HRD/Admin:
Email: hrd@hadirku.demo
Password: DemoHadirku2026!

Karyawan:
Email: karyawan@hadirku.demo
Password: DemoHadirku2026!

HOD:
Email: hod@hadirku.demo
Password: DemoHadirku2026!

Login sebagai Karyawan untuk melihat absensi, riwayat, izin/cuti, klaim makan, training, dan profil.
Login sebagai HRD untuk melihat dashboard, persetujuan, karyawan, laporan, penggajian, dan pengaturan.
```

### Ads

Pilih **No, my app does not contain ads**.

### Content rating

- Mulai kuesioner.
- Kategori: **Business / Utility** (sesuai pilihan yang tersedia).
- Tidak ada kekerasan, konten seksual, judi, alkohol, atau konten dewasa.
- Jawab sesuai kondisi aplikasi sebenarnya.
- Simpan rating yang dihasilkan.

### Target audience

- Pilih **18 and over**.
- Jangan memilih kelompok usia anak-anak.
- Aplikasi ditujukan untuk karyawan perusahaan.

### Data safety

Gunakan draf di `play-store-listing.md`, lalu verifikasi dengan legal/pemilik data.

Ringkasan data yang dikumpulkan:

- Informasi pribadi: nama, email, telepon, alamat, NIK, KTP.
- Informasi keuangan: rekening bank dan data gaji internal.
- Foto: selfie absensi, foto profil, foto KTP, lampiran.
- Lokasi presisi: saat absensi.
- ID perangkat: device key untuk absensi.
- Aktivitas aplikasi: absensi, pengajuan, klaim makan, training, payroll.

Praktik:

- Data dienkripsi saat transit (HTTPS).
- Tidak dijual.
- Tidak dipakai untuk iklan.
- Penghapusan akun melalui HRD/Admin atau kontak privasi.
- Penyedia layanan: hosting, database, email opsional, face provider opsional.

### Deklarasi lain

- Government apps: **No**
- Financial features: **No** — payroll hanya pencatatan internal, bukan transfer bank/kredit.
- Health apps: **No**
- News apps: **No**
- COVID-19 apps: **No**

### Privacy policy

- URL: `https://absensi-karyawan-gray.vercel.app/privacy`
- Buka URL di incognito untuk memastikan dapat diakses tanpa login.
- Sebelum rilis production, lengkapi alamat/email/telepon di
  `ngodingpakeai-starter/src/config/privacy.ts` lalu deploy ulang.

## 3. Isi Store listing

Buka **Grow → Store presence → Main store listing**.

### Teks

- App name: **Hadirku Lecarassa**
- Short description:

```
Absensi selfie + GPS, jadwal shift, izin, klaim makan, laporan, dan payroll.
```

- Full description: ambil dari `play-store-listing.md`.

### Graphics

- App icon: `store-listing/icon-512.png` (512×512).
- Feature graphic: `store-listing/feature-graphic.png` (1024×500).
- Phone screenshots: 8 file di `store-listing/screenshots/` (1080×1920).

Urutan:

1. Beranda karyawan
2. Riwayat absensi
3. Izin & cuti
4. Klaim makan
5. Data karyawan
6. Persetujuan
7. Laporan
8. Penggajian

### Kategori dan kontak

- Category: **Business**
- Contact email: gunakan email resmi perusahaan.
- Website: gunakan website resmi jika ada.
- Phone: opsional.

## 4. Buat Internal testing

Alternatif otomatis: setelah service account disiapkan, gunakan
`npm run play:upload -- --track internal --version-code 3`. Lihat
`PLAY-UPLOAD-AUTOMATION.md`.

1. Buka **Testing → Internal testing → Create new release**.
2. Upload `app-release.aab`.
3. Tunggu Play Console memproses bundle.
4. Isi release notes dari `release-notes-1.2.txt`.
5. Klik **Save → Review release → Start rollout to Internal testing**.
6. Buka tab **Testers**:
   - Buat email list, misalnya `internal-testers`.
   - Tambahkan email tester.
   - Simpan.
7. Salin **opt-in link** dan kirim ke tester.

## 5. Uji di HP fisik

Alternatif cepat sebelum rilis Play Store tersedia: install APK release via adb.

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r `
  mobile-app\android\app\build\outputs\apk\release\app-release.apk
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell am start `
  -n id.lecarassa.hadirku/.MainActivity
```

Ini menguji APK release, tetapi **bukan** pengujian distribusi Play Store.
Untuk menguji dari Play Store, selesaikan Internal Testing dan gunakan opt-in
link.

1. Tester membuka opt-in link dan menerima undangan.
2. Install dari Play Store.
3. Uji minimal:

- Login karyawan, HRD, dan HOD.
- Izin kamera dan lokasi.
- Absen masuk/pulang dengan selfie + GPS.
- Riwayat absensi dan foto.
- Jadwal shift.
- Pengajuan izin/cuti + lampiran.
- Klaim makan.
- Notifikasi.
- Profil dan ubah data.
- Dashboard HRD.
- Persetujuan pengajuan.
- Data karyawan dan verifikasi.
- Laporan + export CSV/Excel/PDF.
- Payroll: buka periode, detail, penyesuaian pada data uji.
  Jangan mencatat pembayaran gaji nyata saat testing.
- Pengaturan dan master data.
- Logout dan login ulang.
- Tutup aplikasi lalu buka lagi; sesi harus tetap aktif.
- Rotasi layar, keyboard, dark mode, dan safe area.

Catat hasil di tabel:

| Skenario | Perangkat | Hasil | Catatan |
|---|---|---|---|
| Login karyawan |  |  |  |
| Absen kamera + GPS |  |  |  |
| Pengajuan + lampiran |  |  |  |
| Dashboard HRD |  |  |  |
| Laporan export |  |  |  |
| Payroll baca/tampil |  |  |  |

## 6. Masalah yang sering muncul

| Masalah | Penyebab / Solusi |
|---|---|
| “App bundle was signed with the wrong key” | Gunakan keystore release yang sama. Jangan kehilangan upload key. |
| “Version code already used” | Naikkan `versionCode` di `android/app/build.gradle`, build ulang. |
| Package name tidak cocok | Harus `id.lecarassa.hadirku`. |
| Privacy policy tidak bisa dibuka | Pastikan URL HTTPS publik dan bisa diakses incognito. |
| Reviewer tidak bisa login | Isi App access dengan akun demo dan petunjuk. |
| Data safety ditolak | Samakan deklarasi dengan data yang benar-benar dikirim aplikasi. |
| Target API level kurang | Build memakai compileSdk/targetSdk 36. |
| Aplikasi crash saat kamera | Uji izin kamera di HP fisik; emulator tidak selalu representatif. |
| GPS tidak akurat | Uji di HP dengan GPS aktif; emulator perlu lokasi virtual. |

## 7. Setelah internal testing stabil

1. Perbaiki bug yang ditemukan.
2. Naikkan versi, build AAB baru.
3. Promosikan ke **Closed testing**.
4. Setelah cukup tester dan stabil, promosikan ke **Production**.
5. Simpan keystore dan kredensial di tempat aman.

## Checklist akhir sebelum Production

- [ ] Alamat/email/telepon privacy policy sudah diisi.
- [ ] Data safety sudah diverifikasi legal.
- [ ] Store listing dan screenshot final.
- [ ] Akun demo berfungsi.
- [ ] Absensi kamera + GPS diuji di HP fisik.
- [ ] Export laporan diuji.
- [ ] Payroll diuji tanpa pembayaran nyata.
- [ ] Tidak ada crash/ANR pada build release.
- [ ] Keystore dan kredensial sudah dibackup.
- [ ] Versi dan release notes benar.
