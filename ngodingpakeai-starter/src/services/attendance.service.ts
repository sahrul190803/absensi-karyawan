import "server-only";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
} from "drizzle-orm";
import { db } from "@/db";
import {
  attendancePhotos,
  attendanceRecords,
  auditLogs,
  companies,
  devices,
  employees,
  holidays,
  shifts,
  user,
  workLocations,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { getStoredFile, putStoredFile } from "@/lib/file-store";
import { haversineDistanceMeters } from "@/lib/geo";
import { ADMIN_ROLES, LOCATION_FREE_ROLES } from "@/lib/permissions";
import { notifyUserInBackground } from "@/services/notifications.service";
import type {
  AttendanceHistoryInput,
  AttendancePingInput,
} from "@/validators/attendance";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const recordFields = {
  id: attendanceRecords.id,
  employeeId: attendanceRecords.employeeId,
  workScheduleId: attendanceRecords.workScheduleId,
  workLocationId: attendanceRecords.workLocationId,
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

const previousDate = (date: string) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
};

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

const getConfig = async () => {
  const [config] = await db.select().from(companies).limit(1);
  return {
    timezone: config?.timezone ?? "Asia/Jakarta",
    accuracyLimitM: config?.gpsAccuracyLimitM ?? 50,
    allowHolidayWork: config?.allowHolidayWork ?? false,
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

type GeofenceTarget = {
  locationId: string;
  locationName: string;
  radiusM: number;
  locationLat: number;
  locationLng: number;
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
      allowedLocationIds: workSchedules.allowedLocationIds,
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
  if (!schedule) return null;
  return {
    ...schedule,
    targets: await buildTargets(schedule, schedule.allowedLocationIds),
  };
};

const buildTargets = async (
  primary: {
    locationId: string;
    locationName: string;
    radiusM: number;
    locationLat: number;
    locationLng: number;
  },
  allowedLocationIds: string[] | null | undefined,
): Promise<GeofenceTarget[]> => {
  const targets: GeofenceTarget[] = [primary];
  if (allowedLocationIds && allowedLocationIds.length > 0) {
    const extras = await db
      .select({
        locationId: workLocations.id,
        locationName: workLocations.name,
        radiusM: workLocations.radiusM,
        locationLat: workLocations.latitude,
        locationLng: workLocations.longitude,
      })
      .from(workLocations)
      .where(inArray(workLocations.id, allowedLocationIds));
    targets.push(...extras);
  }
  return targets;
};

const getScheduleById = async (id: string) => {
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
      allowedLocationIds: workSchedules.allowedLocationIds,
    })
    .from(workSchedules)
    .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .innerJoin(workLocations, eq(workLocations.id, workSchedules.workLocationId))
    .where(eq(workSchedules.id, id))
    .limit(1);
  if (!schedule) return null;
  return {
    ...schedule,
    targets: await buildTargets(schedule, schedule.allowedLocationIds),
  };
};

const getRecordLocation = async (locationId: string) => {
  const [location] = await db
    .select({
      locationId: workLocations.id,
      locationName: workLocations.name,
      radiusM: workLocations.radiusM,
      locationLat: workLocations.latitude,
      locationLng: workLocations.longitude,
    })
    .from(workLocations)
    .where(eq(workLocations.id, locationId))
    .limit(1);
  return location ? { ...location, targets: [location] } : null;
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
  const storageKey = `${name}.${extension}`;
  await putStoredFile({
    category: "attendance-photos",
    storageKey,
    mimeType,
    data: buffer,
  });
  return { storageKey, mimeType, fileSize: buffer.byteLength };
};

const resolveDeviceId = async (
  userId: string,
  deviceKey?: string,
  deviceInfo?: { os: string; model: string; browser: string },
) => {
  if (!deviceKey) return null;
  const [device] = await db
    .insert(devices)
    .values({
      deviceKey,
      userId,
      os: deviceInfo?.os ?? "",
      model: deviceInfo?.model ?? "",
      browser: deviceInfo?.browser ?? "",
      lastLoginAt: new Date(),
    })
    .onConflictDoUpdate({
      target: devices.deviceKey,
      set: {
        userId,
        lastLoginAt: new Date(),
        os: deviceInfo?.os ?? "",
        model: deviceInfo?.model ?? "",
        browser: deviceInfo?.browser ?? "",
      },
    })
    .returning({ id: devices.id });
  return device?.id ?? null;
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
  coordinates: PingCoordinates & { accuracy: number },
  targets: GeofenceTarget[],
  accuracyLimitM: number,
) => {
  if (coordinates.accuracy > accuracyLimitM)
    throw new ApiError(
      422,
      "GPS_ACCURACY",
      `Lokasi belum cukup akurat (${Math.round(coordinates.accuracy)} m, batas ${accuracyLimitM} m).`,
    );
  const best = nearestTarget(coordinates, targets);
  if (best.distance > best.target.radiusM)
    throw new ApiError(
      422,
      "OUTSIDE_GEOFENCE",
      `Anda berada di luar area kerja (${Math.round(best.distance)} m dari ${best.target.locationName}).`,
    );
  return {
    distance: Math.round(best.distance * 100) / 100,
    locationId: best.target.locationId,
    locationName: best.target.locationName,
  };
};

type PingCoordinates = { latitude: number; longitude: number };

const nearestTarget = (
  input: PingCoordinates,
  targets: GeofenceTarget[],
) => {
  let best:
    | { distance: number; target: GeofenceTarget }
    | undefined;
  for (const target of targets) {
    const distance = haversineDistanceMeters(
      input.latitude,
      input.longitude,
      target.locationLat,
      target.locationLng,
    );
    if (!best || distance < best.distance)
      best = { distance, target };
  }
  if (!best)
    throw new ApiError(404, "NOT_FOUND", "Lokasi kerja tidak ditemukan.");
  return best;
};

const getRoleList = async (userId: string) => {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return (row?.role ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
};

// Role Marketing dan HOD tidak diwajibkan berada di radius lokasi (sering
// dinas di luar); absen mereka cukup foto ber-watermark waktu & tempat.
const isLocationFree = async (userId: string) => {
  const roleList = await getRoleList(userId);
  return LOCATION_FREE_ROLES.some((role) => roleList.includes(role));
};

// Admin dan HRD mengelola dashboard, bukan subjek absensi.
const isAdminAccount = async (userId: string) => {
  const roleList = await getRoleList(userId);
  return ADMIN_ROLES.some((role) => roleList.includes(role));
};

type ResolvedPing = {
  distance: number | null;
  locationId: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
};

const resolvePingLocation = (
  input: AttendancePingInput,
  targets: GeofenceTarget[],
  accuracyLimitM: number,
  locationFree: boolean,
  fallback: { locationId: string | null; locationName: string | null },
): ResolvedPing => {
  const hasCoordinates =
    input.latitude !== undefined &&
    input.longitude !== undefined &&
    input.accuracy !== undefined;

  if (!hasCoordinates) {
    if (!locationFree)
      throw new ApiError(
        422,
        "LOCATION_REQUIRED",
        "Aktifkan GPS dan izinkan akses lokasi untuk melakukan absensi.",
      );
    return {
      distance: null,
      locationId: fallback.locationId,
      locationName: fallback.locationName,
      latitude: null,
      longitude: null,
      accuracy: null,
    };
  }

  const coordinates = { latitude: input.latitude!, longitude: input.longitude! };
  if (locationFree) {
    // Catat perkiraan jarak bila memungkinkan, tanpa menolak absen.
    try {
      const best = nearestTarget(coordinates, targets);
      return {
        distance: Math.round(best.distance * 100) / 100,
        locationId: best.target.locationId,
        locationName: best.target.locationName,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: input.accuracy!,
      };
    } catch {
      return {
        distance: null,
        locationId: fallback.locationId,
        locationName: fallback.locationName,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: input.accuracy!,
      };
    }
  }

  const geofence = validateGeofence(
    {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      accuracy: input.accuracy!,
    },
    targets,
    accuracyLimitM,
  );
  return {
    ...geofence,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracy: input.accuracy!,
  };
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
  if (await isAdminAccount(userId))
    throw new ApiError(
      403,
      "ADMIN_NO_ATTENDANCE",
      "Akun admin/HRD mengelola dashboard dan tidak melakukan absensi.",
    );
  const employee = await requireEmployee(userId);
  const { timezone, accuracyLimitM, allowHolidayWork } = await getConfig();
  const date = todayInTimezone(timezone);

  if (input.idempotencyKey) {
    const [replayed] = await db
      .select(recordFields)
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.checkInIdempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (replayed) return replayed;
  }

  const [holiday] = await db
    .select()
    .from(holidays)
    .where(and(eq(holidays.date, date), eq(holidays.active, true)))
    .limit(1);
  const isHolidayWork = Boolean(holiday?.allowWork && allowHolidayWork);
  if (holiday && !isHolidayWork)
    throw new ApiError(
      409,
      "HOLIDAY",
      holiday.allowWork
        ? `Absensi hari libur dinonaktifkan: ${holiday.name}.`
        : `Hari ini libur: ${holiday.name}.`,
    );

  const schedule = await getSchedule(employee.id, date);
  if (!schedule)
    throw new ApiError(409, "NO_SCHEDULE", "Tidak ada jadwal kerja hari ini.");

  const [openRecord] = await db
    .select({ id: attendanceRecords.id, date: attendanceRecords.date })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        isNull(attendanceRecords.checkOutTime),
        gte(attendanceRecords.date, previousDate(date)),
      ),
    )
    .orderBy(desc(attendanceRecords.date))
    .limit(1);
  if (openRecord)
    throw new ApiError(
      409,
      "DUPLICATE_CHECKIN",
      openRecord.date === date
        ? "Anda sudah melakukan absensi masuk."
        : "Selesaikan absensi pulang shift malam terlebih dahulu.",
    );

  const locationFree = await isLocationFree(userId);
  const ping = resolvePingLocation(
    input,
    schedule.targets,
    accuracyLimitM,
    locationFree,
    { locationId: schedule.locationId, locationName: schedule.locationName },
  );
  const deviceId = await resolveDeviceId(
    userId,
    input.deviceKey,
    input.deviceInfo,
  );

  const now = new Date();
  const nowMinutes = minutesInTimezone(timezone, now);
  const late =
    nowMinutes - toMinutes(schedule.startTime) > schedule.toleranceMinutes;
  const status = isHolidayWork ? "holiday_work" : late ? "late" : "present";

  const [record] = await db
    .insert(attendanceRecords)
    .values({
      employeeId: employee.id,
      workScheduleId: schedule.id,
      workLocationId: ping.locationId ?? schedule.locationId,
      date,
      checkInTime: now,
      checkInLatitude: ping.latitude,
      checkInLongitude: ping.longitude,
      checkInAccuracy: ping.accuracy,
      checkInDistance: ping.distance,
      checkInIdempotencyKey: input.idempotencyKey ?? null,
      deviceId,
      ...(input.placeNote ? { notes: input.placeNote } : {}),
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
    distance: ping.distance,
    accuracy: ping.accuracy,
    location: ping.locationName,
    placeNote: input.placeNote ?? null,
    locationFree,
    deviceId,
  });

  notifyUserInBackground(userId, {
    event: "attendance-check-in",
    type: "attendance",
    title: "Absensi masuk berhasil",
    body:
      status === "late"
        ? `Tercatat terlambat hari ini. Jadwal mulai ${schedule.startTime}, batas toleransi ${schedule.toleranceMinutes} menit.`
        : status === "holiday_work"
          ? "Kehadiran hari libur tercatat sebagai kerja hari libur."
          : "Kehadiranmu sudah tercatat untuk hari ini.",
  });

  return updated;
}

export async function checkOut(userId: string, input: AttendancePingInput) {
  if (await isAdminAccount(userId))
    throw new ApiError(
      403,
      "ADMIN_NO_ATTENDANCE",
      "Akun admin/HRD mengelola dashboard dan tidak melakukan absensi.",
    );
  const employee = await requireEmployee(userId);
  const { timezone, accuracyLimitM } = await getConfig();
  const date = todayInTimezone(timezone);

  if (input.idempotencyKey) {
    const [replayed] = await db
      .select(recordFields)
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.checkOutIdempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (replayed) return replayed;
  }

  const [record] = await db
    .select(recordFields)
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        isNull(attendanceRecords.checkOutTime),
        gte(attendanceRecords.date, previousDate(date)),
      ),
    )
    .orderBy(desc(attendanceRecords.date))
    .limit(1);
  if (!record || !record.checkInTime) {
    const [closedToday] = await db
      .select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.date, date),
          isNotNull(attendanceRecords.checkOutTime),
        ),
      )
      .limit(1);
    if (closedToday)
      throw new ApiError(
        409,
        "DUPLICATE_CHECKOUT",
        "Anda sudah melakukan absensi pulang.",
      );
    throw new ApiError(409, "NO_CHECKIN", "Belum ada absensi masuk hari ini.");
  }

  const isToday = record.date === date;
  const schedule = isToday
    ? await getSchedule(employee.id, date)
    : await getScheduleById(record.workScheduleId ?? "");
  if (!schedule || (!isToday && !schedule.crossesMidnight))
    throw new ApiError(
      409,
      "NO_CHECKIN",
      "Absensi masuk tidak ditemukan untuk jadwal hari ini.",
    );

  const location = isToday
    ? schedule
    : record.workLocationId
      ? await getRecordLocation(record.workLocationId)
      : null;
  if (!location)
    throw new ApiError(404, "NOT_FOUND", "Lokasi kerja tidak ditemukan.");
  const locationFree = await isLocationFree(userId);
  const ping = resolvePingLocation(
    input,
    location.targets,
    accuracyLimitM,
    locationFree,
    { locationId: null, locationName: null },
  );

  const now = new Date();
  const nowMinutes = minutesInTimezone(timezone, now);
  const nowAbsolute = daysBetween(record.date, date) * 1440 + nowMinutes;
  const endAbsolute =
    (schedule.crossesMidnight ? 1440 : 0) + toMinutes(schedule.endTime);
  const early = nowAbsolute < endAbsolute;
  const status =
    record.status === "holiday_work"
      ? "holiday_work"
      : early
        ? "early_leave"
        : record.status;

  const deviceId = await resolveDeviceId(
    userId,
    input.deviceKey,
    input.deviceInfo,
  );

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
      checkOutLatitude: ping.latitude,
      checkOutLongitude: ping.longitude,
      checkOutAccuracy: ping.accuracy,
      checkOutDistance: ping.distance,
      checkOutPhotoId: photo.id,
      checkOutIdempotencyKey: input.idempotencyKey ?? null,
      deviceId,
      status,
      ...(input.placeNote ? { notes: input.placeNote } : {}),
    })
    .where(eq(attendanceRecords.id, record.id))
    .returning(recordFields);

  await writeAudit(userId, "check-out", record.id, {
    date,
    status,
    distance: ping.distance,
    accuracy: ping.accuracy,
    location: ping.locationName,
    placeNote: input.placeNote ?? null,
    locationFree,
    deviceId,
  });

  notifyUserInBackground(userId, {
    event: "attendance-check-out",
    type: "attendance",
    title: "Absensi pulang berhasil",
    body:
      status === "early_leave"
        ? "Tercatat pulang cepat. Pulang lebih awal dari jadwal."
        : "Absensi pulang sudah tercatat.",
  });

  return updated;
}

export async function listHistory(
  userId: string,
  query: AttendanceHistoryInput,
) {
  const employee = await requireEmployee(userId);
  const conditions = [eq(attendanceRecords.employeeId, employee.id)];
  if (query.month) {
    const [year, month] = query.month.split("-").map(Number);
    const first = `${query.month}-01`;
    const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    conditions.push(gte(attendanceRecords.date, first));
    conditions.push(lte(attendanceRecords.date, last));
  }
  if (query.from) conditions.push(gte(attendanceRecords.date, query.from));
  if (query.to) conditions.push(lte(attendanceRecords.date, query.to));
  if (query.status) conditions.push(eq(attendanceRecords.status, query.status));

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

export async function getAttendanceDetail(
  userId: string,
  canReadAny: boolean,
  id: string,
) {
  const [record] = await db
    .select({
      ...recordFields,
      employeeName: employees.fullName,
      locationName: workLocations.name,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(employees.id, attendanceRecords.employeeId))
    .innerJoin(workLocations, eq(workLocations.id, attendanceRecords.workLocationId))
    .where(eq(attendanceRecords.id, id))
    .limit(1);
  if (!record) throw new ApiError(404, "NOT_FOUND", "Absensi tidak ditemukan.");

  if (!canReadAny) {
    const employee = await requireEmployee(userId);
    if (record.employeeId !== employee.id)
      throw new ApiError(404, "NOT_FOUND", "Absensi tidak ditemukan.");
  }

  const photos = await db
    .select({
      id: attendancePhotos.id,
      type: attendancePhotos.type,
      mimeType: attendancePhotos.mimeType,
      capturedAt: attendancePhotos.capturedAt,
    })
    .from(attendancePhotos)
    .where(eq(attendancePhotos.attendanceId, id));

  return { record, photos };
}

export async function getPhotoForViewer(
  userId: string,
  canReadAny: boolean,
  photoId: string,
) {
  const [row] = await db
    .select({
      storageKey: attendancePhotos.storageKey,
      mimeType: attendancePhotos.mimeType,
      employeeId: attendanceRecords.employeeId,
    })
    .from(attendancePhotos)
    .innerJoin(
      attendanceRecords,
      eq(attendanceRecords.id, attendancePhotos.attendanceId),
    )
    .where(eq(attendancePhotos.id, photoId))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Foto tidak ditemukan.");

  if (!canReadAny) {
    const employee = await requireEmployee(userId);
    if (row.employeeId !== employee.id)
      throw new ApiError(404, "NOT_FOUND", "Foto tidak ditemukan.");
  }

  const file = await getStoredFile("attendance-photos", row.storageKey);
  if (!file)
    throw new ApiError(404, "NOT_FOUND", "Berkas foto tidak ditemukan.");

  return { data: file.data, mimeType: row.mimeType };
}
