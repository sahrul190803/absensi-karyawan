"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials, isoDate, todayIso } from "@/lib/format";
import { RangeCalendar, type DateRange } from "./range-calendar";

type ScheduleRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  note: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  workLocationId: string;
  locationName: string;
};

type Employee = {
  id: string;
  fullName: string;
  nik: string;
  positionId: string | null;
};
type Position = { id: string; name: string };
type Shift = { id: string; name: string; startTime: string; endTime: string };
type Location = { id: string; name: string };

type ViewMode = "day" | "week" | "month" | "range";

type CellTarget = {
  employeeId: string;
  employeeName: string;
  date: string;
  existing: ScheduleRow | null;
};

const SHIFT_COLORS = [
  { bg: "#F4F8B8", rail: "#C9D61E" },
  { bg: "#FDE8E8", rail: "#E58A8A" },
  { bg: "#E7F0FE", rail: "#7FA8E8" },
  { bg: "#FDF1DC", rail: "#E0B567" },
  { bg: "#E9F7EF", rail: "#7CC39C" },
  { bg: "#F1EAFB", rail: "#AF8FE0" },
];

const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAY_LONG = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const parseIso = (value: string) => new Date(`${value}T00:00:00`);

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
};

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const toIso = (date: Date) => isoDate(date);

const daysBetween = (from: string, to: string) =>
  Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86_400_000);

export function ScheduleGrid() {
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [target, setTarget] = useState<CellTarget | null>(null);
  const [formShift, setFormShift] = useState("");
  const [formNote, setFormNote] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const calendarTriggerRef = useRef<HTMLButtonElement>(null);

  const range = useMemo(() => {
    if (view === "range") {
      if (customRange) return customRange;
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      return { from: toIso(start), to: toIso(end) };
    }
    if (view === "day") {
      const day = isoDate(anchor);
      return { from: day, to: day };
    }
    if (view === "week") {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      return { from: toIso(start), to: toIso(end) };
    }
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: toIso(start), to: toIso(end) };
  }, [anchor, customRange, view]);

  const dates = useMemo(() => {
    const list: string[] = [];
    let cursor = parseIso(range.from);
    const end = parseIso(range.to);
    while (cursor <= end) {
      list.push(toIso(cursor));
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [range]);

  const shiftColor = useMemo(() => {
    const map = new Map<string, { bg: string; rail: string }>();
    shifts.forEach((shift, index) => {
      map.set(shift.id, SHIFT_COLORS[index % SHIFT_COLORS.length]);
    });
    return map;
  }, [shifts]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleRow>();
    for (const row of rows) map.set(`${row.employeeId}|${row.date}`, row);
    return map;
  }, [rows]);

  const dayIso = isoDate(anchor);

  const positionByEmployee = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const employee of employees) map.set(employee.id, employee.positionId);
    return map;
  }, [employees]);

  const positionMatches = useCallback(
    (employeeId: string) =>
      !filterPosition || positionByEmployee.get(employeeId) === filterPosition,
    [filterPosition, positionByEmployee],
  );

  const dayGroups = useMemo(() => {
    if (view !== "day") return [];
    return shifts
      .map((shift) => ({
        shift,
        people: rows
          .filter(
            (row) =>
              row.date === dayIso &&
              row.shiftId === shift.id &&
              (filterShift === "" || row.shiftId === filterShift) &&
              positionMatches(row.employeeId),
          )
          .sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
      }))
      .filter((group) => group.people.length > 0);
  }, [view, rows, dayIso, filterShift, positionMatches, shifts]);

  const dayOff = useMemo(
    () =>
      view === "day"
        ? employees.filter(
            (employee) =>
              positionMatches(employee.id) &&
              filterShift === "" &&
              !rows.some(
                (row) => row.date === dayIso && row.employeeId === employee.id,
              ),
          )
        : [],
    [view, employees, rows, dayIso, filterShift, positionMatches],
  );

  const primaryLocationId = locations[0]?.id ?? "";

  const loadSchedules = useCallback(async (from: string, to: string) => {
    const collected: ScheduleRow[] = [];
    let offset = 0;
    for (;;) {
      const response = await fetch(
        `/api/admin/schedules?from=${from}&to=${to}&limit=200&offset=${offset}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body?.error?.message ?? "Gagal memuat jadwal.");
      collected.push(...(body.data ?? []));
      if (!body.meta?.hasMore || collected.length >= 2000) break;
      offset += 200;
    }
    return collected;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        scheduleRows,
        employeeResponse,
        positionResponse,
        shiftResponse,
        locationResponse,
      ] = await Promise.all([
        loadSchedules(range.from, range.to),
        fetch("/api/employees?limit=200", { cache: "no-store" }),
        fetch("/api/positions?limit=200", { cache: "no-store" }),
        fetch("/api/shifts?limit=100", { cache: "no-store" }),
        fetch("/api/work-locations?limit=100", { cache: "no-store" }),
      ]);
      const employeesBody = await employeeResponse.json();
      const positionsBody = await positionResponse.json();
      const shiftsBody = await shiftResponse.json();
      const locationsBody = await locationResponse.json();
      setRows(scheduleRows);
      if (employeeResponse.ok) setEmployees(employeesBody.data ?? []);
      if (positionResponse.ok) setPositions(positionsBody.data ?? []);
      if (shiftResponse.ok) setShifts(shiftsBody.data ?? []);
      if (locationResponse.ok) setLocations(locationsBody.data ?? []);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Tidak dapat menghubungi server.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadSchedules, range.from, range.to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!calendarOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!calendarWrapperRef.current?.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCalendarOpen(false);
      calendarTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (!target) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      setTarget(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [target, busy]);

  const applyCalendarSelection = (next: DateRange) => {
    setCalendarOpen(false);
    calendarTriggerRef.current?.focus();
    if (next.from !== next.to) {
      setCustomRange(next);
      setView("range");
      return;
    }
    if (view === "range") {
      setCustomRange(next);
      return;
    }
    setAnchor(parseIso(next.from));
  };

  const saveSchedule = async (
    employeeId: string,
    employeeName: string,
    date: string,
    shiftId: string,
    note: string,
  ) => {
    if (!shiftId || !primaryLocationId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          date,
          shiftId,
          workLocationId: primaryLocationId,
          allowedLocationIds: [],
          note,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Jadwal gagal disimpan.",
        );
        return;
      }
      setNotice(`Jadwal ${employeeName} pada ${date} tersimpan.`);
      setTarget(null);
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const openCell = (employee: Employee, date: string) => {
    if (busy) return;
    const existing = scheduleMap.get(`${employee.id}|${date}`) ?? null;
    if (!existing && filterShift && primaryLocationId) {
      void saveSchedule(employee.id, employee.fullName, date, filterShift, "");
      return;
    }
    setTarget({
      employeeId: employee.id,
      employeeName: employee.fullName,
      date,
      existing,
    });
    setFormShift(existing?.shiftId || filterShift || shifts[0]?.id || "");
    setFormNote(existing?.note ?? "");
  };

  const saveCell = async () => {
    if (!target || !formShift || !primaryLocationId) return;
    await saveSchedule(
      target.employeeId,
      target.employeeName,
      target.date,
      formShift,
      formNote,
    );
  };

  const removeCell = async () => {
    if (!target?.existing) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/schedules/${target.existing.id}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Jadwal gagal dihapus.");
        return;
      }
      setNotice(`Jadwal ${target.employeeName} pada ${target.date} dihapus.`);
      setTarget(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const move = (direction: -1 | 1) => {
    if (view === "range") {
      const span = daysBetween(range.from, range.to) + 1;
      setCustomRange({
        from: toIso(addDays(parseIso(range.from), direction * span)),
        to: toIso(addDays(parseIso(range.to), direction * span)),
      });
      return;
    }
    setAnchor((current) =>
      view === "day"
        ? addDays(current, direction)
        : view === "week"
          ? addDays(current, direction * 7)
          : new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };

  const periodLabel = () => {
    const start = parseIso(range.from);
    const end = parseIso(range.to);
    if (view === "day") {
      return start.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (view === "month") {
      return `${MONTH_LONG[start.getMonth()]} ${start.getFullYear()}`;
    }
    const sameMonth = start.getMonth() === end.getMonth();
    return sameMonth
      ? `${start.getDate()}–${end.getDate()} ${MONTH_LONG[end.getMonth()]} ${end.getFullYear()}`
      : `${start.getDate()} ${MONTH_LONG[start.getMonth()]} – ${end.getDate()} ${MONTH_LONG[end.getMonth()]} ${end.getFullYear()}`;
  };

  const today = todayIso();

  return (
    <div className="space-y-5">
      {notice && (
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm"
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border bg-card">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-l-md text-muted-foreground hover:text-foreground"
            onClick={() => move(-1)}
            aria-label={
              view === "week"
                ? "Minggu sebelumnya"
                : view === "day"
                  ? "Hari sebelumnya"
                  : view === "range"
                    ? "Periode sebelumnya"
                    : "Bulan sebelumnya"
            }
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-48 px-2 text-center text-sm font-semibold">
            {periodLabel()}
          </span>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
            onClick={() => move(1)}
            aria-label={
              view === "week"
                ? "Minggu berikutnya"
                : view === "day"
                  ? "Hari berikutnya"
                  : view === "range"
                    ? "Periode berikutnya"
                    : "Bulan berikutnya"
            }
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (view === "range") {
              setCustomRange({ from: today, to: today });
              return;
            }
            setAnchor(new Date());
          }}
        >
          Hari ini
        </Button>
        <div ref={calendarWrapperRef} className="relative">
          <button
            ref={calendarTriggerRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={calendarOpen}
            aria-label="Buka kalender untuk memilih rentang tanggal"
            onClick={() => setCalendarOpen((open) => !open)}
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm text-foreground"
          >
            <CalendarDays
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="font-mono">
              {parseIso(range.from).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </button>
          {calendarOpen && (
            <div className="absolute top-full left-0 z-50 mt-2 rounded-lg border border-border bg-card p-3 shadow-lg">
              <RangeCalendar value={range} onSelect={applyCalendarSelection} />
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={loading}
          onClick={() => void load()}
          aria-label="Muat ulang jadwal"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
        <div
          role="tablist"
          aria-label="Tampilan jadwal"
          className="ml-auto flex rounded-md border border-border bg-card p-0.5"
        >
          {(["day", "week", "month", "range"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              onClick={() => {
                if (mode === "range" && !customRange) {
                  const start = startOfWeek(anchor);
                  setCustomRange({
                    from: toIso(start),
                    to: toIso(addDays(start, 6)),
                  });
                }
                setView(mode);
              }}
              className={`rounded-[5px] px-3 py-1.5 text-sm font-medium ${
                view === mode
                  ? "bg-primary-quiet text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "day"
                ? "Harian"
                : mode === "week"
                  ? "Mingguan"
                  : mode === "month"
                    ? "Bulanan"
                    : "Rentang"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Jabatan
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={filterPosition}
            onChange={(event) => setFilterPosition(event.target.value)}
          >
            <option value="">Semua jabatan</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Shift
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={filterShift}
            onChange={(event) => setFilterShift(event.target.value)}
          >
            <option value="">Semua shift</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} - {shift.startTime.slice(0, 5)}-
                {shift.endTime.slice(0, 5)}
              </option>
            ))}
          </select>
        </label>
        <span className="font-mono text-xs text-muted-foreground">
          {view === "day"
            ? `${dayGroups.reduce((sum, group) => sum + group.people.length, 0) + dayOff.length} orang tampil`
            : `${employees.filter((employee) => positionMatches(employee.id)).length} karyawan tampil`}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFilterPosition("");
            setFilterShift("");
          }}
        >
          Reset filter
        </Button>
      </div>

      {filterShift && (
        <p className="text-xs text-muted-foreground">
          Klik sel kosong untuk langsung mengisi shift ini. Klik jadwal yang
          sudah ada untuk mengubahnya.
        </p>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {shifts.map((shift) => {
          const color = shiftColor.get(shift.id);
          return (
            <li
              key={shift.id}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-[3px] border border-black/10"
                style={{ background: color?.bg ?? "#F0F1E8" }}
              />
              {shift.name}
              <span className="font-mono">
                {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
              </span>
            </li>
          );
        })}
        <li className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-3 rounded-[3px] border border-border-strong bg-muted"
          />
          Libur / belum dijadwalkan
        </li>
      </ul>

      {view === "day" ? (
        <section
          className="rounded-lg border bg-card p-5"
          aria-label="Jadwal harian"
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat jadwal…</p>
          ) : dayGroups.length === 0 && dayOff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada karyawan yang cocok dengan filter ini.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dayGroups.map(({ shift, people }) => {
                const color = shiftColor.get(shift.id);
                return (
                  <article
                    key={shift.id}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <header
                      className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3"
                      style={{ background: color?.bg ?? "#E7F0FE" }}
                    >
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-[3px] border border-black/10"
                        style={{ background: color?.rail ?? "#7FA8E8" }}
                      />
                      <span className="font-semibold">{shift.name}</span>
                      <span className="font-mono text-xs text-black/60">
                        {shift.startTime.slice(0, 5)}–
                        {shift.endTime.slice(0, 5)}
                      </span>
                      <span className="ml-auto font-mono text-xs text-black/60">
                        {people.length} orang
                      </span>
                    </header>
                    <ul className="divide-y divide-border">
                      {people.map((person) => (
                        <li
                          key={person.id}
                          className="flex items-center gap-3 px-4 py-2"
                        >
                          <span className="grid size-8 flex-none place-items-center rounded-full border border-border-strong bg-muted text-[11px] font-semibold">
                            {initials(person.employeeName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {person.employeeName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {person.locationName}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
              {filterShift === "" && dayOff.length > 0 && (
                <article className="overflow-hidden rounded-lg border border-border">
                  <header className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
                    <span className="font-semibold">
                      Libur / belum dijadwalkan
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {dayOff.length} orang
                    </span>
                  </header>
                  <ul className="divide-y divide-border">
                    {dayOff.map((employee) => (
                      <li key={employee.id} className="px-4 py-2 text-sm">
                        {employee.fullName}
                      </li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-lg border bg-card">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Memuat jadwal…
            </p>
          ) : employees.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <CalendarDays
                className="mx-auto size-7 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada karyawan aktif. Tambahkan data karyawan terlebih
                dahulu.
              </p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky top-0 left-0 z-30 w-44 min-w-44 border-r border-b border-border bg-card px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      Karyawan
                    </th>
                    {dates.map((date) => {
                      const parsed = parseIso(date);
                      const isToday = date === today;
                      return (
                        <th
                          key={date}
                          scope="col"
                          className={`sticky top-0 z-20 border-b border-border px-2 py-2.5 text-center align-top ${
                            isToday ? "bg-primary-quiet" : "bg-card"
                          }`}
                        >
                          <span className="block text-[11px] font-medium text-muted-foreground">
                            {DAY_SHORT[parsed.getDay()]}
                          </span>
                          <span className="block font-mono text-sm font-semibold">
                            {parsed.getDate()}
                          </span>
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {MONTH_LONG[parsed.getMonth()]?.slice(0, 3)}
                            {isToday ? " · ini" : ""}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees
                    .filter((employee) => positionMatches(employee.id))
                    .map((employee) => (
                      <tr key={employee.id} className="group">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-r border-b border-border bg-card px-4 py-2 text-left align-middle font-normal"
                        >
                          <span className="block truncate text-sm font-medium">
                            {employee.fullName}
                          </span>
                          <span className="block font-mono text-[11px] text-muted-foreground">
                            {employee.nik}
                          </span>
                        </th>
                        {dates.map((date) => {
                          const row = scheduleMap.get(`${employee.id}|${date}`);
                          const isToday = date === today;
                          const color = row
                            ? shiftColor.get(row.shiftId)
                            : null;
                          return (
                            <td
                              key={date}
                              className={`border-b border-border p-1 align-top ${
                                isToday ? "bg-primary-quiet/40" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => openCell(employee, date)}
                                aria-label={`${employee.fullName}, ${DAY_LONG[parseIso(date).getDay()]} ${date}${row ? `, shift ${row.shiftName}` : ", libur atau belum dijadwalkan"}`}
                                className={
                                  (row
                                    ? "flex min-h-14 w-full flex-col justify-center rounded-md border border-black/5 px-2 py-1.5 text-left transition-transform hover:scale-[1.02]"
                                    : "flex min-h-14 w-full flex-col items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground") +
                                  (filterShift !== "" &&
                                  row &&
                                  row.shiftId !== filterShift
                                    ? " opacity-30"
                                    : "")
                                }
                                style={
                                  row
                                    ? {
                                        background: color?.bg ?? "#F0F1E8",
                                        boxShadow: `inset 3px 0 0 0 ${color?.rail ?? "#B8BAAE"}`,
                                      }
                                    : undefined
                                }
                              >
                                {row ? (
                                  <>
                                    <span className="w-full truncate text-[11px] leading-tight font-semibold">
                                      {row.shiftName}
                                    </span>
                                    <span className="font-mono text-[10px] leading-tight text-black/60">
                                      {row.startTime.slice(0, 5)}–
                                      {row.endTime.slice(0, 5)}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Plus
                                      className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                                      aria-hidden="true"
                                    />
                                    <span className="text-[10px] leading-tight">
                                      Libur
                                    </span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Atur shift ${target.employeeName}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {target.existing ? "Ubah jadwal" : "Tambah jadwal"}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {target.employeeName} ·{" "}
                  {`${DAY_LONG[parseIso(target.date).getDay()]}, ${target.date}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup"
                disabled={busy}
                onClick={() => setTarget(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            {(shifts.length === 0 || locations.length === 0) && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
              >
                {shifts.length === 0
                  ? "Belum ada shift. Tambahkan dulu lewat bagian “Kelola shift”."
                  : "Belum ada lokasi kerja. Atur dulu lewat menu Lokasi & Radius."}
              </p>
            )}

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Shift</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={formShift}
                  onChange={(event) => setFormShift(event.target.value)}
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
                <span className="font-medium">Catatan (opsional)</span>
                <input
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={formNote}
                  onChange={(event) => setFormNote(event.target.value)}
                  placeholder="Contoh: gantikan shift Sari"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                className="flex-1"
                disabled={busy || !formShift || !primaryLocationId}
                onClick={() => void saveCell()}
              >
                {busy ? "Menyimpan…" : "Simpan jadwal"}
              </Button>
              {target.existing && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void removeCell()}
                  aria-label="Hapus jadwal"
                >
                  <Trash2 aria-hidden="true" />
                  Hapus
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setTarget(null)}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
