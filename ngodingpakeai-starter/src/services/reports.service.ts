import "server-only";
import { and, asc, eq, gte, isNull, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  departments,
  employees,
  requests,
} from "@/db/schema";
import type { ReportQueryInput } from "@/validators/reports";

type Bucket = {
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
  lemburJam: number;
};

const emptyBucket = (): Bucket => ({
  hadir: 0,
  terlambat: 0,
  pulangCepat: 0,
  alpha: 0,
  lemburJam: 0,
});

const overtimeHours = (startTime: string | null, endTime: string | null) => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 1440;
  return Math.round((minutes / 60) * 100) / 100;
};

export async function getAttendanceReport(query: ReportQueryInput) {
  const now = new Date();
  const month =
    query.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const from = `${month}-01`;
  const to = `${month}-31`;

  const employeeConditions: SQL[] = [];
  if (query.departmentId) {
    employeeConditions.push(eq(employees.departmentId, query.departmentId));
  }

  const staff = await db
    .select({
      id: employees.id,
      userId: employees.userId,
      fullName: employees.fullName,
      nik: employees.nik,
      departmentName: departments.name,
    })
    .from(employees)
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .where(
      employeeConditions.length > 0
        ? and(...employeeConditions)
        : undefined,
    )
    .orderBy(asc(employees.fullName));

  const records = await db
    .select({
      employeeId: attendanceRecords.employeeId,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .where(
      and(
        gte(attendanceRecords.date, from),
        lte(attendanceRecords.date, to),
      ),
    );

  const counts = new Map<string, Bucket>();
  for (const record of records) {
    const bucket = counts.get(record.employeeId) ?? emptyBucket();
    if (record.status === "present" || record.status === "holiday_work") {
      bucket.hadir += 1;
    } else if (record.status === "late") {
      bucket.terlambat += 1;
    } else if (record.status === "early_leave") {
      bucket.pulangCepat += 1;
    } else if (record.status === "alpha") {
      bucket.alpha += 1;
    }
    counts.set(record.employeeId, bucket);
  }

  const overtimeRows = await db
    .select({
      userId: requests.userId,
      startTime: requests.startTime,
      endTime: requests.endTime,
    })
    .from(requests)
    .where(
      and(
        eq(requests.type, "overtime"),
        eq(requests.status, "approved"),
        lte(requests.startDate, to),
        or(isNull(requests.endDate), gte(requests.endDate, from)),
      ),
    );
  const overtimeByUser = new Map<string, number>();
  for (const row of overtimeRows) {
    overtimeByUser.set(
      row.userId,
      (overtimeByUser.get(row.userId) ?? 0) +
        overtimeHours(row.startTime, row.endTime),
    );
  }

  const data = staff.map((person) => ({
    ...person,
    ...(counts.get(person.id) ?? emptyBucket()),
    lemburJam:
      Math.round((overtimeByUser.get(person.userId) ?? 0) * 100) / 100,
  }));

  const totals = data.reduce(
    (acc, row) => ({
      hadir: acc.hadir + row.hadir,
      terlambat: acc.terlambat + row.terlambat,
      pulangCepat: acc.pulangCepat + row.pulangCepat,
      alpha: acc.alpha + row.alpha,
      lemburJam: Math.round((acc.lemburJam + row.lemburJam) * 100) / 100,
    }),
    emptyBucket(),
  );

  return { data, meta: { month, from, to, totals } };
}
