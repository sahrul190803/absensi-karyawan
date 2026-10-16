import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  companies,
  employees,
  leaveBalances,
  leaveTypes,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { AdminLeaveBalanceUpdateInput } from "@/validators/leave";

const DEFAULT_LEAVE_TYPE = "Cuti Tahunan";

const currentYearInTimezone = async () => {
  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .limit(1);
  const timezone = company?.timezone ?? "Asia/Jakarta";
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric" })
      .format(new Date())
      .slice(0, 4),
  );
};

const requireEmployee = async (userId: string) => {
  const [employee] = await db
    .select({ id: employees.id, fullName: employees.fullName })
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

export async function ensureBalances(employeeId: string, year: number) {
  const types = await db
    .select({
      id: leaveTypes.id,
      name: leaveTypes.name,
      defaultQuota: leaveTypes.defaultQuota,
    })
    .from(leaveTypes)
    .where(eq(leaveTypes.active, true))
    .orderBy(asc(leaveTypes.name));
  for (const type of types) {
    await db
      .insert(leaveBalances)
      .values({
        employeeId,
        leaveTypeId: type.id,
        year,
        openingBalance: type.defaultQuota,
      })
      .onConflictDoNothing({
        target: [
          leaveBalances.employeeId,
          leaveBalances.leaveTypeId,
          leaveBalances.year,
        ],
      });
  }
}

export async function listBalancesForEmployee(
  employeeId: string,
  year: number,
) {
  await ensureBalances(employeeId, year);
  const rows = await db
    .select({
      id: leaveBalances.id,
      year: leaveBalances.year,
      openingBalance: leaveBalances.openingBalance,
      used: leaveBalances.used,
      leaveTypeId: leaveTypes.id,
      leaveTypeName: leaveTypes.name,
    })
    .from(leaveBalances)
    .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
    .where(
      and(
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.year, year),
      ),
    )
    .orderBy(asc(leaveTypes.name));
  return rows.map((row) => ({
    ...row,
    remaining: row.openingBalance - row.used,
  }));
}

export async function listOwnLeaveBalances(
  userId: string,
  year?: number,
) {
  const employee = await requireEmployee(userId);
  const targetYear = year ?? (await currentYearInTimezone());
  return {
    employee,
    year: targetYear,
    data: await listBalancesForEmployee(employee.id, targetYear),
  };
}

export async function listAnyLeaveBalances(
  employeeId: string,
  year?: number,
) {
  const [employee] = await db
    .select({ id: employees.id, fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee)
    throw new ApiError(404, "NOT_FOUND", "Karyawan tidak ditemukan.");
  const targetYear = year ?? (await currentYearInTimezone());
  return {
    employee,
    year: targetYear,
    data: await listBalancesForEmployee(employee.id, targetYear),
  };
}

const inclusiveDays = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  ) + 1;

export async function deductLeaveForApprovedRequest(
  requestUserId: string,
  startDate: string,
  endDate: string,
) {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, requestUserId))
    .limit(1);
  if (!employee)
    throw new ApiError(
      404,
      "NOT_EMPLOYEE",
      "Pemohon belum terhubung ke data karyawan.",
    );

  const [type] = await db
    .select({ id: leaveTypes.id })
    .from(leaveTypes)
    .where(
      and(eq(leaveTypes.active, true), eq(leaveTypes.name, DEFAULT_LEAVE_TYPE)),
    )
    .limit(1);
  const [fallbackType] = type
    ? [type]
    : await db
        .select({ id: leaveTypes.id })
        .from(leaveTypes)
        .where(eq(leaveTypes.active, true))
        .orderBy(asc(leaveTypes.name))
        .limit(1);
  if (!fallbackType)
    throw new ApiError(
      422,
      "NO_LEAVE_TYPE",
      "Belum ada jenis cuti yang dikonfigurasi.",
    );

  const year = Number(startDate.slice(0, 4));
  const days = inclusiveDays(startDate, endDate);
  await ensureBalances(employee.id, year);
  const [balance] = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.employeeId, employee.id),
        eq(leaveBalances.leaveTypeId, fallbackType.id),
        eq(leaveBalances.year, year),
      ),
    )
    .limit(1);
  if (!balance)
    throw new ApiError(404, "NOT_FOUND", "Saldo cuti tidak ditemukan.");
  const remaining = balance.openingBalance - balance.used;
  if (remaining < days)
    throw new ApiError(
      422,
      "INSUFFICIENT_LEAVE_BALANCE",
      `Saldo cuti tidak cukup (tersisa ${remaining} hari, dibutuhkan ${days} hari).`,
    );

  await db
    .update(leaveBalances)
    .set({ used: balance.used + days })
    .where(eq(leaveBalances.id, balance.id));

  return { days, leaveTypeId: fallbackType.id, year };
}

// Ringkasan kuota seluruh karyawan untuk satu tahun. Baris yang belum pernah
// diatur memakai defaultQuota jenis cuti sebagai usulan nilai awal.
export async function listAnyLeaveQuotaOverview(year?: number) {
  const targetYear = year ?? (await currentYearInTimezone());
  const types = await db
    .select({
      id: leaveTypes.id,
      name: leaveTypes.name,
      defaultQuota: leaveTypes.defaultQuota,
    })
    .from(leaveTypes)
    .where(eq(leaveTypes.active, true))
    .orderBy(asc(leaveTypes.name));
  const people = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      nik: employees.nik,
    })
    .from(employees)
    .orderBy(asc(employees.fullName))
    .limit(500);
  const rows = await db
    .select({
      employeeId: leaveBalances.employeeId,
      leaveTypeId: leaveBalances.leaveTypeId,
      openingBalance: leaveBalances.openingBalance,
      used: leaveBalances.used,
    })
    .from(leaveBalances)
    .where(eq(leaveBalances.year, targetYear));
  const byEmployee = new Map<
    string,
    Map<string, { openingBalance: number; used: number }>
  >();
  for (const row of rows) {
    const bucket = byEmployee.get(row.employeeId) ?? new Map();
    bucket.set(row.leaveTypeId, {
      openingBalance: row.openingBalance,
      used: row.used,
    });
    byEmployee.set(row.employeeId, bucket);
  }
  return {
    year: targetYear,
    leaveTypes: types,
    employees: people.map((person) => ({
      ...person,
      balances: types.map((type) => {
        const existing = byEmployee.get(person.id)?.get(type.id);
        return {
          leaveTypeId: type.id,
          openingBalance: existing?.openingBalance ?? type.defaultQuota,
          used: existing?.used ?? 0,
          configured: Boolean(existing),
        };
      }),
    })),
  };
}

export async function updateAnyLeaveBalances(
  actorUserId: string,
  input: AdminLeaveBalanceUpdateInput,
) {
  const { employeeId, year, balances } = input;
  const [employee] = await db
    .select({ id: employees.id, fullName: employees.fullName })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee)
    throw new ApiError(404, "NOT_FOUND", "Karyawan tidak ditemukan.");

  const types = await db
    .select({ id: leaveTypes.id, name: leaveTypes.name })
    .from(leaveTypes)
    .where(
      inArray(
        leaveTypes.id,
        balances.map((item) => item.leaveTypeId),
      ),
    );
  for (const item of balances) {
    if (!types.some((type) => type.id === item.leaveTypeId))
      throw new ApiError(
        422,
        "INVALID_LEAVE_TYPE",
        "Jenis cuti tidak dikenal.",
      );
  }

  const existing = await db
    .select({
      leaveTypeId: leaveBalances.leaveTypeId,
      openingBalance: leaveBalances.openingBalance,
      used: leaveBalances.used,
    })
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.year, year),
      ),
    );
  const before = new Map(existing.map((row) => [row.leaveTypeId, row]));

  const changes: {
    leaveTypeId: string;
    before: number;
    after: number;
  }[] = [];
  for (const item of balances) {
    const current = before.get(item.leaveTypeId);
    if (current && item.openingBalance < current.used)
      throw new ApiError(
        422,
        "QUOTA_BELOW_USED",
        `Kuota tidak boleh lebih kecil dari pemakaian (terpakai ${current.used} hari).`,
      );
    if (current?.openingBalance === item.openingBalance) continue;
    await db
      .insert(leaveBalances)
      .values({
        employeeId,
        leaveTypeId: item.leaveTypeId,
        year,
        openingBalance: item.openingBalance,
        used: current?.used ?? 0,
      })
      .onConflictDoUpdate({
        target: [
          leaveBalances.employeeId,
          leaveBalances.leaveTypeId,
          leaveBalances.year,
        ],
        set: { openingBalance: item.openingBalance },
      });
    changes.push({
      leaveTypeId: item.leaveTypeId,
      before: current?.openingBalance ?? 0,
      after: item.openingBalance,
    });
  }

  if (changes.length > 0) {
    await db.insert(auditLogs).values({
      userId: actorUserId,
      action: "leave-quota-update",
      entity: "leave_balances",
      entityId: employeeId,
      oldValue: {
        year,
        balances: changes.map((change) => ({
          leaveTypeId: change.leaveTypeId,
          openingBalance: change.before,
        })),
      },
      newValue: {
        year,
        balances: changes.map((change) => ({
          leaveTypeId: change.leaveTypeId,
          openingBalance: change.after,
        })),
      },
    });
  }

  return {
    employee,
    year,
    changed: changes.length,
    data: await listBalancesForEmployee(employeeId, year),
  };
}
