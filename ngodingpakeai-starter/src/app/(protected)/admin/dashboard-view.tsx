"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CalendarRange,
  Camera,
  ChevronRight,
  ClipboardCheck,
  Eye,
  ImageOff,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/charts";
import { StatusBadge } from "@/components/status-badge";
import {
  clock,
  formatDate,
  REQUEST_TYPE_LABELS,
  shortTime,
} from "@/lib/format";

type AttendanceRow = {
  id: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  lateMinutes: number;
  notes: string;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  checkInPhotoId: string | null;
  checkOutPhotoId: string | null;
  employeeName: string;
  employeeNik: string;
  locationName: string;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
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

type StatusFilter = "all" | "present" | "late" | "early_leave" | "alpha";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Semua",
  present: "Hadir",
  late: "Terlambat",
  early_leave: "Pulang cepat",
  alpha: "Alpha",
};

const CHART_FILTERS: Record<string, StatusFilter> = {
  Hadir: "present",
  Terlambat: "late",
  "Pulang cepat": "early_leave",
  Alpha: "alpha",
};

const todayJakarta = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const simulationSteps = [
  {
    href: "/admin/jadwal?tab=request",
    title: "Tinjau pengajuan",
    description:
      "Setujui atau tolak izin, sakit, cuti, dinas luar, dan tukar shift.",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/jadwal?tab=create",
    title: "Atur jadwal & shift",
    description:
      "Susun jadwal karyawan per tanggal, atur shift, dan lihat hasilnya.",
    icon: CalendarRange,
  },
  {
    href: "/admin/makan",
    title: "Kelola klaim makan",
    description:
      "Pantau klaim per sesi, cek yang belum klaim, dan hapus klaim keliru.",
    icon: UtensilsCrossed,
  },
  {
    href: "/admin/penggajian?tab=pay",
    title: "Hitung & bayar gaji",
    description:
      "Siapkan periode gaji, sesuaikan komponen, lalu catat pembayaran.",
    icon: Wallet,
  },
  {
    href: "/admin/laporan",
    title: "Analisis laporan",
    description:
      "Lihat rekap harian, bulanan, atau tahunan lalu unduh sebagai berkas.",
    icon: BarChart3,
  },
  {
    href: "/admin/karyawan",
    title: "Kelola data karyawan",
    description:
      "Tambah karyawan, atur departemen, jabatan, dan status kepegawaian.",
    icon: Users,
  },
];

function AttendancePhotoThumb({
  photoId,
  employeeName,
  label,
  onOpen,
}: {
  photoId: string | null;
  employeeName: string;
  label: string;
  onOpen: () => void;
}) {
  if (!photoId) {
    return (
      <div
        className="grid h-20 w-16 flex-none place-items-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground"
        title="Foto tidak tersedia"
      >
        <ImageOff className="size-5" aria-hidden="true" />
        <span className="sr-only">
          Foto {label.toLowerCase()} tidak tersedia
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Lihat foto ${label.toLowerCase()}`}
      aria-label={`Lihat foto ${label.toLowerCase()} ${employeeName}`}
      className="group relative h-20 w-16 flex-none overflow-hidden rounded-md border border-border bg-muted"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`Foto ${label.toLowerCase()} ${employeeName}`}
        className="size-full object-cover"
        loading="lazy"
        src={`/api/attendance/photos/${photoId}`}
      />
      <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
        <Eye className="size-5" aria-hidden="true" />
      </span>
    </button>
  );
}

export function DashboardView() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobNotice, setJobNotice] = useState<string | null>(null);
  const [jobBusy, setJobBusy] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [photoView, setPhotoView] = useState<PhotoView | null>(null);
  const [detailRow, setDetailRow] = useState<AttendanceRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const tableRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (selectedDate) params.set("date", selectedDate);
      const [attendanceResponse, requestResponse] = await Promise.all([
        fetch(`/api/admin/attendance?${params}`, { cache: "no-store" }),
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
  }, [selectedDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!photoView && !detailRow) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (photoView) {
        setPhotoView(null);
        return;
      }
      setDetailRow(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailRow, photoView]);

  const counts = useMemo(
    () =>
      rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {}),
    [rows],
  );

  const filterCounts = useMemo(
    () => ({
      all: rows.length,
      present: (counts.present ?? 0) + (counts.holiday_work ?? 0),
      late: counts.late ?? 0,
      early_leave: counts.early_leave ?? 0,
      alpha: counts.alpha ?? 0,
    }),
    [counts, rows.length],
  );

  const visibleRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    if (statusFilter === "present")
      return rows.filter(
        (row) => row.status === "present" || row.status === "holiday_work",
      );
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const chartData = useMemo(
    () => [
      {
        label: "Hadir",
        value: filterCounts.present,
        color: "#137A4A",
      },
      { label: "Terlambat", value: filterCounts.late, color: "#A65D00" },
      {
        label: "Pulang cepat",
        value: filterCounts.early_leave,
        color: "#0C0A08",
      },
      { label: "Alpha", value: filterCounts.alpha, color: "#B42318" },
    ],
    [filterCounts],
  );

  const applyFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    window.requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
      : Math.round((filterCounts.present / rows.length) * 100);

  const today = todayJakarta();
  const isToday = !date || date === today;
  const periodLabel = isToday
    ? "hari ini"
    : formatDate(date, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const statCards: Array<{
    filter: StatusFilter;
    label: string;
    value: number;
    color: string;
  }> = [
    {
      filter: "present",
      label: "Hadir",
      value: filterCounts.present,
      color: "#137A4A",
    },
    {
      filter: "late",
      label: "Terlambat",
      value: filterCounts.late,
      color: "#A65D00",
    },
    {
      filter: "early_leave",
      label: "Pulang cepat",
      value: filterCounts.early_leave,
      color: "#0C0A08",
    },
    {
      filter: "alpha",
      label: "Alpha",
      value: filterCounts.alpha,
      color: "#B42318",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap absensi {periodLabel} · waktu server WIB
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              Tanggal absensi
            </span>
            <input
              type="date"
              className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
              value={selectedDate || date}
              max={today}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setDetailRow(null);
              }}
              aria-label="Pilih tanggal rekap absensi"
            />
          </label>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDate("");
                setDetailRow(null);
              }}
            >
              Hari ini
            </Button>
          )}
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
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm"
        >
          {jobNotice}
        </p>
      )}
      {reminderNotice && (
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm"
        >
          {reminderNotice}
        </p>
      )}

      <section
        aria-labelledby="simulasi-admin"
        className="rounded-lg border border-border-strong bg-primary-quiet/50 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2
              id="simulasi-admin"
              className="inline-flex items-center gap-2 text-sm font-semibold"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Simulasi alur admin
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Klik setiap kartu untuk membuka fiturnya. Semua langkah memakai
              data demo yang bisa langsung dicoba.
            </p>
          </div>
          <span className="rounded-full border border-border-strong bg-card px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {rows.length} absensi · {pending.length} pengajuan
          </span>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {simulationSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="group flex h-full items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-border-strong hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="grid size-9 flex-none place-items-center rounded-md border border-border bg-background text-primary-text">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {index + 1}.
                      </span>
                      {step.title}
                      <ArrowUpRight
                        className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {step.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((stat) => {
          const active = statusFilter === stat.filter;
          return (
            <button
              key={stat.filter}
              type="button"
              aria-pressed={active}
              onClick={() => applyFilter(stat.filter)}
              className={`group rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                active
                  ? "border-border-strong bg-primary-quiet"
                  : "border-border bg-card hover:border-border-strong hover:bg-muted/50"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ background: stat.color }}
                />
              </span>
              <span className="mt-1 block font-mono text-2xl font-medium">
                {stat.value}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                {active ? "Filter aktif" : "Lihat detail"}
                <ChevronRight
                  className="size-3 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </button>
          );
        })}
      </dl>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-lg border bg-card p-5 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              Distribusi kehadiran {periodLabel}
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              {presencePercent}% hadir
            </span>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Memuat…</p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Belum ada absensi tercatat {isToday ? "hari ini" : periodLabel}.
            </p>
          ) : (
            <>
              <DonutChart
                className="mt-5"
                title={`Distribusi kehadiran ${periodLabel}`}
                centerLabel="Absensi"
                data={chartData}
                onSelect={(label) => {
                  const filter = CHART_FILTERS[label];
                  if (filter) applyFilter(filter);
                }}
                activeLabel={
                  statusFilter === "all" ? null : FILTER_LABELS[statusFilter]
                }
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Klik keterangan warna untuk memfilter tabel di bawah.
              </p>
            </>
          )}
        </section>

        <section className="rounded-lg border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Menunggu persetujuan</h2>
            <Link
              href="/admin/jadwal?tab=request"
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
            <ul className="mt-3 divide-y divide-border">
              {pending.map((request) => (
                <li key={request.id}>
                  <Link
                    href="/admin/jadwal?tab=request"
                    className="group flex items-center justify-between gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                    title="Buka halaman persetujuan"
                  >
                    <span className="min-w-0 pl-1">
                      <span className="block truncate text-sm font-medium">
                        {request.employeeName}
                      </span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {REQUEST_TYPE_LABELS[request.type] ?? request.type} ·{" "}
                        {formatDate(request.startDate, {
                          day: "numeric",
                          month: "short",
                        })}
                        {request.endDate &&
                        request.endDate !== request.startDate
                          ? ` – ${formatDate(request.endDate, {
                              day: "numeric",
                              month: "short",
                            })}`
                          : ""}
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-1.5">
                      <StatusBadge status="pending" kind="request" />
                      <ChevronRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
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

      <section
        ref={tableRef}
        aria-labelledby="absensi-tanggal"
        className="scroll-mt-24 rounded-lg border bg-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            <h2 id="absensi-tanggal" className="font-semibold">
              {isToday ? "Absensi hari ini" : `Absensi ${periodLabel}`}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {statusFilter === "all"
                ? `${rows.length} catatan`
                : `${visibleRows.length} dari ${rows.length} catatan · ${FILTER_LABELS[statusFilter]}`}
            </p>
          </div>
          <Link
            href="/admin/laporan"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
          >
            Laporan lengkap
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
          {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((filter) => {
            const active = statusFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                  active
                    ? "border-border-strong bg-primary-quiet text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {FILTER_LABELS[filter]}
                <span className="ml-1.5 font-mono">{filterCounts[filter]}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Memuat rekap…
          </p>
        ) : visibleRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {rows.length === 0
              ? `Belum ada absensi tercatat ${isToday ? "hari ini" : periodLabel}.`
              : `Tidak ada absensi dengan status ${FILTER_LABELS[statusFilter]} ${isToday ? "hari ini" : `pada ${periodLabel}`}.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
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
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const checkInPhotoId = row.checkInPhotoId;
                  const checkOutPhotoId = row.checkOutPhotoId;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setDetailRow(row)}
                      className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50"
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
                              onClick={(event) => {
                                event.stopPropagation();
                                setPhotoView({
                                  id: checkInPhotoId,
                                  employeeName: row.employeeName,
                                  label: "Absen masuk",
                                  time: row.checkInTime,
                                });
                              }}
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
                              onClick={(event) => {
                                event.stopPropagation();
                                setPhotoView({
                                  id: checkOutPhotoId,
                                  employeeName: row.employeeName,
                                  label: "Absen pulang",
                                  time: row.checkOutTime,
                                });
                              }}
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
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Lihat detail absensi ${row.employeeName}`}
                          title="Lihat detail absensi"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailRow(row);
                          }}
                        >
                          <ChevronRight aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-absensi-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setDetailRow(null)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2
                  id="detail-absensi-title"
                  className="truncate font-semibold"
                >
                  {detailRow.employeeName}
                </h2>
                <p className="font-mono text-xs text-muted-foreground">
                  {detailRow.employeeNik} ·{" "}
                  {date ? formatDate(date) : "Hari ini"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="grid size-8 flex-none place-items-center rounded-md border border-border text-muted-foreground"
                aria-label="Tutup detail absensi"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={detailRow.status} />
                {detailRow.lateMinutes > 0 && (
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    Terlambat {detailRow.lateMinutes} menit
                  </span>
                )}
                {detailRow.shiftName && (
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {detailRow.shiftName} · {shortTime(detailRow.shiftStart)}–
                    {shortTime(detailRow.shiftEnd)}
                  </span>
                )}
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">
                        Absen masuk
                      </dt>
                      <dd className="mt-0.5 font-mono text-lg font-medium">
                        {clock(detailRow.checkInTime)}
                      </dd>
                      <dd className="text-xs text-muted-foreground">
                        {detailRow.checkInDistance != null
                          ? `${Math.round(detailRow.checkInDistance)} m dari lokasi`
                          : "Tanpa data jarak"}
                      </dd>
                    </div>
                    <AttendancePhotoThumb
                      photoId={detailRow.checkInPhotoId}
                      employeeName={detailRow.employeeName}
                      label="Absen masuk"
                      onOpen={() =>
                        setPhotoView({
                          id: detailRow.checkInPhotoId!,
                          employeeName: detailRow.employeeName,
                          label: "Absen masuk",
                          time: detailRow.checkInTime,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">
                        Absen pulang
                      </dt>
                      <dd className="mt-0.5 font-mono text-lg font-medium">
                        {clock(detailRow.checkOutTime)}
                      </dd>
                      <dd className="text-xs text-muted-foreground">
                        {detailRow.checkOutDistance != null
                          ? `${Math.round(detailRow.checkOutDistance)} m dari lokasi`
                          : detailRow.checkOutTime
                            ? "Tanpa data jarak"
                            : "Belum absen pulang"}
                      </dd>
                    </div>
                    <AttendancePhotoThumb
                      photoId={detailRow.checkOutPhotoId}
                      employeeName={detailRow.employeeName}
                      label="Absen pulang"
                      onOpen={() =>
                        setPhotoView({
                          id: detailRow.checkOutPhotoId!,
                          employeeName: detailRow.employeeName,
                          label: "Absen pulang",
                          time: detailRow.checkOutTime,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="rounded-md border border-border bg-background p-3 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    Lokasi kerja
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium">
                    {detailRow.locationName}
                  </dd>
                </div>
                {detailRow.notes && (
                  <div className="rounded-md border border-border bg-background p-3 sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Catatan</dt>
                    <dd className="mt-0.5 text-sm">{detailRow.notes}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <Link
                href="/admin/laporan"
                className="text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
              >
                Buka laporan
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailRow(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {photoView && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${photoView.label} ${photoView.employeeName}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setPhotoView(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card"
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
              className="max-h-[78dvh] w-full bg-muted object-contain"
              src={`/api/attendance/photos/${photoView.id}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
