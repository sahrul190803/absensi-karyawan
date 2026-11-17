import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarRange,
  LoaderCircle,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  EmployeeResponse,
  ScheduleResponse,
  ShiftRow,
  WorkLocationRow,
} from "@/lib/admin-types";
import {
  formatDate,
  isoDate,
  shortTime,
  todayIso,
} from "@/lib/format";

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function AdminScheduleScreen() {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(() => todayIso());
  const [to, setTo] = useState(() => addDays(todayIso(), 7));
  const [formOpen, setFormOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(() => todayIso());
  const [shiftId, setShiftId] = useState("");
  const [workLocationId, setWorkLocationId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ["admin", "schedules", from, to],
    queryFn: () =>
      apiFetch<ScheduleResponse>(
        `/api/admin/schedules?from=${from}&to=${to}&limit=200&offset=0`,
      ),
    retry: false,
  });

  const employeesQuery = useQuery({
    queryKey: ["admin", "employees"],
    queryFn: () =>
      apiFetch<EmployeeResponse>("/api/employees?limit=200&offset=0"),
    retry: false,
    enabled: formOpen,
  });

  const shiftsQuery = useQuery({
    queryKey: ["admin", "shifts"],
    queryFn: () =>
      apiFetch<{ data: ShiftRow[] }>("/api/shifts?limit=200&offset=0"),
    retry: false,
    enabled: formOpen,
  });

  const locationsQuery = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: () =>
      apiFetch<{ data: WorkLocationRow[] }>(
        "/api/work-locations?limit=200&offset=0",
      ),
    retry: false,
    enabled: formOpen,
  });

  const rows = schedulesQuery.data?.data ?? [];
  const employees = employeesQuery.data?.data ?? [];
  const shifts = shiftsQuery.data?.data ?? [];
  const locations = locationsQuery.data?.data ?? [];
  const selectedEmployeeId = employeeId || employees[0]?.id || "";
  const selectedShiftId = shiftId || shifts[0]?.id || "";
  const selectedLocationId = workLocationId || locations[0]?.id || "";

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = grouped.get(row.date) ?? [];
    bucket.push(row);
    grouped.set(row.date, bucket);
  }

  function openForm() {
    setFormOpen(true);
    setNotice(null);
    setError(null);
    if (!employeeId && employees[0]) setEmployeeId(employees[0].id);
    if (!shiftId && shifts[0]) setShiftId(shifts[0].id);
    if (!workLocationId && locations[0]) setWorkLocationId(locations[0].id);
  }

  async function submit() {
    if (!selectedEmployeeId || !date || !selectedShiftId || !selectedLocationId) {
      setError("Pilih karyawan, tanggal, shift, dan lokasi kerja.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/admin/schedules", {
        method: "POST",
        body: {
          employeeId: selectedEmployeeId,
          date,
          shiftId: selectedShiftId,
          workLocationId: selectedLocationId,
          allowedLocationIds: [],
          note: note.trim(),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "schedules"] });
      setFormOpen(false);
      setNote("");
      setNotice("Jadwal berhasil disimpan.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Jadwal gagal disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus jadwal ini?")) return;
    setDeletingId(id);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "schedules"] });
      setNotice("Jadwal dihapus.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Jadwal gagal dihapus.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Attendant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Susun jadwal shift karyawan per tanggal dan pantau penugasannya.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm text-positive"
        >
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

      <div className="grid gap-2">
        <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <CalendarDays
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium">Dari</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="ml-auto h-10 min-w-0 rounded-md border border-border bg-transparent px-2 text-base"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <CalendarDays
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium">Sampai</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="ml-auto h-10 min-w-0 rounded-md border border-border bg-transparent px-2 text-base"
          />
        </label>
      </div>

      {!formOpen ? (
        <Button className="h-11 w-full" onClick={openForm}>
          <Plus aria-hidden="true" />
          Buat / ubah jadwal
        </Button>
      ) : (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Jadwal karyawan</h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="grid size-10 place-items-center rounded-md border text-muted-foreground"
              aria-label="Tutup form jadwal"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="schedule-employee">Karyawan</Label>
              <select
                id="schedule-employee"
                value={selectedEmployeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              >
                <option value="">Pilih karyawan</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} · {employee.nik}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="schedule-date">Tanggal</Label>
              <input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="schedule-shift">Shift</Label>
              <select
                id="schedule-shift"
                value={selectedShiftId}
                onChange={(event) => setShiftId(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              >
                <option value="">Pilih shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} · {shortTime(shift.startTime)}–
                    {shortTime(shift.endTime)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="schedule-location">Lokasi kerja</Label>
              <select
                id="schedule-location"
                value={selectedLocationId}
                onChange={(event) => setWorkLocationId(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              >
                <option value="">Pilih lokasi</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} · {location.radiusM} m
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="schedule-note">Catatan (opsional)</Label>
              <input
                id="schedule-note"
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: ganti shift pagi"
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>

            <Button
              className="h-11 w-full"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {busy ? "Menyimpan…" : "Simpan jadwal"}
            </Button>
          </div>
        </section>
      )}

      {schedulesQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat jadwal…
        </p>
      ) : schedulesQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {schedulesQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <CalendarRange
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada jadwal pada rentang tanggal ini.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {[...grouped.entries()].map(([day, dayRows]) => (
            <section key={day}>
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {formatDate(day)}
              </h2>
              <ul className="mt-2 space-y-2">
                {dayRows.map((row) => (
                  <li key={row.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.employeeName}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {row.shiftName} · {shortTime(row.startTime)}–
                          {shortTime(row.endTime)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => void remove(row.id)}
                        className="grid size-10 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Hapus jadwal ${row.employeeName}`}
                      >
                        {deletingId === row.id ? (
                          <LoaderCircle
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {row.locationName}
                    </p>
                    {row.note && (
                      <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
                        {row.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
