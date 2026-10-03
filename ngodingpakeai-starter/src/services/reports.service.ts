import "server-only";
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRecords, departments, employees } from "@/db/schema";
import type { ReportQueryInput } from "@/validators/reports";

type Bucket = {
  hadir: number;
  terlambat: number;
  pulangCepat: number;
  alpha: number;
};

const emptyBucket = (): Bucket => ({
  hadir: 0,
  terlambat: 0,
  pulangCepat: 0,
  alpha: 0,
});

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

  const data = staff.map((person) => ({
    ...person,
    ...(counts.get(person.id) ?? emptyBucket()),
  }));

  const totals = data.reduce(
    (acc, row) => ({
      hadir: acc.hadir + row.hadir,
      terlambat: acc.terlambat + row.terlambat,
      pulangCepat: acc.pulangCepat + row.pulangCepat,
      alpha: acc.alpha + row.alpha,
    }),
    emptyBucket(),
  );

  return { data, meta: { month, from, to, totals } };
}
