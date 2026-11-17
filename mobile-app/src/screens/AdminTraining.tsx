import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  GraduationCap,
  LoaderCircle,
  MapPin,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  EmployeeResponse,
  TrainingResponse,
} from "@/lib/admin-types";
import { formatDate, shortTime, todayIso } from "@/lib/format";

export function AdminTrainingScreen() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => todayIso());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trainingsQuery = useQuery({
    queryKey: ["admin", "trainings"],
    queryFn: () =>
      apiFetch<TrainingResponse>("/api/admin/trainings?limit=100&offset=0"),
    retry: false,
  });

  const employeesQuery = useQuery({
    queryKey: ["admin", "employees"],
    queryFn: () =>
      apiFetch<EmployeeResponse>("/api/employees?limit=200&offset=0"),
    retry: false,
    enabled: formOpen,
  });

  const rows = trainingsQuery.data?.data ?? [];
  const employees = employeesQuery.data?.data ?? [];

  function resetForm() {
    setTitle("");
    setDate(todayIso());
    setStartTime("08:00");
    setEndTime("10:00");
    setPlace("");
    setNotes("");
    setEmployeeIds([]);
  }

  function toggleEmployee(id: string) {
    setEmployeeIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function submit() {
    if (title.trim().length < 1) {
      setError("Judul training wajib diisi.");
      return;
    }
    if (endTime <= startTime) {
      setError("Jam selesai harus setelah jam mulai.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/admin/trainings", {
        method: "POST",
        body: {
          title: title.trim(),
          date,
          startTime,
          endTime,
          place: place.trim(),
          notes: notes.trim(),
          employeeIds,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "trainings"] });
      setFormOpen(false);
      resetForm();
      setNotice("Training berhasil dibuat.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Training gagal dibuat.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus training ini beserta daftar pesertanya?")) return;
    setDeletingId(id);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/trainings/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "trainings"] });
      setNotice("Training dihapus.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Training gagal dihapus.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat jadwal training dan pilih peserta yang mengikuti.
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

      {!formOpen ? (
        <Button className="h-11 w-full" onClick={() => setFormOpen(true)}>
          <Plus aria-hidden="true" />
          Buat training baru
        </Button>
      ) : (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Training baru</h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="grid size-10 place-items-center rounded-md border text-muted-foreground"
              aria-label="Tutup form training"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="training-title">Judul</Label>
              <input
                id="training-title"
                value={title}
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Pelatihan keselamatan kerja"
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="training-date">Tanggal</Label>
              <input
                id="training-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="training-start">Mulai</Label>
                <input
                  id="training-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="training-end">Selesai</Label>
                <input
                  id="training-end"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="training-place">Tempat</Label>
              <input
                id="training-place"
                value={place}
                maxLength={200}
                onChange={(event) => setPlace(event.target.value)}
                placeholder="Ruang meeting / link online"
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="training-notes">Catatan</Label>
              <textarea
                id="training-notes"
                rows={3}
                value={notes}
                maxLength={500}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-base"
              />
            </label>

            <div className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Users className="size-4" aria-hidden="true" />
                  Peserta
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-text underline-offset-4 hover:underline"
                    onClick={() =>
                      setEmployeeIds(employees.map((employee) => employee.id))
                    }
                  >
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setEmployeeIds([])}
                  >
                    Kosongkan
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Tidak memilih peserta berarti training terbuka untuk semua
                karyawan.
              </p>
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                {employeesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat…</p>
                ) : employees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada data karyawan.
                  </p>
                ) : (
                  employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex min-h-10 items-center gap-2 rounded-md px-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={employeeIds.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="size-4"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {employee.fullName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {employee.nik}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

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
              {busy ? "Menyimpan…" : "Simpan training"}
            </Button>
          </div>
        </section>
      )}

      {trainingsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat training…
        </p>
      ) : trainingsQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {trainingsQuery.error.message}
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{row.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {formatDate(row.date)} · {shortTime(row.startTime)}–
                    {shortTime(row.endTime)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {row.place || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deletingId === row.id}
                  onClick={() => void remove(row.id)}
                  className="grid size-10 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Hapus training ${row.title}`}
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

              {row.notes && (
                <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm leading-6">
                  {row.notes}
                </p>
              )}

              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {row.participants.length > 0
                  ? `${row.participants.length} peserta`
                  : "Terbuka untuk semua karyawan"}
              </p>
              {row.participants.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.participants
                    .slice(0, 5)
                    .map((participant) => participant.fullName)
                    .join(", ")}
                  {row.participants.length > 5
                    ? ` +${row.participants.length - 5} lainnya`
                    : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
