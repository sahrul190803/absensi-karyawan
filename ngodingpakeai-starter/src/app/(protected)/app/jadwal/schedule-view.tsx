"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Moon, Sunrise, Sun } from "lucide-react";
import { cn } from "cn";

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

const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_LONG = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const todayIso = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const parseIso = (value: string) => new Date(`${value}T00:00:00`);

const shiftIcon = (startTime: string) => {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 11) return Sunrise;
  if (hour < 18) return Sun;
  return Moon;
};

export function ScheduleView({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<ScheduleRow[]>([]);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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

  const map = useMemo(() => {
    const next = new Map<string, ScheduleRow>();
    for (const item of items) next.set(item.date, item);
    return next;
  }, [items]);

  const days = useMemo(() => {
    if (!range) return [];
    const list: string[] = [];
    let cursor = parseIso(range.from);
    const end = parseIso(range.to);
    while (cursor <= end) {
      list.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
      );
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
    return list;
  }, [range]);

  const activeDate =
    selected ?? (days.includes(today) ? today : (days[0] ?? null));
  const selectedRow = activeDate ? (map.get(activeDate) ?? null) : null;

  return (
    <div className={embedded ? "space-y-5" : "mx-auto max-w-2xl space-y-5"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Jadwal Kerja Saya
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {range
              ? `${range.from} s/d ${range.to} · diatur HOD/HRD`
              : "Dua minggu ke depan"}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat jadwal…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <CalendarDays
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada jadwal untuk periode ini. Hubungi HOD/HRD jika menurutmu
            ini keliru.
          </p>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Pilih tanggal"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            {days.map((date) => {
              const parsed = parseIso(date);
              const row = map.get(date);
              const isToday = date === today;
              const active = activeDate === date;
              return (
                <button
                  key={date}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelected(date)}
                  className={cn(
                    "flex w-16 flex-none flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-sm",
                    active
                      ? "border-border-strong bg-primary-quiet font-semibold"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="text-[11px]">
                    {DAY_SHORT[parsed.getDay()]}
                  </span>
                  <span className="font-mono text-base font-semibold">
                    {parsed.getDate()}
                  </span>
                  <span className="text-[10px]">
                    {MONTH_SHORT[parsed.getMonth()]}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 h-1.5 w-1.5 rounded-full",
                      row ? "bg-positive" : "bg-border-strong",
                    )}
                    aria-hidden="true"
                  />
                  {isToday && (
                    <span className="text-[10px] font-semibold text-primary-text">
                      ini
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <section className="rounded-lg border border-border-strong bg-card p-5">
            {selectedRow && activeDate ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {`${DAY_LONG[parseIso(activeDate).getDay()]}, ${parseIso(activeDate).getDate()} ${
                        MONTH_SHORT[parseIso(activeDate).getMonth()]
                      } ${parseIso(activeDate).getFullYear()}`}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
                      {(() => {
                        const Icon = shiftIcon(selectedRow.startTime);
                        return (
                          <Icon
                            className="size-5 text-primary-text"
                            aria-hidden="true"
                          />
                        );
                      })()}
                      {selectedRow.shiftName}
                    </p>
                  </div>
                  <span className="rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 font-mono text-xs font-semibold">
                    {selectedRow.startTime.slice(0, 5)}–
                    {selectedRow.endTime.slice(0, 5)}
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="size-4" aria-hidden="true" />
                      Lokasi
                    </dt>
                    <dd className="font-medium">{selectedRow.locationName}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Toleransi</dt>
                    <dd className="font-mono text-xs">
                      {selectedRow.toleranceMinutes} menit
                    </dd>
                  </div>
                  {selectedRow.crossesMidnight && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Catatan</dt>
                      <dd className="text-xs">Melewati tengah malam</dd>
                    </div>
                  )}
                  {selectedRow.note && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Keterangan</dt>
                      <dd className="text-right text-xs">{selectedRow.note}</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <div className="py-4 text-center">
                <CalendarDays
                  className="mx-auto size-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-2 font-medium">Hari libur</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tidak ada shift terjadwal pada tanggal ini.
                </p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Ringkasan dua minggu
            </h2>
            <ul className="mt-3 divide-y divide-border rounded-lg border bg-card">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <span className="text-sm font-medium">
                    {DAY_LONG[parseIso(item.date).getDay()]},{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.date}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-sm">
                    <span>{item.shiftName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.startTime.slice(0, 5)}–{item.endTime.slice(0, 5)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
