import "server-only";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  companies,
  employees,
  holidays,
  requests,
  shifts,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { notifyUser } from "@/services/notifications.service";

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

const EXCUSED_TYPES = ["permission", "sick", "leave", "business_trip"];

// Kirim reminder check-in/check-out untuk karyawan aktif yang wajib absen
// hari ini (punya jadwal, bukan hari libur non-working, tidak ada pengajuan
// disetujui). Dedupe per user per tanggal via dedupeKey.
export async function sendRemindersForDate(targetDate?: string) {
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
      "Reminder tidak dapat dikirim untuk tanggal yang belum berjalan.",
    );

  const [holiday] = await db
    .select({ id: holidays.id, allowWork: holidays.allowWork })
    .from(holidays)
    .where(and(eq(holidays.date, date), eq(holidays.active, true)))
    .limit(1);
  if (holiday && !holiday.allowWork)
    return { date, sent: 0, skipped: "HOLIDAY" };

  const scheduled = await db
    .select({
      employeeId: workSchedules.employeeId,
      userId: employees.userId,
      name: employees.fullName,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      crossesMidnight: shifts.crossesMidnight,
    })
    .from(workSchedules)
    .innerJoin(employees, eq(employees.id, workSchedules.employeeId))
    .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .where(
      and(eq(workSchedules.date, date), eq(employees.employmentStatus, "active")),
    );
  if (scheduled.length === 0) return { date, sent: 0, skipped: "NO_SCHEDULE" };

  const userIds = [...new Set(scheduled.map((row) => row.userId))];
  const excused = await db
    .select({ userId: requests.userId })
    .from(requests)
    .where(
      and(
        eq(requests.status, "approved"),
        inArray(requests.type, EXCUSED_TYPES),
        lte(requests.startDate, date),
        or(isNull(requests.endDate), gte(requests.endDate, date)),
        inArray(requests.userId, userIds),
      ),
    );
  const excusedIds = new Set(excused.map((row) => row.userId));

  const records = await db
    .select({
      employeeId: attendanceRecords.employeeId,
      checkInTime: attendanceRecords.checkInTime,
      checkOutTime: attendanceRecords.checkOutTime,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.date, date),
        inArray(
          attendanceRecords.employeeId,
          scheduled.map((row) => row.employeeId),
        ),
      ),
    );
  const recordByEmployee = new Map(
    records.map((row) => [row.employeeId, row]),
  );

  const now = new Date();
  const nowMinutes = minutesInTimezone(timezone, now);

  let sent = 0;
  for (const row of scheduled) {
    if (excusedIds.has(row.userId)) continue;
    const record = recordByEmployee.get(row.employeeId);

    if (!record || !record.checkInTime) {
      const startMinutes = toMinutes(row.startTime);
      if (nowMinutes < startMinutes - 60) continue;
      const { inApp } = await notifyUser(row.userId, {
        event: "reminder-check-in",
        type: "reminder",
        title: "Jangan lupa absen masuk",
        body: `Halo ${row.name}, jadwal kerjamu hari ini mulai pukul ${row.startTime}. Segera lakukan absen masuk.`,
        dedupeKey: `reminder-check-in:${row.userId}:${date}`,
      });
      if (inApp) sent += 1;
    } else if (record.checkInTime && !record.checkOutTime) {
      const endAbsolute =
        (row.crossesMidnight ? 1440 : 0) + toMinutes(row.endTime);
      if (nowMinutes < endAbsolute) continue;
      const { inApp } = await notifyUser(row.userId, {
        event: "reminder-check-out",
        type: "reminder",
        title: "Jangan lupa absen pulang",
        body: `Halo ${row.name}, jadwal kerjamu berakhir pukul ${row.endTime}. Segera lakukan absen pulang.`,
        dedupeKey: `reminder-check-out:${row.userId}:${date}`,
      });
      if (inApp) sent += 1;
    }
  }

  return { date, sent, skipped: null };
}
