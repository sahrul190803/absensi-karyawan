# Android Release Signing — Hadirku Lecarassa

Tanggal: 17 November 2026  
Status: keystore release dan AAB berhasil dibuat.

## Artefak

| Artefak | Path | Ukuran |
|---|---|---|
| AAB release | `mobile-app/android/app/build/outputs/bundle/release/app-release.aab` | 7.421.485 byte |
| APK release | `mobile-app/android/app/build/outputs/apk/release/app-release.apk` | 8.425.031 byte |
| Keystore | `mobile-app/android/app/release.keystore` | lokal, tidak di-commit |
| Properti signing | `mobile-app/android/keystore.properties` | lokal, tidak di-commit |
| Backup kredensial | `C:\Users\user\orca\projects\absensi-karyawan-backups\hadirku-release-keystore-credentials.txt` | di luar repo |

## Identitas signing

- Alias: `hadirku`
- Algoritma: RSA 2048-bit
- Masa berlaku: 10.000 hari
- Certificate DN:
  `CN=Hadirku Lecarassa, OU=Mobile, O=Lecarassa, L=Bandung, ST=Jawa Barat, C=ID`
- SHA-256 certificate:
  `09:58:35:A5:EA:E2:A5:4D:14:90:E6:7C:A8:7F:04:32:D9:3B:C0:94:15:D0:9C:52:1F:0D:44:66:92:36:37:A0`

## Peringatan penting

- Jangan commit `release.keystore`, `keystore.properties`, atau file kredensial.
- Simpan backup keystore dan password di tempat aman. Jika keduanya hilang,
  aplikasi yang sudah terpasang **tidak bisa diperbarui** di Play Store.
- Jangan memakai debug keystore untuk build release.
- File kredensial berisi password; jangan dikirim lewat chat, email, atau Git.

## Build ulang

```powershell
$env:JAVA_HOME = "C:\Users\user\orca\tools\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

cd mobile-app
npm run build
npx cap sync android
cd android
.\gradlew.bat bundleRelease assembleRelease --no-daemon
```

Gradle membaca `android/keystore.properties` jika ada. Tanpa file itu, build
release tetap bisa dijalankan tetapi tidak ditandatangani dengan keystore
release.

## Verifikasi

```powershell
# Certificate APK release
& "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat" verify --print-certs `
  app\build\outputs\apk\release\app-release.apk

# AAB
& "$env:JAVA_HOME\bin\jarsigner.exe" -verify `
  app\build\outputs\bundle\release\app-release.aab
```

Hasil yang sudah diperiksa:

- APK release: signature valid, sertifikat cocok dengan SHA-256 di atas.
- AAB: `jar verified` (self-signed certificate adalah hal normal untuk Android).
- Package: `id.lecarassa.hadirku`
- Version: `1.2` (versionCode `3`)
- Release tidak debuggable.

## Store listing

Aset dan teks Play Store tersedia di `mobile-app/store-listing/`:

- ikon 512×512,
- feature graphic 1024×500,
- 8 screenshot 1080×1920,
- short/full description,
- data safety draft,
- draf kebijakan privasi,
- panduan upload di `play-store-listing.md`.

## Upload ke Play Console

1. Buka Play Console → aplikasi Hadirku Lecarassa.
2. Buat rilis di **Internal testing** terlebih dahulu.
3. Upload `app-release.aab`.
4. Isi catatan rilis, data safety, privacy policy, dan screenshot.
5. Undang tester internal dan uji instalasi dari Play Store.
6. Setelah stabil, promosikan ke Closed/Production testing.

AAB ini belum diuji interaktif di perangkat. Lakukan internal testing sebelum
rilis produksi.

## Versi berikutnya

Naikkan `versionCode` dan `versionName` di:

- `mobile-app/android/app/build.gradle`
- `mobile-app/ios/App/App.xcodeproj/project.pbxproj`
  (`CURRENT_PROJECT_VERSION` dan `MARKETING_VERSION`)

Lalu build ulang AAB/APK release.
