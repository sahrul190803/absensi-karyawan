## Hadirku Lecarassa iOS 1.2 (Unsigned)

> **PENTING:** IPA ini **unsigned**. Tidak bisa diinstall langsung dan tidak
> tersedia di App Store. Gunakan Sideloadly atau AltStore dengan Apple ID Anda
> untuk menandatangani dan memasangnya di iPhone/iPad sendiri.

Build dibuat di GitHub Actions macOS 26 (Xcode 26) dari source yang sama dengan
versi Android 1.2.

### File IPA

- Nama: `hadirku-ios-unsigned-1.2.ipa`
- Bundle ID: `id.lecarassa.hadirku`
- Version: 1.2 (build 3)
- Ukuran: 1.533.393 byte (±1.5 MB)
- SHA-256: `C4C2FF4D11EC9A5755560ADBC3C9F96EC2A537FA4DCCE3E32CA88064B761B0FF`

### Cara install dari Windows

1. Install **iTunes** atau **Apple Devices** dari Microsoft Store agar driver
   iPhone tersedia.
2. Install [Sideloadly](https://sideloadly.io/) atau AltStore.
3. Hubungkan iPhone dengan kabel USB dan pilih **Trust**.
4. Buka Sideloadly, masukkan IPA ini, lalu masukkan Apple ID Anda.
5. Klik **Start**. Sideloadly akan membuat sertifikat development gratis.
6. Di iPhone, buka **Settings → General → VPN & Device Management**, lalu
   percayai developer certificate.
7. Buka aplikasi.

### Batasan

- Apple ID gratis: aplikasi berlaku sekitar **7 hari**, lalu harus di-sign ulang.
- Hanya untuk perangkat sendiri; bukan TestFlight/App Store.
- Push notification APNs belum dikonfigurasi.
- Untuk TestFlight/App Store diperlukan Apple Developer Program berbayar
  (±US$99/tahun).
- Jangan install IPA dari sumber lain. Verifikasi SHA-256 di atas.

### Sumber build

Workflow: `.github/workflows/ios-build.yml`  
Run: https://github.com/sahrul190803/absensi-karyawan/actions/runs/44188803594
