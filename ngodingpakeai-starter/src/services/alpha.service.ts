import "server-only";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  auditLogs,
  companies,
  employees,
  holidays,
  requests,
  shifts,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";

const toMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
};

const dateInTimezone = (timeZone: string, value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const minutesInTimezone = (timeZone: string, value: Date) => {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
  const [hours, minutes] = formatted.split(":").map(Number);
  return hours * 60 + minutes;
};

const ALPHA_EXCUSED_TYPES = [
  "permission",
  "sick",
  "leave",
  "business_trip",
] as const;

export async function cancelAlphaForRange(
  requestUserId: string,
  startDate: string,
  endDate: string,
  actorId: string,
  reason: string,
) {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, requestUserId))
    .limit(1);
  if (!employee) return { cancelled: 0, attendanceIds: [] as string[] };

  const removed = await db
    .delete(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate),
        eq(attendanceRecords.status, "alpha"),
      ),
    )
    .returning({ id: attendanceRecords.id, date: attendanceRecords.date });

  if (removed.length > 0) {
    await db.insert(auditLogs).values(
      removed.map((row) => ({
        userId: actorId,
        action: "alpha-cancel",
        entity: "attendance_records",
        entityId: row.id,
        oldValue: { date: row.date, status: "alpha", reason },
        newValue: { status: null, reason },
      })),
    );
  }
  return {
    cancelled: removed.length,
    attendanceIds: removed.map((row) => row.id),
  };
}

export async function assignAlphaForDate(targetDate?: string) {
  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .limit(1);
  const timezone = company?.timezone ?? "Asia/Jakarta";
  const today = dateInTimezone(timezone, new Date());
  const date = targetDate ?? today;
  if (date > today)
    throw new ApiError(
      422,
      "FUTURE_DATE",
      "Alpha tidak dapat ditetapkan untuk tanggal yang belum berjalan.",
    );

  const [holiday] = await db
    .select({ id: holidays.id, allowWork: holidays.allowWork })
    .from(holidays)
    .where(and(eq(holidays.date, date), eq(holidays.active, true)))
    .limit(1);
  if (holiday && !holiday.allowWork)
    return { date, assigned: 0, skipped: "HOLIDAY" };

  const scheduled = await db
    .select({
      employeeId: workSchedules.employeeId,
      userId: employees.userId,
      scheduleId: workSchedules.id,
      locationId: workSchedules.workLocationId,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      toleranceMinutes: shifts.toleranceMinutes,
      crossesMidnight: shifts.crossesMidnight,
    })
    .from(workSchedules)
    .innerJoin(employees, eq(employees.id, workSchedules.employeeId))
    .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .where(
      and(eq(workSchedules.date, date), eq(employees.employmentStatus, "active")),
    );
  if (scheduled.length === 0) return { date, assigned: 0, skipped: "NO_SCHEDULE" };

  const employeeIds = scheduled.map((row) => row.employeeId);
  const present = await db
    .select({ employeeId: attendanceRecords.employeeId })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.date, date),
        inArray(attendanceRecords.employeeId, employeeIds),
      ),
    );
  const presentIds = new Set(present.map((row) => row.employeeId));

  const userIds = [...new Set(scheduled.map((row) => row.userId))];
  const excused = await db
    .select({ userId: requests.userId })
    .from(requests)
    .where(
      and(
        eq(requests.status, "approved"),
        inArray(requests.type, [...ALPHA_EXCUSED_TYPES]),
        lte(requests.startDate, date),
        or(isNull(requests.endDate), gte(requests.endDate, date)),
        inArray(requests.userId, userIds),
      ),
    );
  const excusedIds = new Set(excused.map((row) => row.userId));

  const now = new Date();
  const nowMinutes = minutesInTimezone(timezone, now);
  const isToday = date === today;

  const candidates = scheduled.filter((row) => {
    if (presentIds.has(row.employeeId)) return false;
    if (excusedIds.has(row.userId)) return false;
    if (!isToday) return true;
    const endAbsolute =
      (row.crossesMidnight ? 1440 : 0) + toMinutes(row.endTime);
    return nowMinutes >= endAbsolute + row.toleranceMinutes;
  });

  if (candidates.length === 0) return { date, assigned: 0, skipped: null };

  const inserted = await db
    .insert(attendanceRecords)
    .values(
      candidates.map((row) => ({
        employeeId: row.employeeId,
        workScheduleId: row.scheduleId,
        workLocationId: row.locationId,
        date,
        status: "alpha",
      })),
    )
    .onConflictDoNothing({
      target: [attendanceRecords.employeeId, attendanceRecords.date],
    })
    .returning({ id: attendanceRecords.id, employeeId: attendanceRecords.employeeId });

  if (inserted.length > 0) {
    await db.insert(auditLogs).values(
      inserted.map((row) => ({
        userId: null,
        action: "alpha-assign",
        entity: "attendance_records",
        entityId: row.id,
        newValue: { date, status: "alpha", employeeId: row.employeeId },
      })),
    );
  }

  return { date, assigned: inserted.length, skipped: null };
}
