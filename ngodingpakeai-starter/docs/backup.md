# Backup & Recovery — HadirKu

## 1. Backup harian (database)

Database berjalan di PostgreSQL. Untuk lingkungan Docker lokal milik starter:

```bash
npm run db:status        # pastikan container sehat
docker exec <nama-container-postgres> pg_dump -U hadirku -Fc hadirku > backup-$(Get-Date -Format yyyyMMdd).dump
```

Untuk PostgreSQL eksternal/managed (produksi), pakai `pg_dump` versi yang sama
dengan server:

```bash
pg_dump "$DATABASE_URL" -Fc > backup-20261004.dump
```

Rekomendasi:
- Backup harian otomatis via cron/CI, retensi 30 hari terakhir + 12 bulan untuk
  audit (audit_logs wajib tersimpan minimal 12 bulan sesuai PRD §50).
- Simpan dump di lokasi terpisah dari server (object storage/S3) dan uji restore
  berkala (minimal sekali per kuartal).

## 2. File foto & lampiran

Foto absensi dan lampiran pengajuan tersimpan di folder `storage/` lokal.
Untuk produksi, arahkan ke object storage S3-compatible (env `STORAGE_*`) dan
aktifkan versioning/lifecycle sesuai kebijakan retensi.

Backup file: salin folder `storage/` ke bucket backup dengan retensi yang sama
dengan database.

## 3. Restore (database)

```bash
# Hentikan aplikasi dulu, lalu:
createdb hadirku_restore   # database kosong baru
pg_restore -d hadirku_restore -c backup-20261004.dump
```

Atau restore ke container Docker:

```bash
docker exec -i <container> pg_restore -U hadirku -d hadirku -c < backup-20261004.dump
```

## 4. Prosedur verifikasi

1. Restore ke database sementara (bukan produksi).
2. Jalankan `npm run db:migrate` — pastikan tidak ada konflik migrasi.
3. Jalankan `npm run doctor` dan buka `GET /api/health` — harus `status: ok`.
4. Login akun admin, buka dashboard, dan bandingkan jumlah rekap dengan
   hari sebelum backup.

## 5. Runbook insiden singkat

| Gejala | Cek pertama | Tindakan |
|---|---|---|
| /api/health 503 | `docker ps` / status PostgreSQL | Nyalakan DB, cek disk & log `db:logs` |
| Login gagal massal | log Better Auth | Periksa rate limit & akun terkunci; cek secret |
| Absensi ditolak | log server (GPS/GEOFENCE) | Periksa lokasi/radius/akurasi di Pengaturan |
| Email tidak terkirim | log "Resend failed" | Cek RESEND_API_KEY & kuota provider |
| DB error 500 | log `Unexpected API failure` | Cek pool (max 5), indeks, dan beban query |
