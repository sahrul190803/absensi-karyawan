import "server-only";
import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  companies,
  employees,
  workLocations,
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
      checkInDistance: attendanceRecords.checkInDistance,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      locationName: workLocations.name,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(employees.id, attendanceRecords.employeeId))
    .innerJoin(
      workLocations,
      eq(workLocations.id, attendanceRecords.workLocationId),
    )
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
