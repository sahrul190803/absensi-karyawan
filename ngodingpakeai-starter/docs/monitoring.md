# Monitoring & Observability — HadirKu

## 1. Health check

- `GET /api/health` — publik, tanpa sesi. Mengembalikan
  `{"status":"ok","database":"up"}` atau 503 `{"status":"degraded"}`.
- Pasang uptime monitor (UptimeRobot/Vercel Health/Checkly) tiap 1–5 menit,
  alert jika gagal 2x beruntun.

## 2. Metrik yang dipantau

| Area | Sinyal | Sumber |
|---|---|---|
| API error | log `Unexpected API failure` | log server |
| DB error | log pool `idle connection lost` / health 503 | log server + health |
| Login gagal | 429 dari Better Auth rate limiter | log Better Auth |
| Absensi gagal | kode error GPS_ACCURACY/OUTSIDE_GEOFENCE/CAMERA_UNAVAILABLE | response API + log |
| Notifikasi gagal | log `Resend failed` / `notification_logs.status = failed` | log + tabel |
| Job alpha/reminder | respons endpoint `/api/admin/jobs/*` | log permintaan |

## 3. Logging

- Tidak ada secret yang boleh masuk log (jangan log password, token, atau
  `DATABASE_URL`).
- Log server saat ini via `console.error` untuk kegagalan kritis; di produksi
  arahkan ke agregator (Vercel Logs/Papertrail/Axiom) agar bisa dicari.

## 4. Alert sederhana

1. Health check gagal → halaman admin & absensi tidak bisa diakses.
2. `Resend failed` berturut-turut → email reset password/notifikasi mati.
3. Rasio absensi gagal per jam naik drastis → periksa GPS/kamera/kebijakan.
4. Job alpha belum dijalankan menjelang akhir hari kerja (cek dashboard HR).

## 5. Sumber daya

- Indeks utama sudah dibuat untuk kolom pencarian (attendance date/status,
  requests user/status, audit entity). Jika query laporan lambat, periksa
  `EXPLAIN ANALYZE` sebelum menambah indeks.
- Pool PostgreSQL dibatasi 5 koneksi (`src/db/index.ts`); naikkan hanya jika
  server DB mendukung.
