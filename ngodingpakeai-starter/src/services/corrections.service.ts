import "server-only";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceCorrections,
  attendanceRecords,
  auditLogs,
  companies,
  employees,
  shifts,
  user,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { notifyUserInBackground } from "@/services/notifications.service";
import type {
  CorrectionCreateInput,
  CorrectionDecisionInput,
  CorrectionListInput,
} from "@/validators/corrections";

const correctionFields = {
  id: attendanceCorrections.id,
  attendanceId: attendanceCorrections.attendanceId,
  requestedBy: attendanceCorrections.requestedBy,
  reason: attendanceCorrections.reason,
  oldValue: attendanceCorrections.oldValue,
  newValue: attendanceCorrections.newValue,
  status: attendanceCorrections.status,
  decidedBy: attendanceCorrections.decidedBy,
  decidedAt: attendanceCorrections.decidedAt,
  decisionNote: attendanceCorrections.decisionNote,
  createdAt: attendanceCorrections.createdAt,
  updatedAt: attendanceCorrections.updatedAt,
};

const toMinutes = (value: Date, timeZone: string) => {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
  const [hours, minutes] = formatted.split(":").map(Number);
  return hours * 60 + minutes;
};

const dateInTimezone = (timeZone: string, value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

const requireEmployee = async (userId: string) => {
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
  return employee;
};

export async function createOwnCorrection(
  userId: string,
  input: CorrectionCreateInput,
) {
  const employee = await requireEmployee(userId);
  const [record] = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.id, input.attendanceId),
        eq(attendanceRecords.employeeId, employee.id),
      ),
    )
    .limit(1);
  if (!record) throw new ApiError(404, "NOT_FOUND", "Absensi tidak ditemukan.");

  const [pending] = await db
    .select({ id: attendanceCorrections.id })
    .from(attendanceCorrections)
    .where(
      and(
        eq(attendanceCorrections.attendanceId, record.id),
        eq(attendanceCorrections.status, "pending"),
      ),
    )
    .limit(1);
  if (pending)
    throw new ApiError(
      409,
      "CORRECTION_PENDING",
      "Masih ada pengajuan koreksi yang menunggu keputusan.",
    );

  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  if (input.checkInTime !== undefined) {
    oldValue.checkInTime = record.checkInTime?.toISOString() ?? null;
    newValue.checkInTime = input.checkInTime;
  }
  if (input.checkOutTime !== undefined) {
    oldValue.checkOutTime = record.checkOutTime?.toISOString() ?? null;
    newValue.checkOutTime = input.checkOutTime;
  }
  if (input.notes !== undefined) {
    oldValue.notes = record.notes;
    newValue.notes = input.notes;
  }
  const changed = Object.keys(newValue).some(
    (key) => oldValue[key] !== newValue[key],
  );
  if (!changed)
    throw new ApiError(422, "NO_CHANGES", "Nilai koreksi sama dengan data saat ini.");

  const [row] = await db
    .insert(attendanceCorrections)
    .values({
      attendanceId: record.id,
      requestedBy: userId,
      reason: input.reason,
      oldValue,
      newValue,
    })
    .returning(correctionFields);

  await db.insert(auditLogs).values({
    userId,
    action: "correction-create",
    entity: "attendance_corrections",
    entityId: row.id,
    newValue: { attendanceId: record.id, ...newValue },
  });

  return row;
}

export async function listOwnCorrections(
  userId: string,
  query: CorrectionListInput,
) {
  const conditions: SQL[] = [eq(attendanceCorrections.requestedBy, userId)];
  if (query.status) conditions.push(eq(attendanceCorrections.status, query.status));

  const rows = await db
    .select({
      ...correctionFields,
      attendanceDate: attendanceRecords.date,
      attendanceStatus: attendanceRecords.status,
    })
    .from(attendanceCorrections)
    .innerJoin(
      attendanceRecords,
      eq(attendanceRecords.id, attendanceCorrections.attendanceId),
    )
    .where(and(...conditions))
    .orderBy(desc(attendanceCorrections.createdAt))
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

export async function listAnyCorrections(query: CorrectionListInput) {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(attendanceCorrections.status, query.status));

  const rows = await db
    .select({
      ...correctionFields,
      attendanceDate: attendanceRecords.date,
      attendanceStatus: attendanceRecords.status,
      employeeName: employees.fullName,
      requesterName: user.name,
      requesterEmail: user.email,
    })
    .from(attendanceCorrections)
    .innerJoin(
      attendanceRecords,
      eq(attendanceRecords.id, attendanceCorrections.attendanceId),
    )
    .innerJoin(employees, eq(employees.id, attendanceRecords.employeeId))
    .innerJoin(user, eq(user.id, attendanceCorrections.requestedBy))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(attendanceCorrections.createdAt))
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

export async function decideAnyCorrection(
  approverId: string,
  id: string,
  input: CorrectionDecisionInput,
) {
  const [correction] = await db
    .update(attendanceCorrections)
    .set({
      status: input.status,
      decidedBy: approverId,
      decidedAt: new Date(),
      decisionNote: input.decisionNote,
    })
    .where(
      and(
        eq(attendanceCorrections.id, id),
        eq(attendanceCorrections.status, "pending"),
      ),
    )
    .returning(correctionFields);
  if (!correction)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Koreksi tidak ditemukan atau sudah diputus.",
    );

  if (input.status === "approved") {
    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, correction.attendanceId))
      .limit(1);
    if (!record)
      throw new ApiError(404, "NOT_FOUND", "Absensi tidak ditemukan.");

    const newValue = correction.newValue as {
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
    };
    const updates: Record<string, unknown> = {};
    if (newValue.checkInTime) updates.checkInTime = new Date(newValue.checkInTime);
    if (newValue.checkOutTime)
      updates.checkOutTime = new Date(newValue.checkOutTime);
    if (newValue.notes !== undefined) updates.notes = newValue.notes;

    if (Object.keys(updates).length > 0) {
      const effectiveCheckIn =
        (updates.checkInTime as Date | undefined) ?? record.checkInTime;
      const effectiveCheckOut =
        (updates.checkOutTime as Date | undefined) ?? record.checkOutTime;
      if (record.workScheduleId && (updates.checkInTime || updates.checkOutTime)) {
        const [shift] = await db
          .select({
            startTime: shifts.startTime,
            endTime: shifts.endTime,
            toleranceMinutes: shifts.toleranceMinutes,
            crossesMidnight: shifts.crossesMidnight,
          })
          .from(workSchedules)
          .innerJoin(shifts, eq(shifts.id, workSchedules.shiftId))
          .where(eq(workSchedules.id, record.workScheduleId))
          .limit(1);
        if (shift && effectiveCheckIn) {
          const [company] = await db
            .select({ timezone: companies.timezone })
            .from(companies)
            .limit(1);
          const timezone = company?.timezone ?? "Asia/Jakarta";
          const startMinutes =
            Number(shift.startTime.slice(0, 2)) * 60 +
            Number(shift.startTime.slice(3, 5));
          const checkInMinutes = toMinutes(effectiveCheckIn, timezone);
          const late =
            record.status !== "holiday_work" &&
            checkInMinutes - startMinutes > shift.toleranceMinutes;
          let status = record.status === "holiday_work" ? "holiday_work" : "present";
          if (late) status = "late";
          if (effectiveCheckOut) {
            const checkOutDate = dateInTimezone(timezone, effectiveCheckOut);
            const outAbsolute =
              daysBetween(record.date, checkOutDate) * 1440 +
              toMinutes(effectiveCheckOut, timezone);
            const endMinutes =
              Number(shift.endTime.slice(0, 2)) * 60 +
              Number(shift.endTime.slice(3, 5));
            const endAbsolute = (shift.crossesMidnight ? 1440 : 0) + endMinutes;
            if (outAbsolute < endAbsolute) status = "early_leave";
          }
          updates.status = status;
        }
      }
      await db
        .update(attendanceRecords)
        .set(updates)
        .where(eq(attendanceRecords.id, record.id));
    }

    await db.insert(auditLogs).values({
      userId: approverId,
      action: "correction-approved",
      entity: "attendance_records",
      entityId: record.id,
      oldValue: correction.oldValue as Record<string, unknown>,
      newValue: correction.newValue as Record<string, unknown>,
    });
  } else {
    await db.insert(auditLogs).values({
      userId: approverId,
      action: "correction-rejected",
      entity: "attendance_corrections",
      entityId: id,
      newValue: { note: input.decisionNote },
    });
  }

  notifyUserInBackground(correction.requestedBy, {
    event: `correction-${input.status}`,
    type: `correction-${input.status}`,
    title:
      input.status === "approved"
        ? "Koreksi absensi disetujui"
        : "Koreksi absensi ditolak",
    body:
      input.decisionNote || "Buka Riwayat Absensi untuk melihat detail terbaru.",
  });

  return correction;
}
