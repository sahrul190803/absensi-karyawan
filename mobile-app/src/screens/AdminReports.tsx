import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  Camera,
  Download,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import type {
  AdminAttendanceResponse,
  ReportResponse,
} from "@/lib/admin-types";
import { openAuthenticatedFile } from "@/lib/files";
import {
  clock,
  formatDate,
  monthLabel,
  todayIso,
} from "@/lib/format";

type Period = "day" | "month" | "year";
type View = "summary" | "daily";

const PERIOD_TABS = [
  { value: "day", label: "Harian" },
  { value: "month", label: "Bulanan" },
  { value: "year", label: "Tahunan" },
] as const;

const STATUS_FILTERS = [
  { value: "", label: "Semua" },
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "early_leave", label: "Pulang cepat" },
  { value: "alpha", label: "Alpha" },
  { value: "holiday_work", label: "Hari libur" },
] as const;

const METRICS = [
  { key: "hadir", label: "Hadir" },
  { key: "terlambat", label: "Terlambat" },
  { key: "pulangCepat", label: "Pulang cepat" },
  { key: "alpha", label: "Alpha" },
  { key: "lemburJam", label: "Lembur (jam)" },
] as const;

export function AdminReportsScreen() {
  const [view, setView] = useState<View>("summary");
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(() => todayIso());
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [year, setYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [dailyDate, setDailyDate] = useState(() => todayIso());
  const [dailyStatus, setDailyStatus] = useState("");
  const [photo, setPhoto] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const reportParams = new URLSearchParams({ period });
  if (period === "day") reportParams.set("date", date);
  if (period === "month") reportParams.set("month", month);
  if (period === "year") reportParams.set("year", year);

  const reportQuery = useQuery({
    queryKey: ["admin", "report", period, date, month, year],
    queryFn: () =>
      apiFetch<ReportResponse>(
        `/api/admin/reports/attendance?${reportParams.toString()}`,
      ),
    retry: false,
    enabled: view === "summary",
  });

  const dailyQuery = useQuery({
    queryKey: ["admin", "attendance", dailyDate, dailyStatus],
    queryFn: () =>
      apiFetch<AdminAttendanceResponse>(
        `/api/admin/attendance?date=${dailyDate}&limit=100&offset=0${
          dailyStatus ? `&status=${dailyStatus}` : ""
        }`,
      ),
    retry: false,
    enabled: view === "daily",
  });

  async function exportReport(format: "csv" | "xls" | "pdf") {
    setError(null);
    setExporting(format);
    try {
      const params = new URLSearchParams(reportParams);
      params.set("format", format);
      const label = reportQuery.data?.meta.label ?? "kehadiran";
      await openAuthenticatedFile(
        `/api/admin/reports/attendance/export?${params.toString()}`,
        `rekap-${label}.${format}`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Export gagal dibuat.",
      );
    } finally {
      setExporting(null);
    }
  }

  const report = reportQuery.data;
  const dailyRows = dailyQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rekap kehadiran tim, detail absensi harian, dan unduh laporan.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-1.5">
        <button
          type="button"
          onClick={() => setView("summary")}
          className={`min-h-10 rounded-md px-3 text-sm font-medium ${
            view === "summary"
              ? "bg-primary-quiet text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Rekap periode
        </button>
        <button
          type="button"
          onClick={() => setView("daily")}
          className={`min-h-10 rounded-md px-3 text-sm font-medium ${
            view === "daily"
              ? "bg-primary-quiet text-foreground"
              : "text-muted-foreground"
          }`}
        >
          Kehadiran harian
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {view === "summary" ? (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Periode">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={period === tab.value}
                onClick={() => setPeriod(tab.value)}
                className={`min-h-10 rounded-md border px-3 text-sm font-medium ${
                  period === tab.value
                    ? "border-border-strong bg-primary-quiet text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="font-medium">
              {period === "day"
                ? "Tanggal"
                : period === "month"
                  ? "Bulan"
                  : "Tahun"}
            </span>
            {period === "day" ? (
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="ml-auto h-10 rounded-md border border-border bg-transparent px-3 text-base"
              />
            ) : period === "month" ? (
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="ml-auto h-10 rounded-md border border-border bg-transparent px-3 text-base"
              />
            ) : (
              <input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="ml-auto h-10 w-28 rounded-md border border-border bg-transparent px-3 text-base"
              />
            )}
          </label>

          {reportQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Menghitung rekap…
            </p>
          ) : reportQuery.error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
            >
              {reportQuery.error.message}
            </p>
          ) : report ? (
            <>
              <section aria-label="Total rekap">
                <p className="text-sm text-muted-foreground">
                  Rekap {period === "month" ? monthLabel(month) : report.meta.label}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {METRICS.map((metric) => (
                    <div
                      key={metric.key}
                      className="rounded-lg border bg-card p-3"
                    >
                      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {metric.label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold">
                        {report.meta.totals[metric.key]}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => void exportReport("csv")}
                >
                  {exporting === "csv" ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => void exportReport("xls")}
                >
                  {exporting === "xls" ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <FileSpreadsheet aria-hidden="true" />
                  )}
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => void exportReport("pdf")}
                >
                  {exporting === "pdf" ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <FileText aria-hidden="true" />
                  )}
                  PDF
                </Button>
              </div>

              <section>
                <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Per karyawan
                </h2>
                {report.data.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada data karyawan.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {report.data.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg border bg-card p-4"
                      >
                        <p className="font-medium">{row.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.nik}
                          {row.departmentName ? ` · ${row.departmentName}` : ""}
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Hadir</dt>
                            <dd className="font-semibold">{row.hadir}</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Terlambat</dt>
                            <dd className="font-semibold">{row.terlambat}</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">
                              Pulang cepat
                            </dt>
                            <dd className="font-semibold">{row.pulangCepat}</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Alpha</dt>
                            <dd className="font-semibold">{row.alpha}</dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Lembur</dt>
                            <dd className="font-semibold">{row.lemburJam} jam</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="font-medium">Tanggal</span>
            <input
              type="date"
              value={dailyDate}
              onChange={(event) => setDailyDate(event.target.value)}
              className="ml-auto h-10 rounded-md border border-border bg-transparent px-3 text-base"
            />
          </label>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value || "all"}
                type="button"
                role="tab"
                aria-selected={dailyStatus === filter.value}
                onClick={() => setDailyStatus(filter.value)}
                className={`min-h-10 rounded-md border px-3 text-sm font-medium ${
                  dailyStatus === filter.value
                    ? "border-border-strong bg-primary-quiet text-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {dailyQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Memuat kehadiran…
            </p>
          ) : dailyQuery.error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
            >
              {dailyQuery.error.message}
            </p>
          ) : dailyRows.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
              <BarChart3
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada catatan absensi pada tanggal ini.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {dailyRows.map((row) => (
                <li key={row.id} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.employeeNik} · {row.locationName}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {row.shiftName ? `${row.shiftName} · ` : ""}
                    Masuk {clock(row.checkInTime)} · Pulang{" "}
                    {clock(row.checkOutTime)}
                  </p>

                  {row.lateMinutes ? (
                    <p className="mt-1 text-xs text-warning">
                      Terlambat {row.lateMinutes} menit
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.checkInPhotoId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPhoto({
                            id: row.checkInPhotoId as string,
                            label: `Foto masuk ${row.employeeName}`,
                          })
                        }
                      >
                        <Camera aria-hidden="true" />
                        Foto masuk
                      </Button>
                    )}
                    {row.checkOutPhotoId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPhoto({
                            id: row.checkOutPhotoId as string,
                            label: `Foto pulang ${row.employeeName}`,
                          })
                        }
                      >
                        <Camera aria-hidden="true" />
                        Foto pulang
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">
            Menampilkan maksimal 100 catatan pada tanggal {formatDate(dailyDate)}.
          </p>
        </>
      )}

      {photo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={photo.label}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhoto(null)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{photo.label}</p>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="grid size-10 place-items-center rounded-md border text-muted-foreground"
                aria-label="Tutup foto"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <AuthenticatedImage
              path={`/api/attendance/photos/${photo.id}`}
              alt={photo.label}
              className="w-full rounded-md border object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
