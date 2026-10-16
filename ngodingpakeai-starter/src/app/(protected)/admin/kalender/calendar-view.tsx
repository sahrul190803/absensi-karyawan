"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { isoDate } from "@/lib/format";

type ScheduleRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  locationName: string;
};

type Shift = { id: string; name: string; startTime: string; endTime: string };
type Holiday = {
  id: string;
  date: string;
  name: string;
  allowWork: boolean;
  active: boolean;
};
type PayrollPeriod = {
  id: string;
  year: number;
  month: number;
  status: string;
};
type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  note: string;
};

const SHIFT_COLORS = [
  { bg: "#E3EEFF", rail: "#4C8DF6" },
  { bg: "#FDE7EC", rail: "#E4687F" },
  { bg: "#F4F8B8", rail: "#C9D61E" },
  { bg: "#FDF1DC", rail: "#E0B567" },
  { bg: "#E9F7EF", rail: "#7CC39C" },
  { bg: "#F1EAFB", rail: "#AF8FE0" },
];

const EVENT_META: Record<string, { label: string; bg: string; rail: string }> = {
  libur: { label: "Libur", bg: "#FDE7EC", rail: "#E4687F" },
  gajian: { label: "Gajian", bg: "#F4F8B8", rail: "#C9D61E" },
  agenda: { label: "Agenda", bg: "#EEF2F7", rail: "#64748B" },
};

const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
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
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const parseIso = (value: string) => new Date(`${value}T00:00:00`);
const toIso = (date: Date) => isoDate(date);

const DEFAULT_PAYDAY = 25;

export function CalendarView() {
  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [payday, setPayday] = useState(DEFAULT_PAYDAY);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<"agenda" | "libur" | "gajian">(
    "agenda",
  );
  const [eventNote, setEventNote] = useState("");
  const [eventBusy, setEventBusy] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const { data: sessionData } = authClient.useSession();
  const roleList = ((sessionData?.user as { role?: string } | undefined)?.role ?? "")
    .split(",")
    .map((role) => role.trim());
  const canManageCalendar =
    roleList.includes("hrd") || roleList.includes("admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { from: toIso(start), to: toIso(end) };
  }, [anchor]);

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
        shiftResponse,
        holidayResponse,
        periodResponse,
        eventResponse,
        settingsResponse,
      ] = await Promise.all([
        loadSchedules(range.from, range.to),
        fetch("/api/shifts?limit=100", { cache: "no-store" }),
        fetch("/api/holidays?limit=100", { cache: "no-store" }),
        fetch("/api/admin/payroll/periods", { cache: "no-store" }),
        fetch(
          `/api/admin/calendar-events?from=${range.from}&to=${range.to}&limit=200`,
          { cache: "no-store" },
        ),
        // HOD tidak punya akses pengaturan; fallback ke tanggal default.
        fetch("/api/admin/settings", { cache: "no-store" }),
      ]);
      const shiftBody = await shiftResponse.json();
      const holidayBody = await holidayResponse.json();
      const periodBody = await periodResponse.json();
      const eventBody = await eventResponse.json();
      setRows(scheduleRows);
      if (eventResponse.ok) setEvents(eventBody.data ?? []);
      if (shiftResponse.ok) setShifts(shiftBody.data ?? []);
      if (holidayResponse.ok) setHolidays(holidayBody.data ?? []);
      if (settingsResponse.ok) {
        const settingsBody = await settingsResponse.json();
        if (typeof settingsBody?.data?.payday === "number")
          setPayday(settingsBody.data.payday);
      }
      if (periodResponse.ok)
        setPeriods(
          (periodBody.data ?? []).map(
            (period: { id: string; year: number; month: number; status?: string }) => ({
              id: period.id,
              year: period.year,
              month: period.month,
              status: period.status ?? "draft",
            }),
          ),
        );
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

  const shiftColor = useMemo(() => {
    const map = new Map<string, { bg: string; rail: string }>();
    shifts.forEach((shift, index) => {
      map.set(shift.id, SHIFT_COLORS[index % SHIFT_COLORS.length]);
    });
    return map;
  }, [shifts]);

  const holidayByDate = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of holidays) {
      if (holiday.active) map.set(holiday.date, holiday);
    }
    return map;
  }, [holidays]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    const list: Date[] = [];
    for (let index = 0; index < 42; index += 1) {
      list.push(
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
      );
    }
    return list;
  }, [anchor]);

  const rowsByDate = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const row of rows) {
      const list = map.get(row.date) ?? [];
      list.push(row);
      map.set(row.date, list);
    }
    return map;
  }, [rows]);

  const monthPeriod = periods.find(
    (period) =>
      period.year === anchor.getFullYear() && period.month === anchor.getMonth() + 1,
  );

  const todayIso = isoDate(new Date());

  const shiftCountsForDate = (date: string) => {
    const dayRows = rowsByDate.get(date) ?? [];
    const counts = new Map<string, number>();
    for (const row of dayRows) {
      counts.set(row.shiftId, (counts.get(row.shiftId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([shiftId, count]) => ({
        shiftId,
        count,
        shift: shifts.find((item) => item.id === shiftId) ?? null,
      }))
      .sort((a, b) => (a.shift?.startTime ?? "").localeCompare(b.shift?.startTime ?? ""));
  };

  const monthSummary = useMemo(() => {
    const shiftDays = rowsByDate.size;
    const holidayCount = holidays.filter(
      (holiday) =>
        holiday.active &&
        holiday.date >= range.from &&
        holiday.date <= range.to,
    ).length;
    return { shiftDays, holidayCount };
  }, [rowsByDate, holidays, range]);

  const move = (step: number) => {
    setAnchor(
      (current) => new Date(current.getFullYear(), current.getMonth() + step, 1),
    );
  };

  const selectedCount = selectedDate
    ? (rowsByDate.get(selectedDate)?.length ?? 0)
    : 0;
  const selectedHoliday = selectedDate ? holidayByDate.get(selectedDate) : undefined;
  const selectedPayroll =
    selectedDate &&
    parseIso(selectedDate).getDate() === payday &&
    monthPeriod
      ? monthPeriod
      : undefined;

  const saveEvent = async () => {
    if (!selectedDate || !eventTitle.trim()) return;
    setEventBusy(true);
    setEventError(null);
    try {
      const payload = {
        title: eventTitle.trim(),
        type: eventType,
        date: selectedDate,
        note: eventNote.trim(),
      };
      const response = await fetch(
        editingEvent
          ? `/api/admin/calendar-events/${editingEvent.id}`
          : "/api/admin/calendar-events",
        {
          method: editingEvent ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setEventError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Agenda gagal disimpan.",
        );
        return;
      }
      setEventFormOpen(false);
      setEditingEvent(null);
      await load();
    } catch {
      setEventError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setEventBusy(false);
    }
  };

  const removeEvent = async (event: CalendarEvent) => {
    if (!window.confirm(`Hapus agenda "${event.title}"?`)) return;
    setEventBusy(true);
    setEventError(null);
    try {
      const response = await fetch(
        `/api/admin/calendar-events/${event.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setEventError(body?.error?.message ?? "Agenda gagal dihapus.");
        return;
      }
      await load();
    } catch {
      setEventError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setEventBusy(false);
    }
  };

  const selectedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : [];

  const selectedGroups = useMemo(() => {
    if (!selectedDate) return [];
    const groups = new Map<string, ScheduleRow[]>();
    for (const row of rowsByDate.get(selectedDate) ?? []) {
      const list = groups.get(row.shiftId) ?? [];
      list.push(row);
      groups.set(row.shiftId, list);
    }
    return [...groups.entries()].map(([shiftId, people]) => ({
      shiftId,
      shift: shifts.find((item) => item.id === shiftId) ?? null,
      people: people.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
    }));
  }, [selectedDate, rowsByDate, shifts]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Kalender
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jadwal shift per hari, hari libur, dan agenda gajian — dikelola HRD
            dan dipakai HOD.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
            <RefreshCw aria-hidden="true" />
            Muat ulang
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border-strong bg-card">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-l-md text-muted-foreground hover:text-foreground"
            onClick={() => move(-1)}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-44 px-2 text-center text-sm font-semibold">
            {MONTH_LONG[anchor.getMonth()]} {anchor.getFullYear()}
          </span>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
            onClick={() => move(1)}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAnchor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
          Hari ini
        </Button>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground">
          {monthSummary.shiftDays} hari ada shift · {monthSummary.holidayCount} hari libur
          {monthPeriod ? ` · periode gaji ${monthPeriod.status === "final" ? "final" : "draf"}` : ""}
        </span>
        <ul className="ml-auto flex flex-wrap gap-4">
          <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ background: "#4C8DF6" }}
            />
            Shift
          </li>
          <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ background: "#E4687F" }}
            />
            Libur
          </li>
          <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ background: "#C9D61E" }}
            />
            Gajian
          </li>
        </ul>
      </div>

      <section className="rounded-lg border bg-card p-2">
        <div className="grid grid-cols-7 pb-2" aria-hidden="true">
          {DAY_SHORT.map((day) => (
            <span
              key={day}
              className={cn(
                "px-2 py-1 text-center text-[11px] font-semibold tracking-wide uppercase",
                day === "Sab" || day === "Min"
                  ? "text-primary-text"
                  : "text-muted-foreground",
              )}
            >
              {day}
            </span>
          ))}
        </div>
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Memuat kalender…
          </p>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((date) => {
              const dateString = toIso(date);
              const outside = date.getMonth() !== anchor.getMonth();
              const weekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = dateString === todayIso;
              const holiday = holidayByDate.get(dateString);
              const counts = shiftCountsForDate(dateString);
              const isPayday =
                date.getDate() === payday &&
                monthPeriod !== undefined &&
                date.getMonth() === anchor.getMonth();
              return (
                <button
                  key={dateString}
                  type="button"
                  onClick={() => setSelectedDate(dateString)}
                  aria-label={`Lihat detail ${dateString}`}
                  className={cn(
                    "flex min-h-24 flex-col items-stretch gap-1 rounded-[10px] border border-border p-2 text-left transition-colors",
                    outside && "opacity-45",
                    weekend && !isToday && "bg-muted/40",
                    isToday && "border-border-strong bg-primary-quiet",
                    !isToday && "bg-card hover:border-border-strong",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full font-mono text-xs font-semibold",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {holiday && (
                    <span
                      className="truncate rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: "#FDE7EC", color: "#8C2E43" }}
                    >
                      {holiday.name}
                    </span>
                  )}
                  {counts.slice(0, 2).map(({ shiftId, count, shift }) => (
                    <span
                      key={shiftId}
                      className="flex items-center gap-1 truncate rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: shiftColor.get(shiftId)?.bg ?? "#E3EEFF" }}
                    >
                      <span
                        aria-hidden="true"
                        className="size-1.5 flex-none rounded-full"
                        style={{ background: shiftColor.get(shiftId)?.rail ?? "#4C8DF6" }}
                      />
                      <span className="truncate">
                        {(shift?.name ?? shiftId).slice(0, 9)} · {count}
                      </span>
                    </span>
                  ))}
                  {counts.length > 2 && (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      +{counts.length - 2} shift lain
                    </span>
                  )}
                  {isPayday && (
                    <span
                      className="truncate rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: "#F4F8B8", color: "#5B6210" }}
                    >
                      Gajian {MONTH_SHORT[date.getMonth()]}
                    </span>
                  )}
                  {(eventsByDate.get(dateString) ?? [])
                    .slice(0, 2)
                    .map((event) => {
                      const meta = EVENT_META[event.type] ?? EVENT_META.agenda;
                      return (
                        <span
                          key={event.id}
                          className="truncate rounded-[6px] border border-black/5 px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: meta.bg }}
                        >
                          {event.title}
                        </span>
                      );
                    })}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-muted-foreground">
        Sumber data: jadwal shift (halaman Jadwal Kerja), hari libur master,
        periode penggajian, dan agenda manual yang diatur HRD.
      </p>

      {selectedDate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail kalender ${selectedDate}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {parseIso(selectedDate).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedCount} orang terjadwal
                  {selectedHoliday ? ` · libur: ${selectedHoliday.name}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="grid size-8 flex-none place-items-center rounded-md border border-border text-muted-foreground"
                aria-label="Tutup detail"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {selectedHoliday && (
              <p
                className="mt-3 rounded-md px-3 py-2 text-sm font-semibold"
                style={{ background: "#FDE7EC", color: "#8C2E43" }}
              >
                Hari libur: {selectedHoliday.name}
                {selectedHoliday.allowWork ? " (izin kerja hari libur aktif)" : ""}
              </p>
            )}

            {selectedPayroll && (
              <p
                className="mt-3 rounded-md px-3 py-2 text-sm font-semibold"
                style={{ background: "#F4F8B8", color: "#5B6210" }}
              >
                Agenda gajian: periode {MONTH_LONG[selectedPayroll.month - 1]}{" "}
                {selectedPayroll.year} · status{" "}
                {selectedPayroll.status === "final" ? "final" : "draf"}
              </p>
            )}

            {(selectedEvents.length > 0 || canManageCalendar) && (
              <div className="mt-4 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Agenda HRD</h3>
                  {canManageCalendar && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setEditingEvent(null);
                        setEventTitle("");
                        setEventType("agenda");
                        setEventNote("");
                        setEventError(null);
                        setEventFormOpen(true);
                      }}
                    >
                      Tambah agenda
                    </Button>
                  )}
                </div>
                {selectedEvents.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Belum ada agenda manual pada tanggal ini.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {selectedEvents.map((event) => {
                      const meta = EVENT_META[event.type] ?? EVENT_META.agenda;
                      return (
                        <li
                          key={event.id}
                          className="flex flex-wrap items-center gap-2 text-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="size-2.5 flex-none rounded-full"
                            style={{ background: meta.rail }}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {event.title}
                          </span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {meta.label}
                          </span>
                          {canManageCalendar && (
                            <span className="flex gap-1">
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEvent(event);
                                  setEventTitle(event.title);
                                  setEventType(
                                    event.type as "agenda" | "libur" | "gajian",
                                  );
                                  setEventNote(event.note);
                                  setEventError(null);
                                  setEventFormOpen(true);
                                }}
                              >
                                Ubah
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => void removeEvent(event)}
                              >
                                Hapus
                              </Button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {eventError && (
                  <p role="alert" className="mt-2 text-xs text-danger">
                    {eventError}
                  </p>
                )}
                {eventFormOpen && (
                  <div className="mt-3 grid gap-2 border-t border-border pt-3">
                    <input
                      className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                      placeholder="Judul agenda"
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                    />
                    <select
                      className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
                      value={eventType}
                      onChange={(event) =>
                        setEventType(
                          event.target.value as "agenda" | "libur" | "gajian",
                        )
                      }
                      aria-label="Jenis agenda"
                    >
                      <option value="agenda">Agenda</option>
                      <option value="libur">Libur</option>
                      <option value="gajian">Gajian</option>
                    </select>
                    <input
                      className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                      placeholder="Catatan (opsional)"
                      value={eventNote}
                      onChange={(event) => setEventNote(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={eventBusy || !eventTitle.trim()}
                        onClick={() => void saveEvent()}
                      >
                        {eventBusy ? "Menyimpan…" : "Simpan agenda"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEventFormOpen(false)}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedGroups.length === 0 && !selectedHoliday ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Tidak ada shift terjadwal pada tanggal ini.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {selectedGroups.map((group) => (
                  <li
                    key={group.shiftId}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <div
                      className="flex items-center justify-between gap-2 px-3 py-2"
                      style={{ background: shiftColor.get(group.shiftId)?.bg ?? "#E3EEFF" }}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-full"
                          style={{
                            background: shiftColor.get(group.shiftId)?.rail ?? "#4C8DF6",
                          }}
                        />
                        {group.shift?.name ?? group.shiftId}
                      </span>
                      <span className="font-mono text-xs text-black/60">
                        {group.shift
                          ? `${group.shift.startTime.slice(0, 5)}–${group.shift.endTime.slice(0, 5)}`
                          : ""}{" "}
                        · {group.people.length} orang
                      </span>
                    </div>
                    <ul className="divide-y divide-border bg-card">
                      {group.people.map((person) => (
                        <li
                          key={person.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{person.employeeName}</span>
                          <span className="text-xs text-muted-foreground">
                            {person.locationName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setSelectedDate(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
