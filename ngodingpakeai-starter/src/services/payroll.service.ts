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
  companies,
  departments,
  employees,
  mealClaims,
  payrollEntries,
  payrollPayments,
  payrollPeriods,
  positions,
  requests,
  shifts,
  workSchedules,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { notifyUserInBackground } from "@/services/notifications.service";
import type { ListQueryInput } from "@/validators/common";
import type {
  GeneratePayrollInput,
  PayDailyPayrollInput,
  PayPayrollEntriesInput,
  PayrollPaymentListInput,
  UpdatePayrollEntryInput,
  UpdatePayrollPeriodInput,
} from "@/validators/payroll";

// Aturan hitung default (transparan, HRD tetap bisa menyesuaikan):
// - Upah harian = gaji bulanan / hari terjadwal (fallback 30), atau gaji
//   harian langsung untuk karyawan upah harian.
// - Potongan terlambat dan alpha mengikuti pengaturan di halaman Penggajian.
// - Lembur = menit lembur / 60 x (upah harian / 8).
const HOURS_PER_DAY = 8;
const DAY_MS = 86_400_000;

const getDeductionRates = async () => {
  const [company] = await db
    .select({
      lateRate: companies.payrollLateRatePerMinute,
      alphaRate: companies.payrollAlphaRatePerDay,
      permissionPercent: companies.payrollPermissionPercent,
    })
    .from(companies)
    .limit(1);
  return {
    lateRate: Number(company?.lateRate ?? 2000),
    alphaRate: Number(company?.alphaRate ?? 100000),
    permissionPercent: (company?.permissionPercent ?? 50) / 100,
  };
};

const EXCUSED_TYPES = ["permission", "sick", "leave", "business_trip"] as const;

const pad = (value: number) => String(value).padStart(2, "0");

const monthRange = (year: number, month: number) => {
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${year}-${pad(month)}-${pad(lastDay)}` };
};

const dayCount = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      DAY_MS,
  ) + 1;

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
  allowance: payrollEntries.allowance,
  scheduledDays: payrollEntries.scheduledDays,
  presentDays: payrollEntries.presentDays,
  lateDays: payrollEntries.lateDays,
  lateMinutes: payrollEntries.lateMinutes,
  alphaDays: payrollEntries.alphaDays,
  excusedDays: payrollEntries.excusedDays,
  permissionDays: payrollEntries.permissionDays,
  overtimeMinutes: payrollEntries.overtimeMinutes,
  mealClaimCount: payrollEntries.mealClaimCount,
  baseAmount: payrollEntries.baseAmount,
  grossAmount: payrollEntries.grossAmount,
  lateDeduction: payrollEntries.lateDeduction,
  alphaDeduction: payrollEntries.alphaDeduction,
  permissionDeduction: payrollEntries.permissionDeduction,
  overtimeAmount: payrollEntries.overtimeAmount,
  otherAdjustment: payrollEntries.otherAdjustment,
  adjustmentNote: payrollEntries.adjustmentNote,
  isHidden: payrollEntries.isHidden,
  paymentMethod: payrollEntries.paymentMethod,
  total: payrollEntries.total,
  paidAt: payrollEntries.paidAt,
  paidBy: payrollEntries.paidBy,
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
      departmentId: employees.departmentId,
      departmentName: departments.name,
      positionId: employees.positionId,
      positionName: positions.name,
    })
    .from(payrollEntries)
    .innerJoin(employees, eq(employees.id, payrollEntries.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(positions, eq(positions.id, employees.positionId))
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
      allowance: employees.allowance,
    })
    .from(employees)
    .where(eq(employees.employmentStatus, "active"));
  const staffIds = staff.map((row) => row.id);

  const scheduleCount = new Map<string, number>();
  const attendanceCount = new Map<string, Map<string, number>>();
  const lateMinutesByEmployee = new Map<string, number>();
  const mealCount = new Map<string, number>();
  const overtimeByUser = new Map<string, number>();
  const excusedByUser = new Map<string, number>();
  const permissionByUser = new Map<string, number>();

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

    const lateMinutes = await db
      .select({
        employeeId: attendanceRecords.employeeId,
        total: sql<string>`coalesce(sum(${attendanceRecords.lateMinutes}), 0)`,
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, from),
          lte(attendanceRecords.date, to),
          inArray(attendanceRecords.employeeId, staffIds),
        ),
      )
      .groupBy(attendanceRecords.employeeId);
    for (const row of lateMinutes)
      lateMinutesByEmployee.set(row.employeeId, Number(row.total));

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
    for (const row of meals)
      mealCount.set(row.employeeId, Number(row.dayCount));
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
        type: requests.type,
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
      const end =
        (row.endDate ?? row.startDate) > to
          ? to
          : (row.endDate ?? row.startDate);
      const days = Math.max(dayCount(start, end), 0);
      excusedByUser.set(
        row.userId,
        (excusedByUser.get(row.userId) ?? 0) + days,
      );
      if (row.type === "permission")
        permissionByUser.set(
          row.userId,
          (permissionByUser.get(row.userId) ?? 0) + days,
        );
    }
  }

  const rates = await getDeductionRates();
  const computed = staff.map((person) => {
    const statusCounts = attendanceCount.get(person.id) ?? new Map();
    const scheduledDays = scheduleCount.get(person.id) ?? 0;
    const presentDays =
      (statusCounts.get("present") ?? 0) +
      (statusCounts.get("late") ?? 0) +
      (statusCounts.get("early_leave") ?? 0) +
      (statusCounts.get("holiday_work") ?? 0);
    const lateDays = statusCounts.get("late") ?? 0;
    const lateMinutes = lateMinutesByEmployee.get(person.id) ?? 0;
    const alphaDays = statusCounts.get("alpha") ?? 0;
    const excusedDays = excusedByUser.get(person.userId) ?? 0;
    const permissionDays = permissionByUser.get(person.userId) ?? 0;
    const overtime = overtimeByUser.get(person.userId) ?? 0;
    const mealClaimCountValue = mealCount.get(person.id) ?? 0;

    const baseSalary = Number(person.baseSalary);
    const allowance = Number(person.allowance);
    const dailyRate =
      person.salaryType === "daily"
        ? baseSalary
        : scheduledDays > 0
          ? baseSalary / scheduledDays
          : baseSalary / 30;
    const baseAmount =
      person.salaryType === "daily" ? dailyRate * presentDays : baseSalary;
    const grossAmount = baseAmount + allowance;
    const lateDeduction = lateMinutes * rates.lateRate;
    const alphaDeduction = alphaDays * rates.alphaRate;
    const permissionDeduction =
      permissionDays * dailyRate * rates.permissionPercent;
    const overtimeAmount = (dailyRate / HOURS_PER_DAY / 60) * overtime;
    const total =
      grossAmount -
      lateDeduction -
      alphaDeduction -
      permissionDeduction +
      overtimeAmount;

    return {
      employeeId: person.id,
      salaryType: person.salaryType,
      baseSalary: money(baseSalary),
      allowance: money(allowance),
      scheduledDays,
      presentDays,
      lateDays,
      lateMinutes,
      alphaDays,
      excusedDays,
      permissionDays,
      overtimeMinutes: overtime,
      mealClaimCount: mealClaimCountValue,
      baseAmount: money(baseAmount),
      grossAmount: money(grossAmount),
      lateDeduction: money(lateDeduction),
      alphaDeduction: money(alphaDeduction),
      permissionDeduction: money(permissionDeduction),
      overtimeAmount: money(overtimeAmount),
      otherAdjustment: "0.00",
      adjustmentNote: "",
      isHidden: false,
      paymentMethod: "transfer",
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
        .values(
          computed.map((row) => ({ ...row, periodId: targetId as string })),
        );
    }
    return targetId as string;
  });

  await db.insert(auditLogs).values({
    userId: actorId,
    action: existing ? "payroll-regenerate" : "payroll-generate",
    entity: "payroll_periods",
    entityId: periodId,
    newValue: {
      year: input.year,
      month: input.month,
      employees: computed.length,
    },
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

  if (update.status === "paid")
    await notifyPayrollPaid(id, period.year, period.month, actorId);

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

type PaymentRow = {
  entryId: string;
  employeeId: string;
  baseSalary: string;
  allowance: string;
  grossAmount: string;
  lateDeduction: string;
  alphaDeduction: string;
  permissionDeduction: string;
  overtimeAmount: string;
  otherAdjustment: string;
  total: string;
  isHidden: boolean;
  paymentMethod: string;
};

const insertPayrollPayments = async (
  actorId: string,
  period: { id: string; year: number; month: number },
  rows: PaymentRow[],
  paymentDate: Date,
) => {
  if (rows.length === 0) return;
  await db.insert(payrollPayments).values(
    rows.map((row) => ({
      periodId: period.id,
      entryId: row.entryId,
      employeeId: row.employeeId,
      periodLabel: `${MONTHS[period.month - 1] ?? period.month} ${period.year}`,
      periodYear: period.year,
      periodMonth: period.month,
      paymentDate,
      baseSalary: row.baseSalary,
      allowance: row.allowance,
      grossAmount: row.grossAmount,
      totalDeduction: money(
        Number(row.lateDeduction) +
          Number(row.alphaDeduction) +
          Number(row.permissionDeduction),
      ),
      overtimeAmount: row.overtimeAmount,
      adjustment: row.otherAdjustment,
      netAmount: row.total,
      status: "paid",
      method: row.paymentMethod,
      isHidden: row.isHidden,
      paidBy: actorId,
    })),
  );
};

// Kirim notifikasi ke setiap karyawan yang belum dibayar pada periode ini.
const notifyPayrollPaid = async (
  periodId: string,
  year: number,
  month: number,
  actorId: string,
) => {
  const label = `${MONTHS[month - 1] ?? month} ${year}`;
  const rows = await db
    .select({
      entryId: payrollEntries.id,
      employeeId: payrollEntries.employeeId,
      userId: employees.userId,
      bankName: employees.bankName,
      bankAccount: employees.bankAccount,
      baseSalary: payrollEntries.baseSalary,
      allowance: payrollEntries.allowance,
      grossAmount: payrollEntries.grossAmount,
      lateDeduction: payrollEntries.lateDeduction,
      alphaDeduction: payrollEntries.alphaDeduction,
      permissionDeduction: payrollEntries.permissionDeduction,
      overtimeAmount: payrollEntries.overtimeAmount,
      otherAdjustment: payrollEntries.otherAdjustment,
      isHidden: payrollEntries.isHidden,
      paymentMethod: payrollEntries.paymentMethod,
      total: payrollEntries.total,
    })
    .from(payrollEntries)
    .innerJoin(employees, eq(employees.id, payrollEntries.employeeId))
    .where(
      and(eq(payrollEntries.periodId, periodId), isNull(payrollEntries.paidAt)),
    );
  if (rows.length === 0) return;

  const now = new Date();
  await db
    .update(payrollEntries)
    .set({ paidAt: now, paidBy: actorId })
    .where(
      and(eq(payrollEntries.periodId, periodId), isNull(payrollEntries.paidAt)),
    );
  await insertPayrollPayments(
    actorId,
    { id: periodId, year, month },
    rows,
    now,
  );

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
      dedupeKey: `payroll-paid:${periodId}:${row.entryId}`,
    });
  }
};

export async function payAnyPayrollEntries(
  actorId: string,
  periodId: string,
  input: PayPayrollEntriesInput,
) {
  const [period] = await db
    .select({
      id: payrollPeriods.id,
      year: payrollPeriods.year,
      month: payrollPeriods.month,
      status: payrollPeriods.status,
    })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, periodId))
    .limit(1);
  if (!period)
    throw new ApiError(404, "NOT_FOUND", "Periode penggajian tidak ditemukan.");
  if (period.status === "draft")
    throw new ApiError(
      409,
      "PAYROLL_NOT_FINALIZED",
      "Finalkan periode terlebih dahulu sebelum membayar gaji.",
    );
  if (period.status === "paid")
    throw new ApiError(409, "PAYROLL_PAID", "Periode ini sudah dibayarkan.");

  const rows = await db
    .select({
      entryId: payrollEntries.id,
      employeeId: payrollEntries.employeeId,
      userId: employees.userId,
      bankName: employees.bankName,
      bankAccount: employees.bankAccount,
      baseSalary: payrollEntries.baseSalary,
      allowance: payrollEntries.allowance,
      grossAmount: payrollEntries.grossAmount,
      lateDeduction: payrollEntries.lateDeduction,
      alphaDeduction: payrollEntries.alphaDeduction,
      permissionDeduction: payrollEntries.permissionDeduction,
      overtimeAmount: payrollEntries.overtimeAmount,
      otherAdjustment: payrollEntries.otherAdjustment,
      isHidden: payrollEntries.isHidden,
      paymentMethod: payrollEntries.paymentMethod,
      total: payrollEntries.total,
      paidAt: payrollEntries.paidAt,
    })
    .from(payrollEntries)
    .innerJoin(employees, eq(employees.id, payrollEntries.employeeId))
    .where(
      and(
        eq(payrollEntries.periodId, periodId),
        inArray(payrollEntries.id, input.entryIds),
      ),
    );
  const unpaid = rows.filter((row) => !row.paidAt);
  if (unpaid.length === 0) return getAnyPayrollPeriod(periodId);

  const now = new Date();
  await db
    .update(payrollEntries)
    .set({ paidAt: now, paidBy: actorId })
    .where(
      and(
        eq(payrollEntries.periodId, periodId),
        inArray(
          payrollEntries.id,
          unpaid.map((row) => row.entryId),
        ),
      ),
    );
  await insertPayrollPayments(actorId, period, unpaid, now);

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "payroll-entries-paid",
    entity: "payroll_entries",
    entityId: periodId,
    newValue: {
      entryIds: unpaid.map((row) => row.entryId),
      paidAt: now.toISOString(),
    },
  });

  const label = `${MONTHS[period.month - 1] ?? period.month} ${period.year}`;
  for (const row of unpaid) {
    const rekening =
      row.bankName || row.bankAccount
        ? ` ke rekening ${row.bankName} ${row.bankAccount}`.trimEnd()
        : "";
    notifyUserInBackground(row.userId, {
      event: `payroll-paid:${periodId}`,
      type: "payroll",
      title: `Gaji ${label} sudah dibayar`,
      body: `Gaji kamu untuk periode ${label} sebesar ${rupiah(Number(row.total))} sudah dibayarkan${rekening}. Terima kasih.`,
      dedupeKey: `payroll-paid:${periodId}:${row.entryId}`,
    });
  }

  const [remaining] = await db
    .select({ value: count() })
    .from(payrollEntries)
    .where(
      and(eq(payrollEntries.periodId, periodId), isNull(payrollEntries.paidAt)),
    );
  if (Number(remaining?.value ?? 0) === 0) {
    await db
      .update(payrollPeriods)
      .set({ status: "paid", paidBy: actorId, paidAt: now })
      .where(eq(payrollPeriods.id, periodId));
    await db.insert(auditLogs).values({
      userId: actorId,
      action: "payroll-paid",
      entity: "payroll_periods",
      entityId: periodId,
      newValue: { status: "paid", paidAt: now.toISOString() },
    });
  }

  return getAnyPayrollPeriod(periodId);
}

export async function getAnyPayrollEntryAttendance(id: string) {
  const [entry] = await db
    .select({
      id: payrollEntries.id,
      employeeId: payrollEntries.employeeId,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      scheduledDays: payrollEntries.scheduledDays,
      presentDays: payrollEntries.presentDays,
      lateDays: payrollEntries.lateDays,
      lateMinutes: payrollEntries.lateMinutes,
      alphaDays: payrollEntries.alphaDays,
      excusedDays: payrollEntries.excusedDays,
      permissionDays: payrollEntries.permissionDays,
      overtimeMinutes: payrollEntries.overtimeMinutes,
      periodYear: payrollPeriods.year,
      periodMonth: payrollPeriods.month,
      periodStatus: payrollPeriods.status,
    })
    .from(payrollEntries)
    .innerJoin(employees, eq(employees.id, payrollEntries.employeeId))
    .innerJoin(payrollPeriods, eq(payrollPeriods.id, payrollEntries.periodId))
    .where(eq(payrollEntries.id, id))
    .limit(1);
  if (!entry)
    throw new ApiError(404, "NOT_FOUND", "Baris penggajian tidak ditemukan.");

  const { from, to } = monthRange(entry.periodYear, entry.periodMonth);
  const records = await db
    .select({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      checkInTime: attendanceRecords.checkInTime,
      checkOutTime: attendanceRecords.checkOutTime,
      status: attendanceRecords.status,
      lateMinutes: attendanceRecords.lateMinutes,
      notes: attendanceRecords.notes,
      shiftName: shifts.name,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
    .from(attendanceRecords)
    .leftJoin(
      workSchedules,
      eq(workSchedules.id, attendanceRecords.workScheduleId),
    )
    .leftJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .where(
      and(
        eq(attendanceRecords.employeeId, entry.employeeId),
        gte(attendanceRecords.date, from),
        lte(attendanceRecords.date, to),
      ),
    )
    .orderBy(asc(attendanceRecords.date));

  return {
    entry: {
      id: entry.id,
      employeeName: entry.employeeName,
      employeeNik: entry.employeeNik,
      scheduledDays: entry.scheduledDays,
      presentDays: entry.presentDays,
      lateDays: entry.lateDays,
      lateMinutes: entry.lateMinutes,
      alphaDays: entry.alphaDays,
      excusedDays: entry.excusedDays,
      permissionDays: entry.permissionDays,
      overtimeMinutes: entry.overtimeMinutes,
      year: entry.periodYear,
      month: entry.periodMonth,
      status: entry.periodStatus,
    },
    records,
    meta: { from, to },
  };
}

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
  const onlyHidden = Object.keys(input).every((key) => key === "isHidden");
  if (row.periodStatus !== "draft" && !onlyHidden)
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
    Number(row.entry.grossAmount) -
    Number(row.entry.lateDeduction) -
    Number(row.entry.alphaDeduction) -
    Number(row.entry.permissionDeduction) +
    Number(row.entry.overtimeAmount) +
    Number(otherAdjustment);

  await db
    .update(payrollEntries)
    .set({
      otherAdjustment,
      ...(input.adjustmentNote !== undefined
        ? { adjustmentNote: input.adjustmentNote }
        : {}),
      ...(input.isHidden !== undefined ? { isHidden: input.isHidden } : {}),
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

export async function getDailyPayroll(date: string) {
  const rates = await getDeductionRates();
  const scheduled = await db
    .select({
      userId: employees.userId,
      employeeId: employees.id,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      photoUrl: employees.photoUrl,
      salaryType: employees.salaryType,
      baseSalary: employees.baseSalary,
      bankName: employees.bankName,
      bankAccount: employees.bankAccount,
      bankAccountName: employees.bankAccountName,
      departmentName: departments.name,
      positionId: employees.positionId,
      positionName: positions.name,
    })
    .from(workSchedules)
    .innerJoin(employees, eq(employees.id, workSchedules.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(positions, eq(positions.id, employees.positionId))
    .where(
      and(
        eq(workSchedules.date, date),
        eq(employees.employmentStatus, "active"),
      ),
    )
    .orderBy(asc(employees.fullName));

  const attendance = await db
    .select({
      employeeId: attendanceRecords.employeeId,
      status: attendanceRecords.status,
      lateMinutes: attendanceRecords.lateMinutes,
      notes: attendanceRecords.notes,
      checkInTime: attendanceRecords.checkInTime,
      checkOutTime: attendanceRecords.checkOutTime,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.date, date));
  const attendanceByEmployee = new Map(
    attendance.map((row) => [row.employeeId, row]),
  );

  const permissions = await db
    .select({ userId: requests.userId })
    .from(requests)
    .where(
      and(
        eq(requests.type, "permission"),
        eq(requests.status, "approved"),
        lte(requests.startDate, date),
        or(isNull(requests.endDate), gte(requests.endDate, date)),
      ),
    );
  const permissionUsers = new Set(permissions.map((row) => row.userId));

  const payments = await db
    .select({ employeeId: payrollPayments.employeeId })
    .from(payrollPayments)
    .where(eq(payrollPayments.periodLabel, date));
  const paidEmployees = new Set(payments.map((row) => row.employeeId));

  const [year, month] = date.split("-").map(Number);
  const rows = scheduled.map((person) => {
    const record = attendanceByEmployee.get(person.employeeId);
    const hasPermission = permissionUsers.has(person.userId);
    const dailyRate =
      person.salaryType === "daily"
        ? Number(person.baseSalary)
        : Number(person.baseSalary) / 30;
    const lateMinutes = record?.lateMinutes ?? 0;
    const alphaDays = !record && !hasPermission ? 1 : 0;
    const permissionDays = !record && hasPermission ? 1 : 0;
    const lateDeduction = lateMinutes * rates.lateRate;
    const alphaDeduction = alphaDays * rates.alphaRate;
    const permissionDeduction =
      permissionDays * dailyRate * rates.permissionPercent;
    const grossAmount = dailyRate;
    const netAmount =
      grossAmount - lateDeduction - alphaDeduction - permissionDeduction;

    return {
      ...person,
      status: record?.status ?? (hasPermission ? "permission" : "alpha"),
      checkInTime: record?.checkInTime ?? null,
      checkOutTime: record?.checkOutTime ?? null,
      lateMinutes,
      alphaDays,
      permissionDays,
      baseAmount: money(grossAmount),
      lateDeduction: money(lateDeduction),
      alphaDeduction: money(alphaDeduction),
      permissionDeduction: money(permissionDeduction),
      totalDeduction: money(
        lateDeduction + alphaDeduction + permissionDeduction,
      ),
      netAmount: money(netAmount),
      isPaid: paidEmployees.has(person.employeeId),
    };
  });

  return { date, year, month, rates, rows };
}

export async function payDailyPayroll(
  actorId: string,
  input: PayDailyPayrollInput,
) {
  const { date, year, month, rows } = await getDailyPayroll(input.date);
  const selected = rows.filter(
    (row) => input.employeeIds.includes(row.employeeId) && !row.isPaid,
  );
  if (selected.length === 0) return { paid: 0 };

  const now = new Date();
  await db.insert(payrollPayments).values(
    selected.map((row) => ({
      employeeId: row.employeeId,
      periodLabel: date,
      periodYear: year,
      periodMonth: month,
      paymentDate: now,
      baseSalary: row.baseAmount,
      allowance: "0.00",
      grossAmount: row.baseAmount,
      totalDeduction: row.totalDeduction,
      overtimeAmount: "0.00",
      adjustment: "0.00",
      netAmount: row.netAmount,
      status: "paid",
      method: input.method,
      isHidden: false,
      paidBy: actorId,
    })),
  );

  for (const row of selected) {
    notifyUserInBackground(row.userId, {
      event: `payroll-daily-paid:${date}`,
      type: "payroll",
      title: `Gaji harian ${date} sudah dibayar`,
      body: `Gaji harian kamu untuk ${date} sebesar ${rupiah(Number(row.netAmount))} sudah dibayarkan. Terima kasih.`,
      dedupeKey: `payroll-daily-paid:${date}:${row.employeeId}`,
    });
  }

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "payroll-daily-paid",
    entity: "payroll_payments",
    entityId: date,
    newValue: {
      date,
      employees: selected.map((row) => row.employeeId),
      method: input.method,
    },
  });

  return { paid: selected.length };
}

export async function listAnyPayrollPayments(query: PayrollPaymentListInput) {
  const conditions = [];
  if (query.year) conditions.push(eq(payrollPayments.periodYear, query.year));
  if (query.month)
    conditions.push(eq(payrollPayments.periodMonth, query.month));
  if (query.positionId)
    conditions.push(eq(employees.positionId, query.positionId));

  const rows = await db
    .select({
      id: payrollPayments.id,
      employeeId: payrollPayments.employeeId,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      photoUrl: employees.photoUrl,
      departmentName: departments.name,
      positionName: positions.name,
      periodLabel: payrollPayments.periodLabel,
      periodYear: payrollPayments.periodYear,
      periodMonth: payrollPayments.periodMonth,
      paymentDate: payrollPayments.paymentDate,
      baseSalary: payrollPayments.baseSalary,
      allowance: payrollPayments.allowance,
      grossAmount: payrollPayments.grossAmount,
      totalDeduction: payrollPayments.totalDeduction,
      overtimeAmount: payrollPayments.overtimeAmount,
      adjustment: payrollPayments.adjustment,
      netAmount: payrollPayments.netAmount,
      status: payrollPayments.status,
      method: payrollPayments.method,
      isHidden: payrollPayments.isHidden,
    })
    .from(payrollPayments)
    .innerJoin(employees, eq(employees.id, payrollPayments.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(positions, eq(positions.id, employees.positionId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(payrollPayments.paymentDate))
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

export async function getAnyPayrollPayment(id: string) {
  const [row] = await db
    .select({
      id: payrollPayments.id,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      photoUrl: employees.photoUrl,
      departmentName: departments.name,
      positionName: positions.name,
      bankName: employees.bankName,
      bankAccount: employees.bankAccount,
      bankAccountName: employees.bankAccountName,
      periodLabel: payrollPayments.periodLabel,
      paymentDate: payrollPayments.paymentDate,
      baseSalary: payrollPayments.baseSalary,
      allowance: payrollPayments.allowance,
      grossAmount: payrollPayments.grossAmount,
      totalDeduction: payrollPayments.totalDeduction,
      overtimeAmount: payrollPayments.overtimeAmount,
      adjustment: payrollPayments.adjustment,
      netAmount: payrollPayments.netAmount,
      status: payrollPayments.status,
      method: payrollPayments.method,
      isHidden: payrollPayments.isHidden,
    })
    .from(payrollPayments)
    .innerJoin(employees, eq(employees.id, payrollPayments.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(positions, eq(positions.id, employees.positionId))
    .where(eq(payrollPayments.id, id))
    .limit(1);

  if (!row)
    throw new ApiError(404, "NOT_FOUND", "Riwayat pembayaran tidak ditemukan.");

  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .limit(1);
  return { ...row, companyName: company?.name ?? "HadirKu" };
}
