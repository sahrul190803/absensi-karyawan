"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, Camera, RefreshCw, Send, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/charts";
import { StatusBadge } from "@/components/status-badge";
import { clock, formatDate, REQUEST_TYPE_LABELS } from "@/lib/format";

type AttendanceRow = {
  id: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInDistance: number | null;
  checkInPhotoId: string | null;
  checkOutPhotoId: string | null;
  employeeName: string;
  employeeNik: string;
  locationName: string;
};

type PhotoView = {
  id: string;
  employeeName: string;
  label: string;
  time: string | null;
};

type PendingRequest = {
  id: string;
  type: string;
  startDate: string;
  endDate: string | null;
  employeeName: string;
};

export function DashboardView() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobNotice, setJobNotice] = useState<string | null>(null);
  const [jobBusy, setJobBusy] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [photoView, setPhotoView] = useState<PhotoView | null>(null);

  const load = useCallback(async () => {
    try {
      const [attendanceResponse, requestResponse] = await Promise.all([
        fetch("/api/admin/attendance?limit=100", { cache: "no-store" }),
        fetch("/api/admin/requests?status=pending&limit=6", {
          cache: "no-store",
        }),
      ]);
      const attendanceBody = await attendanceResponse.json();
      const requestBody = await requestResponse.json();
      if (!attendanceResponse.ok) {
        setError(attendanceBody?.error?.message ?? "Gagal memuat rekap.");
        return;
      }
      setRows(attendanceBody.data);
      setDate(attendanceBody.meta?.date ?? "");
      setPending(requestResponse.ok ? requestBody.data : []);
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

  useEffect(() => {
    if (!photoView) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhotoView(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photoView]);

  const counts = useMemo(
    () =>
      rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {}),
    [rows],
  );

  const chartData = useMemo(
    () => [
      {
        label: "Hadir",
        value: (counts.present ?? 0) + (counts.holiday_work ?? 0),
        color: "#137A4A",
      },
      { label: "Terlambat", value: counts.late ?? 0, color: "#A65D00" },
      {
        label: "Pulang cepat",
        value: counts.early_leave ?? 0,
        color: "#0C0A08",
      },
      { label: "Alpha", value: counts.alpha ?? 0, color: "#B42318" },
    ],
    [counts],
  );

  const runAlphaJob = async () => {
    setJobBusy(true);
    setJobNotice(null);
    try {
      const response = await fetch("/api/admin/jobs/alpha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Job alpha gagal dijalankan.");
        return;
      }
      setJobNotice(
        `${body.data?.assigned ?? 0} alpha ditetapkan hari ini${
          body.data?.skipped ? `, ${body.data.skipped} dilewati` : ""
        }.`,
      );
      await load();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setJobBusy(false);
    }
  };

  const runReminderJob = async () => {
    setReminderBusy(true);
    setReminderNotice(null);
    try {
      const response = await fetch("/api/admin/jobs/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Job reminder gagal dijalankan.");
        return;
      }
      setReminderNotice(
        `${body.data?.sent ?? 0} reminder terkirim${
          body.data?.skipped ? `, ${body.data.skipped} dilewati` : ""
        }.`,
      );
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setReminderBusy(false);
    }
  };

  const presencePercent =
    rows.length === 0
      ? 0
      : Math.round(
          (((counts.present ?? 0) + (counts.holiday_work ?? 0)) / rows.length) *
            100,
        );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap absensi {date ? formatDate(date) : "hari ini"} · waktu server
            WIB
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link href="/admin/jadwal">
              <CalendarClock aria-hidden="true" />
              Buka Attendant
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {jobNotice && (
        <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">
          {jobNotice}
        </p>
      )}
      {reminderNotice && (
        <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">
          {reminderNotice}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Hadir",
            value: (counts.present ?? 0) + (counts.holiday_work ?? 0),
          },
          { label: "Terlambat", value: counts.late ?? 0 },
          { label: "Pulang cepat", value: counts.early_leave ?? 0 },
          { label: "Alpha", value: counts.alpha ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 font-mono text-2xl font-medium">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-lg border bg-card p-5 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Distribusi kehadiran hari ini</h2>
            <span className="font-mono text-xs text-muted-foreground">
              {presencePercent}% hadir
            </span>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Memuat…</p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Belum ada absensi tercatat hari ini.
            </p>
          ) : (
            <DonutChart
              className="mt-5"
              title="Distribusi kehadiran hari ini"
              centerLabel="Absensi"
              data={chartData}
            />
          )}
        </section>

        <section className="rounded-lg border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Menunggu persetujuan</h2>
            <Link
              href="/admin/jadwal"
              className="text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="size-4" aria-hidden="true" />
              Tidak ada pengajuan yang menunggu.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {pending.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {request.employeeName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {REQUEST_TYPE_LABELS[request.type] ?? request.type} ·{" "}
                      {formatDate(request.startDate, {
                        day: "numeric",
                        month: "short",
                      })}
                      {request.endDate && request.endDate !== request.startDate
                        ? ` – ${formatDate(request.endDate, { day: "numeric", month: "short" })}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status="pending" kind="request" />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              disabled={reminderBusy}
              onClick={() => void runReminderJob()}
            >
              <Send aria-hidden="true" />
              {reminderBusy ? "Mengirim…" : "Kirim reminder absen hari ini"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              disabled={jobBusy}
              onClick={() => void runAlphaJob()}
            >
              <RefreshCw aria-hidden="true" />
              {jobBusy ? "Menjalankan…" : "Tetapkan alpha hari ini"}
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="font-semibold">Absensi hari ini</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {rows.length} catatan
          </span>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Memuat rekap…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Belum ada absensi tercatat hari ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-5 py-3">
                    Karyawan
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Masuk
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Pulang
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Lokasi
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const checkInPhotoId = row.checkInPhotoId;
                  const checkOutPhotoId = row.checkOutPhotoId;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium">{row.employeeName}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {row.employeeNik}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          {clock(row.checkInTime)}
                          {checkInPhotoId && (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              title="Lihat foto absen masuk"
                              aria-label={`Lihat foto absen masuk ${row.employeeName}`}
                              onClick={() =>
                                setPhotoView({
                                  id: checkInPhotoId,
                                  employeeName: row.employeeName,
                                  label: "Absen masuk",
                                  time: row.checkInTime,
                                })
                              }
                            >
                              <Camera aria-hidden="true" />
                            </Button>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          {clock(row.checkOutTime)}
                          {checkOutPhotoId && (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              title="Lihat foto absen pulang"
                              aria-label={`Lihat foto absen pulang ${row.employeeName}`}
                              onClick={() =>
                                setPhotoView({
                                  id: checkOutPhotoId,
                                  employeeName: row.employeeName,
                                  label: "Absen pulang",
                                  time: row.checkOutTime,
                                })
                              }
                            >
                              <Camera aria-hidden="true" />
                            </Button>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs">
                          {row.locationName}
                          {row.checkInDistance != null && (
                            <span className="ml-1.5 font-mono text-muted-foreground">
                              {Math.round(row.checkInDistance)} m
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {photoView && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${photoView.label} ${photoView.employeeName}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setPhotoView(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-lg border border-border bg-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold">
                  {photoView.employeeName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {photoView.label}
                  {photoView.time ? ` · ${clock(photoView.time)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoView(null)}
                className="grid size-8 flex-none place-items-center rounded-md border border-border text-muted-foreground"
                aria-label="Tutup foto"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`Foto ${photoView.label} ${photoView.employeeName}`}
              className="max-h-[70dvh] w-full bg-background object-contain"
              src={`/api/attendance/photos/${photoView.id}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
