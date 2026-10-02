# PRD FINAL v1.0 --- HADIRKU

## Sistem Absensi Karyawan Berbasis Kamera + GPS/Geofencing

> Dokumen ini merupakan versi final yang telah dirapikan dari PRD
> HadirKu yang dibuat sebelumnya. Fokus utama tetap: foto selfie,
> GPS/geofencing, server timestamp, device binding, jadwal kerja, hari
> libur, pengajuan HR, laporan, audit log, dan keamanan.

------------------------------------------------------------------------

## 1. Ringkasan Produk

HadirKu adalah sistem absensi karyawan berbasis web/PWA yang
memungkinkan karyawan melakukan check-in dan check-out menggunakan
**kamera perangkat dan lokasi GPS**.

Absensi normal hanya dianggap berhasil apabila:

1.  akun karyawan aktif;
2.  karyawan mempunyai jadwal kerja yang berlaku;
3.  tanggal bukan hari libur yang tidak mewajibkan kerja;
4.  kamera dapat digunakan untuk mengambil foto secara langsung;
5.  lokasi GPS tersedia dan memenuhi batas akurasi;
6.  posisi berada di dalam radius lokasi kerja;
7.  waktu ditentukan oleh server;
8.  tidak terdapat absensi duplikat;
9.  request lolos autentikasi, otorisasi, validasi payload, dan
    pemeriksaan keamanan.

Bukti absensi minimal mencakup waktu server, foto, koordinat, akurasi
GPS, jarak dari titik kerja, lokasi kerja, perangkat, dan status.

### Nilai utama

-   Mengurangi risiko titip absen melalui kombinasi foto, lokasi, waktu
    server, dan device binding.
-   Mengotomatisasi rekap kehadiran.
-   Memudahkan HR mengelola jadwal, shift, lokasi, hari libur,
    pengajuan, approval, dan laporan.
-   Mendukung multi-lokasi dan shift malam.
-   Memisahkan fitur MVP dari fitur advanced seperti face verification
    dan offline mode.

------------------------------------------------------------------------

# 2. Masalah yang Diselesaikan

Sistem ditujukan untuk mengatasi:

-   titip absen;
-   absensi dari luar lokasi kerja;
-   manipulasi jam perangkat;
-   rekap manual yang lambat;
-   sulitnya membuktikan kehadiran;
-   pengelolaan hari libur yang tidak konsisten;
-   proses izin/cuti/sakit/dinas/lembur yang masih manual;
-   perubahan absensi tanpa jejak audit.

------------------------------------------------------------------------

# 3. Tujuan

### Tujuan MVP

-   Login dan RBAC.
-   Data karyawan.
-   Jadwal dan shift.
-   Lokasi kerja dan geofence.
-   Kamera absensi.
-   Check-in/check-out.
-   Riwayat absensi.
-   Hari libur.
-   Perhitungan hadir/terlambat/pulang cepat/alpha.
-   Koreksi absensi.
-   Dashboard dasar.
-   Laporan dasar.
-   Audit log dasar.

### Tujuan tahap berikutnya

-   Izin, sakit, cuti, dinas luar, lembur.
-   Approval workflow.
-   Notifikasi/reminder.
-   Multi-location.
-   Device management.
-   Face verification/liveness.
-   Offline mode.
-   Payroll integration.

------------------------------------------------------------------------

# 4. Non-Goals MVP

Fitur berikut tidak wajib pada MVP:

-   Face recognition penuh.
-   Liveness detection.
-   Offline attendance.
-   Payroll.
-   Multi-company/multi-tenant.
-   Advanced ML anti-fraud.

Fondasi arsitektur tetap harus memungkinkan fitur tersebut ditambahkan
kemudian.

------------------------------------------------------------------------

# 5. Role dan Hak Akses

## Super Admin

Dapat:

-   mengelola semua konfigurasi;
-   mengelola user dan role;
-   mengelola lokasi;
-   mengelola jadwal/shift;
-   mengelola hari libur;
-   melihat laporan;
-   melihat audit log;
-   mengelola device;
-   mengelola konfigurasi sistem.

## HR/Admin

Dapat:

-   mengelola karyawan;
-   mengelola departemen/jabatan;
-   mengelola lokasi kerja;
-   mengelola jadwal/shift;
-   mengelola hari libur;
-   melihat dan mengoreksi absensi sesuai permission;
-   memproses approval;
-   melihat laporan.

## Karyawan

Dapat:

-   login/logout;
-   melihat jadwal;
-   check-in/check-out;
-   melihat riwayat pribadi;
-   melihat bukti absensi;
-   mengajukan koreksi;
-   mengajukan izin/sakit/cuti/dinas/lembur;
-   melihat status pengajuan;
-   melihat notifikasi;
-   mengelola profil yang diizinkan.

Semua akses wajib diperiksa server-side menggunakan RBAC.

------------------------------------------------------------------------

# 6. Core Attendance

## 6.1 Check-in

Flow:

LOGIN → CEK AKUN → CEK JADWAL → CEK HARI LIBUR → AMBIL GPS → VALIDASI
AKURASI → HITUNG GEOFENCE → BUKA KAMERA → AMBIL FOTO LANGSUNG → VALIDASI
FOTO → CEK DUPLIKAT → SERVER TIMESTAMP → TENTUKAN STATUS → SIMPAN →
TAMPILKAN BUKTI

## 6.2 Check-out

Flow:

LOGIN → CEK CHECK-IN → AMBIL GPS → VALIDASI AKURASI → GEOFENCE → BUKA
KAMERA → AMBIL FOTO → VALIDASI → SERVER TIMESTAMP → HITUNG DURASI →
HITUNG PULANG CEPAT/LEMBUR → SIMPAN

------------------------------------------------------------------------

# 7. Kamera

Kamera adalah bagian wajib untuk absensi normal.

### Aturan

-   Gunakan `MediaDevices.getUserMedia()`.
-   Foto harus diambil dari kamera saat proses absensi.
-   Upload foto dari galeri tidak boleh menjadi metode absensi normal.
-   Tampilkan preview kamera.
-   Sediakan retake sebelum submit.
-   Kompres foto dengan ukuran yang wajar.
-   Validasi MIME type dan ukuran file di server.
-   Simpan foto pada object storage, bukan sebagai blob besar di tabel
    attendance.

Jika browser/perangkat tidak memberikan permission kamera, absensi gagal
dengan pesan yang jelas.

### Data foto

-   attendance_id;
-   tipe `check_in` atau `check_out`;
-   storage key/URL;
-   ukuran;
-   MIME type;
-   created_at.

Face verification dan liveness merupakan fitur future, bukan syarat MVP.

------------------------------------------------------------------------

# 8. GPS dan Geofencing

Setiap lokasi kerja memiliki:

-   nama;
-   alamat;
-   latitude;
-   longitude;
-   radius meter;
-   status aktif.

### Validasi lokasi

Sistem menghitung jarak antara koordinat karyawan dan titik lokasi kerja
menggunakan perhitungan jarak geografis/Haversine.

Contoh konfigurasi awal:

-   radius: 100 meter;
-   batas akurasi GPS: 50 meter.

**Angka tersebut harus configurable**, bukan hard-coded.

Jika akurasi GPS \> batas konfigurasi:

> Lokasi belum cukup akurat. Silakan aktifkan lokasi dengan akurasi
> tinggi dan coba lagi.

Jika jarak \> radius:

> Anda berada di luar area kerja.

Jika jarak \<= radius dan akurasi memenuhi batas:

> Lokasi valid.

Server harus menghitung ulang jarak berdasarkan koordinat yang diterima.
Jangan mempercayai nilai `distance` yang dikirim client.

### Catatan anti-spoofing

Aplikasi web tidak boleh menjanjikan deteksi fake GPS 100%. Sistem hanya
melakukan mitigasi berdasarkan kemampuan platform, misalnya:

-   server-side geofence;
-   GPS accuracy;
-   device binding;
-   anomaly logging;
-   rate limiting;
-   audit log;
-   pemeriksaan pola tidak wajar.

Deteksi mock location yang lebih kuat dapat ditambahkan jika aplikasi
native/mobile digunakan.

------------------------------------------------------------------------

# 9. Server Timestamp

Server merupakan sumber waktu resmi.

Client tidak boleh menentukan waktu resmi absensi.

Simpan:

-   `server_timestamp`;
-   timezone organisasi;
-   optional client timestamp untuk debugging.

Status terlambat/pulang cepat dihitung dari server timestamp + jadwal
yang berlaku.

------------------------------------------------------------------------

# 10. Jadwal dan Shift

Sistem mendukung:

-   jadwal harian;
-   jadwal mingguan;
-   shift;
-   shift malam;
-   shift melewati tengah malam;
-   lokasi kerja per jadwal;
-   toleransi keterlambatan;
-   toleransi pulang cepat.

Contoh:

Shift Pagi: 08:00--17:00

Toleransi: 15 menit

08:10 → Hadir 08:20 → Terlambat

Untuk shift 22:00--06:00, tanggal kerja harus memiliki aturan bisnis
yang jelas agar check-out pukul 06:00 tidak dianggap sebagai tanggal
baru yang salah.

------------------------------------------------------------------------

# 11. Hari Libur dan Kalender Kerja

Admin dapat mengelola:

-   libur nasional;
-   libur perusahaan;
-   cuti bersama;
-   hari kerja khusus;
-   hari kerja pengganti.

Data hari libur:

-   tanggal;
-   nama;
-   tipe;
-   deskripsi;
-   aktif/tidak;
-   `allow_work`.

### Aturan

Jika hari merupakan hari libur aktif dan `allow_work=false`:

-   karyawan tidak wajib absensi;
-   tidak ada Alpha otomatis.

Jika `allow_work=true`:

-   absensi diperbolehkan;
-   dapat dikategorikan sebagai kerja hari libur;
-   perhitungan lembur mengikuti aturan perusahaan.

------------------------------------------------------------------------

# 12. Status Kehadiran

Pisahkan status kehadiran dari status pengajuan.

### Attendance status

-   `PRESENT`
-   `LATE`
-   `EARLY_LEAVE`
-   `ALPHA`
-   `HOLIDAY_WORK`

### Request type

-   `PERMISSION`
-   `SICK`
-   `LEAVE`
-   `BUSINESS_TRIP`
-   `OVERTIME`

### Request status

-   `PENDING`
-   `APPROVED`
-   `REJECTED`
-   `CANCELLED`

Jangan menjadikan izin, sakit, dan cuti sebagai status attendance yang
bercampur dengan status hadir.

------------------------------------------------------------------------

# 13. Perhitungan Alpha

Alpha hanya dapat ditetapkan jika:

1.  tanggal merupakan hari kerja;
2.  karyawan mempunyai jadwal;
3.  tidak ada check-in yang sah;
4.  tidak ada izin approved;
5.  tidak ada sakit approved;
6.  tidak ada cuti approved;
7.  tidak ada dinas approved;
8.  bukan hari libur yang tidak mewajibkan kerja.

Proses penentuan Alpha sebaiknya dijalankan melalui job terjadwal
setelah batas waktu yang ditentukan perusahaan, bukan langsung pada awal
hari.

------------------------------------------------------------------------

# 14. Izin, Sakit, Cuti, Dinas, Lembur

Karyawan dapat membuat pengajuan dengan:

-   jenis;
-   tanggal mulai;
-   tanggal selesai;
-   alasan;
-   lampiran;
-   catatan.

Workflow:

PENDING → REVIEW → APPROVED / REJECTED

Approval wajib mencatat:

-   approver;
-   waktu keputusan;
-   keputusan;
-   catatan.

Pengajuan yang approved harus memengaruhi perhitungan kehadiran sesuai
business rule.

------------------------------------------------------------------------

# 15. Koreksi Absensi

Karyawan dapat mengajukan koreksi dengan alasan.

HR/Admin yang memiliki permission dapat:

-   menyetujui;
-   menolak.

Perubahan attendance tidak boleh dilakukan diam-diam.

Audit log harus menyimpan:

-   nilai sebelum;
-   nilai sesudah;
-   siapa yang mengubah;
-   alasan;
-   waktu.

------------------------------------------------------------------------

# 16. Device Binding

Sistem dapat mendaftarkan device.

Data:

-   device_id;
-   user_id;
-   OS;
-   model jika tersedia;
-   last_login;
-   trusted status.

Jika device baru:

-   minta verifikasi tambahan atau;
-   blokir sesuai konfigurasi.

Device binding adalah mitigasi, bukan jaminan mutlak bahwa satu orang
tidak dapat berganti perangkat.

------------------------------------------------------------------------

# 17. Dashboard Karyawan

Menampilkan:

-   jadwal hari ini;
-   status absensi;
-   jam masuk;
-   jam pulang;
-   durasi kerja;
-   status terlambat;
-   lokasi kerja;
-   jarak saat absensi;
-   riwayat;
-   pengajuan;
-   notifikasi.

Tombol utama:

**ABSEN MASUK** atau **ABSEN PULANG**

------------------------------------------------------------------------

# 18. Dashboard HR/Admin

Menampilkan:

-   total karyawan;
-   hadir;
-   terlambat;
-   belum absen;
-   Alpha;
-   izin;
-   sakit;
-   cuti;
-   dinas;
-   lembur;
-   kerja hari libur.

Filter:

-   tanggal;
-   departemen;
-   karyawan;
-   lokasi;
-   status.

------------------------------------------------------------------------

# 19. Laporan

Laporan:

-   harian;
-   mingguan;
-   bulanan;
-   per karyawan;
-   per departemen;
-   per lokasi;
-   keterlambatan;
-   lembur;
-   izin;
-   sakit;
-   cuti;
-   Alpha.

Export:

-   CSV;
-   Excel;
-   PDF.

------------------------------------------------------------------------

# 20. Database Final

Gunakan **PostgreSQL sejak awal** agar development dan production
menggunakan model database yang konsisten.

Gunakan Drizzle ORM.

Tabel minimal:

-   `users`
-   `roles`
-   `permissions`
-   `role_permissions`
-   `departments`
-   `positions`
-   `work_locations`
-   `shifts`
-   `work_schedules`
-   `holidays`
-   `attendance_records`
-   `attendance_photos`
-   `device_registrations`
-   `requests`
-   `attendance_corrections`
-   `notifications`
-   `audit_logs`
-   `sessions`

### attendance_records

Minimal:

-   id
-   user_id
-   work_schedule_id
-   work_location_id
-   date
-   check_in_time
-   check_out_time
-   check_in_photo_id
-   check_out_photo_id
-   check_in_latitude
-   check_in_longitude
-   check_in_accuracy
-   check_in_distance
-   check_out_latitude
-   check_out_longitude
-   check_out_accuracy
-   check_out_distance
-   device_id
-   status
-   notes
-   created_at
-   updated_at

Jangan menggunakan satu `gps_accuracy` dan satu `distance_meter` untuk
check-in/check-out karena keduanya dapat memiliki nilai berbeda.

### attendance_photos

-   id
-   attendance_id
-   type
-   storage_key
-   mime_type
-   file_size
-   captured_at
-   created_at

### requests

-   id
-   user_id
-   type
-   start_date
-   end_date
-   reason
-   attachment_url
-   status
-   approved_by
-   decided_at
-   decision_note
-   created_at
-   updated_at

Gunakan index pada kolom yang sering dicari, misalnya `user_id`, `date`,
`status`, `work_location_id`, dan kombinasi yang relevan.

------------------------------------------------------------------------

# 21. API Utama

### Authentication

`POST /api/auth/login` `POST /api/auth/logout`
`POST /api/auth/forgot-password`

### Attendance

`POST /api/attendance/check-in` `POST /api/attendance/check-out`
`GET /api/attendance/today` `GET /api/attendance/history`
`GET /api/attendance/:id`

### Employee

`GET /api/employees` `POST /api/employees` `GET /api/employees/:id`
`PATCH /api/employees/:id` `DELETE /api/employees/:id`

### Location

`GET /api/work-locations` `POST /api/work-locations`
`PATCH /api/work-locations/:id`

### Schedule

`GET /api/schedules` `POST /api/schedules` `PATCH /api/schedules/:id`

### Holiday

`GET /api/holidays` `POST /api/holidays` `PATCH /api/holidays/:id`
`DELETE /api/holidays/:id`

### Requests

`POST /api/requests` `GET /api/requests`
`POST /api/requests/:id/approve` `POST /api/requests/:id/reject`

### Correction

`POST /api/attendance/:id/correction`
`POST /api/corrections/:id/approve` `POST /api/corrections/:id/reject`

### Reports

`GET /api/reports/attendance` `GET /api/reports/attendance/export`

Semua endpoint wajib memiliki authentication dan authorization sesuai
kebutuhan.

------------------------------------------------------------------------

# 22. Arsitektur

``` text
Karyawan / HR
      ↓
Next.js App / PWA
      ↓
API Route Handlers
      ↓
Authentication + RBAC
      ↓
Business Logic
 ┌────┼─────────┐
 ↓    ↓         ↓
Geo  Attendance Requests
 ↓    ↓         ↓
 └────┼─────────┘
      ↓
 Drizzle ORM
      ↓
 PostgreSQL

Foto / Lampiran → S3-compatible Object Storage

Notification → Email / Web Push / WhatsApp / Telegram
```

Semua keputusan final absensi dilakukan server-side.

------------------------------------------------------------------------

# 23. Keamanan

Wajib:

-   password hashing;
-   secure session;
-   HTTP-only cookie bila menggunakan cookie session;
-   RBAC;
-   server-side validation;
-   rate limiting;
-   idempotency key;
-   secure upload;
-   MIME/type validation;
-   batas ukuran file;
-   audit log;
-   database backup;
-   HTTPS di production.

Jangan mempercayai dari client:

-   role;
-   status;
-   waktu resmi;
-   jarak;
-   hasil geofence;
-   status absensi;
-   permission.

------------------------------------------------------------------------

# 24. Privasi

Data yang sensitif:

-   foto;
-   lokasi;
-   data karyawan;
-   lampiran pengajuan;
-   kemungkinan data biometrik jika fitur face verification digunakan.

Aturan:

-   akses berdasarkan role;
-   karyawan hanya dapat melihat data miliknya;
-   HR/Admin hanya melihat data sesuai permission;
-   object storage harus private;
-   gunakan signed URL bila diperlukan;
-   tentukan retention policy;
-   jangan menyimpan data yang tidak diperlukan.

Jika face verification ditambahkan, perlakukan data biometrik sebagai
fitur terpisah dengan kontrol privasi yang lebih ketat.

------------------------------------------------------------------------

# 25. Edge Cases

Sistem wajib menangani:

1.  check-in dua kali;
2.  check-out dua kali;
3.  check-out tanpa check-in;
4.  lupa check-out;
5.  GPS mati;
6.  permission GPS ditolak;
7.  GPS tidak akurat;
8.  di luar radius;
9.  kamera tidak tersedia;
10. permission kamera ditolak;
11. foto terlalu besar;
12. foto invalid;
13. internet terputus;
14. API timeout;
15. database error;
16. shift malam;
17. hari libur;
18. izin approved;
19. sakit approved;
20. cuti approved;
21. dinas approved;
22. karyawan nonaktif;
23. device baru;
24. duplicate request;
25. manipulasi timestamp;
26. request tanpa authorization;
27. lokasi kerja nonaktif;
28. tidak ada jadwal;
29. kerja pada hari libur;
30. koreksi absensi.

------------------------------------------------------------------------

# 26. Business Rules Utama

**BR-001** Server timestamp adalah waktu resmi.

**BR-002** Karyawan harus memiliki akun aktif.

**BR-003** Karyawan harus memiliki jadwal yang berlaku.

**BR-004** Absensi normal wajib menggunakan kamera langsung.

**BR-005** Foto galeri tidak menjadi metode absensi normal.

**BR-006** GPS wajib tersedia.

**BR-007** GPS harus memenuhi batas akurasi yang dikonfigurasi.

**BR-008** Jarak dihitung ulang server.

**BR-009** Jarak harus berada dalam radius lokasi kerja.

**BR-010** Check-in duplicate ditolak.

**BR-011** Check-out duplicate ditolak.

**BR-012** Check-out tanpa check-in ditolak atau masuk workflow koreksi
sesuai konfigurasi.

**BR-013** Hari libur non-working tidak dihitung Alpha.

**BR-014** Hari libur dengan allow_work dapat menerima absensi.

**BR-015** Absensi hari libur dapat dikategorikan holiday work/overtime.

**BR-016** Approved leave tidak dihitung Alpha.

**BR-017** Approved sick tidak dihitung Alpha.

**BR-018** Approved permission tidak dihitung Alpha.

**BR-019** Approved business trip tidak dihitung Alpha.

**BR-020** Alpha hanya ditentukan setelah batas waktu yang ditetapkan.

**BR-021** Keterlambatan dihitung berdasarkan server time.

**BR-022** Pulang cepat dihitung berdasarkan server time.

**BR-023** Perubahan absensi wajib diaudit.

**BR-024** Karyawan tidak dapat melihat data karyawan lain.

**BR-025** Endpoint admin wajib authorization.

**BR-026** Secret tidak boleh disimpan di source code.

**BR-027** Foto disimpan pada object storage private.

**BR-028** Nilai distance dari client tidak dipercaya.

**BR-029** Nilai status dari client tidak dipercaya.

**BR-030** Nilai timestamp dari client bukan timestamp resmi.

------------------------------------------------------------------------

# 27. Acceptance Criteria

## Check-in valid

**Given** akun aktif, jadwal aktif, bukan hari libur non-working, GPS
valid, berada dalam radius, kamera aktif.

**When** karyawan mengambil foto dan submit.

**Then** server menyimpan attendance dengan server timestamp, foto,
koordinat, akurasi, jarak, device, dan status.

## Check-in di luar area

**Given** karyawan berada di luar radius.

**When** submit check-in.

**Then** server menolak request dan attendance valid tidak dibuat.

## GPS buruk

**Given** accuracy melebihi konfigurasi.

**When** check-in.

**Then** sistem menolak dan meminta pengguna memperoleh lokasi lebih
akurat.

## Hari libur

**Given** hari libur `allow_work=false`.

**When** tidak ada attendance.

**Then** sistem tidak membuat Alpha.

## Duplicate

**Given** karyawan sudah check-in.

**When** melakukan check-in kedua.

**Then** request ditolak sebagai duplicate.

## Koreksi

**Given** karyawan mengajukan koreksi.

**When** HR menyetujui.

**Then** perubahan diterapkan dan audit log dibuat.

------------------------------------------------------------------------

# 28. Testing

## Unit test

-   Haversine distance.
-   Geofence.
-   GPS accuracy.
-   Late calculation.
-   Early leave.
-   Overtime.
-   Holiday.
-   Alpha.
-   Shift cross-midnight.
-   Request approval.
-   Permission checks.

## Integration test

-   Login.
-   Check-in.
-   Check-out.
-   Upload foto.
-   Database transaction.
-   Approval.
-   Reports.
-   Audit log.

## E2E

Simulasikan:

Login → lihat jadwal → permission kamera → permission GPS → validasi
lokasi → selfie → check-in → check-out → riwayat.

## Security test

-   unauthorized endpoint;
-   invalid session;
-   role escalation;
-   duplicate request;
-   malicious upload;
-   SQL injection;
-   XSS;
-   brute force;
-   invalid payload.

------------------------------------------------------------------------

# 29. Non-Functional Requirements

-   Responsive/mobile-first.
-   UI sederhana.
-   API tervalidasi.
-   Database terindeks.
-   Object storage untuk file.
-   Backup database harian.
-   Audit log minimal 12 bulan atau sesuai kebijakan organisasi.
-   Error logging.
-   Monitoring.
-   Production menggunakan HTTPS.
-   Target proses absensi harus realistis terhadap jaringan; jangan
    menjadikan `<5 detik` sebagai jaminan mutlak karena upload foto dan
    kondisi jaringan dapat bervariasi.

------------------------------------------------------------------------

# 30. Tech Stack

### Frontend

-   Next.js App Router
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   React Hook Form
-   Zod
-   Browser Geolocation API
-   MediaDevices `getUserMedia`

### Backend

-   Next.js Route Handlers
-   Drizzle ORM
-   Better Auth atau sistem auth setara
-   Zod
-   Rate limiting
-   Idempotency

### Database

**PostgreSQL**

Gunakan PostgreSQL sejak development agar tidak perlu migrasi dari
SQLite ke PostgreSQL saat production.

### Storage

S3-compatible object storage.

### Deployment

Vercel atau VPS/Docker sesuai kebutuhan.

------------------------------------------------------------------------

# 31. Roadmap

## Fase 1 --- MVP Core

-   Project setup
-   PostgreSQL
-   Auth
-   RBAC
-   Employee
-   Department
-   Position
-   Work location
-   Shift
-   Schedule
-   Holiday
-   Camera
-   GPS
-   Geofence
-   Check-in
-   Check-out
-   History

## Fase 2 --- HR Workflow

-   Permission
-   Sick
-   Leave
-   Business trip
-   Overtime
-   Approval
-   Correction

## Fase 3 --- Dashboard & Notification

-   Dashboard
-   Reports
-   Excel/CSV/PDF
-   Reminder
-   Notification

## Fase 4 --- Security

-   Device management
-   Audit log
-   Security hardening
-   Monitoring
-   Backup

## Fase 5 --- Advanced

-   Face verification
-   Liveness detection
-   Offline mode
-   Multi-company
-   Payroll
-   Advanced anomaly detection

------------------------------------------------------------------------

# 32. Implementation Rules untuk AI Coding Agent

AI coding agent harus:

1.  Membaca PRD sebelum coding.
2.  Memeriksa repository yang sudah ada.
3.  Tidak menghapus kode existing tanpa alasan.
4.  Tidak membuat duplicate table/API/component.
5.  Membuat perubahan secara bertahap.
6.  Setelah setiap fase menjalankan lint/typecheck/test.
7.  Memperbaiki error sebelum lanjut.
8.  Menjaga fitur fase sebelumnya tetap berjalan.
9.  Tidak menyimpan secret di source code.
10. Semua data penting divalidasi server-side.
11. Tidak mempercayai role, timestamp, status, distance, atau hasil
    geofence dari client.
12. Membuat migration database.
13. Menjelaskan file yang dibuat/diubah.
14. Membuat checkpoint setelah fase selesai.

Workflow:

``` text
PLAN
↓
IMPLEMENT
↓
MIGRATE
↓
TEST
↓
REVIEW
↓
FIX
↓
CHECKPOINT
↓
NEXT PHASE
```

------------------------------------------------------------------------

# 33. Definition of Done MVP

MVP dianggap selesai apabila:

-   karyawan dapat login;
-   admin dapat membuat karyawan;
-   admin dapat membuat lokasi kerja;
-   admin dapat membuat shift;
-   admin dapat membuat jadwal;
-   admin dapat membuat hari libur;
-   karyawan dapat membuka kamera;
-   foto hanya diambil dari kamera;
-   GPS dapat diperoleh;
-   server menghitung geofence;
-   server menggunakan timestamp resmi;
-   check-in valid tersimpan;
-   check-in di luar radius ditolak;
-   GPS buruk ditolak;
-   duplicate check-in ditolak;
-   check-out berjalan;
-   riwayat tampil;
-   Alpha tidak dibuat pada hari libur non-working;
-   audit log berjalan;
-   RBAC berjalan;
-   database migration berhasil;
-   lint/typecheck/test berhasil;
-   error kritis tidak tersisa.

------------------------------------------------------------------------

# 34. Catatan Implementasi Penting

PRD sumber sebelumnya sudah menetapkan kombinasi foto + GPS + server
time + device binding, user flow, arsitektur client-server, serta
roadmap fitur advanced. Versi final ini mempertegas beberapa keputusan
agar implementasi AI coding agent tidak ambigu:

1.  **Kamera langsung**, bukan upload galeri untuk absensi normal.
2.  **GPS accuracy configurable**, dengan contoh default 50 meter.
3.  **Distance dihitung server**, bukan dipercaya dari client.
4.  **PostgreSQL sejak awal** untuk konsistensi development/production.
5.  **Status attendance dipisahkan dari request type**.
6.  Check-in/check-out menyimpan data lokasi masing-masing karena
    nilainya dapat berbeda.
7.  Fake GPS hanya dimitigasi; jangan menjanjikan deteksi 100% pada web
    browser.
8.  Face verification/liveness tetap future feature.
9.  Alpha dihitung berdasarkan hari kerja dan pengajuan approved, bukan
    sekadar tidak adanya check-in.
10. Semua keputusan penting harus server-side.
