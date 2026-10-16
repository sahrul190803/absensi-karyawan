"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  History,
  Inbox,
  MapPin,
  RefreshCw,
  Send,
  UtensilsCrossed,
  User,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { clock, formatDate, shortTime } from "@/lib/format";

type Schedule = {
  id: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  locationName: string;
  radiusM: number;
};

type AttendanceRecord = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  notes: string | null;
};

type Today = {
  employee: { id: string; fullName: string } | null;
  date: string;
  record: AttendanceRecord | null;
  schedule: Schedule | null;
};

type HistoryRow = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
};

type MealToday = {
  session: string;
  note: string | null;
} | null;

type Mode = "check-in" | "check-out";

type PingPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const SESSION_LABELS: Record<string, string> = {
  pagi: "pagi",
  siang: "siang",
  malam: "malam",
};

const getDeviceKey = () => {
  const storageKey = "hadirku_device_key";
  let key = window.localStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(storageKey, key);
  }
  return key;
};

const getDeviceInfo = () => {
  const agent = window.navigator.userAgent;
  const os = /Android/i.test(agent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(agent)
      ? "iOS"
      : /Windows/i.test(agent)
        ? "Windows"
        : /Mac/i.test(agent)
          ? "macOS"
          : /Linux/i.test(agent)
            ? "Linux"
            : "Lainnya";
  const browser = /Edg\//i.test(agent)
    ? "Edge"
    : /OPR\//i.test(agent)
      ? "Opera"
      : /Chrome/i.test(agent)
        ? "Chrome"
        : /Firefox/i.test(agent)
          ? "Firefox"
          : /Safari/i.test(agent)
            ? "Safari"
            : "Lainnya";
  const model = /Mobile/i.test(agent) ? "Perangkat mobile" : "Desktop";
  return { os, model, browser };
};

const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Perangkat tidak mendukung GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });

const jakartaParts = (date: Date) => {
  const day = date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const time = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return { day, time };
};

export function AttendanceHome({
  userName,
  locationFree,
}: {
  userName: string;
  locationFree: boolean;
}) {
  const [today, setToday] = useState<Today | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [meal, setMeal] = useState<MealToday>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [position, setPosition] = useState<PingPosition | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [placeNote, setPlaceNote] = useState("");
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadToday = useCallback(async () => {
    try {
      const [todayResponse, historyResponse, mealResponse] = await Promise.all([
        fetch("/api/attendance/today", { cache: "no-store" }),
        fetch("/api/attendance/history?limit=3", { cache: "no-store" }),
        fetch("/api/meals", { cache: "no-store" }),
      ]);
      const todayBody = await todayResponse.json();
      if (!todayResponse.ok) {
        setToday(null);
        setError(todayBody?.error?.message ?? "Gagal memuat status absensi.");
        return;
      }
      setToday(todayBody.data);
      if (historyResponse.ok) {
        const historyBody = await historyResponse.json();
        setHistory(historyBody.data ?? []);
      }
      if (mealResponse.ok) {
        const mealBody = await mealResponse.json();
        setMeal(mealBody.data?.todayClaim ?? null);
      }
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadToday(), 0);
    return () => window.clearTimeout(timer);
  }, [loadToday]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const refreshPosition = useCallback(async () => {
    try {
      const result = await getPosition();
      setPosition({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
      });
      setPositionError(null);
      return true;
    } catch {
      setPosition(null);
      setPositionError(
        locationFree
          ? "GPS tidak tersedia. Absen tetap bisa dikirim tanpa lokasi."
          : "Izin lokasi ditolak atau GPS tidak tersedia.",
      );
      return false;
    }
  }, [locationFree]);

  const openCamera = useCallback(
    async (nextMode: Mode) => {
      setError(null);
      setNotice(null);
      setPhoto(null);
      setBusy(true);
      try {
        const hasPosition = await refreshPosition();
        if (!hasPosition && !locationFree) {
          setError(
            "Aktifkan izin lokasi untuk absen. Jika dinas di luar kantor, hubungi HRD.",
          );
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        setMode(nextMode);
      } catch (caught) {
        let reason = "Kamera tidak dapat diakses.";
        if (caught instanceof Error) {
          if (caught.name === "NotAllowedError") {
            reason =
              "Izin kamera ditolak. Aktifkan kamera untuk melanjutkan absensi.";
          } else if (caught.message) {
            reason = caught.message;
          }
        }
        setError(reason);
      } finally {
        setBusy(false);
      }
    },
    [locationFree, refreshPosition],
  );

  useEffect(() => {
    if (mode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [mode]);

  const drawWatermark = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      const scale = width / 720;
      const pad = Math.round(14 * scale);
      const panelHeight = Math.round(104 * scale);
      const now = new Date();
      const parts = jakartaParts(now);

      context.fillStyle = "rgba(12, 10, 8, 0.64)";
      context.fillRect(0, height - panelHeight, width, panelHeight);
      context.fillStyle = "#E4F222";
      context.fillRect(
        0,
        height - panelHeight,
        Math.round(6 * scale),
        panelHeight,
      );

      context.textBaseline = "top";
      context.fillStyle = "#E4F222";
      context.font = `600 ${Math.round(11 * scale)}px system-ui, sans-serif`;
      context.fillText(
        `HADIRKU LECARASSA · ${mode === "check-in" ? "ABSEN MASUK" : "ABSEN PULANG"}`,
        pad,
        height - panelHeight + Math.round(10 * scale),
      );

      context.fillStyle = "#FFFFFF";
      context.font = `700 ${Math.round(22 * scale)}px ui-monospace, Consolas, monospace`;
      context.fillText(
        `${parts.day} · ${parts.time} WIB`,
        pad,
        height - panelHeight + Math.round(28 * scale),
      );

      const scheduleName = today?.schedule?.locationName;
      const placeLine = locationFree
        ? placeNote.trim()
          ? `Tempat: ${placeNote.trim()}`
          : "Mode dinas luar — foto tanpa lokasi"
        : `Lokasi: ${scheduleName ?? "-"}`;
      const gpsLine = position
        ? `GPS ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)} ±${Math.round(position.accuracy)} m`
        : "GPS tidak tersedia";

      context.font = `500 ${Math.round(13 * scale)}px system-ui, sans-serif`;
      context.fillText(
        placeLine.slice(0, 70),
        pad,
        height - panelHeight + Math.round(60 * scale),
      );
      context.fillText(
        gpsLine,
        pad,
        height - panelHeight + Math.round(80 * scale),
      );
    },
    [locationFree, mode, placeNote, position, today?.schedule?.locationName],
  );

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
    canvas.height = Math.round((video.videoHeight || maxWidth) * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawWatermark(context, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.72));
  }, [drawWatermark]);

  const closeModal = useCallback(() => {
    stopCamera();
    setMode(null);
    setPhoto(null);
    setPlaceNote("");
    setPositionError(null);
  }, [stopCamera]);

  const submit = useCallback(async () => {
    if (!mode || !photo) return;
    setBusy(true);
    setError(null);
    try {
      let current = position;
      if (!current) {
        try {
          const result = await getPosition();
          current = {
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
            accuracy: result.coords.accuracy,
          };
          setPosition(current);
        } catch {
          if (!locationFree) {
            setError(
              "GPS tidak terdeteksi. Aktifkan izin lokasi lalu coba lagi.",
            );
            setBusy(false);
            return;
          }
        }
      }
      const response = await fetch(`/api/attendance/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(current
            ? {
                latitude: current.latitude,
                longitude: current.longitude,
                accuracy: current.accuracy,
              }
            : {}),
          photo,
          deviceKey: getDeviceKey(),
          deviceInfo: getDeviceInfo(),
          idempotencyKey: `${mode}-${crypto.randomUUID()}`,
          ...(locationFree && placeNote.trim()
            ? { placeNote: placeNote.trim() }
            : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Absensi gagal disimpan.");
        setBusy(false);
        return;
      }
      closeModal();
      setNotice(
        mode === "check-in"
          ? "Absen masuk tercatat. Selamat bekerja!"
          : "Absen pulang tercatat. Terima kasih!",
      );
      await loadToday();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [closeModal, loadToday, locationFree, mode, photo, placeNote, position]);

  const record = today?.record ?? null;
  const schedule = today?.schedule ?? null;
  const state = !record
    ? "Belum absen masuk"
    : !record.checkOutTime
      ? "Sudah absen masuk"
      : "Absen hari ini selesai";

  const quickLinks = [
    { href: "/app/jadwal", label: "Jadwal Saya", icon: CalendarDays },
    { href: "/app/riwayat", label: "Riwayat", icon: History },
    { href: "/app/pengajuan", label: "Pengajuan", icon: Inbox },
    { href: "/app/makan", label: "Jatah Makan", icon: UtensilsCrossed },
    { href: "/app/training", label: "Training", icon: GraduationCap },
    { href: "/app/notifikasi", label: "Notifikasi", icon: Bell },
    { href: "/app/profil", label: "Profil", icon: User },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Halo, {userName}
        </h1>
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
        >
          <CheckCircle2 className="size-4 text-positive" aria-hidden="true" />
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section className="relative overflow-hidden rounded-lg border border-border-strong bg-card p-5">
        <span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-1 rounded-r bg-primary"
        />
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat status absensi…</p>
        ) : today && !today.employee ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Akun ini belum terhubung ke data karyawan. Hubungi HRD untuk
              menautkan akun dengan NIK Anda.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Status hari ini
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {locationFree ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    Mode dinas luar — foto tanpa lokasi
                  </span>
                ) : position ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    GPS ±{Math.round(position.accuracy)} m
                  </span>
                ) : null}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{state}</p>
            {record && (
              <div className="mt-2">
                <StatusBadge status={record.status} />
              </div>
            )}

            {schedule ? (
              <dl className="mt-4 grid gap-2 rounded-md border border-border bg-muted/50 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Shift</dt>
                  <dd className="font-mono text-xs font-medium">
                    {shortTime(schedule.startTime)}–
                    {shortTime(schedule.endTime)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-4" aria-hidden="true" />
                    Lokasi
                  </dt>
                  <dd className="text-right font-medium">
                    {schedule.locationName}
                    {!locationFree && (
                      <span className="ml-1 font-mono text-xs text-muted-foreground">
                        radius {schedule.radiusM} m
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Masuk</dt>
                  <dd className="font-mono text-xs">
                    {clock(record?.checkInTime)}
                    {record?.checkInDistance != null
                      ? ` · ${Math.round(record.checkInDistance)} m`
                      : ""}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Pulang</dt>
                  <dd className="font-mono text-xs">
                    {clock(record?.checkOutTime)}
                  </dd>
                </div>
                {record?.notes && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Keterangan</dt>
                    <dd className="max-w-[60%] truncate text-right text-xs">
                      {record.notes}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-4 rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                Tidak ada jadwal kerja hari ini. Absensi tidak diwajibkan.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {!record ? (
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={busy || !schedule}
                  onClick={() => void openCamera("check-in")}
                >
                  <Camera aria-hidden="true" />
                  Ambil Foto &amp; Absen Masuk
                </Button>
              ) : !record.checkOutTime ? (
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => void openCamera("check-out")}
                >
                  <Camera aria-hidden="true" />
                  Ambil Foto &amp; Absen Pulang
                </Button>
              ) : (
                <Button size="lg" className="flex-1" disabled>
                  <CheckCircle2 aria-hidden="true" />
                  Absen hari ini selesai
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={() => {
                  setNotice(null);
                  void loadToday();
                }}
              >
                <RefreshCw aria-hidden="true" />
                Muat ulang
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Foto selfie otomatis diberi keterangan waktu, tempat, dan GPS.
              Waktu resmi memakai jam server (WIB) dan validasi lokasi diulang
              di server.
            </p>
          </>
        )}
      </section>

      <section aria-label="Menu cepat">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {quickLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex h-full flex-col items-start gap-2 rounded-lg border bg-card p-3.5 text-sm font-medium transition-colors hover:border-border-strong"
              >
                <link.icon
                  className="size-5 text-primary-text"
                  aria-hidden="true"
                />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Jatah makan hari ini</h2>
            <Link
              href="/app/makan"
              className="text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
            >
              {meal ? "Lihat riwayat" : "Klaim sekarang"}
            </Link>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {meal
              ? `Klaim makan ${SESSION_LABELS[meal.session] ?? meal.session} sudah tercatat. Satu klaim per hari.`
              : "Belum ada klaim makan hari ini. Pilih sesi pagi, siang, atau malam."}
          </p>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Absensi terakhir</h2>
            <Link
              href="/app/riwayat"
              className="text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Belum ada riwayat absensi.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDate(row.date, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="font-mono text-xs">
                    {clock(row.checkInTime)} → {clock(row.checkOutTime)}
                  </span>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {mode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === "check-in" ? "Absen masuk" : "Absen pulang"}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-5">
            <h2 className="text-lg font-semibold">
              {mode === "check-in" ? "Absen masuk" : "Absen pulang"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Posisikan wajah di dalam bingkai. Foto otomatis mencantumkan
              waktu, tempat, dan GPS.
            </p>

            <div className="mt-4 overflow-hidden rounded-md border bg-muted">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt="Pratinjau foto absensi dengan keterangan waktu dan tempat"
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="aspect-[3/4] w-full object-cover"
                />
              )}
            </div>

            {locationFree && !photo && (
              <label className="mt-3 grid gap-1.5 text-sm">
                <span className="font-medium">
                  Keterangan tempat (opsional)
                </span>
                <input
                  className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm"
                  placeholder="Contoh: Kunjungan klien Grand Indonesia"
                  value={placeNote}
                  onChange={(event) => setPlaceNote(event.target.value)}
                />
              </label>
            )}

            <p className="mt-3 font-mono text-xs text-muted-foreground">
              {position
                ? `GPS ±${Math.round(position.accuracy)} m siap`
                : (positionError ?? "Mendeteksi GPS…")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {!photo ? (
                <Button className="flex-1" disabled={busy} onClick={capture}>
                  <Camera aria-hidden="true" />
                  Ambil Foto
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => setPhoto(null)}
                  >
                    Ulangi
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void submit()}
                  >
                    <Send aria-hidden="true" />
                    {busy ? "Mengirim…" : "Kirim Absen"}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              disabled={busy}
              onClick={closeModal}
            >
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
