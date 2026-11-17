import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, LoaderCircle, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate, shortTime } from "@/lib/format";

type ScheduleRow = {
  id: string;
  date: string;
  note: string | null;
  shiftName: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  crossesMidnight: boolean;
  locationName: string;
  radiusM: number;
};

export function ScheduleScreen() {
  const scheduleQuery = useQuery({
    queryKey: ["schedule", "mine"],
    queryFn: () =>
      apiFetch<{ data: ScheduleRow[]; meta: { from: string; to: string } }>(
        "/api/schedules/mine",
      ),
    retry: false,
  });

  const rows = scheduleQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Jadwal Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jadwal shift dan lokasi absen beberapa hari ke depan.
        </p>
      </header>

      {scheduleQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat jadwal…
        </p>
      ) : scheduleQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {scheduleQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada jadwal shift untuk periode ini.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <CalendarDays
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {formatDate(row.date)}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {row.shiftName}
                  </p>
                </div>
                <span className="rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 font-mono text-xs font-semibold">
                  {shortTime(row.startTime)}–{shortTime(row.endTime)}
                </span>
              </div>

              <dl className="mt-3 grid gap-1.5 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {row.locationName}
                    <span className="ml-1 font-mono text-xs">
                      · radius {row.radiusM} m
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Toleransi {row.toleranceMinutes} menit
                    {row.crossesMidnight ? " · melewati tengah malam" : ""}
                  </span>
                </div>
              </dl>

              {row.note && (
                <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  {row.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
