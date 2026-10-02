import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  employees,
  shifts,
  workLocations,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { ScheduleRangeInput } from "@/validators/schedules";

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
