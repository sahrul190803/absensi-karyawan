"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

type EmployeeRow = {
  id: string;
  fullName: string;
  nik: string;
  departmentId: string | null;
  positionId: string | null;
  employmentStatus: string;
};

type Named = { id: string; name: string };

type Participant = {
  employeeId: string;
  fullName: string;
  nik: string;
  departmentName: string | null;
  positionName: string | null;
};

type TrainingRow = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  notes: string;
  participants: Participant[];
};

type FormValues = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  notes: string;
};

const EMPTY_FORM: FormValues = {
  title: "",
  date: "",
  startTime: "09:00",
  endTime: "11:00",
  place: "",
  notes: "",
};

export function TrainingAdmin() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<Named[]>([]);
  const [positions, setPositions] = useState<Named[]>([]);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [employeeResponse, departmentResponse, positionResponse, trainingResponse] =
        await Promise.all([
          fetch("/api/employees?limit=200", { cache: "no-store" }),
          fetch("/api/departments?limit=200", { cache: "no-store" }),
          fetch("/api/positions?limit=200", { cache: "no-store" }),
          fetch("/api/admin/trainings?limit=200", { cache: "no-store" }),
        ]);
      const [employeeBody, departmentBody, positionBody, trainingBody] =
        await Promise.all([
          employeeResponse.json(),
          departmentResponse.json(),
          positionResponse.json(),
          trainingResponse.json(),
        ]);
      if (!employeeResponse.ok || !trainingResponse.ok) {
        setError(
          employeeBody?.error?.message ??
            trainingBody?.error?.message ??
            "Gagal memuat data training.",
        );
        return;
      }
      setEmployees(employeeBody.data ?? []);
      setDepartments(departmentResponse.ok ? (departmentBody.data ?? []) : []);
      setPositions(positionResponse.ok ? (positionBody.data ?? []) : []);
      setTrainings(trainingBody.data ?? []);
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

  const departmentNames = useMemo(
    () => new Map(departments.map((row) => [row.id, row.name])),
    [departments],
  );
  const positionNames = useMemo(
    () => new Map(positions.map((row) => [row.id, row.name])),
    [positions],
  );

  const trainedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const training of trainings) {
      for (const participant of training.participants) {
        ids.add(participant.employeeId);
      }
    }
    return ids;
  }, [trainings]);

  // Karyawan yang belum pernah ikut training tampil paling atas supaya mudah
  // dipilih; setelah itu urut nama.
  const pickerRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees
      .filter((employee) => employee.employmentStatus === "active")
      .map((employee) => ({
        ...employee,
        departmentName: employee.departmentId
          ? (departmentNames.get(employee.departmentId) ?? null)
          : null,
        positionName: employee.positionId
          ? (positionNames.get(employee.positionId) ?? null)
          : null,
        trained: trainedIds.has(employee.id),
      }))
      .filter((employee) => {
        if (query.length === 0) return true;
        return [
          employee.fullName,
          employee.nik,
          employee.departmentName ?? "",
          employee.positionName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (a.trained !== b.trained) return a.trained ? 1 : -1;
        return a.fullName.localeCompare(b.fullName, "id-ID");
      });
  }, [departmentNames, employees, positionNames, search, trainedIds]);

  const visibleTrainings = useMemo(
    () =>
      [...trainings].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
      ),
    [trainings],
  );

  const openCreate = () => {
    setEditingId(null);
    setValues(EMPTY_FORM);
    setSelected(new Set());
    setSearch("");
    setFormOpen(true);
    setNotice(null);
    setError(null);
  };

  const openEdit = (row: TrainingRow) => {
    setEditingId(row.id);
    setValues({
      title: row.title,
      date: row.date,
      startTime: row.startTime.slice(0, 5),
      endTime: row.endTime.slice(0, 5),
      place: row.place ?? "",
      notes: row.notes ?? "",
    });
    setSelected(new Set(row.participants.map((p) => p.employeeId)));
    setSearch("");
    setFormOpen(true);
    setNotice(null);
    setError(null);
  };

  const toggleParticipant = (employeeId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        editingId ? `/api/admin/trainings/${editingId}` : "/api/admin/trainings",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, employeeIds: [...selected] }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Training gagal disimpan.",
        );
        return;
      }
      setNotice(editingId ? "Training diperbarui." : "Training ditambahkan.");
      setFormOpen(false);
      setEditingId(null);
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: TrainingRow) => {
    if (!window.confirm(`Hapus training "${row.title}"? Tindakan ini permanen.`))
      return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/trainings/${row.id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Gagal menghapus training.");
        return;
      }
      setNotice("Training dihapus.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Training
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tentukan jadwal training dan pilih siapa saja karyawan yang ikut.
            Departemen dan jabatan peserta otomatis dari data karyawan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw aria-hidden="true" />
            Muat ulang
          </Button>
          <Button size="sm" onClick={openCreate}>
            Tambah training
          </Button>
        </div>
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

      {formOpen && (
        <section className="mt-6 rounded-lg border border-border-strong bg-card p-5">
          <h2 className="text-lg font-semibold">
            {editingId ? "Ubah training" : "Tambah training"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Judul *</span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={values.title}
                onChange={(event) =>
                  setValues({ ...values, title: event.target.value })
                }
                placeholder="Contoh: Induksi K3 Dasar"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tanggal *</span>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={values.date}
                onChange={(event) =>
                  setValues({ ...values, date: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tempat</span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={values.place}
                onChange={(event) =>
                  setValues({ ...values, place: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Jam mulai *</span>
              <input
                type="time"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={values.startTime}
                onChange={(event) =>
                  setValues({ ...values, startTime: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Jam selesai *</span>
              <input
                type="time"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={values.endTime}
                onChange={(event) =>
                  setValues({ ...values, endTime: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Catatan</span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={values.notes}
                onChange={(event) =>
                  setValues({ ...values, notes: event.target.value })
                }
              />
            </label>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Peserta</h3>
              <span className="font-mono text-xs text-muted-foreground">
                {selected.size} karyawan dipilih
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pilih siapa saja yang ikut. Kosongkan bila training berlaku untuk
              semua karyawan. Karyawan yang belum pernah training tampil di
              paling atas.
            </p>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIK, departemen, atau jabatan…"
              aria-label="Cari karyawan peserta"
              className="mt-3 h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
            />
            <ul className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border">
              {pickerRows.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada karyawan yang cocok.
                </li>
              ) : (
                pickerRows.map((employee) => (
                  <li
                    key={employee.id}
                    className="border-b border-border last:border-0"
                  >
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60">
                      <input
                        type="checkbox"
                        className="size-4 flex-none accent-current"
                        checked={selected.has(employee.id)}
                        onChange={() => toggleParticipant(employee.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {employee.fullName}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {employee.nik} · {employee.departmentName ?? "—"} ·{" "}
                          {employee.positionName ?? "—"}
                        </span>
                      </span>
                      {!employee.trained && (
                        <span className="flex-none rounded-full border border-border-strong bg-primary-quiet px-2 py-0.5 text-[11px] font-semibold text-primary-text">
                          Belum training
                        </span>
                      )}
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              disabled={
                busy ||
                !values.title.trim() ||
                !values.date ||
                !values.startTime ||
                !values.endTime
              }
              onClick={() => void submit()}
            >
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setFormOpen(false)}
            >
              Batal
            </Button>
          </div>
        </section>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : visibleTrainings.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <GraduationCap
            className="mx-auto size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada jadwal training. Tambahkan training pertama.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {visibleTrainings.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{row.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {formatDate(row.date, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)}
                    {row.place ? ` · ${row.place}` : ""}
                  </p>
                  {row.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {row.notes}
                    </p>
                  )}
                  <p className="mt-2 text-sm">
                    {row.participants.length === 0 ? (
                      <span className="rounded-full border border-border-strong bg-primary-quiet px-2.5 py-0.5 text-xs font-semibold text-primary-text">
                        Semua karyawan
                      </span>
                    ) : (
                      <>
                        <span className="text-muted-foreground">
                          {row.participants.length} peserta:
                        </span>{" "}
                        <span className="text-foreground">
                          {row.participants
                            .map((participant) => participant.fullName)
                            .join(", ")}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => openEdit(row)}
                  >
                    Ubah
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void remove(row)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
