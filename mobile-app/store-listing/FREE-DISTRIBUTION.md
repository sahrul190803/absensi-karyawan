# Distribusi Gratis — Hadirku Lecarassa

Status: **publikasi ke Play Store dan App Store ditunda** karena biaya akun
developer. Aplikasi tidak diupload ke store mana pun.

## Biaya store (bukan gratis)

| Platform | Biaya | Sifat |
|---|---|---|
| Google Play Console | ± US$25 (± Rp400.000) | Sekali bayar saat registrasi |
| Apple Developer Program | ± US$99/tahun (± Rp1.650.000) | Tahunan |
| TestFlight / App Store | Termasuk Apple Developer Program | Butuh akun berbayar |

Catatan:

- Google Play tidak menyediakan jalur gratis umum untuk akun developer baru.
- Apple hanya menyediakan provisioning gratis untuk development di perangkat
  sendiri (berlaku sekitar 7 hari), bukan TestFlight/App Store.
- Harga dapat berubah dan belum termasuk pajak/biaya bank.

## Distribusi Android gratis

Link download resmi:

- Halaman download: **https://absensi-karyawan-gray.vercel.app/download**
- GitHub Release: **https://github.com/sahrul190803/absensi-karyawan/releases/tag/v1.2**
- File: `hadirku-lecarassa-1.2.apk`

APK release sudah ditandatangani dan siap dibagikan:

`mobile-app/android/app/build/outputs/apk/release/app-release.apk`

Spesifikasi:

- Package: `id.lecarassa.hadirku`
- Version: 1.2 (versionCode 3)
- Ukuran: 8.425.031 byte (±8.4 MB)
- SHA-256:
  `3578D277B013080F4269A3B2C68C32C506C21632D8A88738F3021C4D1D97DADF`

### Cara bagi APK

Pilih salah satu yang gratis:

1. **Google Drive / OneDrive** — upload APK, bagikan link ke karyawan.
2. **WhatsApp / Telegram** — kirim file APK langsung ke grup internal.
3. **USB / kabel data** — copy APK ke HP, lalu install.
4. **GitHub Releases** — gratis untuk repo publik; cocok jika ingin link
   download yang rapi.
5. **Firebase App Distribution** — gratis, butuh project Firebase; tester
   menerima undangan dan update.

### Cara install di HP

1. Kirim APK ke HP.
2. Buka file APK.
3. Jika diminta, aktifkan **Install unknown apps** untuk aplikasi file manager
   atau browser yang dipakai.
4. Install.
5. Saat pertama dibuka, izinkan kamera dan lokasi.

### Update aplikasi

1. Naikkan `versionCode` dan `versionName` di
   `mobile-app/android/app/build.gradle`.
2. Build ulang release APK.
3. Bagikan APK baru.
4. Karyawan install di atas aplikasi lama. Data dan sesi tetap tersimpan karena
   package name dan signing key sama.

Jangan mengganti keystore. APK dengan signing key berbeda tidak bisa
menggantikan aplikasi lama; pengguna harus uninstall dulu.

## Distribusi iOS

Build iOS unsigned sudah tersedia dari GitHub Actions macOS 26 (Xcode 26):

- Release: https://github.com/sahrul190803/absensi-karyawan/releases/tag/ios-v1.2-unsigned
- File: `hadirku-ios-unsigned-1.2.ipa`
- Ukuran: 1.533.393 byte
- SHA-256:
  `C4C2FF4D11EC9A5755560ADBC3C9F96EC2A537FA4DCCE3E32CA88064B761B0FF`

Cara install dari Windows:

1. Install iTunes/Apple Devices dan Sideloadly atau AltStore.
2. Hubungkan iPhone dengan kabel USB.
3. Masukkan IPA dan Apple ID ke Sideloadly/AltStore.
4. Percayai sertifikat developer di Settings → General → VPN & Device
   Management.
5. Apple ID gratis berlaku sekitar 7 hari; sign ulang setelah kedaluwarsa.

Batasannya:

- Bukan TestFlight/App Store.
- Hanya untuk perangkat sendiri dengan Apple ID gratis.
- Push notification APNs belum dikonfigurasi.
- Untuk TestFlight/App Store tetap diperlukan Apple Developer Program berbayar
  dan signing resmi.

## Yang tetap gratis

- Backend production di Vercel dan Neon selama masih dalam kuota gratis.
- Privacy policy di `/privacy`.
- APK Android untuk distribusi internal.
- IPA iOS unsigned lewat GitHub Actions dan Sideloadly/AltStore.
- Halaman download adaptif di `/download`.

## Jika nanti ingin ke Play Store

Semua sudah siap:

- AAB release: `mobile-app/android/app/build/outputs/bundle/release/app-release.aab`
- Store listing: ikon, feature graphic, 8 screenshot, deskripsi.
- Privacy policy: `https://absensi-karyawan-gray.vercel.app/privacy`
- Panduan upload: `PLAY-CONSOLE-INTERNAL-TESTING.md`
- Otomasi upload: `PLAY-UPLOAD-AUTOMATION.md`

Cukup daftar dan bayar Google Play Console, isi App content, lalu upload AAB.
