import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Camera, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { apiFetch } from "@/lib/api";
import { clock, formatDate, todayIso } from "@/lib/format";

type HistoryRow = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhotoId: string | null;
  checkOutPhotoId: string | null;
  checkInDistance: number | null;
  checkOutDistance: number | null;
  status: string;
  lateMinutes: number | null;
  notes: string | null;
};

type HistoryResponse = {
  data: HistoryRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

export function HistoryScreen() {
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [photoId, setPhotoId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["attendance", "history", month],
    queryFn: () =>
      apiFetch<HistoryResponse>(
        `/api/attendance/history?limit=60&offset=0&month=${encodeURIComponent(month)}`,
      ),
    retry: false,
  });

  const rows = historyQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Riwayat Absensi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kehadiran, keterlambatan, dan rekap absensi Anda.
        </p>
      </header>

      <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium">Bulan</span>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="ml-auto h-10 rounded-md border border-border bg-transparent px-3 text-base"
        />
      </label>

      {historyQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat riwayat…
        </p>
      ) : historyQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {historyQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada data absensi pada bulan ini.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{formatDate(row.date)}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    Masuk {clock(row.checkInTime)} · Pulang{" "}
                    {clock(row.checkOutTime)}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Jarak masuk:{" "}
                  {row.checkInDistance != null
                    ? `${Math.round(row.checkInDistance)} m`
                    : "—"}
                </span>
                <span>
                  Jarak pulang:{" "}
                  {row.checkOutDistance != null
                    ? `${Math.round(row.checkOutDistance)} m`
                    : "—"}
                </span>
                {row.lateMinutes ? (
                  <span className="text-warning">
                    Terlambat {row.lateMinutes} menit
                  </span>
                ) : null}
              </div>

              {row.notes && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.notes}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {row.checkInPhotoId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPhotoId(row.checkInPhotoId)}
                  >
                    <Camera aria-hidden="true" />
                    Foto masuk
                  </Button>
                )}
                {row.checkOutPhotoId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPhotoId(row.checkOutPhotoId)}
                  >
                    <Camera aria-hidden="true" />
                    Foto pulang
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {historyQuery.data?.meta.hasMore && (
        <p className="text-center text-xs text-muted-foreground">
          Menampilkan 60 data terbaru. Gunakan filter bulan untuk melihat
          periode lain.
        </p>
      )}

      {photoId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto absensi"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhotoId(null)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Foto absensi</p>
              <button
                type="button"
                onClick={() => setPhotoId(null)}
                className="grid size-10 place-items-center rounded-md border text-muted-foreground"
                aria-label="Tutup foto"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <AuthenticatedImage
              path={`/api/attendance/photos/${photoId}`}
              alt="Foto absensi karyawan"
              className="w-full rounded-md border object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
