"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
};

type Today = {
  employee: { id: string; fullName: string };
  date: string;
  record: AttendanceRecord | null;
  schedule: Schedule | null;
};

type Mode = "check-in" | "check-out";

const clock = (value?: string | null) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
};

const shortTime = (value?: string) => (value ? value.slice(0, 5) : "--:--");

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

const getDeviceKey = () => {
  const storageKey = "hadirku_device_key";
  let key = window.localStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(storageKey, key);
  }
  return key;
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

export function AttendanceHome({ userName }: { userName: string }) {
  const [today, setToday] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadToday = useCallback(async () => {
    try {
      const response = await fetch("/api/attendance/today", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setToday(null);
        setError(body?.error?.message ?? "Gagal memuat status absensi.");
        return;
      }
      setToday(body.data);
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

  const openCamera = useCallback(
    async (nextMode: Mode) => {
      setError(null);
      setNotice(null);
      setPhoto(null);
      setBusy(true);
      try {
        const position = await getPosition();
        setAccuracy(position.coords.accuracy);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        setMode(nextMode);
      } catch (caught) {
        let reason = "Kamera atau lokasi tidak dapat diakses.";
        if (caught instanceof Error) {
          if (caught.name === "NotAllowedError") {
            reason =
              "Izin kamera ditolak. Aktifkan kamera untuk melanjutkan absensi.";
          } else if (caught.message) {
            reason = caught.message;
          }
        } else if (typeof caught === "object" && caught !== null && "code" in caught) {
          reason = "Izin lokasi ditolak atau GPS tidak tersedia.";
        }
        setError(reason);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (mode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [mode]);

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
    setPhoto(canvas.toDataURL("image/jpeg", 0.7));
  }, []);

  const closeModal = useCallback(() => {
    stopCamera();
    setMode(null);
    setPhoto(null);
  }, [stopCamera]);

  const submit = useCallback(async () => {
    if (!mode || !photo) return;
    setBusy(true);
    setError(null);
    try {
      const position = await getPosition();
      const response = await fetch(`/api/attendance/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          photo,
          deviceKey: getDeviceKey(),
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
  }, [closeModal, loadToday, mode, photo]);

  const record = today?.record ?? null;
  const schedule = today?.schedule ?? null;
  const state = !record
    ? "Belum absen masuk"
    : !record.checkOutTime
      ? "Sudah absen masuk"
      : "Absen hari ini selesai";

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-medium text-muted-foreground">
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

      {notice && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm"
        >
          <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat status absensi…</p>
        ) : today && !today.employee ? (
          <p className="text-sm text-muted-foreground">
            Akun ini belum terhubung ke data karyawan. Hubungi HR.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Status hari ini
              </span>
              {accuracy !== null && (
                <span className="text-xs text-muted-foreground">
                  GPS ±{Math.round(accuracy)} m
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-semibold">{state}</p>

            {schedule ? (
              <dl className="mt-4 grid gap-2 rounded-xl border bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Shift</dt>
                  <dd className="font-medium">
                    {shortTime(schedule.startTime)} – {shortTime(schedule.endTime)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-4" aria-hidden="true" />
                    Lokasi
                  </dt>
                  <dd className="font-medium">
                    {schedule.locationName} · radius {schedule.radiusM} m
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Masuk</dt>
                  <dd className="font-mono">
                    {clock(record?.checkInTime)}
                    {record?.checkInDistance != null
                      ? ` · ${Math.round(record.checkInDistance)} m`
                      : ""}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Pulang</dt>
                  <dd className="font-mono">
                    {clock(record?.checkOutTime)}
                  </dd>
                </div>
                {record && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">
                      {statusLabel(record.status)}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                Tidak ada jadwal kerja hari ini. Absensi tidak diwajibkan.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {!record ? (
                <Button
                  size="lg"
                  disabled={busy || !schedule}
                  onClick={() => void openCamera("check-in")}
                >
                  <Camera aria-hidden="true" />
                  Ambil Foto &amp; Absen Masuk
                </Button>
              ) : !record.checkOutTime ? (
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={() => void openCamera("check-out")}
                >
                  <Camera aria-hidden="true" />
                  Ambil Foto &amp; Absen Pulang
                </Button>
              ) : (
                <Button size="lg" disabled>
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
                Muat ulang status
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/app/riwayat">Lihat riwayat absensi</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/app/jadwal">Lihat jadwal kerja</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/app/pengajuan">Pengajuan izin/cuti</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Foto diambil langsung dari kamera dan lokasi divalidasi ulang di
              server. Waktu resmi memakai server timestamp.
            </p>
          </>
        )}
      </section>

      {mode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === "check-in" ? "Absen masuk" : "Absen pulang"}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">
              {mode === "check-in" ? "Absen masuk" : "Absen pulang"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Posisikan wajah di dalam bingkai, lalu ambil foto.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border bg-muted">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt="Pratinjau foto absensi"
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
