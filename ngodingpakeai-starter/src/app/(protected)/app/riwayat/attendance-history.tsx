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

type AttendanceDetail = {
  record: AttendanceRecord & { employeeName?: string; locationName?: string };
  photos: {
    id: string;
    type: string;
    mimeType: string;
    capturedAt: string;
  }[];
};

const PAGE_SIZE = 20;

const statusOptions = [
  { value: "", label: "Semua status" },
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "early_leave", label: "Pulang cepat" },
  { value: "alpha", label: "Alpha" },
  { value: "holiday_work", label: "Kerja hari libur" },
];

const statusLabel = (status: string) =>
  statusOptions.find((option) => option.value === status)?.label ?? status;

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

const toIso = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export function AttendanceHistory() {
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState("");
  const [status, setStatus] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionCheckIn, setCorrectionCheckIn] = useState("");
  const [correctionCheckOut, setCorrectionCheckOut] = useState("");

  const load = useCallback(
    async (offset: number, nextMonth: string, nextStatus: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (nextMonth) params.set("month", nextMonth);
        if (nextStatus) params.set("status", nextStatus);
        const response = await fetch(`/api/attendance/history?${params}`, {
          cache: "no-store",
        });
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
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(0, month, status), 0);
    return () => window.clearTimeout(timer);
  }, [load, month, status]);

  const openDetail = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/attendance/${id}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (response.ok) setDetail(body.data);
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId]);

  const submitCorrection = useCallback(
    async (attendanceId: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch("/api/corrections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendanceId,
            reason: correctionReason,
            checkInTime: toIso(correctionCheckIn),
            checkOutTime: toIso(correctionCheckOut),
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(
            body?.error?.details?.[0]?.message ??
              body?.error?.message ??
              "Koreksi gagal dikirim.",
          );
          return;
        }
        setNotice("Koreksi terkirim dan menunggu persetujuan HR.");
        setCorrectingId(null);
        setCorrectionReason("");
        setCorrectionCheckIn("");
        setCorrectionCheckOut("");
      } catch {
        setError("Jaringan bermasalah. Coba lagi.");
      } finally {
        setBusy(false);
      }
    },
    [correctionCheckIn, correctionCheckOut, correctionReason],
  );

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Riwayat absensi
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Waktu server WIB · bukti foto tersimpan privat
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Bulan</span>
          <input
            type="month"
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Status</span>
          <select
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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

      {loading && items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat riwayat…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <CalendarDays
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada catatan absensi pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card p-4">
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
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void openDetail(item.id)}
                >
                  {expandedId === item.id ? "Tutup bukti" : "Lihat bukti"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCorrectingId(
                      correctingId === item.id ? null : item.id,
                    );
                    setCorrectionReason("");
                    setCorrectionCheckIn("");
                    setCorrectionCheckOut("");
                  }}
                >
                  {correctingId === item.id ? "Batal" : "Ajukan koreksi"}
                </Button>
              </div>

              {expandedId === item.id && (
                <div className="mt-3 rounded-lg border bg-background p-3">
                  {detailLoading ? (
                    <p className="text-xs text-muted-foreground">
                      Memuat bukti…
                    </p>
                  ) : detail ? (
                    <div className="grid grid-cols-2 gap-3">
                      {detail.photos.length === 0 && (
                        <p className="col-span-2 text-xs text-muted-foreground">
                          Tidak ada foto bukti pada catatan ini.
                        </p>
                      )}
                      {detail.photos.map((photo) => (
                        <figure key={photo.id} className="grid gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={
                              photo.type === "check_in"
                                ? "Foto absen masuk"
                                : "Foto absen pulang"
                            }
                            className="aspect-[3/4] w-full rounded-lg border object-cover"
                            loading="lazy"
                            src={`/api/attendance/photos/${photo.id}`}
                          />
                          <figcaption className="text-center text-xs text-muted-foreground">
                            {photo.type === "check_in" ? "Masuk" : "Pulang"} ·{" "}
                            {clock(photo.capturedAt)}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Detail tidak tersedia.
                    </p>
                  )}
                </div>
              )}

              {correctingId === item.id && (
                <div className="mt-3 grid gap-3 rounded-lg border bg-background p-3">
                  <p className="text-sm font-medium">
                    Ajukan koreksi absensi
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-xs">
                      <span className="font-medium">Jam masuk baru</span>
                      <input
                        type="datetime-local"
                        className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                        value={correctionCheckIn}
                        onChange={(event) =>
                          setCorrectionCheckIn(event.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs">
                      <span className="font-medium">Jam pulang baru</span>
                      <input
                        type="datetime-local"
                        className="h-9 w-full rounded-md border border-border bg-card px-2 text-xs"
                        value={correctionCheckOut}
                        onChange={(event) =>
                          setCorrectionCheckOut(event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-xs">
                    <span className="font-medium">Alasan koreksi</span>
                    <textarea
                      rows={2}
                      className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs"
                      value={correctionReason}
                      onChange={(event) =>
                        setCorrectionReason(event.target.value)
                      }
                      placeholder="Contoh: lupa absen pulang"
                    />
                  </label>
                  <Button
                    size="sm"
                    disabled={
                      busy ||
                      correctionReason.trim().length < 3 ||
                      (!correctionCheckIn && !correctionCheckOut)
                    }
                    onClick={() => void submitCorrection(item.id)}
                  >
                    {busy ? "Mengirim…" : "Kirim koreksi"}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          disabled={loading}
          onClick={() => void load(items.length, month, status)}
        >
          {loading ? "Memuat…" : "Muat lebih banyak"}
        </Button>
      )}
    </div>
  );
}
