# Play Store Listing — Hadirku Lecarassa

Dokumen kerja untuk Google Play Console. Ganti placeholder sebelum publikasi.

## Identitas aplikasi

| Field | Nilai |
|---|---|
| Nama aplikasi | Hadirku Lecarassa |
| Package name | `id.lecarassa.hadirku` |
| Kategori | Business |
| Default language | Indonesia (id-ID) |
| Jenis | Aplikasi gratis |
| Target audiens | 18+ / karyawan perusahaan |
| Iklan | Tidak ada |
| In-app purchase | Tidak ada |
| Versi saat ini | 1.2 (versionCode 3) |
| AAB | `mobile-app/android/app/build/outputs/bundle/release/app-release.aab` |

## Short description (maks. 80 karakter)

```
Absensi selfie + GPS, jadwal shift, izin, klaim makan, laporan, dan payroll.
```

## Full description (maks. 4.000 karakter)

```
Hadirku Lecarassa adalah aplikasi kehadiran dan administrasi HR untuk karyawan, HOD, HRD, dan Admin Lecarassa.

ABSENSI YANG LEBIH JUJUR
• Absen masuk dan pulang dengan foto selfie.
• Foto otomatis diberi watermark waktu, lokasi, dan GPS.
• Validasi radius lokasi dan akurasi GPS dilakukan di server.
• Waktu absensi memakai jam server, bukan jam perangkat.
• Riwayat kehadiran lengkap dengan bukti foto.

UNTUK KARYAWAN
• Lihat jadwal shift dan lokasi kerja.
• Ajukan izin, sakit, cuti, atau tukar shift beserta lampiran.
• Pantau status pengajuan dan saldo cuti.
• Klaim jatah makan harian.
• Lihat jadwal training dan notifikasi.
• Kelola profil, kontak, rekening, dan dokumen pribadi.

UNTUK HOD, HRD, DAN ADMIN
• Dashboard kehadiran dan pengajuan yang menunggu.
• Setujui atau tolak pengajuan dengan catatan.
• Susun jadwal shift dan kelola training.
• Kelola data karyawan, verifikasi akun, dan dokumen.
• Rekap klaim makan dan daftar yang belum klaim.
• Laporan kehadiran harian, bulanan, dan tahunan.
• Export laporan ke CSV, Excel, atau PDF.
• Kelola periode penggajian, komponen gaji, pembayaran, dan riwayat.

KEAMANAN DAN AKSES
• Sesi login dan hak akses diperiksa di server.
• Data hanya dapat diakses sesuai peran pengguna.
• Foto dan dokumen dilayani melalui endpoint terautentikasi.
• Komunikasi aplikasi memakai HTTPS.
• Akun baru harus diverifikasi HRD sebelum dapat dipakai.

CATATAN
Aplikasi ini ditujukan untuk karyawan internal perusahaan. Penggajian di aplikasi adalah pencatatan dan rekap internal, bukan layanan transfer bank atau produk keuangan.

Butuh bantuan? Hubungi admin HRD perusahaan Anda.
```

## Release notes (versi 1.2)

```
Versi 1.2
• Modul admin/HOD lengkap: persetujuan, jadwal, karyawan, laporan, klaim makan, training, master data, dan pengaturan.
• Penggajian mobile: periode bulanan, penyesuaian gaji, finalisasi, pembayaran, gaji harian, export, dan riwayat.
• Peningkatan performa: layar admin dimuat terpisah agar startup lebih ringan.
• Perbaikan laporan bulanan untuk bulan dengan 30 hari.
```

## App access (untuk reviewer Play)

Aplikasi memerlukan login. Gunakan akun demo berikut:

| Peran | Email | Password |
|---|---|---|
| HRD / Admin | hrd@hadirku.demo | DemoHadirku2026! |
| Karyawan | karyawan@hadirku.demo | DemoHadirku2026! |
| HOD | hod@hadirku.demo | DemoHadirku2026! |

Petunjuk untuk reviewer:

1. Login sebagai **Karyawan** untuk melihat beranda absensi, riwayat, jadwal, izin/cuti, klaim makan, training, dan profil.
2. Login sebagai **HRD** untuk melihat dashboard, persetujuan, data karyawan, laporan, penggajian, dan pengaturan.
3. Login sebagai **HOD** untuk melihat persetujuan, jadwal, laporan, dan training tanpa akses penggajian/pengaturan.

Catatan: absensi nyata memerlukan izin kamera dan lokasi. Data demo dapat berubah atau direset.

## Data safety (draf untuk diisi di Play Console)

Bagian ini harus diverifikasi dengan kebijakan perusahaan dan legal.

### Data yang dikumpulkan

| Jenis data | Contoh | Tujuan | Wajib? |
|---|---|---|---|
| Informasi pribadi | Nama, email, telepon, alamat, NIK, nomor KTP | Akun, kepegawaian, verifikasi | Ya, untuk karyawan |
| Informasi keuangan | Nama bank, nomor rekening, gaji, tunjangan, potongan | Penggajian internal | Ya, untuk payroll |
| Foto | Selfie absensi, foto profil, foto KTP, lampiran pengajuan | Bukti kehadiran dan verifikasi | Ya, sesuai fitur |
| Lokasi presisi | Koordinat saat absensi | Validasi radius/geofence | Ya, saat absensi |
| ID perangkat | Device key untuk binding absensi | Keamanan absensi | Ya, saat absensi |
| Aktivitas aplikasi | Absensi, pengajuan, klaim makan, training, payroll | Operasional HR | Ya |

### Praktik

- Data dienkripsi saat transit menggunakan HTTPS.
- Data tidak dijual.
- Akses dibatasi berdasarkan peran di server.
- Penyedia layanan yang dipakai: hosting/aplikasi (Vercel), database (Neon/PostgreSQL), email opsional (Resend), dan penyedia verifikasi wajah opsional jika diaktifkan perusahaan.
- Penghapusan data: karyawan dapat menghubungi HRD/Admin perusahaan. Aplikasi belum menyediakan tombol hapus akun mandiri.
- Data disimpan sesuai kebijakan retensi perusahaan.

### Jawaban deklarasi umum

- Iklan: **Tidak**
- In-app purchase: **Tidak**
- Fitur keuangan: **Tidak** (payroll hanya pencatatan internal, bukan transfer bank/kredit)
- Konten buatan pengguna yang publik: **Tidak**
- Aplikasi pemerintah: **Tidak**
- Berita: **Tidak**
- Kesehatan: **Tidak**
- COVID-19: **Tidak**

## Content rating dan target audiens

- Target audiens: **18 tahun ke atas** (karyawan perusahaan).
- Aplikasi bukan untuk anak-anak.
- Tidak ada kekerasan, konten seksual, judi, alkohol, atau konten dewasa.
- Isi kuesioner content rating sesuai kondisi sebenarnya.

## Privacy policy

- URL publik: **https://absensi-karyawan-gray.vercel.app/privacy**
- Halaman sumber: `ngodingpakeai-starter/src/app/privacy/page.tsx`
- Data perusahaan: `ngodingpakeai-starter/src/config/privacy.ts`
- Draf teks: `store-listing/privacy-policy-draft.md`
- Sebelum submit ke Play Console, ganti placeholder alamat, email, dan telepon
  di `src/config/privacy.ts`, lalu deploy ulang.
- Play Console memerlukan **URL HTTPS publik**; halaman `/privacy` sudah memenuhi
  syarat tersebut setelah placeholder dilengkapi.

## Aset store listing

| Aset | File | Spesifikasi |
|---|---|---|
| App icon | `store-listing/icon-512.png` | 512×512 PNG |
| Feature graphic | `store-listing/feature-graphic.png` | 1024×500 PNG |
| Screenshot 1 | `store-listing/screenshots/01-beranda-karyawan.png` | 1080×1920 |
| Screenshot 2 | `store-listing/screenshots/02-riwayat-absensi.png` | 1080×1920 |
| Screenshot 3 | `store-listing/screenshots/03-pengajuan-izin-cuti.png` | 1080×1920 |
| Screenshot 4 | `store-listing/screenshots/04-klaim-makan.png` | 1080×1920 |
| Screenshot 5 | `store-listing/screenshots/05-data-karyawan.png` | 1080×1920 |
| Screenshot 6 | `store-listing/screenshots/06-persetujuan-pengajuan.png` | 1080×1920 |
| Screenshot 7 | `store-listing/screenshots/07-laporan-kehadiran.png` | 1080×1920 |
| Screenshot 8 | `store-listing/screenshots/08-penggajian.png` | 1080×1920 |

## Langkah upload ke Play Console

1. Buka [Google Play Console](https://play.google.com/console) dan buat aplikasi baru:
   - Nama: **Hadirku Lecarassa**
   - Bahasa default: **Indonesia**
   - Aplikasi, gratis.
2. Isi **App access**:
   - Pilih “All or some functionality is restricted”.
   - Masukkan akun demo HRD/Karyawan/HOD di atas beserta petunjuk singkat.
3. Isi deklarasi:
   - Ads: No
   - Content rating: isi kuesioner
   - Target audience: 18+
   - Data safety: gunakan draf di atas, verifikasi dengan legal
   - Financial features: No (payroll internal)
   - Government apps: No
   - News apps: No
   - Health apps: No
4. Isi **Store listing**:
   - Short description dan full description dari dokumen ini.
   - App icon, feature graphic, dan 8 screenshot.
   - Kategori: Business.
   - Email kontak dan website perusahaan.
   - URL privacy policy.
5. Buat **Internal testing**:
   - Upload `app-release.aab`.
   - Tambahkan release notes versi 1.2.
   - Undang tester internal.
   - Rollout.
6. Setelah build tersedia:
   - Install dari Play Store di HP fisik.
   - Uji login karyawan/HRD/HOD, absensi kamera + GPS, izin/cuti, laporan, dan payroll.
   - Periksa izin kamera/lokasi dan tampilan notch/safe area.
7. Jika stabil, promosikan ke **Closed testing** lalu **Production**.
8. Simpan keystore dan file kredensial — tanpa keduanya, update aplikasi tidak bisa dilakukan.

## Catatan Play App Signing

- AAB saat ini ditandatangani dengan upload key lokal.
- Jika memakai **Play App Signing**, Google menyimpan app signing key dan developer menyimpan upload key.
- Jangan kehilangan upload key; simpan backup di tempat aman.
- Jangan commit keystore, `keystore.properties`, atau file password ke Git.
