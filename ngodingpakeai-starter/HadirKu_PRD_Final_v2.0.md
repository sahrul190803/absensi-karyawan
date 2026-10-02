# PRD FINAL v2.0 — HADIRKU

## Sistem Absensi Karyawan Berbasis Kamera + GPS/Geofencing

> Versi ini menyatukan dan melengkapi PRD v1.0 menjadi dokumen lengkap 67 bagian:
> visi produk, alur, aturan bisnis, desain database + ERD, spesifikasi API,
> arsitektur, struktur folder, keamanan, privasi, pengujian, risiko,
> prioritas, roadmap, dan **Implementation Prompt for OpenCode**.
> Dokumen ini menjadi sumber kebenaran tunggal sebelum coding.

---

## 1. Executive Summary

HadirKu adalah aplikasi absensi karyawan berbasis web/PWA yang mewajibkan
**foto kamera langsung + validasi GPS/geofencing + jadwal kerja + waktu server**
untuk setiap absensi masuk dan pulang. Tujuannya: mengurangi titip absen,
absensi dari luar area, dan manipulasi waktu; serta mengotomatisasi rekap
kehadiran, izin/cuti, approval, laporan, dan audit.

MVP fokus pada alur inti:
**LOGIN → JADWAL → CEK HARI LIBUR → GPS → GEOFENCING → KAMERA → CHECK-IN →
CHECK-OUT → STATUS → RIWAYAT → LAPORAN**, dengan fitur advanced (face
verification, liveness, offline mode, payroll) sebagai fase lanjutan.

## 2. Problem Statement

- Titip absen dan absensi dari luar lokasi kerja.
- Manipulasi jam perangkat dan bukti kehadiran yang lemah.
- Rekap manual lambat dan rawan salah.
- Pengelolaan hari libur, shift, dan pengajuan yang tidak konsisten.
- Perubahan absensi tanpa jejak audit.

## 3. Product Vision

Menjadi fondasi absensi digital yang **jujur, tervalidasi server, dan mudah
dipakai** — bukti foto + lokasi + waktu server untuk setiap kehadiran, dengan
pengalaman mobile-first untuk karyawan dan meja kerja desktop untuk HR/Admin.

## 4. Goals

**MVP (P0):** RBAC, data karyawan, jadwal & shift, lokasi kerja + geofence,
kamera, check-in/out, riwayat, hari libur, perhitungan hadir/terlambat/pulang
cepat/alpha, dashboard dasar, laporan dasar, audit log dasar.
**Tahap berikutnya:** izin/sakit/cuti/dinas/lembur + approval, notifikasi &
reminder, multi-lokasi, device management, face verification/liveness, offline
mode, integrasi payroll.

## 5. Non-Goals (MVP)

Face recognition penuh, liveness, offline attendance, payroll, multi-company,
advanced ML anti-fraud, integrasi mesin fingerprint, AI analytics. Arsitektur
tetap disiapkan agar fitur tersebut dapat ditambahkan kemudian.

## 6. Target Users

Perusahaan menengah dengan satu atau beberapa lokasi kerja, karyawan lapangan
maupun kantor, HR kecil (1–3 orang), dan manajemen yang butuh laporan cepat.

## 7. Personas

| Persona | Kebutuhan utama | Perangkat |
|---|---|---|
| Rani — Staf Operasional | Absen cepat 2 langkah, lihat jadwal & sisa cuti | Smartphone |
| Budi — HR Admin | Kelola master data, approve, rekap, audit | Desktop |
| Sari — Supervisor | Pantau tim, setujui lembur/dinas | Desktop + mobile |
| Super Admin | Kelola role, konfigurasi, keamanan sistem | Desktop |

## 8. Roles & Permissions (RBAC)

| Permission | Super Admin | HR/Admin | Karyawan |
|---|---|---|---|
| attendance.view / view-own | ✅ / ✅ | ✅ / — | — / ✅ |
| attendance.create (absen) | — | — | ✅ |
| attendance.update / approve | ✅ | ✅ | — |
| attendance.delete | ✅ | — | — |
| employee.view/create/update | ✅ | ✅ | — |
| employee.delete | ✅ | — | — |
| holiday.manage | ✅ | ✅ | — |
| schedule.manage, shift.manage | ✅ | ✅ | — |
| work_location.manage | ✅ | ✅ | — |
| requests.create (izin/cuti/dll) | — | — | ✅ |
| requests.approve | ✅ | ✅ | — |
| correction.create (ajukan) | — | — | ✅ |
| correction.approve | ✅ | ✅ | — |
| report.view / export | ✅ | ✅ | — |
| audit.view | ✅ | ✅ (terbatas) | — |
| settings.manage, device.manage, role.manage | ✅ | — | — |

Semua permission dicek **server-side**. Signup publik tidak dapat menetapkan
role; promosi role hanya via `npm run role:set -- <email> <role>` atau UI Super Admin.

## 9. Feature List & Prioritas

| P0 (MVP) | P1 | P2 | P3 (Advanced) |
|---|---|---|---|
| Auth, role, employee | Shift & jadwal mingguan | Multi-location routing | Face verification |
| Work location + geofence | Izin/sakit/cuti/dinas/lembur | Device management | Liveness detection |
| GPS + accuracy + jarak server | Approval workflow | Reminder otomatis | Offline sync |
| Kamera + foto wajib | Department & position | Import Excel/CSV | Anti-fraud lanjutan |
| Check-in / check-out | Notifikasi (in-app/email/Telegram) | Laporan lanjutan (per jabatan) | Multi-company |
| Riwayat + bukti | Excel/PDF export | Pagination & search lengkap | Payroll integration |
| Hari libur + allow_work | Audit log lengkap | | Advanced analytics |
| Alpha otomatis (job) | | | |
| Koreksi absensi + audit | | | |
| Dashboard & laporan dasar | | | |

## 10. Functional Requirements

- **FR-01** Karyawan dapat login/logout; sesi server-side; rate limit login.
- **FR-02** HR mengelola karyawan (CRUD, aktif/nonaktif, import/export).
- **FR-03** Admin mengelola lokasi kerja (lat, lng, radius, status).
- **FR-04** Admin mengelola shift dan menugaskan jadwal per karyawan/tanggal.
- **FR-05** Admin mengelola hari libur (jenis, allow_work, aktif) + import.
- **FR-06** Karyawan check-in/out dengan kamera + GPS; server memvalidasi.
- **FR-07** Sistem menolak absensi di luar radius/GPS buruk/duplikat.
- **FR-08** Sistem menyimpan bukti (foto, koordinat, akurasi, jarak, device).
- **FR-09** Karyawan melihat riwayat + bukti absensi miliknya.
- **FR-10** Karyawan mengajukan izin/sakit/cuti/dinas/lembur + lampiran.
- **FR-11** HR menyetujui/menolak; approval tercatat.
- **FR-12** Karyawan mengajukan koreksi; HR approve/reject dengan audit.
- **FR-13** Sistem menghitung terlambat/pulang cepat/lembur/durasi kerja.
- **FR-14** Sistem menetapkan Alpha hanya sesuai BR-020.
- **FR-15** Dashboard karyawan & HR dengan filter.
- **FR-16** Laporan harian/bulanan + export CSV/Excel/PDF.
- **FR-17** Notifikasi & reminder sesuai aturan (tidak dikirim saat libur/cuti/izin).
- **FR-18** Audit log mencatat semua perubahan penting.
- **FR-19** Device binding: perangkat baru butuh verifikasi.
- **FR-20** Pengaturan sistem (zona waktu, akurasi, toleransi, dsb).

## 11. User Stories (contoh inti)

- Sebagai karyawan, saya ingin absen masuk dengan selfie + GPS agar kehadiran
  saya sah tanpa mengisi formulir.
- Sebagai karyawan, saya ingin melihat jadwal minggu ini dan sisa cuti agar
  bisa merencanakan.
- Sebagai karyawan, saya ingin tahu alasan ketika absen ditolak (di luar area,
  GPS buruk, duplikat).
- Sebagai HR, saya ingin melihat siapa belum absen hari ini agar bisa menindak.
- Sebagai HR, saya ingin menyetujui cuti dan otomatis memengaruhi rekap.
- Sebagai auditor, saya ingin melihat siapa mengubah absensi, kapan, dan
  nilainya sebelum/sesudah.

## 12. User Flow

```text
Karyawan: Login → Beranda (status hari ini) → Absen Masuk (validasi lokasi →
kamera → bukti) → aktivitas → Absen Pulang → riwayat.
Pendukung: Jadwal, Pengajuan, Notifikasi, Profil.
HR: Login → Dashboard (monitor + approval) → master data (karyawan, lokasi,
shift, hari libur, departemen, jabatan) → pengajuan → laporan → audit → pengaturan.
```

## 13. Check-in Flow (detail)

```text
LOGIN → CEK AKUN AKTIF → CEK JADWAL → CEK HARI LIBUR → MINTA IZIN KAMERA/LOKASI
→ AMBIL GPS → VALIDASI AKURASI → HITUNG JARAK (server) → VALIDASI GEOFENCE
→ BUKA KAMERA → AMBIL FOTO → VALIDASI FOTO → (OPSIONAL FACE) → CEK DUPLIKAT
→ SERVER TIMESTAMP → TENTUKAN STATUS (HADIR/TERLAMBAT) → SIMPAN + FOTO
→ AUDIT + NOTIFIKASI → TAMPILKAN BUKTI
```

Penolakan: akun nonaktif (`ACCOUNT_INACTIVE`), tanpa jadwal (`NO_SCHEDULE`),
hari libur non-working (`HOLIDAY`), GPS buruk (`GPS_ACCURACY`), di luar radius
(`OUTSIDE_GEOFENCE`), kamera gagal (`CAMERA_UNAVAILABLE`), duplikat
(`DUPLICATE_CHECKIN`), foto invalid (`INVALID_PHOTO`).

## 14. Check-out Flow (detail)

```text
LOGIN → CEK CHECK-IN HARI ITU → CEK JADWAL → AMBIL GPS → VALIDASI AKURASI
→ GEOFENCE → KAMERA → FOTO → SERVER TIMESTAMP → HITUNG DURASI, PULANG CEPAT,
LEMBUR → SIMPAN → AUDIT + NOTIFIKASI
```

Tanpa check-in: ditolak atau masuk workflow koreksi sesuai konfigurasi
(`NO_CHECKIN`).

## 15. GPS/Geofencing Requirements

- Data lokasi: id, nama, alamat, latitude, longitude, radius_m, aktif, deskripsi.
- Validasi: `accuracy <= batas_akurasi` (default 50 m, configurable).
- Jarak dihitung **di server** (Haversine) dari koordinat tersimpan.
- `distance <= radius` → VALID; selain itu DI LUAR AREA.
- Simpan per absen: latitude, longitude, accuracy, distance, work_location_id.
- Fake GPS hanya dimitigasi (accuracy, device binding, anomaly log, rate
  limit, audit) — jangan menjanjikan deteksi 100% di web.

## 16. Camera Requirements

- `MediaDevices.getUserMedia()`; preview; ambil foto; retake; kompres.
- Upload galeri **bukan** metode absensi normal; validasi MIME + ukuran server.
- Foto disimpan di object storage (private), metadata: attendance_id, type
  (`check_in|check_out`), storage_key, mime_type, file_size, captured_at.
- Kamera gagal/permission ditolak → absensi gagal dengan pesan jelas.

## 17. Face Verification (P3, opsional)

Diaktifkan per perusahaan. Alur: selfie → face detection → verifikasi →
similarity threshold → valid/invalid. Tangani: wajah tidak ditemukan, >1 wajah,
terlalu jauh, cahaya buruk, wajah tertutup, foto tidak jelas, gagal verifikasi.
Wajib pertimbangkan liveness. Data biometrik = fitur terpisah dengan kontrol
privasi lebih ketat (consent, enkripsi, retention, hak hapus).

## 18. Holiday Requirements

- CRUD hari libur: tanggal, nama, jenis (Nasional/Cuti bersama/Perusahaan/
  Khusus), deskripsi, aktif, `allow_work`; import Excel/CSV dengan validasi
  per baris (tampilkan nomor baris + alasan error).
- Hari libur aktif (`allow_work=false`): tidak wajib absen, **tidak Alpha**.
- `allow_work=true`: absensi boleh → kategori kerja hari libur/lembur.
- Pengaturan global "Izinkan absensi pada hari libur".

## 19. Work Calendar

Kalender kerja menggabungkan hari kerja, libur, cuti bersama, hari kerja
khusus/pengganti, dan perubahan jadwal. Kalender menentukan apakah karyawan
wajib absen dan dasar perhitungan Alpha.

## 20. Shift

- CRUD shift: nama, jam mulai, jam selesai, toleransi, aktif.
- Dukungan shift lintas tengah malam (22:00–06:00) dengan aturan tanggal kerja.
- Penugasan shift per karyawan (employee_shifts) dan jadwal per tanggal
  (work_schedules) termasuk lokasi kerja per jadwal.

## 21–25. Leave, Sick, Permission, Business Trip, Overtime

Semua pengajuan memakai satu entitas `requests`:
`id, user_id, type (PERMISSION|SICK|LEAVE|BUSINESS_TRIP|OVERTIME), start_date,
end_date, start_time, end_time, reason, attachment_url, status
(PENDING|APPROVED|REJECTED|CANCELLED), approved_by, decided_at, decision_note,
created_at, updated_at`.

- **Cuti**: punya saldo (`leave_balances`): saldo awal − terpakai = tersisa;
  pengajuan mengurangi saldo saat approved.
- **Sakit**: boleh lampiran surat dokter.
- **Dinas**: lokasi/tujuan + surat tugas.
- **Lembur**: jam mulai/selesai + durasi; kerja hari libur dapat dicatat
  sebagai lembur/kerja hari libur.
- Workflow: `PENDING → REVIEW → APPROVED/REJECTED` (approval mencatat approver,
  waktu, keputusan, catatan).
- Semua jenis approved **tidak dihitung Alpha** pada tanggal terkait.

## 26–27. Notification & Reminder

Channel: in-app, email, Telegram (WhatsApp bila tersedia), push (future).
Event: absensi berhasil, terlambat, pengajuan disetujui/ditolak, reminder
check-in/out, pengumuman. Reminder **tidak dikirim** jika hari libur, cuti,
izin, sakit, dinas, atau tidak ada jadwal.

## 28–29. Dashboard & Reports

- **Karyawan**: status hari ini, jam masuk/pulang, durasi, keterlambatan,
  lokasi + jarak, jadwal/shift, saldo cuti, pengajuan, riwayat, notifikasi.
  Tombol utama: ABSEN MASUK / ABSEN PULANG.
- **HR**: total karyawan, hadir, terlambat, belum absen, alpha, izin, sakit,
  cuti, dinas, lembur, kerja hari libur; grafik harian/mingguan/bulanan;
  filter tanggal/departemen/jabatan/lokasi/status.
- **Laporan**: harian, mingguan, bulanan, per karyawan/departemen/jabatan/
  lokasi; keterlambatan, lembur, izin, sakit, cuti, alpha. Export CSV/Excel/PDF.

## 30. Database Design

PostgreSQL + Drizzle ORM. Semua tabel: `id (uuid pk)`, `created_at`,
`updated_at`; soft delete (`deleted_at`) untuk master data. Index pada kolom
pencarian (user_id, date, status, work_location_id, dsb).

| Tabel | Kolom kunci | Keterangan |
|---|---|---|
| companies | nama, zona_waktu, allow_holiday_work | konfigurasi organisasi |
| users | email (unique), password_hash, role, status | akun login (Better Auth) |
| employees | user_id (fk), nik (unique), nama, telepon, alamat, foto, department_id, position_id, join_date, status_kerja, status_akun | data karyawan |
| departments | kode (unique), nama, manager_id, aktif | |
| positions | nama, department_id, level, aktif | |
| work_locations | nama, alamat, latitude, longitude, radius_m, aktif, deskripsi | geofence |
| shifts | nama, start_time, end_time, toleransi_menit, lintas_hari, aktif | |
| work_schedules | employee_id, date, shift_id, work_location_id, catatan | jadwal per tanggal |
| employee_shifts | employee_id, shift_id, pola_hari, mulai, selesai | penugasan berulang |
| holidays | date, nama, jenis, deskripsi, allow_work, aktif | unique(date) |
| attendance_records | user_id, work_schedule_id, work_location_id, date, check_in_time, check_out_time, check_in_photo_id, check_out_photo_id, check_in_latitude/longitude/accuracy/distance, check_out_*, device_id, status, notes | unique(user_id, date) |
| attendance_photos | attendance_id, type, storage_key, mime_type, file_size, captured_at | |
| requests | (lihat 21–25) | izin/sakit/cuti/dinas/lembur |
| leave_types | nama, kuota_default, aktif | |
| leave_balances | employee_id, leave_type_id, tahun, saldo_awal, terpakai | unique(employee,type,tahun) |
| attendance_corrections | attendance_id, requested_by, alasan, old_value, new_value, status | |
| devices | device_id (unique), user_id, os, model, browser, last_login, trusted | |
| notifications | user_id, tipe, judul, isi, read_at | in-app |
| notification_logs | channel, target, event, status, error, sent_at | |
| audit_logs | user_id, action, entity, entity_id, old_value, new_value, ip, user_agent, created_at | append-only |
| sessions | (dikelola Better Auth) | |

**Attendance status enum:** `PRESENT, LATE, EARLY_LEAVE, ALPHA, HOLIDAY_WORK`
(dipisahkan dari request type/status).

## 31. ERD

```mermaid
erDiagram
    USERS ||--o| EMPLOYEES : "memiliki profil"
    USERS ||--o{ SESSIONS : "login"
    USERS ||--o{ DEVICES : "perangkat"
    USERS ||--o{ NOTIFICATIONS : "menerima"
    USERS ||--o{ AUDIT_LOGS : "beraksi"
    DEPARTMENTS ||--o{ POSITIONS : "punya"
    DEPARTMENTS ||--o{ EMPLOYEES : "menaungi"
    POSITIONS ||--o{ EMPLOYEES : "diisi"
    WORK_LOCATIONS ||--o{ WORK_SCHEDULES : "lokasi jadwal"
    SHIFTS ||--o{ WORK_SCHEDULES : "shift jadwal"
    EMPLOYEES ||--o{ WORK_SCHEDULES : "dijadwalkan"
    EMPLOYEES ||--o{ EMPLOYEE_SHIFTS : "penugasan"
    SHIFTS ||--o{ EMPLOYEE_SHIFTS : "dipakai"
    EMPLOYEES ||--o{ ATTENDANCE_RECORDS : "absen"
    WORK_SCHEDULES ||--o{ ATTENDANCE_RECORDS : "dasar"
    WORK_LOCATIONS ||--o{ ATTENDANCE_RECORDS : "validasi"
    ATTENDANCE_RECORDS ||--o{ ATTENDANCE_PHOTOS : "bukti foto"
    ATTENDANCE_RECORDS ||--o{ ATTENDANCE_CORRECTIONS : "koreksi"
    EMPLOYEES ||--o{ REQUESTS : "mengajukan"
    USERS ||--o{ REQUESTS : "approver"
    LEAVE_TYPES ||--o{ LEAVE_BALANCES : "jenis"
    EMPLOYEES ||--o{ LEAVE_BALANCES : "saldo"
    HOLIDAYS }o--o{ COMPANIES : "kalender"
```

## 32. API Specification

Konvensi: JSON; auth via sesi cookie (Better Auth) + origin check untuk mutasi;
validasi Zod; respons konsisten:

```json
{ "success": true, "data": {} }
{ "success": false, "message": "Pesan error", "code": "ERROR_CODE" }
```

| Method & Path | Auth | Deskripsi |
|---|---|---|
| POST /api/auth/login | publik + rate limit | login (Better Auth) |
| POST /api/auth/logout | sesi | logout |
| POST /api/auth/forgot-password | publik + rate limit | kirim tautan reset |
| POST /api/auth/reset-password | token | reset password |
| POST /api/auth/change-password | sesi | ganti password |
| GET /api/attendance/today | karyawan | status absensi hari ini |
| POST /api/attendance/check-in | karyawan | body: photo(base64/multipart), latitude, longitude, accuracy, device_id, idempotency_key → validasi server |
| POST /api/attendance/check-out | karyawan | idem |
| GET /api/attendance/history | karyawan | filter bulan/status, pagination |
| GET /api/attendance/:id | owner/HR | detail + foto signed URL |
| GET /api/attendance | HR | filter tanggal/departemen/lokasi/status |
| POST /api/attendance/:id/correction | karyawan | ajukan koreksi |
| POST /api/corrections/:id/approve|reject | HR | keputusan + catatan |
| GET/POST/PATCH/DELETE /api/employees[/:id] | HR | CRUD + nonaktif |
| GET/POST/PATCH /api/work-locations[/:id] | HR | CRUD lokasi |
| GET/POST/PATCH /api/shifts[/:id] | HR | CRUD shift |
| GET/POST/PATCH /api/schedules[/:id] | HR | jadwal |
| GET/POST/PATCH/DELETE /api/holidays[/:id] | HR | hari libur |
| POST /api/holidays/import | HR | import CSV/Excel |
| GET/POST /api/requests | karyawan/HR | buat & daftar pengajuan |
| POST /api/requests/:id/approve|reject | HR | approval |
| GET /api/leave-balances/:userId | owner/HR | saldo cuti |
| GET /api/reports/attendance | HR | query: from,to,groupBy |
| GET /api/reports/attendance/export?format=csv|xlsx|pdf | HR | unduhan |
| GET /api/audit-logs | Super Admin | filter user/action/entity |
| GET/PATCH /api/settings | Super Admin | konfigurasi |
| GET/DELETE /api/devices[/:id] | owner/Super Admin | perangkat |

Validasi & keamanan API: autentikasi + otorisasi per endpoint, rate limit,
idempotency key pada check-in/out, tolak data client yang tidak dipercaya
(distance/status/timestamp/role), signed URL untuk foto, batas ukuran upload.

## 33. System Architecture

```mermaid
flowchart TD
    A[Karyawan / HR - Web/PWA] --> B[Next.js App Router]
    B --> C[API Route Handlers]
    C --> D[Authentication + RBAC]
    D --> E[Business Logic / Services]
    E --> F[Drizzle ORM]
    F --> G[(PostgreSQL)]
    E --> H[Object Storage S3 - foto/lampiran]
    E --> I[Notification Service - Email/Telegram/WA]
    L[Background Jobs - Alpha, Reminder, Sync] --> E
    C --> M[Monitoring/Logging]
```

Semua keputusan final absensi (jarak, status, waktu, validitas) dilakukan
server-side.

## 34. Folder Structure (Next.js)

```text
src/
  app/                     # App Router
    (auth)/                # sign-in, reset password
    (protected)/           # area login (dashboard, absensi, riwayat, dll)
    api/                   # route handlers tipis
  components/              # UI (shadcn/ui) + fitur
  db/
    schema/                # tabel Drizzle per file + index.ts
    index.ts               # koneksi pool
  lib/                     # auth, session, permissions, api helper, utils
  services/                # domain logic + query Drizzle (server-only)
  validators/              # skema Zod + tipe
  config/                  # site/identity
  styles/                  # tokens/Tailwind
drizzle/                   # migrasi SQL + meta (committed)
scripts/                   # setup, doctor, migrate, seed, role
tests/ , e2e/              # unit/integration & Playwright
```

## 35. UI/UX Requirements

Modern, bersih, responsif; **mobile-first untuk karyawan**, **desktop-friendly
untuk admin**; accessible (kontras, fokus, label, non-color cue). Absensi
maksimal beberapa langkah: status lokasi → kamera → bukti. Halaman karyawan &
admin mengikuti struktur navigasi pada prototype DesainPakeAI project ini
(18 halaman acuan).

## 36. Security

HTTPS, password hashing (Better Auth), secure session + HTTP-only cookie,
RBAC, validasi server-side (Zod), rate limiting, idempotency, secure upload
(MIME/size), CSP/XSS prevention, SQL injection protection via ORM/parameter,
CSRF protection untuk cookie-auth mutation, audit log, security logging.
Jangan menyimpan secret di source code.

## 37. Privacy

Data sensitif: foto, lokasi, data karyawan, lampiran, potensi biometrik.
Aturan: data minimization, consent, privacy policy, enkripsi, akses per role,
object storage private + signed URL, retention policy, hak hapus, backup aman.

## 38. Anti-Fraud

Mitigasi: fake/mock GPS (accuracy, device binding, anomaly log), duplicate
request (idempotency + unique constraint), shared account (device binding +
audit), manipulasi timestamp (server time), request API manual (auth + origin +
rate limit), foto lama/galeri (kamera langsung + timestamp + metadata),
screenshot/replay (idempotency, nonce), multiple face (face verification P3).
Semua validasi penting di server.

## 39. Audit Log

Mencatat: login/logout, check-in/out, perubahan data karyawan, perubahan
absensi, approval/rejection, perubahan konfigurasi. Field: user, action,
entity, entity_id, timestamp, old_value, new_value, ip, user_agent.
Append-only; tidak boleh dihapus.

## 40. Device Management

Catat device_id, tipe, OS, browser, last_login, last_activity, trusted.
Advanced: binding (perangkat baru → verifikasi HR/blokir sesuai konfigurasi),
revoke, limit jumlah perangkat.

## 41. Testing

- **Unit**: Haversine, geofence, validasi akurasi, keterlambatan, durasi,
  pulang cepat, lembur, hari libur, alpha, saldo cuti, shift lintas malam.
- **Integration**: login, check-in, check-out, upload foto, transaksi DB,
  approval, laporan, audit.
- **E2E (Playwright)**: login → jadwal → permission kamera/GPS → validasi
  lokasi → selfie → check-in → check-out → riwayat.
- **Security**: endpoint tanpa auth, sesi invalid, escalasi role, duplicate
  request, upload berbahaya, SQLi, XSS, brute force, payload invalid.

## 42. Edge Cases (40) — solusi singkat

1 Check-in dua kali → 409 `DUPLICATE_CHECKIN`; 2 Check-out dua kali → 409;
3 Checkout tanpa check-in → tolak/arahkan koreksi; 4 Lupa checkout → koreksi +
audit; 5 GPS mati → pesan aktifkan lokasi; 6 Permission GPS ditolak → tolak +
panduan; 7 GPS tidak akurat → minta akurasi lebih baik; 8 Di luar radius →
tolak + tampilkan jarak; 9 Kamera tidak tersedia → tolak; 10 Permission kamera
ditolak → tolak + panduan; 11 Foto terlalu besar → kompres/tolak; 12 Foto tidak
jelas → minta ulang; 13 Wajah tidak terdeteksi → retake (P3); 14 Multiple face →
tolak (P3); 15 Face gagal → fallback sesuai kebijakan (P3); 16 Fake GPS →
mitigasi + flag audit; 17 Internet terputus → (P3 offline queue); 18 Server
timeout → idempotency + retry aman; 19 Database error → 500 + log + retry; 20
Notification error → retry queue + log; 21 Hari libur → sesuai allow_work; 22
Cuti approved → bukan Alpha; 23 Izin approved → bukan Alpha; 24 Sakit approved →
bukan Alpha; 25 Dinas approved → bukan Alpha; 26 Shift malam → aturan tanggal
kerja; 27 Lintas tengah malam → check-out 06:00 tetap tanggal kerja; 28
Perubahan jadwal → snapshot jadwal disimpan di attendance; 29 Resign → akun
nonaktif; 30 Akun dinonaktifkan → tolak; 31 Dua perangkat → device binding; 32
Request berkali-kali → idempotency; 33 Manipulasi timestamp → server time; 34
Foto galeri → tidak diizinkan; 35 Admin ubah absensi → audit old/new; 36
Berpindah lokasi saat absen → validasi saat request; 37 Akurasi buruk → tolak;
38 Tanpa jadwal → `NO_SCHEDULE`; 39 Absen hari libur → kategori holiday work; 40
Lokasi berbeda dari jadwal → tolak sesuai konfigurasi.

## 43. Business Rules (BR)

1 Server timestamp = waktu resmi. 2 Akun harus aktif. 3 Harus punya jadwal.
4 Absensi normal wajib kamera langsung. 5 Foto galeri bukan metode normal.
6 GPS wajib tersedia. 7 GPS memenuhi batas akurasi. 8 Jarak dihitung ulang
server. 9 Jarak dalam radius lokasi. 10 Check-in duplikat ditolak. 11 Check-out
duplikat ditolak. 12 Check-out tanpa check-in ditolak/koreksi. 13 Hari libur
non-working tidak Alpha. 14 Hari libur allow_work menerima absensi. 15 Absensi
hari libur dapat dikategorikan holiday work/lembur. 16–19 Approved leave/sick/
permission/business trip tidak Alpha. 20 Alpha hanya setelah batas waktu.
21 Keterlambatan dari server time + toleransi. 22 Pulang cepat dari server time.
23 Perubahan absensi wajib audit. 24 Karyawan hanya melihat datanya. 25 Endpoint
admin wajib authorization. 26 Secret tidak di source code. 27 Foto di object
storage private. 28 Distance client tidak dipercaya. 29 Status client tidak
dipercaya. 30 Timestamp client bukan resmi. 31 Satu absensi per user per hari
(unique). 32 Foto wajib menempel pada attendance record. 33 Radius GPS
configurable per lokasi. 34 Toleransi configurable per shift. 35 Shift lintas
malam memakai tanggal kerja. 36 Perubahan role hanya Super Admin. 37 Signup
tidak dapat menetapkan role. 38 Rate limit login & API absensi. 39 Idempotency
wajib untuk check-in/out. 40 Device baru mengikuti kebijakan binding. 41
Reminder hanya dikirim ke yang wajib absen. 42 Laporan menghormati filter &
hak akses. 43 Export hanya untuk role berizin. 44 Koreksi menyimpan old/new
value. 45 Audit log append-only. 46 Import memvalidasi tiap baris. 47 Data
pribadi hanya untuk yang berhak. 48 Jam kerja tidak dihitung dari hari libur
non-working. 49 Lembur mengikuti approval. 50 Alpha dibatalkan jika ada
pengajuan approved pada tanggal itu.

## 44. Acceptance Criteria (Given/When/Then)

- **Check-in valid** — Given akun aktif, jadwal aktif, bukan libur, GPS valid
  dalam radius, kamera aktif; When karyawan ambil foto & submit; Then tersimpan
  dengan server timestamp + foto + koordinat + jarak + device + status.
- **Di luar area** — Given di luar radius; When submit; Then ditolak, tidak ada
  attendance valid.
- **GPS buruk** — Given accuracy > batas; When check-in; Then ditolak + minta
  lokasi lebih akurat.
- **Hari libur** — Given libur allow_work=false; When tanpa attendance; Then
  tidak ada Alpha.
- **Duplicate** — Given sudah check-in; When check-in lagi; Then ditolak
  `DUPLICATE_CHECKIN`.
- **Koreksi** — Given karyawan ajukan koreksi; When HR setujui; Then perubahan
  diterapkan + audit log old/new.
- **Cuti approved** — Given cuti disetujui; When rekap bulanan; Then tanggal itu
  bukan Alpha dan saldo cuti berkurang.
- **Lembur** — Given lembur approved dengan durasi; When laporan; Then lembur
  muncul di rekap.
- **Reminder** — Given tidak ada jadwal/cuti/libur; When jadwal reminder; Then
  tidak ada pesan terkirim.
- **Audit** — Given HR mengubah jam masuk; When simpan; Then tercatat user,
  waktu, old, new.

## 45. Non-Functional Requirements

Performance (index, pagination, kompresi gambar, caching, background jobs),
security, scalability (multi-lokasi), availability, reliability, maintainability,
accessibility, privacy, observability (log & monitoring), backup, recovery.
Target absensi realistis terhadap jaringan; jangan menjadikan "<5 detik"
jaminan mutlak.

## 46. Technology Stack & Alasan

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js App Router + TypeScript | SSR/route handler satu basis, ekosistem besar |
| UI | Tailwind CSS + shadcn/ui | cepat, konsisten, accessible, dimiliki proyek |
| Backend | Next.js Route Handlers | kolokasi API + web, tipis & tervalidasi |
| DB | PostgreSQL | transaksional, index kuat, konsisten dev/prod |
| ORM | Drizzle ORM | type-safe, migrasi SQL transparan |
| Auth | Better Auth | sesi server-side, RBAC/admin plugin, cookie aman |
| Validasi | Zod | skema ketat dipakai server & client |
| Storage | S3-compatible | foto private + signed URL |
| Notifikasi | Email + Telegram API (WhatsApp opsional) | murah, mudah, terdokumentasi |
| Deployment | Vercel atau VPS/Docker | fleksibel sesuai skala |

## 47. Environment Variables

```dotenv
DATABASE_URL=postgresql://user:pass@host:5432/hadirku
MIGRATION_DATABASE_URL=            # opsional (direct connection)
BETTER_AUTH_SECRET=                # rahasia sesi
BETTER_AUTH_URL=http://localhost:3000
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
TELEGRAM_BOT_TOKEN=
WHATSAPP_API_KEY=
EMAIL_API_KEY=
FACE_API_KEY=                      # P3
TZ=Asia/Jakarta
```

Secret asli tidak pernah masuk source code; `.env.local` ignored.

## 48. Deployment

Node.js host + PostgreSQL persisten. Jalankan migrasi sekali per rilis
(`npm run db:migrate`), lalu build & start. Container: Dockerfile app + target
migrator. Object storage & backup dikonfigurasi per environment. HTTPS wajib.

## 49. Monitoring

Pantau: API error, DB error, login gagal, absensi gagal, validasi GPS gagal,
upload kamera gagal, notifikasi gagal, performa server. Sediakan health check,
error logging, dan alert sederhana.

## 50. Backup & Recovery

Backup database harian (retensi sesuai kebijakan, audit log minimal 12 bulan),
prosedur restore teruji, disaster recovery, retensi file/foto, dan dokumentasi
runbook.

## 51. Risks & Mitigation

| Risiko | Dampak | Prob. | Mitigasi |
|---|---|---|---|
| GPS tidak akurat | Absen gagal | Tinggi | Batas akurasi configurable + retry + pesan jelas |
| Fake GPS | Kehadiran palsu | Sedang | Geofence server, device binding, anomaly log, audit |
| Kamera gagal | Tidak bisa absen | Sedang | Pesan jelas, fallback koreksi manual |
| Internet tidak stabil | Absen tertunda | Tinggi | Idempotency, retry; offline mode (P3) |
| Data pribadi bocor | Reputasi/hukum | Rendah | Enkripsi, RBAC, storage private, audit |
| Data biometrik | Risiko privasi | Rendah | Fitur terpisah, consent, retention ketat (P3) |
| DB failure | Layanan berhenti | Rendah | Backup harian, monitoring, HA opsional |
| Notifikasi gagal | Info terlambat | Sedang | Queue + retry + log |
| Server down | Absen terhenti | Rendah | Monitoring + autoscaling/HA |
| User abuse | Kecurangan | Sedang | Rate limit, audit, approval |
| Duplicate attendance | Data ganda | Sedang | Unique constraint + idempotency |
| Device sharing | Titip absen | Sedang | Device binding + face verification (P3) |

## 52. Assumptions

Karyawan memakai smartphone berkamera + GPS; memberikan permission kamera &
lokasi; tersedia internet saat absen online; perusahaan menetapkan titik lokasi
& radius; server memiliki waktu akurat (NTP); HR menetapkan jadwal sebelum
absensi; email kantor aktif untuk reset password; admin mengelola master data
secara berkala.

## 53. Prioritization (P0–P3)

Lihat §9. Penjelasan tambahan: fokus P0 pada **integritas absensi** (kamera +
GPS + server time) karena itu inti nilai produk; P1 melengkapi workflow HR;
P2 efisiensi operasional; P3 diferensiasi/anti-fraud lanjutan.

## 54. Roadmap

- **PHASE 1 Foundation**: setup, DB schema + migrasi, auth, RBAC, employee.
- **PHASE 2 Core Attendance**: schedule, work location, GPS, geofence, kamera,
  check-in/out, riwayat.
- **PHASE 3 HR Management**: holiday, izin/sakit/cuti/dinas/lembur, shift,
  overtime, approval.
- **PHASE 4 Dashboard & Reports**: dashboard, laporan, export CSV/Excel/PDF.
- **PHASE 5 Notification**: email/Telegram/WA, reminder, queue.
- **PHASE 6 Security**: audit log, device management, anti-fraud, hardening.
- **PHASE 7 Advanced**: face verification, liveness, offline, multi-company,
  payroll integration.
- **PHASE 8 Production**: testing menyeluruh, security/perf testing, backup,
  deployment, monitoring.

## 55. IMPLEMENTATION PROMPT FOR OPENCODE

> Salin prompt ini sebagai instruksi kerja untuk agent coding (OpenCode) di
> repository `ngodingpakeai-starter`.

**Peran:** Kamu adalah senior full-stack engineer yang mengimplementasikan
HadirKu bertahap di repo Next.js + Drizzle + PostgreSQL + Better Auth.

**Aturan wajib:**
1. Baca seluruh PRD v2.0 ini sebelum coding.
2. Jangan langsung membuat seluruh aplikasi — kerjakan per fase.
3. Analisis struktur file yang ada; jangan hapus kode existing tanpa alasan.
4. Jangan membuat duplicate table/API/component; cek dulu yang sudah ada.
5. Semua data penting divalidasi **server-side** (Zod + service).
6. Jangan mempercayai role, status, timestamp, distance, hasil geofence dari client.
7. Jangan menyimpan secret di source code; gunakan env.
8. Setiap perubahan schema: edit file tabel → `npm run db:generate` → review SQL
   → `npm run db:migrate`; commit SQL + meta bersama.
9. Ikuti pola yang ada: API tipis → service → Drizzle; UI memakai komponen yang
   sudah ada (`src/components/ui`).
10. Setelah setiap fase: jalankan `npm run check` dan `npm run build`; perbaiki
    semua error sebelum lanjut; pastikan fitur fase sebelumnya tetap jalan.
11. Buat audit log untuk perubahan penting; jangan pernah menghapus histori.
12. Akhiri setiap fase dengan laporan: file dibuat, file diubah, penjelasan,
    hasil test, error yang diperbaiki, dan checkpoint.

**Workflow tiap fase:**
`PLAN → IMPLEMENT → MIGRATE → TEST → REVIEW → FIX → DOCUMENT → CHECKPOINT → NEXT PHASE`

**Urutan implementasi (ikuti roadmap §54):**
1. **Phase 1**: schema DB inti (companies, users/employees, departments,
   positions, work_locations, shifts, work_schedules, holidays,
   attendance_records, attendance_photos, requests, devices, audit_logs) +
   migrasi; RBAC permission; CRUD employee/lokasi/shift/hari libur (API+UI);
   seed admin & data contoh.
2. **Phase 2**: halaman absensi karyawan — GPS + Haversine server + geofence,
   kamera, check-in/out (idempotent, anti-duplikat, server timestamp), riwayat
   + bukti (foto signed URL).
3. **Phase 3**: requests + approval + koreksi + saldo cuti + lembur.
4. **Phase 4**: dashboard HR + laporan + export.
5. **Phase 5**: notifikasi & reminder (queue).
6. **Phase 6**: audit lengkap, device management, hardening.
7. **Phase 7**: advanced (face, offline, multi-company) sesuai kebutuhan.
8. **Phase 8**: production readiness.

**Definisi selesai tiap fase:** semua acceptance criteria fase terkait lulus,
`npm run check` hijau, `npm run build` hijau, tidak ada error kritis, dan
checkpoint dilaporkan.

---

*Referensi desain: prototype DesainPakeAI project `absensi-karyawan`
(18 halaman: karyawan + admin). Dokumen v1.0 tetap tersedia sebagai lampiran;
v2.0 menggantikan/melengkapi.*
