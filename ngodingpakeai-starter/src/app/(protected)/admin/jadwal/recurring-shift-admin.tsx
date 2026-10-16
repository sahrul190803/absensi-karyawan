"use client";

import { useCallback, useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";

type Assignment = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  workLocationId: string;
  locationName: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  active: boolean;
};

type Employee = { id: string; fullName: string; nik: string };
type Shift = { id: string; name: string; startTime: string; endTime: string };
type Location = { id: string; name: string };

const DAY_LABELS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function RecurringShiftAdmin() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [workLocationId, setWorkLocationId] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(isoDate(new Date()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        assignmentResponse,
        employeeResponse,
        shiftResponse,
        locationResponse,
      ] = await Promise.all([
        fetch("/api/admin/employee-shifts?limit=200", { cache: "no-store" }),
        fetch("/api/employees?limit=200", { cache: "no-store" }),
        fetch("/api/shifts?limit=100", { cache: "no-store" }),
        fetch("/api/work-locations?limit=100", { cache: "no-store" }),
      ]);
      const assignmentBody = await assignmentResponse.json();
      const employeesBody = await employeeResponse.json();
      const shiftsBody = await shiftResponse.json();
      const locationsBody = await locationResponse.json();
      if (assignmentResponse.ok) {
        setRows(assignmentBody.data ?? []);
        setError(null);
      } else {
        setError(
          assignmentBody?.error?.message ?? "Gagal memuat penugasan shift.",
        );
      }
      if (employeeResponse.ok) setEmployees(employeesBody.data ?? []);
      if (shiftResponse.ok) setShifts(shiftsBody.data ?? []);
      if (locationResponse.ok) setLocations(locationsBody.data ?? []);
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

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  };

  const resetForm = () => {
    setEmployeeId("");
    setShiftId("");
    setWorkLocationId("");
    setDays([]);
    setStartDate(isoDate(new Date()));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/employee-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          shiftId,
          workLocationId,
          daysOfWeek: days,
          startDate,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Penugasan gagal disimpan.",
        );
        return;
      }
      setNotice("Penugasan shift disimpan.");
      resetForm();
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/employee-shifts/${id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Penugasan gagal dihapus.");
        return;
      }
      setNotice("Penugasan dihapus.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10 rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2">
        <Repeat className="size-5 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Penugasan shift berulang</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pola mingguan per karyawan: shift, lokasi, dan hari kerja. Bisa dipakai
        untuk membangun jadwal otomatis.
      </p>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm"
        >
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

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Karyawan</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
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
            <span className="font-medium">Shift</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={shiftId}
              onChange={(event) => setShiftId(event.target.value)}
            >
              <option value="">Pilih shift</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} · {shift.startTime.slice(0, 5)}–
                  {shift.endTime.slice(0, 5)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Lokasi kerja</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={workLocationId}
              onChange={(event) => setWorkLocationId(event.target.value)}
            >
              <option value="">Pilih lokasi</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Mulai berlaku</span>
            <input
              type="date"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
        </div>
        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Hari kerja</span>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, day) => (
              <button
                key={label}
                type="button"
                aria-pressed={days.includes(day)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  days.includes(day)
                    ? "border-primary bg-primary/10 font-medium"
                    : "bg-transparent"
                }`}
                onClick={() => toggleDay(day)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              busy ||
              !employeeId ||
              !shiftId ||
              !workLocationId ||
              days.length === 0
            }
            onClick={() => void submit()}
          >
            {busy ? "Menyimpan…" : "Simpan penugasan"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={resetForm}>
            Batal
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat penugasan…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada penugasan berulang.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {row.employeeName}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                    {row.employeeNik}
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void remove(row.id)}
                >
                  Hapus
                </Button>
              </div>
              <p className="mt-1 text-sm">
                {row.shiftName} ·{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)}
                </span>{" "}
                · {row.locationName}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {row.daysOfWeek.map((day) => DAY_LABELS[day]).join(", ")} ·{" "}
                {formatDate(row.startDate)}
                {row.endDate
                  ? ` – ${formatDate(row.endDate)}`
                  : " · seterusnya"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
