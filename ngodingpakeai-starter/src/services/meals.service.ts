import "server-only";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  companies,
  departments,
  employees,
  mealClaims,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { MealClaimInput, MealQueryInput } from "@/validators/meals";

const fields = {
  id: mealClaims.id,
  employeeId: mealClaims.employeeId,
  date: mealClaims.date,
  session: mealClaims.session,
  note: mealClaims.note,
  claimedAt: mealClaims.claimedAt,
};

const dateInTimezone = (timeZone: string, value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const todayInCompanyTimezone = async () => {
  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .limit(1);
  return dateInTimezone(company?.timezone ?? "Asia/Jakarta", new Date());
};

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

export async function getOwnMeals(userId: string) {
  const employee = await requireEmployee(userId);
  const today = await todayInCompanyTimezone();

  const [todayClaim] = await db
    .select(fields)
    .from(mealClaims)
    .where(
      and(eq(mealClaims.employeeId, employee.id), eq(mealClaims.date, today)),
    )
    .limit(1);

  const history = await db
    .select(fields)
    .from(mealClaims)
    .where(eq(mealClaims.employeeId, employee.id))
    .orderBy(desc(mealClaims.date))
    .limit(31);

  return { data: { today, todayClaim: todayClaim ?? null, history } };
}

export async function claimOwnMeal(userId: string, input: MealClaimInput) {
  const employee = await requireEmployee(userId);
  const today = await todayInCompanyTimezone();

  const [row] = await db
    .insert(mealClaims)
    .values({
      employeeId: employee.id,
      date: today,
      session: input.session,
      note: input.note,
    })
    .onConflictDoNothing({
      target: [mealClaims.employeeId, mealClaims.date],
    })
    .returning(fields);

  if (!row)
    throw new ApiError(
      409,
      "ALREADY_CLAIMED",
      "Klaim makan hari ini sudah tercatat.",
    );

  await db.insert(auditLogs).values({
    userId,
    action: "meal-claim",
    entity: "meal_claims",
    entityId: row.id,
    newValue: { date: today, session: input.session },
  });

  return row;
}

export async function listAnyMealClaims(query: MealQueryInput) {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(mealClaims.date, query.from));
  if (query.to) conditions.push(lte(mealClaims.date, query.to));
  if (query.departmentId)
    conditions.push(eq(employees.departmentId, query.departmentId));

  const rows = await db
    .select({
      ...fields,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      departmentName: departments.name,
    })
    .from(mealClaims)
    .innerJoin(employees, eq(employees.id, mealClaims.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(mealClaims.date), desc(mealClaims.claimedAt))
    .limit(query.limit + 1)
    .offset(query.offset);

  const data = rows.slice(0, query.limit);
  const totals = data.reduce(
    (acc, row) => ({
      total: acc.total + 1,
      pagi: acc.pagi + (row.session === "pagi" ? 1 : 0),
      siang: acc.siang + (row.session === "siang" ? 1 : 0),
      malam: acc.malam + (row.session === "malam" ? 1 : 0),
    }),
    { total: 0, pagi: 0, siang: 0, malam: 0 },
  );

  return {
    data,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
      totals,
    },
  };
}

export async function deleteAnyMealClaim(actorId: string, id: string) {
  const [row] = await db
    .delete(mealClaims)
    .where(eq(mealClaims.id, id))
    .returning({
      id: mealClaims.id,
      employeeId: mealClaims.employeeId,
      date: mealClaims.date,
      session: mealClaims.session,
    });
  if (!row)
    throw new ApiError(404, "NOT_FOUND", "Klaim makan tidak ditemukan.");
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "meal-claim-delete",
    entity: "meal_claims",
    entityId: id,
    oldValue: { employeeId: row.employeeId, date: row.date, session: row.session },
  });
  return row;
}
