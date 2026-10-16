# Akun demo lokal

Akun ini dibuat untuk demo di database pengembangan (`npm run dev`).
Kata sandi semua akun: `DemoHadirku2026!`

| Peran    | Email                   | Nama           | Data karyawan                              |
| -------- | ----------------------- | -------------- | ------------------------------------------ |
| HRD      | hrd@hadirku.demo        | Rina Kartika   | NIK DEMO-HRD, HRD, lintas divisi           |
| HOD      | hod@hadirku.demo        | Hendra Wijaya  | Kitchen, Head Kitchen, Gudang Cikarang     |
| Marketing| marketing@hadirku.demo  | Maya Sari      | Marketing, Digital Marketing, Kantor Pusat |
| Karyawan | karyawan@hadirku.demo   | Andi Pratama   | Kitchen, Cook, Gudang Cikarang             |

Catatan:

- Email domain `.demo` tidak dipakai untuk produksi. Ganti kata sandi bila
  akun ini dipakai di lingkungan yang bisa diakses orang lain.
- Akun dan data karyawan dibuat lewat sign-up API aplikasi, lalu peran diatur
  dengan pola `npm run role:set -- <email> <role>`.
- Jika database lokal di-reset, jalankan ulang pembuatan akun demo (sign-up di
  aplikasi + `npm run employee:link -- <email>` atau skrip pembuat akun).
