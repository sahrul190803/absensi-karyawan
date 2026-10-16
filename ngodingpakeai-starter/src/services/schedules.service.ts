import "server-only";
import { and, asc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  companies,
  employees,
  shifts,
  workLocations,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type {
  ScheduleCreateInput,
  ScheduleListInput,
  ScheduleRangeInput,
  ScheduleUpdateInput,
} from "@/validators/schedules";

const DAY_MS = 86_400_000;

const dateInTimezone = (timeZone: string, date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export async function listOwnSchedule(
  userId: string,
  query: ScheduleRangeInput,
) {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);
  if (!employee)
    throw new ApiError(
      404,
      "NOT_EMPLOYEE",
      "Akun ini belum terhubung ke data karyawan.",
    );

  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .limit(1);
  const timeZone = company?.timezone ?? "Asia/Jakarta";

  const now = new Date();
  const from = query.from ?? dateInTimezone(timeZone, now);
  const to =
    query.to ?? dateInTimezone(timeZone, new Date(now.getTime() + 13 * DAY_MS));

  const rows = await db
    .select({
      id: workSchedules.id,
      date: workSchedules.date,
      note: workSchedules.note,
      shiftName: shifts.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      toleranceMinutes: shifts.toleranceMinutes,
      crossesMidnight: shifts.crossesMidnight,
      locationName: workLocations.name,
      radiusM: workLocations.radiusM,
    })
    .from(workSchedules)
    .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .innerJoin(workLocations, eq(workLocations.id, workSchedules.workLocationId))
    .where(
      and(
        eq(workSchedules.employeeId, employee.id),
        gte(workSchedules.date, from),
        lte(workSchedules.date, to),
      ),
    )
    .orderBy(asc(workSchedules.date));

  return { data: rows, meta: { from, to } };
}

const scheduleRowFields = {
  id: workSchedules.id,
  employeeId: workSchedules.employeeId,
  employeeName: employees.fullName,
  date: workSchedules.date,
  note: workSchedules.note,
  shiftId: workSchedules.shiftId,
  shiftName: shifts.name,
  startTime: shifts.startTime,
  endTime: shifts.endTime,
  toleranceMinutes: shifts.toleranceMinutes,
  crossesMidnight: shifts.crossesMidnight,
  workLocationId: workSchedules.workLocationId,
  locationName: workLocations.name,
  allowedLocationIds: workSchedules.allowedLocationIds,
};

const getScheduleRow = async (id: string) => {
  const [row] = await db
    .select(scheduleRowFields)
    .from(workSchedules)
    .innerJoin(employees, eq(employees.id, workSchedules.employeeId))
    .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .innerJoin(workLocations, eq(workLocations.id, workSchedules.workLocationId))
    .where(eq(workSchedules.id, id))
    .limit(1);
  return row;
};

const assertReferences = async (
  input: Pick<
    ScheduleCreateInput,
    "employeeId" | "shiftId" | "workLocationId" | "allowedLocationIds"
  >,
) => {
  const [employee] = await db
    .select({ id: employees.id, status: employees.employmentStatus })
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1);
  if (!employee)
    throw new ApiError(404, "NOT_FOUND", "Karyawan tidak ditemukan.");
  const [shift] = await db
    .select({ id: shifts.id, active: shifts.active })
    .from(shifts)
    .where(eq(shifts.id, input.shiftId))
    .limit(1);
  if (!shift) throw new ApiError(404, "NOT_FOUND", "Shift tidak ditemukan.");
  const [location] = await db
    .select({ id: workLocations.id, active: workLocations.active })
    .from(workLocations)
    .where(eq(workLocations.id, input.workLocationId))
    .limit(1);
  if (!location)
    throw new ApiError(404, "NOT_FOUND", "Lokasi kerja tidak ditemukan.");
  if (input.allowedLocationIds && input.allowedLocationIds.length > 0) {
    const allowed = await db
      .select({ id: workLocations.id })
      .from(workLocations)
      .where(inArray(workLocations.id, input.allowedLocationIds));
    if (allowed.length !== input.allowedLocationIds.length)
      throw new ApiError(
        404,
        "NOT_FOUND",
        "Salah satu lokasi tambahan tidak ditemukan.",
      );
  }
};

export async function listAnySchedules(query: ScheduleListInput) {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(workSchedules.date, query.from));
  if (query.to) conditions.push(lte(workSchedules.date, query.to));
  if (query.employeeId)
    conditions.push(eq(workSchedules.employeeId, query.employeeId));

  const rows = await db
    .select(scheduleRowFields)
    .from(workSchedules)
    .innerJoin(employees, eq(employees.id, workSchedules.employeeId))
    .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .innerJoin(workLocations, eq(workLocations.id, workSchedules.workLocationId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(workSchedules.date), asc(employees.fullName))
    .limit(query.limit + 1)
    .offset(query.offset);

  return {
    data: rows.slice(0, query.limit),
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}

export async function upsertAnySchedule(
  actorId: string,
  input: ScheduleCreateInput,
) {
  await assertReferences(input);
  const [row] = await db
    .insert(workSchedules)
    .values({
      employeeId: input.employeeId,
      date: input.date,
      shiftId: input.shiftId,
      workLocationId: input.workLocationId,
      allowedLocationIds: input.allowedLocationIds,
      note: input.note,
    })
    .onConflictDoUpdate({
      target: [workSchedules.employeeId, workSchedules.date],
      set: {
        shiftId: input.shiftId,
        workLocationId: input.workLocationId,
        allowedLocationIds: input.allowedLocationIds,
        note: input.note,
        updatedAt: new Date(),
      },
    })
    .returning({ id: workSchedules.id });
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "schedule-upsert",
    entity: "work_schedules",
    entityId: row.id,
    newValue: {
      employeeId: input.employeeId,
      date: input.date,
      shiftId: input.shiftId,
      workLocationId: input.workLocationId,
      allowedLocationIds: input.allowedLocationIds,
    },
  });
  return getScheduleRow(row.id);
}

export async function updateAnySchedule(
  actorId: string,
  id: string,
  input: ScheduleUpdateInput,
) {
  const existing = await getScheduleRow(id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Jadwal tidak ditemukan.");
  if (input.shiftId || input.workLocationId || input.allowedLocationIds) {
    await assertReferences({
      employeeId: existing.employeeId,
      shiftId: input.shiftId ?? existing.shiftId,
      workLocationId: input.workLocationId ?? existing.workLocationId,
      allowedLocationIds:
        input.allowedLocationIds ?? existing.allowedLocationIds ?? [],
    });
  }
  await db
    .update(workSchedules)
    .set({
      ...(input.date ? { date: input.date } : {}),
      ...(input.shiftId ? { shiftId: input.shiftId } : {}),
      ...(input.workLocationId ? { workLocationId: input.workLocationId } : {}),
      ...(input.allowedLocationIds !== undefined
        ? { allowedLocationIds: input.allowedLocationIds }
        : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    })
    .where(eq(workSchedules.id, id));
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "schedule-update",
    entity: "work_schedules",
    entityId: id,
    oldValue: {
      date: existing.date,
      shiftId: existing.shiftId,
      workLocationId: existing.workLocationId,
      note: existing.note,
    },
    newValue: input,
  });
  return getScheduleRow(id);
}

export async function deleteAnySchedule(actorId: string, id: string) {
  const existing = await getScheduleRow(id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Jadwal tidak ditemukan.");
  await db.delete(workSchedules).where(eq(workSchedules.id, id));
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "schedule-delete",
    entity: "work_schedules",
    entityId: id,
    oldValue: {
      employeeId: existing.employeeId,
      date: existing.date,
      shiftId: existing.shiftId,
      workLocationId: existing.workLocationId,
    },
  });
  return { id };
}
