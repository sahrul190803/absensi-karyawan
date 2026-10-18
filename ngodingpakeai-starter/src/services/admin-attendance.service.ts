import "server-only";
import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  companies,
  employees,
  shifts,
  workLocations,
  workSchedules,
} from "@/db/schema";
import type { AdminAttendanceListInput } from "@/validators/admin-attendance";

export async function listAnyAttendance(query: AdminAttendanceListInput) {
  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .limit(1);
  const timeZone = company?.timezone ?? "Asia/Jakarta";
  const date =
    query.date ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const conditions: SQL[] = [eq(attendanceRecords.date, date)];
  if (query.status) conditions.push(eq(attendanceRecords.status, query.status));

  const rows = await db
    .select({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      checkInTime: attendanceRecords.checkInTime,
      checkOutTime: attendanceRecords.checkOutTime,
      status: attendanceRecords.status,
      lateMinutes: attendanceRecords.lateMinutes,
      notes: attendanceRecords.notes,
      checkInDistance: attendanceRecords.checkInDistance,
      checkOutDistance: attendanceRecords.checkOutDistance,
      checkInPhotoId: attendanceRecords.checkInPhotoId,
      checkOutPhotoId: attendanceRecords.checkOutPhotoId,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      locationName: workLocations.name,
      shiftName: shifts.name,
      shiftStart: shifts.startTime,
      shiftEnd: shifts.endTime,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(employees.id, attendanceRecords.employeeId))
    .innerJoin(
      workLocations,
      eq(workLocations.id, attendanceRecords.workLocationId),
    )
    .leftJoin(
      workSchedules,
      eq(workSchedules.id, attendanceRecords.workScheduleId),
    )
    .leftJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .where(and(...conditions))
    .orderBy(asc(employees.fullName))
    .limit(query.limit + 1)
    .offset(query.offset);

  return {
    data: rows.slice(0, query.limit),
    meta: {
      date,
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}
