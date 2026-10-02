"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";

type ScheduleRow = {
  id: string;
  date: string;
  note: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  crossesMidnight: boolean;
  locationName: string;
  radiusM: number;
};

const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

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

const shortTime = (value: string) => value.slice(0, 5);

export function ScheduleView() {
  const [items, setItems] = useState<ScheduleRow[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/schedules/mine", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat jadwal.");
        return;
      }
      setItems(body.data);
      setRange(body.meta ?? null);
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

  const today = todayIso();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Jadwal kerja
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {range ? `${range.from} – ${range.to}` : "Dua minggu ke depan"} · WIB
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat jadwal…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
          <CalendarDays
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada jadwal kerja untuk periode ini. Hubungi HR jika menurutmu
            ini keliru.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{longDate(item.date)}</p>
                {item.date === today && (
                  <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    Hari ini
                  </span>
                )}
              </div>
              <p className="mt-2 text-lg font-semibold">{item.shiftName}</p>
              <p className="font-mono text-sm text-muted-foreground">
                {shortTime(item.startTime)} – {shortTime(item.endTime)}
                {item.crossesMidnight ? " · melewati tengah malam" : ""}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" />
                {item.locationName} · radius {item.radiusM} m · toleransi{" "}
                {item.toleranceMinutes} menit
              </p>
              {item.note && (
                <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
