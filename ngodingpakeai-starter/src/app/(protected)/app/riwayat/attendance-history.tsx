"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

type AttendanceRecord = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInDistance: number | null;
  checkOutDistance: number | null;
};

const PAGE_SIZE = 20;

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    present: "Hadir",
    late: "Terlambat",
    early_leave: "Pulang cepat",
    alpha: "Alpha",
    holiday_work: "Kerja hari libur",
  };
  return labels[status] ?? status;
};

const clock = (value?: string | null) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

const longDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function AttendanceHistory() {
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/attendance/history?limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat riwayat absensi.");
        return;
      }
      setItems((previous) =>
        offset === 0 ? body.data : [...previous, ...body.data],
      );
      setHasMore(Boolean(body.meta?.hasMore));
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(0), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Riwayat absensi
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        30 catatan terakhir · waktu server WIB
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat riwayat…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
          <CalendarDays
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada catatan absensi. Lakukan absen masuk di Beranda.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{longDate(item.date)}</p>
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {statusLabel(item.status)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Masuk</dt>
                  <dd className="text-foreground">{clock(item.checkInTime)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Pulang</dt>
                  <dd className="text-foreground">{clock(item.checkOutTime)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Jarak masuk</dt>
                  <dd className="text-foreground">
                    {item.checkInDistance != null
                      ? `${Math.round(item.checkInDistance)} m`
                      : "--"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Jarak pulang</dt>
                  <dd className="text-foreground">
                    {item.checkOutDistance != null
                      ? `${Math.round(item.checkOutDistance)} m`
                      : "--"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          disabled={loading}
          onClick={() => void load(items.length)}
        >
          {loading ? "Memuat…" : "Muat lebih banyak"}
        </Button>
      )}
    </div>
  );
}
