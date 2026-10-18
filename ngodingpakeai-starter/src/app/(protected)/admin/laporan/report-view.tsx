"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/charts";
import { monthLabel } from "@/lib/format";

type ReportRow = {
  id: string;
  fullName: string;
  nik: string;
  departmentName: string | null;
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
  lemburJam: number;
};

type Totals = {
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
  lemburJam: number;
};

type Position = { id: string; name: string };

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const currentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

type ReportPeriod = "day" | "month" | "year";

export function ReportView() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [day, setDay] = useState(currentDate());
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [positionId, setPositionId] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<Totals>({
    hadir: 0,
    terlambat: 0,
    pulangCepat: 0,
    alpha: 0,
    lemburJam: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, "praise" | "warn">>({});
  const [sending, setSending] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const queryParams = useCallback(
    (format?: "csv" | "xls" | "pdf") => {
      const params = new URLSearchParams({ period });
      if (period === "day") params.set("date", day);
      if (period === "month") params.set("month", month);
      if (period === "year") params.set("year", year);
      if (positionId) params.set("positionId", positionId);
      if (format) params.set("format", format);
      return params;
    },
    [day, month, period, positionId, year],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reports/attendance?${queryParams()}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat laporan.");
        return;
      }
      setRows(body.data);
      setTotals(
        body.meta?.totals ?? {
          hadir: 0,
          terlambat: 0,
          pulangCepat: 0,
          alpha: 0,
          lemburJam: 0,
        },
      );
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/positions?limit=200", {
          cache: "no-store",
        });
        const body = await response.json();
        if (response.ok) setPositions(body.data ?? []);
      } catch {
        // Filter jabatan opsional; laporan tetap bisa dimuat tanpa daftar ini.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const exportUrl = (format: "csv" | "xls" | "pdf") =>
    `/api/admin/reports/attendance/export?${queryParams(format)}`;

  const periodLabel =
    period === "day" ? day : period === "year" ? year : monthLabel(month);

  const presencePercent = (row: ReportRow) => {
    const total = row.hadir + row.terlambat + row.pulangCepat + row.alpha;
    if (total === 0) return 0;
    return Math.round((row.hadir / total) * 100);
  };

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          b.hadir + b.terlambat + b.alpha - (a.hadir + a.terlambat + a.alpha),
      ),
    [rows],
  );

  const chartData = [
    { label: "Hadir", value: totals.hadir, color: "#137A4A" },
    { label: "Terlambat", value: totals.terlambat, color: "#A65D00" },
    { label: "Pulang cepat", value: totals.pulangCepat, color: "#0C0A08" },
    { label: "Alpha", value: totals.alpha, color: "#B42318" },
  ];

  const topPerformers = sortedRows
    .map((row) => ({ row, score: presencePercent(row) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const watchList = sortedRows
    .filter((row) => row.alpha > 0 || row.terlambat >= 2)
    .sort((a, b) => b.alpha * 2 + b.terlambat - (a.alpha * 2 + a.terlambat))
    .slice(0, 3);

  const stats = [
    { label: "Hadir", value: totals.hadir },
    { label: "Terlambat", value: totals.terlambat },
    { label: "Pulang cepat", value: totals.pulangCepat },
    { label: "Alpha", value: totals.alpha },
    { label: "Lembur (jam)", value: totals.lemburJam },
  ];

  const sendNote = async (row: ReportRow, kind: "praise" | "warn") => {
    setSending(row.id);
    setNoteError(null);
    try {
      const response = await fetch("/api/admin/appreciations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: row.id,
          kind,
          message:
            kind === "praise"
              ? "Kerja bagus! Pertahankan kehadiran dan kontribusimu. Terima kasih."
              : "Mohon perbaiki kehadiran dan ketepatan waktu. Ini tercatat sebagai bahan evaluasi.",
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setNoteError(body?.error?.message ?? "Pesan gagal dikirim.");
        return;
      }
      setNotes((current) => ({ ...current, [row.id]: kind }));
    } catch {
      setNoteError("Tidak dapat menghubungi server.");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Laporan Kehadiran
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap{" "}
            {period === "day"
              ? "harian"
              : period === "year"
                ? "tahunan"
                : "bulanan"}{" "}
            per karyawan · periode {periodLabel} · hari libur tidak dihitung
            alpha
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              Jenis laporan
            </span>
            <select
              className="h-10 rounded-md border border-border bg-card px-2 text-sm text-foreground"
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as ReportPeriod)
              }
            >
              <option value="day">Harian</option>
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">
              {period === "day"
                ? "Tanggal"
                : period === "year"
                  ? "Tahun"
                  : "Bulan"}
            </span>
            {period === "day" ? (
              <input
                type="date"
                className="h-10 rounded-md border border-border bg-card px-3 text-sm"
                value={day}
                onChange={(event) => setDay(event.target.value)}
              />
            ) : period === "year" ? (
              <input
                type="number"
                min={2000}
                max={2100}
                className="h-10 rounded-md border border-border bg-card px-3 text-sm"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            ) : (
              <input
                type="month"
                className="h-10 rounded-md border border-border bg-card px-3 text-sm"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            )}
          </label>
          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">Jabatan</span>
            <select
              className="h-10 rounded-md border border-border bg-card px-2 text-sm text-foreground"
              value={positionId}
              onChange={(event) => setPositionId(event.target.value)}
            >
              <option value="">Semua jabatan</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ["csv", "CSV"],
              ["xls", "Excel"],
              ["pdf", "PDF"],
            ] as const
          ).map(([format, label]) => (
            <Button
              key={format}
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => {
                const link = document.createElement("a");
                link.href = exportUrl(format);
                link.download = `rekap-${periodLabel}.${format}`;
                link.click();
              }}
            >
              <Download aria-hidden="true" />
              {label}
            </Button>
          ))}
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

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 font-mono text-2xl font-medium">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat laporan…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada data untuk bulan ini.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border bg-card p-5">
              <h2 className="font-semibold">Komposisi kehadiran</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Total catatan absensi {periodLabel}
              </p>
              <DonutChart
                className="mt-5"
                title="Komposisi kehadiran bulan ini"
                centerLabel="Catatan"
                data={chartData}
              />
            </section>
            <section className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Karyawan terbaik bulan ini</h2>
                <span className="rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold text-primary-text">
                  Otomatis
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Dihitung sistem dari data absensi {periodLabel}
              </p>
              {topPerformers.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Belum ada data untuk bulan ini.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {topPerformers.map(({ row, score }, index) => (
                    <li
                      key={row.id}
                      className={
                        "flex items-center gap-3 rounded-md border p-3 " +
                        (index === 0
                          ? "border-border-strong bg-primary-quiet/50"
                          : "border-border bg-background")
                      }
                    >
                      <span className="w-8 flex-none font-mono text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {row.fullName}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {row.departmentName ?? "—"} · hadir {row.hadir} ·
                          telat {row.terlambat} · alpha {row.alpha}
                        </span>
                      </span>
                      <span className="flex-none font-mono text-lg font-medium text-positive">
                        {score}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Peringkat otomatis dari kehadiran & ketepatan waktu — siap
                diberi ucapan di bagian Evaluasi.
              </p>
            </section>
          </div>

          <section aria-labelledby="evaluasi-title" className="space-y-4">
            <div>
              <h2 id="evaluasi-title" className="font-semibold">
                Evaluasi &amp; apresiasi
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Berdasarkan rekap absensi {periodLabel} — HRD bisa memberi
                ucapan atau peringatan.
              </p>
              {noteError && (
                <p
                  role="alert"
                  className="mt-2 rounded-md border border-danger/40 bg-card px-3 py-2 text-sm text-danger"
                >
                  {noteError}
                </p>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold">Karyawan berprestasi</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Kehadiran tinggi dan tanpa alpha.
                </p>
                {topPerformers.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Belum ada data.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {topPerformers.map(({ row, score }) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background p-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {row.fullName}
                          </span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {row.departmentName ?? "—"} · hadir {row.hadir} ·
                            alpha {row.alpha} · lembur {row.lemburJam}j
                          </span>
                        </span>
                        <span className="flex-none rounded-full bg-positive px-2.5 py-0.5 text-xs font-semibold text-white">
                          {score}%
                        </span>
                        {notes[row.id] === "praise" ? (
                          <span className="flex-none rounded-full bg-positive px-2.5 py-0.5 text-xs font-semibold text-white">
                            Ucapan terkirim
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sending === row.id}
                            onClick={() => void sendNote(row, "praise")}
                          >
                            Beri ucapan
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold">Perlu perhatian</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Alpha atau keterlambatan berulang.
                </p>
                {watchList.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Tidak ada yang perlu perhatian bulan ini.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {watchList.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background p-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {row.fullName}
                          </span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {row.departmentName ?? "—"} · telat {row.terlambat}{" "}
                            · alpha {row.alpha}
                          </span>
                        </span>
                        <span className="flex-none rounded-full bg-warning px-2.5 py-0.5 text-xs font-semibold text-white">
                          {row.alpha > 0
                            ? "Alpha " + row.alpha + "×"
                            : "Telat " + row.terlambat + "×"}
                        </span>
                        {notes[row.id] === "warn" ? (
                          <span className="flex-none rounded-full bg-warning px-2.5 py-0.5 text-xs font-semibold text-white">
                            Peringatan terkirim
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sending === row.id}
                            onClick={() => void sendNote(row, "warn")}
                          >
                            Beri peringatan
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Ucapan &amp; peringatan dikirim sebagai notifikasi in-app dan
              email ke karyawan.
            </p>
          </section>

          <section className="rounded-lg border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Rekap per karyawan</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-5 py-3">
                      Karyawan
                    </th>
                    <th scope="col" className="px-5 py-3">
                      Departemen
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Hadir
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Terlambat
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      P. cepat
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Alpha
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      Lembur (jam)
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      % Hadir
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium">{row.fullName}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {row.nik}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {row.departmentName ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {row.hadir}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {row.terlambat}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {row.pulangCepat}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {row.alpha}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {row.lemburJam}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-semibold">
                        {presencePercent(row)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
