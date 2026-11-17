import { useQuery } from "@tanstack/react-query";
import { CalendarDays, GraduationCap, LoaderCircle, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatDate, shortTime } from "@/lib/format";

type TrainingRow = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  notes: string | null;
};

export function TrainingScreen() {
  const trainingQuery = useQuery({
    queryKey: ["trainings"],
    queryFn: () =>
      apiFetch<{ data: TrainingRow[]; meta: { from: string } }>(
        "/api/trainings",
      ),
    retry: false,
  });

  const rows = trainingQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jadwal training yang tersedia untuk Anda.
        </p>
      </header>

      {trainingQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat training…
        </p>
      ) : trainingQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {trainingQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <GraduationCap
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada jadwal training.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <p className="text-lg font-semibold">{row.title}</p>
              <dl className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {formatDate(row.date)} · {shortTime(row.startTime)}–
                    {shortTime(row.endTime)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{row.place}</span>
                </div>
              </dl>
              {row.notes && (
                <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-sm leading-6">
                  {row.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
