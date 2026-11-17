# Store Listing Assets — Hadirku Lecarassa

Aset untuk listing Google Play Console.

## Isi folder

| File | Spesifikasi | Fungsi |
|---|---|---|
| `icon-512.png` | 512×512 PNG | App icon Play Store |
| `feature-graphic.png` | 1024×500 PNG | Feature graphic |
| `screenshots/01-beranda-karyawan.png` | 1080×1920 PNG | Screenshot 1 |
| `screenshots/02-riwayat-absensi.png` | 1080×1920 PNG | Screenshot 2 |
| `screenshots/03-pengajuan-izin-cuti.png` | 1080×1920 PNG | Screenshot 3 |
| `screenshots/04-klaim-makan.png` | 1080×1920 PNG | Screenshot 4 |
| `screenshots/05-data-karyawan.png` | 1080×1920 PNG | Screenshot 5 |
| `screenshots/06-persetujuan-pengajuan.png` | 1080×1920 PNG | Screenshot 6 |
| `screenshots/07-laporan-kehadiran.png` | 1080×1920 PNG | Screenshot 7 |
| `screenshots/08-penggajian.png` | 1080×1920 PNG | Screenshot 8 |
| `screenshots/alternates/05-dashboard-admin.png` | 1080×1920 PNG | Alternatif screenshot dashboard |
| `play-store-listing.md` | Teks | Judul, deskripsi, data safety, panduan upload |
| `privacy-policy-draft.md` | Teks | Draf kebijakan privasi |
| `feature-graphic.html` | HTML | Sumber feature graphic |

## Urutan screenshot yang disarankan

1. Beranda karyawan — status absensi dan menu utama.
2. Riwayat absensi — bukti kehadiran dan foto.
3. Izin & cuti — pengajuan dan status.
4. Klaim makan — klaim harian.
5. Data karyawan — pencarian dan verifikasi akun.
6. Persetujuan — approval HOD/HRD.
7. Laporan — rekap kehadiran dan export.
8. Penggajian — periode dan rincian gaji.

## Sumber dan regenerasi

- Screenshot diambil dari aplikasi mobile yang berjalan dengan backend production.
- Viewport capture: 360×640 CSS px, device scale factor 3 → 1080×1920.
- Feature graphic dibuat dari HTML/CSS dan screenshot asli.
- Ikon berasal dari `mobile-app/resources/icon.png` yang diperkecil ke 512×512.

## Catatan

- Jangan memakai data pribadi nyata pada screenshot.
- Ganti screenshot jika ada perubahan UI besar.
- Feature graphic dan ikon sudah memakai warna brand `#E4F222`.
- File ini tidak mengandung password atau kredensial produksi.
