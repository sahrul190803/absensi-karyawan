"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IzinCutiView } from "../izin-cuti/izin-cuti-view";
import { formatDate } from "@/lib/format";

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

type EmployeeRow = {
  id: string;
  fullName: string;
  positionId: string | null;
};

type Position = { id: string; name: string };

const isoToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const monthRange = () => {
  const today = isoToday();
  const [year, month] = today.split("-");
  const last = new Date(Date.UTC(Number(year), Number(month), 0))
    .toISOString()
    .slice(0, 10);
  return { from: `${year}-${month}-01`, to: last };
};

const DAY_LONG = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export function AttendantView() {
  const [from, setFrom] = useState(() => monthRange().from);
  const [to, setTo] = useState(() => monthRange().to);
  const [positionFilter, setPositionFilter] = useState("");
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = useCallback(async (nextFrom: string, nextTo: string) => {
    const collected: ScheduleRow[] = [];
    let offset = 0;
    for (;;) {
      const response = await fetch(
        `/api/admin/schedules?from=${nextFrom}&to=${nextTo}&limit=200&offset=${offset}`,
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
      const [scheduleRows, employeeResponse, positionResponse] =
        await Promise.all([
          loadSchedules(from, to),
          fetch("/api/employees?limit=200", { cache: "no-store" }),
          fetch("/api/positions?limit=200", { cache: "no-store" }),
        ]);
      const employeeBody = await employeeResponse.json();
      const positionBody = await positionResponse.json();
      setRows(scheduleRows);
      if (employeeResponse.ok) setEmployees(employeeBody.data ?? []);
      if (positionResponse.ok) setPositions(positionBody.data ?? []);
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
  }, [from, to, loadSchedules]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const positionByEmployee = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const employee of employees) map.set(employee.id, employee.positionId);
    return map;
  }, [employees]);

  const filteredRows = useMemo(
    () =>
      positionFilter
        ? rows.filter(
            (row) => positionByEmployee.get(row.employeeId) === positionFilter,
          )
        : rows,
    [rows, positionFilter, positionByEmployee],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleRow[]>>();
    for (const row of filteredRows) {
      const shiftKey = row.shiftId || row.shiftName;
      const day = map.get(row.date) ?? new Map<string, ScheduleRow[]>();
      const list = day.get(shiftKey) ?? [];
      list.push(row);
      day.set(shiftKey, list);
      map.set(row.date, day);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, shiftMap]) => ({
        date,
        shifts: [...shiftMap.entries()]
          .map(([shiftId, items]) => ({
            shiftId,
            shiftName: items[0].shiftName,
            startTime: items[0].startTime,
            endTime: items[0].endTime,
            items: items.sort((a, b) =>
              a.employeeName.localeCompare(b.employeeName),
            ),
          }))
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [filteredRows]);

  const requestTypes = [
    "permission",
    "sick",
    "leave",
    "business_trip",
    "shift_swap",
  ];

  return (
    <div className="space-y-8">
      <section aria-labelledby="attendant-view-jadwal" className="space-y-4">
        <div>
          <h2
            id="attendant-view-jadwal"
            className="text-lg font-semibold tracking-tight"
          >
            Hasil Jadwal Kerja
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jadwal yang sudah dibuat dari tab Create, dipisah per tanggal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Dari
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Sampai
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Jabatan
            <select
              value={positionFilter}
              onChange={(event) => setPositionFilter(event.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            >
              <option value="">Semua jabatan</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw aria-hidden="true" />
            Muat ulang
          </Button>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {filteredRows.length} jadwal
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="rounded-lg border bg-card">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Memuat jadwal…
            </p>
          ) : grouped.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <CalendarDays
                className="mx-auto size-7 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada jadwal pada periode ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {grouped.map((group) => (
                <div key={group.date} className="p-4">
                  <p className="text-sm font-semibold">
                    {DAY_LONG[new Date(`${group.date}T00:00:00`).getDay()]},{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDate(group.date, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                  <div className="mt-2 space-y-3">
                    {group.shifts.map((shift) => (
                      <div
                        key={shift.shiftId}
                        className="overflow-hidden rounded-md border border-border"
                      >
                        <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted px-3 py-2">
                          <span className="text-sm font-semibold">
                            {shift.shiftName}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {shift.startTime.slice(0, 5)}-
                            {shift.endTime.slice(0, 5)}
                          </span>
                          <span className="ml-auto font-mono text-xs text-muted-foreground">
                            {shift.items.length} orang
                          </span>
                        </header>
                        <ul className="divide-y divide-border">
                          {shift.items.map((row) => (
                            <li
                              key={row.id}
                              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                            >
                              <span className="font-medium">
                                {row.employeeName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {row.locationName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="attendant-view-request" className="space-y-4">
        <div>
          <h2
            id="attendant-view-request"
            className="text-lg font-semibold tracking-tight"
          >
            Hasil Pengajuan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Semua pengajuan izin, sakit, cuti, dinas luar, dan tukar shift
            beserta statusnya.
          </p>
        </div>
        <IzinCutiView readOnly allowedTypes={requestTypes} />
      </section>
    </div>
  );
}
