import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  auditLogs,
  departments,
  employees,
  mealClaims,
  payrollEntries,
  payrollPeriods,
  requests,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { notifyUserInBackground } from "@/services/notifications.service";
import type { ListQueryInput } from "@/validators/common";
import type {
  GeneratePayrollInput,
  UpdatePayrollEntryInput,
  UpdatePayrollPeriodInput,
} from "@/validators/payroll";

// Aturan hitung default (transparan, HRD tetap bisa menyesuaikan):
// - Upah harian = gaji bulanan / hari terjadwal (fallback 30), atau gaji
//   harian langsung untuk karyawan upah harian.
// - Potongan terlambat 10% upah harian per hari; alpha 100% upah harian.
// - Lembur = menit lembur / 60 x (upah harian / 8).
const LATE_DEDUCTION_RATE = 0.1;
const HOURS_PER_DAY = 8;
const DAY_MS = 86_400_000;

const EXCUSED_TYPES = [
  "permission",
  "sick",
  "leave",
  "business_trip",
] as const;

const pad = (value: number) => String(value).padStart(2, "0");

const monthRange = (year: number, month: number) => {
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${year}-${pad(month)}-${pad(lastDay)}` };
};

const dayCount = (start: string, end: string) =>
  Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;

const round2 = (value: number) => Math.round(value * 100) / 100;

const money = (value: number) => round2(value).toFixed(2);

const overtimeMinutes = (startTime: string | null, endTime: string | null) => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 1440;
  return minutes;
};

const periodFields = {
  id: payrollPeriods.id,
  year: payrollPeriods.year,
  month: payrollPeriods.month,
  status: payrollPeriods.status,
  note: payrollPeriods.note,
  generatedBy: payrollPeriods.generatedBy,
  finalizedBy: payrollPeriods.finalizedBy,
  finalizedAt: payrollPeriods.finalizedAt,
  paidBy: payrollPeriods.paidBy,
  paidAt: payrollPeriods.paidAt,
  createdAt: payrollPeriods.createdAt,
};

const entryFields = {
  id: payrollEntries.id,
  periodId: payrollEntries.periodId,
  employeeId: payrollEntries.employeeId,
  salaryType: payrollEntries.salaryType,
  baseSalary: payrollEntries.baseSalary,
  scheduledDays: payrollEntries.scheduledDays,
  presentDays: payrollEntries.presentDays,
  lateDays: payrollEntries.lateDays,
  alphaDays: payrollEntries.alphaDays,
  excusedDays: payrollEntries.excusedDays,
  overtimeMinutes: payrollEntries.overtimeMinutes,
  mealClaimCount: payrollEntries.mealClaimCount,
  baseAmount: payrollEntries.baseAmount,
  lateDeduction: payrollEntries.lateDeduction,
  alphaDeduction: payrollEntries.alphaDeduction,
  overtimeAmount: payrollEntries.overtimeAmount,
  otherAdjustment: payrollEntries.otherAdjustment,
  adjustmentNote: payrollEntries.adjustmentNote,
  total: payrollEntries.total,
};

export async function listAnyPayrollPeriods({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(periodFields)
    .from(payrollPeriods)
    .orderBy(desc(payrollPeriods.year), desc(payrollPeriods.month))
    .limit(limit + 1)
    .offset(offset);

  const data = rows.slice(0, limit);
  const ids = data.map((row) => row.id);
  const summary = new Map<string, { employeeCount: number; total: number }>();
  if (ids.length > 0) {
    const grouped = await db
      .select({
        periodId: payrollEntries.periodId,
        employeeCount: count(),
        total: sql<string>`coalesce(sum(${payrollEntries.total}), 0)`,
      })
      .from(payrollEntries)
      .where(inArray(payrollEntries.periodId, ids))
      .groupBy(payrollEntries.periodId);
    for (const row of grouped) {
      summary.set(row.periodId, {
        employeeCount: Number(row.employeeCount),
        total: Number(row.total),
      });
    }
  }

  return {
    data: data.map((row) => ({
      ...row,
      employeeCount: summary.get(row.id)?.employeeCount ?? 0,
      total: summary.get(row.id)?.total ?? 0,
    })),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function getAnyPayrollPeriod(id: string) {
  const [period] = await db
    .select(periodFields)
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, id))
    .limit(1);
  if (!period)
    throw new ApiError(404, "NOT_FOUND", "Periode penggajian tidak ditemukan.");

  const entries = await db
    .select({
      ...entryFields,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      departmentName: departments.name,
    })
    .from(payrollEntries)
    .innerJoin(employees, eq(employees.id, payrollEntries.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .where(eq(payrollEntries.periodId, id))
    .orderBy(asc(employees.fullName));

  const totals = entries.reduce(
    (acc, row) => ({
      presentDays: acc.presentDays + row.presentDays,
      lateDays: acc.lateDays + row.lateDays,
      alphaDays: acc.alphaDays + row.alphaDays,
      overtimeMinutes: acc.overtimeMinutes + row.overtimeMinutes,
      mealClaimCount: acc.mealClaimCount + row.mealClaimCount,
      total: round2(acc.total + Number(row.total)),
    }),
    {
      presentDays: 0,
      lateDays: 0,
      alphaDays: 0,
      overtimeMinutes: 0,
      mealClaimCount: 0,
      total: 0,
    },
  );

  return { period, entries, meta: { totals } };
}

export async function generateAnyPayrollPeriod(
  actorId: string,
  input: GeneratePayrollInput,
) {
  const { from, to } = monthRange(input.year, input.month);
  const [existing] = await db
    .select({ id: payrollPeriods.id, status: payrollPeriods.status })
    .from(payrollPeriods)
    .where(
      and(
        eq(payrollPeriods.year, input.year),
        eq(payrollPeriods.month, input.month),
      ),
    )
    .limit(1);
  if (existing?.status === "finalized")
    throw new ApiError(
      409,
      "PAYROLL_FINALIZED",
      "Periode ini sudah difinalkan. Buka kembali sebelum menghitung ulang.",
    );
  if (existing?.status === "paid")
    throw new ApiError(
      409,
      "PAYROLL_PAID",
      "Periode ini sudah dibayarkan dan tidak bisa dihitung ulang.",
    );

  const staff = await db
    .select({
      id: employees.id,
      userId: employees.userId,
      salaryType: employees.salaryType,
      baseSalary: employees.baseSalary,
    })
    .from(employees)
    .where(eq(employees.employmentStatus, "active"));
  const staffIds = staff.map((row) => row.id);

  const scheduleCount = new Map<string, number>();
  const attendanceCount = new Map<string, Map<string, number>>();
  const mealCount = new Map<string, number>();
  const overtimeByUser = new Map<string, number>();
  const excusedByUser = new Map<string, number>();

  if (staffIds.length > 0) {
    const schedules = await db
      .select({ employeeId: workSchedules.employeeId, dayCount: count() })
      .from(workSchedules)
      .where(
        and(
          gte(workSchedules.date, from),
          lte(workSchedules.date, to),
          inArray(workSchedules.employeeId, staffIds),
        ),
      )
      .groupBy(workSchedules.employeeId);
    for (const row of schedules)
      scheduleCount.set(row.employeeId, Number(row.dayCount));

    const attendance = await db
      .select({
        employeeId: attendanceRecords.employeeId,
        status: attendanceRecords.status,
        dayCount: count(),
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, from),
          lte(attendanceRecords.date, to),
          inArray(attendanceRecords.employeeId, staffIds),
        ),
      )
      .groupBy(attendanceRecords.employeeId, attendanceRecords.status);
    for (const row of attendance) {
      const bucket = attendanceCount.get(row.employeeId) ?? new Map();
      bucket.set(row.status, Number(row.dayCount));
      attendanceCount.set(row.employeeId, bucket);
    }

    const meals = await db
      .select({ employeeId: mealClaims.employeeId, dayCount: count() })
      .from(mealClaims)
      .where(
        and(
          gte(mealClaims.date, from),
          lte(mealClaims.date, to),
          inArray(mealClaims.employeeId, staffIds),
        ),
      )
      .groupBy(mealClaims.employeeId);
    for (const row of meals) mealCount.set(row.employeeId, Number(row.dayCount));
  }

  const userIds = staff.map((row) => row.userId);
  if (userIds.length > 0) {
    const overtime = await db
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
          inArray(requests.userId, userIds),
        ),
      );
    for (const row of overtime) {
      overtimeByUser.set(
        row.userId,
        (overtimeByUser.get(row.userId) ?? 0) +
          overtimeMinutes(row.startTime, row.endTime),
      );
    }

    const excused = await db
      .select({
        userId: requests.userId,
        startDate: requests.startDate,
        endDate: requests.endDate,
      })
      .from(requests)
      .where(
        and(
          eq(requests.status, "approved"),
          inArray(requests.type, [...EXCUSED_TYPES]),
          lte(requests.startDate, to),
          or(isNull(requests.endDate), gte(requests.endDate, from)),
          inArray(requests.userId, userIds),
        ),
      );
    for (const row of excused) {
      const start = row.startDate < from ? from : row.startDate;
      const end = (row.endDate ?? row.startDate) > to ? to : (row.endDate ?? row.startDate);
      excusedByUser.set(
        row.userId,
        (excusedByUser.get(row.userId) ?? 0) + Math.max(dayCount(start, end), 0),
      );
    }
  }

  const computed = staff.map((person) => {
    const statusCounts = attendanceCount.get(person.id) ?? new Map();
    const scheduledDays = scheduleCount.get(person.id) ?? 0;
    const presentDays =
      (statusCounts.get("present") ?? 0) +
      (statusCounts.get("late") ?? 0) +
      (statusCounts.get("early_leave") ?? 0) +
      (statusCounts.get("holiday_work") ?? 0);
    const lateDays = statusCounts.get("late") ?? 0;
    const alphaDays = statusCounts.get("alpha") ?? 0;
    const excusedDays = excusedByUser.get(person.userId) ?? 0;
    const overtime = overtimeByUser.get(person.userId) ?? 0;
    const mealClaimCountValue = mealCount.get(person.id) ?? 0;

    const baseSalary = Number(person.baseSalary);
    const dailyRate =
      person.salaryType === "daily"
        ? baseSalary
        : scheduledDays > 0
          ? baseSalary / scheduledDays
          : baseSalary / 30;
    const baseAmount =
      person.salaryType === "daily" ? dailyRate * presentDays : baseSalary;
    const lateDeduction = dailyRate * LATE_DEDUCTION_RATE * lateDays;
    const alphaDeduction = dailyRate * alphaDays;
    const overtimeAmount = (dailyRate / HOURS_PER_DAY / 60) * overtime;
    const total = baseAmount - lateDeduction - alphaDeduction + overtimeAmount;

    return {
      employeeId: person.id,
      salaryType: person.salaryType,
      baseSalary: money(baseSalary),
      scheduledDays,
      presentDays,
      lateDays,
      alphaDays,
      excusedDays,
      overtimeMinutes: overtime,
      mealClaimCount: mealClaimCountValue,
      baseAmount: money(baseAmount),
      lateDeduction: money(lateDeduction),
      alphaDeduction: money(alphaDeduction),
      overtimeAmount: money(overtimeAmount),
      otherAdjustment: "0.00",
      adjustmentNote: "",
      total: money(total),
    };
  });

  const periodId = await db.transaction(async (tx) => {
    let targetId = existing?.id;
    if (targetId) {
      await tx
        .update(payrollPeriods)
        .set({
          generatedBy: actorId,
          ...(input.note ? { note: input.note } : {}),
        })
        .where(eq(payrollPeriods.id, targetId));
      await tx
        .delete(payrollEntries)
        .where(eq(payrollEntries.periodId, targetId));
    } else {
      const [inserted] = await tx
        .insert(payrollPeriods)
        .values({
          year: input.year,
          month: input.month,
          note: input.note,
          generatedBy: actorId,
        })
        .returning({ id: payrollPeriods.id });
      targetId = inserted.id;
    }
    if (computed.length > 0) {
      await tx
        .insert(payrollEntries)
        .values(computed.map((row) => ({ ...row, periodId: targetId as string })));
    }
    return targetId as string;
  });

  await db.insert(auditLogs).values({
    userId: actorId,
    action: existing ? "payroll-regenerate" : "payroll-generate",
    entity: "payroll_periods",
    entityId: periodId,
    newValue: { year: input.year, month: input.month, employees: computed.length },
  });

  return getAnyPayrollPeriod(periodId);
}

export async function updateAnyPayrollPeriod(
  actorId: string,
  id: string,
  input: UpdatePayrollPeriodInput,
) {
  const [period] = await db
    .select(periodFields)
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, id))
    .limit(1);
  if (!period)
    throw new ApiError(404, "NOT_FOUND", "Periode penggajian tidak ditemukan.");

  const update: Partial<{
    status: string;
    note: string;
    finalizedBy: string | null;
    finalizedAt: Date | null;
    paidBy: string | null;
    paidAt: Date | null;
  }> = {};
  if (input.note !== undefined) update.note = input.note;
  if (input.status && input.status !== period.status) {
    if (period.status === "paid")
      throw new ApiError(
        409,
        "PAYROLL_PAID",
        "Periode ini sudah dibayarkan. Statusnya tidak bisa diubah lagi.",
      );
    if (input.status === "finalized") {
      update.status = "finalized";
      update.finalizedBy = actorId;
      update.finalizedAt = new Date();
    } else if (input.status === "paid") {
      if (period.status !== "finalized")
        throw new ApiError(
          409,
          "PAYROLL_NOT_FINALIZED",
          "Finalkan periode terlebih dahulu sebelum membayar gaji.",
        );
      update.status = "paid";
      update.paidBy = actorId;
      update.paidAt = new Date();
    } else {
      update.status = "draft";
      update.finalizedBy = null;
      update.finalizedAt = null;
    }
  }
  if (Object.keys(update).length === 0) return getAnyPayrollPeriod(id);

  await db.update(payrollPeriods).set(update).where(eq(payrollPeriods.id, id));
  await db.insert(auditLogs).values({
    userId: actorId,
    action: update.status === "paid" ? "payroll-paid" : "payroll-period-update",
    entity: "payroll_periods",
    entityId: id,
    oldValue: { status: period.status, note: period.note },
    newValue: update,
  });

  if (update.status === "paid") await notifyPayrollPaid(id, period.year, period.month);

  return getAnyPayrollPeriod(id);
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const rupiah = (value: number) =>
  `Rp ${Math.round(value).toLocaleString("id-ID")}`;

// Kirim notifikasi ke setiap karyawan bahwa gaji periodenya sudah dibayarkan.
const notifyPayrollPaid = async (periodId: string, year: number, month: number) => {
  const label = `${MONTHS[month - 1] ?? month} ${year}`;
  const rows = await db
    .select({
      userId: employees.userId,
      fullName: employees.fullName,
      bankName: employees.bankName,
      bankAccount: employees.bankAccount,
      total: payrollEntries.total,
    })
    .from(payrollEntries)
    .innerJoin(employees, eq(employees.id, payrollEntries.employeeId))
    .where(eq(payrollEntries.periodId, periodId));

  for (const row of rows) {
    const rekening =
      row.bankName || row.bankAccount
        ? ` ke rekening ${row.bankName} ${row.bankAccount}`.trimEnd()
        : "";
    notifyUserInBackground(row.userId, {
      event: `payroll-paid:${periodId}`,
      type: "payroll",
      title: `Gaji ${label} sudah dibayar`,
      body: `Gaji kamu untuk periode ${label} sebesar ${rupiah(Number(row.total))} sudah dibayarkan${rekening}. Terima kasih.`,
      dedupeKey: `payroll-paid:${periodId}:${row.userId}`,
    });
  }
};

export async function updateAnyPayrollEntry(
  actorId: string,
  id: string,
  input: UpdatePayrollEntryInput,
) {
  const [row] = await db
    .select({
      entry: entryFields,
      periodStatus: payrollPeriods.status,
    })
    .from(payrollEntries)
    .innerJoin(payrollPeriods, eq(payrollPeriods.id, payrollEntries.periodId))
    .where(eq(payrollEntries.id, id))
    .limit(1);
  if (!row)
    throw new ApiError(404, "NOT_FOUND", "Baris penggajian tidak ditemukan.");
  if (row.periodStatus !== "draft")
    throw new ApiError(
      409,
      row.periodStatus === "paid" ? "PAYROLL_PAID" : "PAYROLL_FINALIZED",
      row.periodStatus === "paid"
        ? "Periode sudah dibayarkan dan tidak bisa diubah."
        : "Periode sudah difinalkan. Buka kembali untuk menyesuaikan.",
    );

  const otherAdjustment =
    input.otherAdjustment !== undefined
      ? input.otherAdjustment
      : row.entry.otherAdjustment;
  const total =
    Number(row.entry.baseAmount) -
    Number(row.entry.lateDeduction) -
    Number(row.entry.alphaDeduction) +
    Number(row.entry.overtimeAmount) +
    Number(otherAdjustment);

  await db
    .update(payrollEntries)
    .set({
      otherAdjustment,
      ...(input.adjustmentNote !== undefined
        ? { adjustmentNote: input.adjustmentNote }
        : {}),
      total: money(total),
    })
    .where(eq(payrollEntries.id, id));

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "payroll-entry-update",
    entity: "payroll_entries",
    entityId: id,
    oldValue: {
      otherAdjustment: row.entry.otherAdjustment,
      adjustmentNote: row.entry.adjustmentNote,
      total: row.entry.total,
    },
    newValue: { otherAdjustment, total: money(total) },
  });

  const [updated] = await db
    .select(entryFields)
    .from(payrollEntries)
    .where(eq(payrollEntries.id, id))
    .limit(1);
  return updated;
}
