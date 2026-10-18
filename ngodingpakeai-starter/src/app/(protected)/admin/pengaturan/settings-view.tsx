"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS } from "@/lib/permissions";

type Settings = {
  name: string;
  timezone: string;
  allowHolidayWork: boolean;
  gpsAccuracyLimitM: number;
  defaultRadiusM: number;
  defaultToleranceMinutes: number;
  payday: number;
  faceVerificationEnabled: boolean;
  faceSimilarityThreshold: number;
  faceLivenessRequired: boolean;
  faceProviderConfigured: boolean;
};

const ROLE_ROWS = [
  {
    pill: "HRD",
    pillClass: "bg-foreground text-background",
    position: "Paling atas — bos SDM",
    duties:
      "Rekrutmen, kelola semua karyawan, penggajian, laporan, aturan perusahaan.",
    access:
      "Menu penuh: Dashboard, Attendant (create/request/view), Penggajian, Laporan, Data Karyawan, Master data, Pengaturan.",
  },
  {
    pill: "HOD",
    pillClass:
      "border border-border-strong bg-primary-quiet text-primary-text",
    position: "Kepala divisi — di bawah HRD",
    duties:
      "Atur jadwal shift timnya, konfirmasi izin/sakit/tukar shift, kelola training.",
    access:
      "Menu terbatas: Dashboard, Attendant (create/request/view), Training, Laporan. Absen tanpa wajib radius (dinas luar).",
  },
  {
    pill: "Karyawan & Marketing",
    pillClass: "border border-border-strong bg-card text-foreground",
    position: "Anak buah HOD — pelaksana harian",
    duties:
      "Absen foto, lihat jadwal, ajukan izin/tukar shift, klaim jatah makan.",
    access:
      "Menu personal: Beranda Absen, Attendant, Jadwal Makan, Profil. Fitur lain (jadwal, riwayat, training, notifikasi) lewat ikon di Beranda. Marketing: absen foto tanpa lokasi.",
  },
] as const;

const LEVELS = [
  {
    number: "1",
    title: "HRD",
    body: "Bos SDM — mengatur semua karyawan, rekrutmen, gaji, dan aturan perusahaan.",
    pill: "HRD",
    pillClass: "bg-foreground text-background",
  },
  {
    number: "2",
    title: "HOD — Kepala Divisi",
    body: "Mandor tiap bidang: HOD Bar, HOD Kitchen, HOD Service. Bertanggung jawab penuh atas divisinya.",
    pill: "HOD",
    pillClass:
      "border border-border-strong bg-primary-quiet text-primary-text",
  },
  {
    number: "3",
    title: "Karyawan & Tim Marketing",
    body: "Anak buah HOD — tim pelaksana yang bekerja harian.",
    pill: "Karyawan",
    pillClass: "border border-border-strong bg-card text-foreground",
  },
] as const;

export function SettingsView({
  userEmail,
  userRole,
}: {
  userEmail: string;
  userRole: string;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat pengaturan.");
        return;
      }
      setSettings(body.data);
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = useCallback(async () => {
    if (!settings) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          timezone: settings.timezone,
          allowHolidayWork: settings.allowHolidayWork,
          gpsAccuracyLimitM: settings.gpsAccuracyLimitM,
          defaultRadiusM: settings.defaultRadiusM,
          defaultToleranceMinutes: settings.defaultToleranceMinutes,
          payday: settings.payday,
          faceVerificationEnabled: settings.faceVerificationEnabled,
          faceSimilarityThreshold: settings.faceSimilarityThreshold,
          faceLivenessRequired: settings.faceLivenessRequired,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Pengaturan gagal disimpan.",
        );
        return;
      }
      setSettings(body.data);
      setNotice("Pengaturan disimpan.");
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [settings]);

  const clearNotifications = useCallback(async () => {
    if (!window.confirm("Hapus seluruh riwayat notifikasi Anda?")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/notifications", { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Riwayat notifikasi gagal dihapus.");
        return;
      }
      setNotice("Riwayat notifikasi dihapus.");
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (loading) {
    return (
      <p className="mx-auto max-w-xl text-sm text-muted-foreground">
        Memuat pengaturan…
      </p>
    );
  }

  if (!settings) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-xl rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
      >
        {error ?? "Pengaturan tidak tersedia."}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Pengaturan
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Konfigurasi perusahaan, geofence default, toleransi, dan peran akses.
      </p>

      {notice && (
        <p role="status" className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section className="mt-6 grid gap-3 rounded-lg border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Profil perusahaan
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Identitas dan zona waktu yang dipakai seluruh aplikasi.
          </p>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Nama perusahaan</span>
          <input
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={settings.name}
            onChange={(event) =>
              setSettings({ ...settings, name: event.target.value })
            }
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Zona waktu</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={settings.timezone}
            onChange={(event) =>
              setSettings({ ...settings, timezone: event.target.value })
            }
          >
            <option value="Asia/Jakarta">WIB (UTC+7)</option>
            <option value="Asia/Makassar">WITA (UTC+8)</option>
            <option value="Asia/Jayapura">WIT (UTC+9)</option>
          </select>
        </label>
        <div className="mt-2 border-t border-border pt-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Aturan absensi
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Batas akurasi GPS, radius default, dan toleransi keterlambatan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Batas akurasi GPS (m)</span>
            <input
              type="number"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={settings.gpsAccuracyLimitM}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  gpsAccuracyLimitM: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Radius default (m)</span>
            <input
              type="number"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={settings.defaultRadiusM}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  defaultRadiusM: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Toleransi terlambat default (menit)</span>
          <input
            type="number"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={settings.defaultToleranceMinutes}
            onChange={(event) =>
              setSettings({
                ...settings,
                defaultToleranceMinutes: Number(event.target.value),
              })
            }
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-current"
            checked={settings.allowHolidayWork}
            onChange={(event) =>
              setSettings({
                ...settings,
                allowHolidayWork: event.target.checked,
              })
            }
          />
          <span>Izinkan absensi pada hari libur</span>
        </label>
        <div className="mt-2 border-t border-border pt-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Kalender &amp; penggajian
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tanggal gajian dan agenda yang muncul di kalender HRD.
          </p>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Tanggal gajian (1–28)</span>
          <input
            type="number"
            min={1}
            max={28}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={settings.payday}
            onChange={(event) =>
              setSettings({
                ...settings,
                payday: Number(event.target.value),
              })
            }
          />
          <span className="text-xs text-muted-foreground">
            Tanggal ini ditandai sebagai agenda gajian di kalender HRD.
          </span>
        </label>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "Menyimpan..." : "Simpan pengaturan"}
        </Button>
      </section>

      <section aria-labelledby="notifikasi-title" className="mt-8">
        <h2
          id="notifikasi-title"
          className="text-lg font-semibold tracking-tight"
        >
          Notifikasi admin
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aktivitas seperti karyawan baru mendaftar dan pengajuan yang masuk
          akan muncul di pusat notifikasi admin.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-5">
          <div>
            <p className="font-medium">Pusat notifikasi</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Lihat aktivitas terbaru, filter, tandai dibaca, atau hapus
              riwayat.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/notifikasi">
              <Button variant="outline" size="sm">
                Buka pusat notifikasi
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void clearNotifications()}
            >
              <Trash2 aria-hidden="true" />
              Hapus riwayat
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="akun-title" className="mt-8">
        <h2 id="akun-title" className="text-lg font-semibold tracking-tight">
          Akun &amp; keamanan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informasi akun admin yang sedang dipakai.
        </p>
        <div className="mt-4 grid gap-3 rounded-lg border bg-card p-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="mt-0.5 font-medium break-all">{userEmail}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Peran</p>
            <p className="mt-0.5 font-medium">
              {userRole
                .split(",")
                .map((role) => ROLE_LABELS[role.trim()] ?? role.trim())
                .join(" · ") || "HRD"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Link href="/forgot-password">
              <Button variant="outline" size="sm">
                Ubah kata sandi
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="tampilan-title" className="mt-8">
        <h2
          id="tampilan-title"
          className="text-lg font-semibold tracking-tight"
        >
          Tampilan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilihan tema tersimpan otomatis di perangkat ini dan berlaku di
          seluruh halaman.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-5">
          <div>
            <p className="font-medium">Tema terang / gelap</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Klik tombol untuk berganti tema — ikon bulan saat tema terang,
              matahari saat tema gelap.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section aria-labelledby="peran-title" className="mt-8">
        <h2 id="peran-title" className="text-lg font-semibold tracking-tight">
          Peran &amp; Akses
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Struktur organisasi: HRD di paling atas, HOD memimpin tiap divisi di
          bawah HRD, lalu Karyawan &amp; Tim Marketing sebagai pelaksana harian.
          Akses menu otomatis mengikuti peran akun.
        </p>

        <ol className="mt-4 grid gap-2">
          {LEVELS.map((level) => (
            <li
              key={level.number}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <span className="grid size-7 flex-none place-items-center rounded-full bg-foreground font-mono text-xs font-semibold text-background">
                {level.number}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {level.title}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${level.pillClass}`}
                  >
                    {level.pill}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {level.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-5 py-3">
                  Peran
                </th>
                <th scope="col" className="px-5 py-3">
                  Posisi
                </th>
                <th scope="col" className="px-5 py-3">
                  Tugas utama
                </th>
                <th scope="col" className="px-5 py-3">
                  Aksen &amp; akses
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLE_ROWS.map((row) => (
                <tr
                  key={row.pill}
                  className="border-b border-border align-top last:border-0"
                >
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${row.pillClass}`}
                    >
                      {row.pill}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium">{row.position}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {row.duties}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {row.access}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Aksen pill mengikuti peran, bukan divisi: HRD gelap, HOD lime lembut,
          Karyawan/Marketing outline. Badge peran hanya penanda tampilan —
          pembatasan akses tetap divalidasi di server.
        </p>
      </section>
    </div>
  );
}
