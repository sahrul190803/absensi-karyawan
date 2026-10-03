"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ReportRow = {
  id: string;
  fullName: string;
  nik: string;
  departmentName: string | null;
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
};

type Totals = {
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
};

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export function ReportView() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<Totals>({
    hadir: 0,
    terlambat: 0,
    pulangCepat: 0,
    alpha: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextMonth: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reports/attendance?month=${nextMonth}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat laporan.");
        return;
      }
      setRows(body.data);
      setTotals(body.meta?.totals ?? { hadir: 0, terlambat: 0, pulangCepat: 0, alpha: 0 });
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(currentMonth()), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const exportCsv = useCallback(() => {
    const header = [
      "Nama",
      "NIK",
      "Departemen",
      "Hadir",
      "Terlambat",
      "Pulang cepat",
      "Alpha",
    ];
    const lines = [header.join(";")];
    for (const row of rows) {
      lines.push(
        [
          row.fullName,
          row.nik,
          row.departmentName ?? "",
          row.hadir,
          row.terlambat,
          row.pulangCepat,
          row.alpha,
        ].join(";"),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rekap-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [month, rows]);

  const stats = [
    { label: "Hadir", value: totals.hadir },
    { label: "Terlambat", value: totals.terlambat },
    { label: "Pulang cepat", value: totals.pulangCepat },
    { label: "Alpha", value: totals.alpha },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Laporan kehadiran
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap bulanan per karyawan · hari libur tidak dihitung Alpha
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="grid gap-1 text-xs">
            <span className="font-medium text-muted-foreground">Bulan</span>
            <input
              type="month"
              className="h-10 rounded-lg border bg-transparent px-3 text-sm"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                if (event.target.value) void load(event.target.value);
              }}
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={exportCsv}
          >
            Ekspor CSV
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 font-mono text-2xl font-medium">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat laporan…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada data untuk bulan ini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {row.fullName}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                    {row.nik}
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">
                  {row.departmentName ?? "—"}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-4 gap-2 font-mono text-xs text-muted-foreground">
                <div>
                  <dt>Hadir</dt>
                  <dd className="text-foreground">{row.hadir}</dd>
                </div>
                <div>
                  <dt>Telat</dt>
                  <dd className="text-foreground">{row.terlambat}</dd>
                </div>
                <div>
                  <dt>P. cepat</dt>
                  <dd className="text-foreground">{row.pulangCepat}</dd>
                </div>
                <div>
                  <dt>Alpha</dt>
                  <dd className="text-foreground">{row.alpha}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
