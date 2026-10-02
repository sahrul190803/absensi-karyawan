import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  attendancePhotos,
  attendanceRecords,
  auditLogs,
  companies,
  employees,
  holidays,
  shifts,
  workLocations,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { haversineDistanceMeters } from "@/lib/geo";
import type {
  AttendanceHistoryInput,
  AttendancePingInput,
} from "@/validators/attendance";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const recordFields = {
  id: attendanceRecords.id,
  date: attendanceRecords.date,
  checkInTime: attendanceRecords.checkInTime,
  checkOutTime: attendanceRecords.checkOutTime,
  checkInPhotoId: attendanceRecords.checkInPhotoId,
  checkOutPhotoId: attendanceRecords.checkOutPhotoId,
  checkInLatitude: attendanceRecords.checkInLatitude,
  checkInLongitude: attendanceRecords.checkInLongitude,
  checkInAccuracy: attendanceRecords.checkInAccuracy,
  checkInDistance: attendanceRecords.checkInDistance,
  checkOutLatitude: attendanceRecords.checkOutLatitude,
  checkOutLongitude: attendanceRecords.checkOutLongitude,
  checkOutAccuracy: attendanceRecords.checkOutAccuracy,
  checkOutDistance: attendanceRecords.checkOutDistance,
  status: attendanceRecords.status,
  notes: attendanceRecords.notes,
  createdAt: attendanceRecords.createdAt,
  updatedAt: attendanceRecords.updatedAt,
};

const toMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
};

const todayInTimezone = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const minutesInTimezone = (timeZone: string, date: Date) => {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const [hours, minutes] = formatted.split(":").map(Number);
  return hours * 60 + minutes;
};

const getConfig = async () => {
  const [config] = await db.select().from(companies).limit(1);
  return {
    timezone: config?.timezone ?? "Asia/Jakarta",
    accuracyLimitM: config?.gpsAccuracyLimitM ?? 50,
  };
};

const requireEmployee = async (userId: string) => {
  const [employee] = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      employmentStatus: employees.employmentStatus,
    })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);
  if (!employee)
    throw new ApiError(
      404,
      "NOT_EMPLOYEE",
      "Akun ini belum terhubung ke data karyawan.",
    );
  if (employee.employmentStatus !== "active")
    throw new ApiError(403, "ACCOUNT_INACTIVE", "Akun karyawan tidak aktif.");
  return employee;
};

const getSchedule = async (employeeId: string, date: string) => {
  const [schedule] = await db
    .select({
      id: workSchedules.id,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      toleranceMinutes: shifts.toleranceMinutes,
      crossesMidnight: shifts.crossesMidnight,
      locationId: workLocations.id,
      locationName: workLocations.name,
      radiusM: workLocations.radiusM,
      locationLat: workLocations.latitude,
      locationLng: workLocations.longitude,
    })
    .from(workSchedules)
    .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .innerJoin(workLocations, eq(workLocations.id, workSchedules.workLocationId))
    .where(
      and(
        eq(workSchedules.employeeId, employeeId),
        eq(workSchedules.date, date),
      ),
    )
    .limit(1);
  return schedule;
};

const storePhoto = async (dataUrl: string, name: string) => {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  if (!match)
    throw new ApiError(422, "INVALID_PHOTO", "Foto harus berformat JPEG atau PNG.");
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_PHOTO_BYTES)
    throw new ApiError(422, "PHOTO_TOO_LARGE", "Ukuran foto melebihi 3 MB.");
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const directory = resolve(process.cwd(), "storage", "attendance-photos");
  await mkdir(directory, { recursive: true });
  const storageKey = `${name}.${extension}`;
  await writeFile(resolve(directory, storageKey), buffer);
  return { storageKey, mimeType, fileSize: buffer.byteLength };
};

const writeAudit = async (
  userId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
) => {
  await db.insert(auditLogs).values({
    userId,
    action,
    entity: "attendance_records",
    entityId,
    newValue: payload,
  });
};

const validateGeofence = (
  input: AttendancePingInput,
  schedule: NonNullable<Awaited<ReturnType<typeof getSchedule>>>,
  accuracyLimitM: number,
) => {
  if (input.accuracy > accuracyLimitM)
    throw new ApiError(
      422,
      "GPS_ACCURACY",
      `Lokasi belum cukup akurat (${Math.round(input.accuracy)} m, batas ${accuracyLimitM} m).`,
    );
  const distance = haversineDistanceMeters(
    input.latitude,
    input.longitude,
    schedule.locationLat,
    schedule.locationLng,
  );
  if (distance > schedule.radiusM)
    throw new ApiError(
      422,
      "OUTSIDE_GEOFENCE",
      `Anda berada di luar area kerja (${Math.round(distance)} m dari ${schedule.locationName}).`,
    );
  return Math.round(distance * 100) / 100;
};

export async function getToday(userId: string) {
  const employee = await requireEmployee(userId);
  const { timezone } = await getConfig();
  const date = todayInTimezone(timezone);
  const [record] = await db
    .select(recordFields)
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        eq(attendanceRecords.date, date),
      ),
    )
    .limit(1);
  const schedule = await getSchedule(employee.id, date);
  return { employee, date, record: record ?? null, schedule: schedule ?? null };
}

export async function checkIn(userId: string, input: AttendancePingInput) {
  const employee = await requireEmployee(userId);
  const { timezone, accuracyLimitM } = await getConfig();
  const date = todayInTimezone(timezone);

  const [holiday] = await db
    .select()
    .from(holidays)
    .where(and(eq(holidays.date, date), eq(holidays.active, true)))
    .limit(1);
  if (holiday && !holiday.allowWork)
    throw new ApiError(409, "HOLIDAY", `Hari ini libur: ${holiday.name}.`);

  const schedule = await getSchedule(employee.id, date);
  if (!schedule)
    throw new ApiError(409, "NO_SCHEDULE", "Tidak ada jadwal kerja hari ini.");

  const [existing] = await db
    .select({ id: attendanceRecords.id })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        eq(attendanceRecords.date, date),
      ),
    )
    .limit(1);
  if (existing)
    throw new ApiError(409, "DUPLICATE_CHECKIN", "Anda sudah melakukan absensi masuk.");

  const distance = validateGeofence(input, schedule, accuracyLimitM);

  const now = new Date();
  const nowMinutes = minutesInTimezone(timezone, now);
  const late =
    nowMinutes - toMinutes(schedule.startTime) > schedule.toleranceMinutes;
  const status = late ? "late" : "present";

  const [record] = await db
    .insert(attendanceRecords)
    .values({
      employeeId: employee.id,
      workScheduleId: schedule.id,
      workLocationId: schedule.locationId,
      date,
      checkInTime: now,
      checkInLatitude: input.latitude,
      checkInLongitude: input.longitude,
      checkInAccuracy: input.accuracy,
      checkInDistance: distance,
      status,
    })
    .returning(recordFields);

  const stored = await storePhoto(input.photo, `${record.id}-check-in`);
  const [photo] = await db
    .insert(attendancePhotos)
    .values({
      attendanceId: record.id,
      type: "check_in",
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      capturedAt: now,
    })
    .returning({ id: attendancePhotos.id });

  const [updated] = await db
    .update(attendanceRecords)
    .set({ checkInPhotoId: photo.id })
    .where(eq(attendanceRecords.id, record.id))
    .returning(recordFields);

  await writeAudit(userId, "check-in", record.id, {
    date,
    status,
    distance,
    accuracy: input.accuracy,
    location: schedule.locationName,
  });

  return updated;
}

export async function checkOut(userId: string, input: AttendancePingInput) {
  const employee = await requireEmployee(userId);
  const { timezone, accuracyLimitM } = await getConfig();
  const date = todayInTimezone(timezone);

  const [record] = await db
    .select(recordFields)
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        eq(attendanceRecords.date, date),
      ),
    )
    .limit(1);
  if (!record || !record.checkInTime)
    throw new ApiError(409, "NO_CHECKIN", "Belum ada absensi masuk hari ini.");
  if (record.checkOutTime)
    throw new ApiError(409, "DUPLICATE_CHECKOUT", "Anda sudah melakukan absensi pulang.");

  const schedule = await getSchedule(employee.id, date);
  if (!schedule)
    throw new ApiError(409, "NO_SCHEDULE", "Tidak ada jadwal kerja hari ini.");

  const distance = validateGeofence(input, schedule, accuracyLimitM);

  const now = new Date();
  const nowMinutes = minutesInTimezone(timezone, now);
  const early = nowMinutes < toMinutes(schedule.endTime);
  const status = early ? "early_leave" : record.status;

  const stored = await storePhoto(input.photo, `${record.id}-check-out`);
  const [photo] = await db
    .insert(attendancePhotos)
    .values({
      attendanceId: record.id,
      type: "check_out",
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      capturedAt: now,
    })
    .returning({ id: attendancePhotos.id });

  const [updated] = await db
    .update(attendanceRecords)
    .set({
      checkOutTime: now,
      checkOutLatitude: input.latitude,
      checkOutLongitude: input.longitude,
      checkOutAccuracy: input.accuracy,
      checkOutDistance: distance,
      checkOutPhotoId: photo.id,
      status,
    })
    .where(eq(attendanceRecords.id, record.id))
    .returning(recordFields);

  await writeAudit(userId, "check-out", record.id, {
    date,
    status,
    distance,
    accuracy: input.accuracy,
    location: schedule.locationName,
  });

  return updated;
}

export async function listHistory(
  userId: string,
  query: AttendanceHistoryInput,
) {
  const employee = await requireEmployee(userId);
  const conditions = [eq(attendanceRecords.employeeId, employee.id)];
  if (query.from) conditions.push(gte(attendanceRecords.date, query.from));
  if (query.to) conditions.push(lte(attendanceRecords.date, query.to));

  const rows = await db
    .select(recordFields)
    .from(attendanceRecords)
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.date))
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
