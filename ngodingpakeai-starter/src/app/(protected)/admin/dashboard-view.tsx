"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AttendanceRow = {
  id: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInDistance: number | null;
  employeeName: string;
  employeeNik: string;
  locationName: string;
};

const statusLabels: Record<string, string> = {
  present: "Hadir",
  late: "Terlambat",
  early_leave: "Pulang cepat",
  alpha: "Alpha",
  holiday_work: "Kerja hari libur",
};

const clock = (value: string | null) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

export function DashboardView() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/attendance?limit=100", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat rekap.");
        return;
      }
      setRows(body.data);
      setDate(body.meta?.date ?? "");
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

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Hadir", value: (counts.present ?? 0) + (counts.holiday_work ?? 0) },
    { label: "Terlambat", value: counts.late ?? 0 },
    { label: "Pulang cepat", value: counts.early_leave ?? 0 },
    { label: "Alpha", value: counts.alpha ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard HR
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap absensi {date || "hari ini"} · waktu server WIB
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/requests">Persetujuan pengajuan</Link>
        </Button>
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
        <p className="mt-6 text-sm text-muted-foreground">Memuat rekap…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada absensi tercatat hari ini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {row.employeeName}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                    {row.employeeNik}
                  </span>
                </p>
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {statusLabels[row.status] ?? row.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Masuk {clock(row.checkInTime)} · Pulang {clock(row.checkOutTime)}
                {row.checkInDistance != null
                  ? ` · ${Math.round(row.checkInDistance)} m`
                  : ""}{" "}
                · {row.locationName}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
