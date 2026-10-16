import "server-only";
import {
  and,
  asc,
  eq,
  gte,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  employeeShifts,
  employees,
  holidays,
  shifts,
  workLocations,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { ListQueryInput } from "@/validators/common";
import type {
  EmployeeShiftCreateInput,
  EmployeeShiftUpdateInput,
} from "@/validators/employee-shifts";

const fields = {
  id: employeeShifts.id,
  employeeId: employeeShifts.employeeId,
  employeeName: employees.fullName,
  employeeNik: employees.nik,
  shiftId: employeeShifts.shiftId,
  shiftName: shifts.name,
  startTime: shifts.startTime,
  endTime: shifts.endTime,
  workLocationId: employeeShifts.workLocationId,
  locationName: workLocations.name,
  daysOfWeek: employeeShifts.daysOfWeek,
  startDate: employeeShifts.startDate,
  endDate: employeeShifts.endDate,
  active: employeeShifts.active,
};

export async function listAnyEmployeeShifts(
  { limit, offset }: ListQueryInput,
  filter?: { employeeId?: string },
) {
  const conditions: SQL[] = [];
  if (filter?.employeeId) {
    conditions.push(eq(employeeShifts.employeeId, filter.employeeId));
  }
  const rows = await db
    .select(fields)
    .from(employeeShifts)
    .innerJoin(employees, eq(employees.id, employeeShifts.employeeId))
    .innerJoin(shifts, eq(shifts.id, employeeShifts.shiftId))
    .innerJoin(workLocations, eq(workLocations.id, employeeShifts.workLocationId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(employees.fullName), asc(employeeShifts.startDate))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function createAnyEmployeeShift(
  actorId: string,
  input: EmployeeShiftCreateInput,
) {
  const [row] = await db
    .insert(employeeShifts)
    .values(input)
    .returning({ id: employeeShifts.id });
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "employee-shift-create",
    entity: "employee_shifts",
    entityId: row.id,
    newValue: input,
  });
  return row;
}

export async function updateAnyEmployeeShift(
  actorId: string,
  id: string,
  input: EmployeeShiftUpdateInput,
) {
  const [row] = await db
    .update(employeeShifts)
    .set(input)
    .where(eq(employeeShifts.id, id))
    .returning({ id: employeeShifts.id });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Penugasan tidak ditemukan.");
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "employee-shift-update",
    entity: "employee_shifts",
    entityId: id,
    newValue: input,
  });
  return row;
}

export async function deleteAnyEmployeeShift(actorId: string, id: string) {
  const [row] = await db
    .delete(employeeShifts)
    .where(eq(employeeShifts.id, id))
    .returning({ id: employeeShifts.id });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Penugasan tidak ditemukan.");
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "employee-shift-delete",
    entity: "employee_shifts",
    entityId: id,
  });
  return row;
}

export async function listActiveAssignmentsForDate(date: string) {
  return db
    .select({
      id: employeeShifts.id,
      employeeId: employeeShifts.employeeId,
      shiftId: employeeShifts.shiftId,
      workLocationId: employeeShifts.workLocationId,
      daysOfWeek: employeeShifts.daysOfWeek,
      startDate: employeeShifts.startDate,
      endDate: employeeShifts.endDate,
    })
    .from(employeeShifts)
    .where(
      and(
        eq(employeeShifts.active, true),
        lte(employeeShifts.startDate, date),
        or(isNull(employeeShifts.endDate), gte(employeeShifts.endDate, date)),
      ),
    );
}

// Kalender kerja: bangun work_schedules dari penugasan berulang untuk
// rentang tanggal. Hari libur non-working dilewati (tidak wajib absen).
export async function generateSchedulesFromAssignments(
  actorId: string,
  from: string,
  to: string,
) {
  if (from > to)
    throw new ApiError(
      422,
      "INVALID_RANGE",
      "Tanggal mulai tidak boleh melewati tanggal selesai.",
    );
  const days =
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  if (days > 92)
    throw new ApiError(422, "RANGE_TOO_LARGE", "Rentang maksimal 92 hari.");

  const assignments = await db
    .select({
      employeeId: employeeShifts.employeeId,
      shiftId: employeeShifts.shiftId,
      workLocationId: employeeShifts.workLocationId,
      daysOfWeek: employeeShifts.daysOfWeek,
      startDate: employeeShifts.startDate,
      endDate: employeeShifts.endDate,
    })
    .from(employeeShifts)
    .innerJoin(employees, eq(employees.id, employeeShifts.employeeId))
    .where(
      and(
        eq(employeeShifts.active, true),
        lte(employeeShifts.startDate, to),
        or(isNull(employeeShifts.endDate), gte(employeeShifts.endDate, from)),
      ),
    );

  const holidayRows = await db
    .select({ date: holidays.date, allowWork: holidays.allowWork })
    .from(holidays)
    .where(
      and(
        eq(holidays.active, true),
        gte(holidays.date, from),
        lte(holidays.date, to),
      ),
    );
  const nonWorkingDates = new Set(
    holidayRows.filter((row) => !row.allowWork).map((row) => row.date),
  );

  let upserted = 0;
  let skippedHoliday = 0;
  const cursor = new Date(`${from}T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) <= to) {
    const date = cursor.toISOString().slice(0, 10);
    const dayOfWeek = cursor.getUTCDay();
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (nonWorkingDates.has(date)) {
      skippedHoliday += 1;
      continue;
    }
    const rows = assignments
      .filter(
        (assignment) =>
          assignment.daysOfWeek.includes(dayOfWeek) &&
          assignment.startDate <= date &&
          (!assignment.endDate || assignment.endDate >= date),
      )
      .map((assignment) => ({
        employeeId: assignment.employeeId,
        date,
        shiftId: assignment.shiftId,
        workLocationId: assignment.workLocationId,
        note: "otomatis",
      }));
    if (rows.length === 0) continue;
    const inserted = await db
      .insert(workSchedules)
      .values(rows)
      .onConflictDoUpdate({
        target: [workSchedules.employeeId, workSchedules.date],
        set: {
          shiftId: sql`excluded.shift_id`,
          workLocationId: sql`excluded.work_location_id`,
          note: sql`excluded.note`,
        },
      })
      .returning({ id: workSchedules.id });
    upserted += inserted.length;
  }

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "schedules-generate",
    entity: "work_schedules",
    newValue: { from, to, upserted, skippedHoliday },
  });

  return { from, to, upserted, skippedHoliday };
}
