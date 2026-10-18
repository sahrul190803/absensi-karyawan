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
  const pad = (value: number) => String(value).padStart(2, "0");
  const period =
    query.period ?? (query.date ? "day" : query.year ? "year" : "month");

  let from: string;
  let to: string;
  let label: string;

  if (period === "day") {
    const date =
      query.date ??
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    from = date;
    to = date;
    label = date;
  } else if (period === "year") {
    const year = query.year ?? now.getFullYear();
    from = `${year}-01-01`;
    to = `${year}-12-31`;
    label = String(year);
  } else {
    const month =
      query.month ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    from = `${month}-01`;
    to = `${month}-31`;
    label = month;
  }

  const employeeConditions: SQL[] = [];
  if (query.departmentId) {
    employeeConditions.push(eq(employees.departmentId, query.departmentId));
  }
  if (query.positionId) {
    employeeConditions.push(eq(employees.positionId, query.positionId));
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

  return { data, meta: { period, label, from, to, totals } };
}
