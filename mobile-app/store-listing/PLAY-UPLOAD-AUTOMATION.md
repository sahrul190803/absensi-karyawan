# Upload AAB ke Play Console via Service Account

Script: `mobile-app/scripts/play-upload.mjs`  
NPM scripts: `play:upload`, `play:dry-run`

Script ini membuat Play edit, mengunggah AAB, mengisi track, lalu commit.
Store listing, deklarasi App content, dan tester tetap diatur di Play Console.

## Status saat ini

- AAB siap: `android/app/build/outputs/bundle/release/app-release.aab`
- Version: 1.2 (versionCode 3)
- Service account Play Console: **belum tersedia di mesin ini**
- HP fisik untuk uji Play Store: **belum terhubung**
- Upload dan promosi belum dijalankan

## 1. Buat aplikasi di Play Console

Script tidak bisa membuat aplikasi baru. Buat dulu aplikasi
**Hadirku Lecarassa** di Play Console dengan package `id.lecarassa.hadirku`,
lalu selesaikan App content minimal.

## 2. Buat service account Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat atau pilih project.
3. Buka **APIs & Services → Library**.
4. Cari **Google Play Android Developer API**.
5. Klik **Enable**.
6. Buka **IAM & Admin → Service Accounts → Create service account**.
7. Nama: `hadirku-play-upload`.
8. Setelah dibuat, buka tab **Keys → Add key → Create new key → JSON**.
9. Simpan file JSON **di luar repo**, misalnya:
   `C:\Users\user\orca\projects\absensi-karyawan-backups\play-service-account.json`

Jangan commit file JSON tersebut. File itu memberi akses merilis aplikasi.

## 3. Beri akses di Play Console

1. Buka **Play Console → Users and permissions → Invite new users**.
2. Masukkan email service account (berakhiran
   `@...iam.gserviceaccount.com`).
3. Beri akses aplikasi **Hadirku Lecarassa**.
4. Minimal untuk Internal Testing:
   - View app information and download bulk reports
   - Manage testing tracks
   - Release to testing tracks
5. Untuk Closed/Open Testing: izin testing tracks yang sama.
6. Untuk Production: tambahkan **Release to production, exclude devices,
   and use Play App Signing**.
7. Kirim undangan. Service account tidak perlu menerima email; akses langsung
   aktif setelah disimpan.

## 4. Set environment variable

PowerShell:

```powershell
$env:PLAY_SERVICE_ACCOUNT_JSON = "C:\Users\user\orca\projects\absensi-karyawan-backups\play-service-account.json"
```

Jangan menaruh path atau isi JSON di file yang di-commit.

## 5. Cek tanpa upload

```powershell
cd mobile-app
npm run play:dry-run -- --track internal --version-code 3
```

Output menampilkan path AAB, ukuran, track, dan release notes tanpa memanggil
Google API.

## 6. Upload ke Internal Testing

```powershell
cd mobile-app
npm run play:upload -- --track internal --version-code 3
```

Yang dilakukan script:

1. Membuat Play edit.
2. Mengunggah `app-release.aab`.
3. Mengisi track `internal` dengan release `completed`.
4. Menambahkan release notes `id-ID` dari
   `store-listing/release-notes-1.2.txt`.
5. Commit edit.
6. Menghapus edit jika terjadi error sebelum commit.

Setelah berhasil:

1. Buka **Play Console → Testing → Internal testing**.
2. Tambahkan tester dan email list.
3. Salin opt-in link.
4. Install dari Play Store di HP tester.

## 7. Closed testing

Setelah Internal Testing stabil:

```powershell
npm run play:upload -- --track alpha --version-code 3
```

Track `alpha` adalah **Closed testing** di Play Console. Tambahkan tester di
Play Console dan rollout.

## 8. Open testing

```powershell
npm run play:upload -- --track beta --version-code 3
```

Track `beta` adalah **Open testing**.

## 9. Production

Hanya setelah semua pengujian dan deklarasi selesai:

```powershell
npm run play:upload -- --track production --version-code 3
```

Release production dapat memerlukan review Google. Jangan jalankan sebelum
privacy policy, data safety, store listing, dan hasil uji internal siap.

## Troubleshooting

| Error | Kemungkinan penyebab |
|---|---|
| 401 Unauthorized | Service account JSON salah atau Android Publisher API belum aktif |
| 403 Forbidden | Service account belum diundang di Play Console atau izin kurang |
| 404 Not Found | Aplikasi belum dibuat atau package name salah |
| Version code already used | Naikkan `versionCode`, build AAB baru |
| App bundle was signed with wrong key | Gunakan upload key yang sama; jangan ganti keystore |
| Release not allowed | App content/declarations belum lengkap |
| `PLAY_SERVICE_ACCOUNT_JSON` not found | Path JSON salah atau env belum di-set |
| AAB not found | Jalankan `bundleRelease` terlebih dahulu |

## Keamanan

- Jangan commit service account JSON.
- Jangan kirim isi JSON lewat chat.
- Simpan backup di tempat aman.
- Jika file bocor, revoke key di Google Cloud lalu buat key baru.
- Service account sebaiknya hanya diberi akses aplikasi yang diperlukan.
