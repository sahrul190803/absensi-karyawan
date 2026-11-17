import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  Gauge,
  GraduationCap,
  History,
  Inbox,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Send,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isNativeApp, captureNativePhoto } from "@/lib/camera";
import { getAttendanceDeviceInfo } from "@/lib/device";
import { getCurrentPosition, type DevicePosition } from "@/lib/geolocation";
import { getDeviceKey } from "@/lib/storage";
import {
  addWatermark,
  captureVideoFrame,
  type WatermarkInput,
} from "@/lib/watermark";
import { clock, shortTime } from "@/lib/format";

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

type Mode = "check-in" | "check-out";

const dateLabel = () =>
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function friendlyError(caught: unknown): string {
  if (caught instanceof ApiError) return caught.message;
  if (caught instanceof Error) {
    if (caught.name === "NotAllowedError") {
      return "Izin kamera/lokasi ditolak. Aktifkan izin tersebut untuk melanjutkan absensi.";
    }
    if (caught.name === "NotFoundError") {
      return "Kamera tidak ditemukan pada perangkat ini.";
    }
    return caught.message;
  }
  return "Terjadi kesalahan. Coba lagi.";
}

function QuickLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-20 flex-col items-start justify-between gap-2 rounded-lg border bg-card p-3.5 text-sm font-medium transition-colors hover:border-border-strong"
    >
      <span className="text-primary-text">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}

export function HomeScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locationFree, isManager } = useAuth();

  const [mode, setMode] = useState<Mode | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [placeNote, setPlaceNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const todayQuery = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () => apiFetch<{ data: Today }>("/api/attendance/today"),
    retry: false,
  });

  useEffect(() => {
    const error = todayQuery.error;
    if (
      error instanceof ApiError &&
      (error.code === "ACCOUNT_PENDING" || error.code === "ACCOUNT_NOT_LINKED")
    ) {
      navigate("/pending", { replace: true });
    }
  }, [navigate, todayQuery.error]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (mode && !isNativeApp() && !photo && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [mode, photo]);

  const today = todayQuery.data?.data;
  const record = today?.record ?? null;
  const schedule = today?.schedule ?? null;
  const state = !record
    ? "Belum absen masuk"
    : !record.checkOutTime
      ? "Sudah absen masuk"
      : "Absen hari ini selesai";

  const watermarkInput = useCallback(
    (nextMode: Mode): WatermarkInput => ({
      mode: nextMode,
      locationFree,
      locationName: schedule?.locationName,
      placeNote,
      position,
    }),
    [locationFree, placeNote, position, schedule?.locationName],
  );

  const startWebCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 } },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play();
    }
  }, []);

  const openAttendance = useCallback(
    async (nextMode: Mode) => {
      setFormError(null);
      setNotice(null);
      setPhoto(null);
      setPlaceNote("");
      setPositionError(null);
      setBusy(true);
      try {
        let nextPosition: DevicePosition | null = null;
        try {
          nextPosition = await getCurrentPosition();
          setPosition(nextPosition);
        } catch {
          setPosition(null);
          setPositionError(
            locationFree
              ? "GPS tidak tersedia. Absen tetap bisa dikirim tanpa lokasi."
              : "Izin lokasi ditolak atau GPS tidak tersedia.",
          );
          if (!locationFree) {
            throw new Error(
              "Aktifkan izin lokasi untuk absen. Jika dinas di luar kantor, hubungi HRD.",
            );
          }
        }

        setMode(nextMode);
        if (!isNativeApp()) await startWebCamera();
      } catch (caught) {
        setFormError(friendlyError(caught));
      } finally {
        setBusy(false);
      }
    },
    [locationFree, startWebCamera],
  );

  const capture = useCallback(async () => {
    if (!mode) return;
    setBusy(true);
    setFormError(null);
    try {
      let marked: string | null = null;
      if (isNativeApp()) {
        const raw = await captureNativePhoto();
        if (!raw) throw new Error("Kamera tidak tersedia.");
        marked = await addWatermark(raw, watermarkInput(mode));
      } else {
        if (!videoRef.current) throw new Error("Kamera belum siap.");
        marked = captureVideoFrame(videoRef.current, watermarkInput(mode));
      }
      setPhoto(marked);
      stopCamera();
    } catch (caught) {
      setFormError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }, [mode, stopCamera, watermarkInput]);

  const retake = useCallback(async () => {
    setPhoto(null);
    setFormError(null);
    if (isNativeApp()) return;
    setBusy(true);
    try {
      await startWebCamera();
    } catch (caught) {
      setFormError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }, [startWebCamera]);

  const closeModal = useCallback(() => {
    stopCamera();
    setMode(null);
    setPhoto(null);
    setPlaceNote("");
    setPositionError(null);
    setFormError(null);
  }, [stopCamera]);

  const submit = useCallback(async () => {
    if (!mode || !photo) return;
    setBusy(true);
    setFormError(null);
    try {
      let current = position;
      if (!current) {
        try {
          current = await getCurrentPosition();
          setPosition(current);
        } catch {
          if (!locationFree) {
            setFormError(
              "GPS tidak terdeteksi. Aktifkan izin lokasi lalu coba lagi.",
            );
            return;
          }
        }
      }

      if (!locationFree && !current) {
        setFormError("Lokasi wajib tersedia untuk absensi ini.");
        return;
      }

      const deviceInfo = await getAttendanceDeviceInfo();
      await apiFetch(`/api/attendance/${mode}`, {
        method: "POST",
        body: {
          ...(current
            ? {
                latitude: current.latitude,
                longitude: current.longitude,
                accuracy: current.accuracy,
              }
            : {}),
          photo,
          deviceKey: getDeviceKey(),
          deviceInfo,
          idempotencyKey: `${mode}-${uuid()}`,
          ...(locationFree && placeNote.trim()
            ? { placeNote: placeNote.trim() }
            : {}),
        },
      });

      closeModal();
      setNotice(
        mode === "check-in"
          ? "Absen masuk tercatat. Selamat bekerja!"
          : "Absen pulang tercatat. Terima kasih!",
      );
      await queryClient.invalidateQueries({
        queryKey: ["attendance", "today"],
      });
    } catch (caught) {
      setFormError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }, [
    closeModal,
    locationFree,
    mode,
    photo,
    placeNote,
    position,
    queryClient,
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{dateLabel()}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Halo, {today?.employee?.fullName ?? "Karyawan"}
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
      {todayQuery.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {todayQuery.error instanceof Error
            ? todayQuery.error.message
            : "Gagal memuat status absensi."}
        </p>
      )}

      <section
        id="status-absensi"
        className="relative overflow-hidden rounded-lg border border-border-strong bg-card p-4"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-1 rounded-r bg-primary"
        />
        {todayQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat status absensi…</p>
        ) : !today?.employee ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Akun ini belum terhubung ke data karyawan. Hubungi HRD untuk
            menautkan akun dengan NIK Anda.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Status hari ini
              </span>
              {locationFree ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  Dinas luar
                </span>
              ) : position ? (
                <span className="font-mono text-xs text-muted-foreground">
                  GPS ±{Math.round(position.accuracy)} m
                </span>
              ) : null}
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
                    {shortTime(schedule.startTime)}–{shortTime(schedule.endTime)}
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
              </dl>
            ) : (
              <p className="mt-4 rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                Tidak ada jadwal kerja hari ini. Absensi tidak diwajibkan.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {!record ? (
                <Button
                  size="lg"
                  className="h-11 w-full"
                  disabled={busy || !schedule}
                  onClick={() => void openAttendance("check-in")}
                >
                  <Camera aria-hidden="true" />
                  Ambil Foto &amp; Absen Masuk
                </Button>
              ) : !record.checkOutTime ? (
                <Button
                  size="lg"
                  className="h-11 w-full"
                  disabled={busy}
                  onClick={() => void openAttendance("check-out")}
                >
                  <Camera aria-hidden="true" />
                  Ambil Foto &amp; Absen Pulang
                </Button>
              ) : (
                <Button size="lg" className="h-11 w-full" disabled>
                  <CheckCircle2 aria-hidden="true" />
                  Absen hari ini selesai
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="h-11 w-full"
                disabled={busy || todayQuery.isFetching}
                onClick={() => void todayQuery.refetch()}
              >
                <RefreshCw
                  className={todayQuery.isFetching ? "animate-spin" : undefined}
                  aria-hidden="true"
                />
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

      {positionError && !locationFree && (
        <p className="rounded-lg border border-warning/40 bg-warning-quiet px-4 py-3 text-sm text-warning">
          {positionError}
        </p>
      )}

      <section aria-label="Menu fitur">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Fitur lainnya
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {isManager && (
            <li>
              <QuickLink to="/admin" icon={<Gauge className="size-5" />}>
                Dashboard HOD
              </QuickLink>
            </li>
          )}
          <li>
            <QuickLink
              to="/app/history"
              icon={<History className="size-5" />}
            >
              Riwayat Absensi
            </QuickLink>
          </li>
          <li>
            <QuickLink
              to="/app/schedule"
              icon={<CalendarDays className="size-5" />}
            >
              Jadwal Saya
            </QuickLink>
          </li>
          <li>
            <QuickLink to="/app/requests" icon={<Inbox className="size-5" />}>
              Izin &amp; Cuti
            </QuickLink>
          </li>
          <li>
            <QuickLink
              to="/app/meals"
              icon={<UtensilsCrossed className="size-5" />}
            >
              Jadwal Makan
            </QuickLink>
          </li>
          <li>
            <QuickLink
              to="/app/training"
              icon={<GraduationCap className="size-5" />}
            >
              Training
            </QuickLink>
          </li>
          <li>
            <QuickLink to="/app/notifications" icon={<Bell className="size-5" />}>
              Notifikasi
            </QuickLink>
          </li>
        </ul>
      </section>

      {mode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === "check-in" ? "Absen masuk" : "Absen pulang"}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <h2 className="text-lg font-semibold">
              {mode === "check-in" ? "Absen masuk" : "Absen pulang"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Posisikan wajah di dalam bingkai. Foto otomatis mencantumkan
              waktu, tempat, dan GPS.
            </p>

            <div className="mt-4 overflow-hidden rounded-md border bg-muted">
              {photo ? (
                <img
                  src={photo}
                  alt="Pratinjau foto absensi dengan keterangan waktu dan tempat"
                  className="max-h-[60dvh] w-full object-contain"
                />
              ) : isNativeApp() ? (
                <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Camera className="size-8" aria-hidden="true" />
                  <span className="text-sm">Kamera siap dibuka</span>
                </div>
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
                  className="h-11 w-full rounded-md border border-border bg-transparent px-3 text-base"
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

            {formError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
              >
                {formError}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {!photo ? (
                <Button
                  className="h-11 flex-1"
                  disabled={busy}
                  onClick={() => void capture()}
                >
                  {busy ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Camera aria-hidden="true" />
                  )}
                  {busy ? "Membuka kamera…" : "Ambil Foto"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-11 flex-1"
                    disabled={busy}
                    onClick={() => void retake()}
                  >
                    Ulangi
                  </Button>
                  <Button
                    className="h-11 flex-1"
                    disabled={busy}
                    onClick={() => void submit()}
                  >
                    {busy ? (
                      <LoaderCircle
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send aria-hidden="true" />
                    )}
                    {busy ? "Mengirim…" : "Kirim Absen"}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              className="mt-2 h-11 w-full"
              disabled={busy}
              onClick={closeModal}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {isManager && (
        <Link
          to="/admin"
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium"
        >
          Buka dashboard HOD
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
