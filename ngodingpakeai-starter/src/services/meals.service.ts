import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  auditLogs,
  companies,
  departments,
  employees,
  mealClaims,
  shifts,
  workSchedules,
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

type Totals = { total: number; pagi: number; siang: number; malam: number };

const emptyTotals = (): Totals => ({
  total: 0,
  pagi: 0,
  siang: 0,
  malam: 0,
});

const claimConditions = (query: MealQueryInput) => {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(mealClaims.date, query.from));
  if (query.to) conditions.push(lte(mealClaims.date, query.to));
  if (query.departmentId)
    conditions.push(eq(employees.departmentId, query.departmentId));
  if (query.positionId)
    conditions.push(eq(employees.positionId, query.positionId));
  return conditions;
};

const claimTotals = async (conditions: SQL[]): Promise<Totals> => {
  const [row] = await db
    .select({
      total: count(),
      pagi: sql<number>`count(*) filter (where ${mealClaims.session} = 'pagi')`.mapWith(
        Number,
      ),
      siang: sql<number>`count(*) filter (where ${mealClaims.session} = 'siang')`.mapWith(
        Number,
      ),
      malam: sql<number>`count(*) filter (where ${mealClaims.session} = 'malam')`.mapWith(
        Number,
      ),
    })
    .from(mealClaims)
    .innerJoin(employees, eq(employees.id, mealClaims.employeeId))
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return row ?? emptyTotals();
};

const scheduleSession = sql<string>`
  case
    when lower(${shifts.name}) like '%malam%' then 'malam'
    when lower(${shifts.name}) like '%siang%' then 'siang'
    when lower(${shifts.name}) like '%pagi%' then 'pagi'
    when ${shifts.crossesMidnight} then 'malam'
    when extract(hour from ${shifts.startTime}) >= 17 then 'malam'
    when extract(hour from ${shifts.startTime}) >= 11 then 'siang'
    when extract(hour from (${attendanceRecords.checkInTime} at time zone 'Asia/Jakarta')) >= 17 then 'malam'
    when extract(hour from (${attendanceRecords.checkInTime} at time zone 'Asia/Jakarta')) >= 11 then 'siang'
    else 'pagi'
  end
`;

const unclaimedConditions = (query: MealQueryInput) => {
  const conditions: SQL[] = [
    isNotNull(attendanceRecords.checkInTime),
    ne(attendanceRecords.status, "alpha"),
    eq(employees.employmentStatus, "active"),
    isNull(mealClaims.id),
  ];
  if (query.from) conditions.push(gte(attendanceRecords.date, query.from));
  if (query.to) conditions.push(lte(attendanceRecords.date, query.to));
  if (query.departmentId)
    conditions.push(eq(employees.departmentId, query.departmentId));
  if (query.positionId)
    conditions.push(eq(employees.positionId, query.positionId));
  return conditions;
};

const unclaimedTotals = async (query: MealQueryInput): Promise<Totals> => {
  const [row] = await db
    .select({
      total: count(),
      pagi: sql<number>`count(*) filter (where ${scheduleSession} = 'pagi')`.mapWith(
        Number,
      ),
      siang: sql<number>`count(*) filter (where ${scheduleSession} = 'siang')`.mapWith(
        Number,
      ),
      malam: sql<number>`count(*) filter (where ${scheduleSession} = 'malam')`.mapWith(
        Number,
      ),
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(employees.id, attendanceRecords.employeeId))
    .leftJoin(
      workSchedules,
      and(
        eq(workSchedules.employeeId, attendanceRecords.employeeId),
        eq(workSchedules.date, attendanceRecords.date),
      ),
    )
    .leftJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .leftJoin(
      mealClaims,
      and(
        eq(mealClaims.employeeId, attendanceRecords.employeeId),
        eq(mealClaims.date, attendanceRecords.date),
      ),
    )
    .where(and(...unclaimedConditions(query)));
  return row ?? emptyTotals();
};

export async function listAnyMealClaims(query: MealQueryInput) {
  const conditions = claimConditions(query);
  const [totals, unclaimed] = await Promise.all([
    claimTotals(conditions),
    unclaimedTotals(query),
  ]);

  const detailConditions = [...conditions];
  if (query.session)
    detailConditions.push(eq(mealClaims.session, query.session));

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
    .where(
      detailConditions.length > 0 ? and(...detailConditions) : undefined,
    )
    .orderBy(desc(mealClaims.date), desc(mealClaims.claimedAt))
    .limit(query.limit + 1)
    .offset(query.offset);

  return {
    data: rows.slice(0, query.limit),
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
      totals,
      unclaimed,
    },
  };
}

export async function listAnyUnclaimedMeals(query: MealQueryInput) {
  const conditions = unclaimedConditions(query);
  const totals = await unclaimedTotals(query);

  const detailConditions = [...conditions];
  if (query.session)
    detailConditions.push(sql`${scheduleSession} = ${query.session}`);

  const rows = await db
    .select({
      employeeId: attendanceRecords.employeeId,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      departmentName: departments.name,
      date: attendanceRecords.date,
      session: scheduleSession,
      shiftName: shifts.name,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(employees.id, attendanceRecords.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(
      workSchedules,
      and(
        eq(workSchedules.employeeId, attendanceRecords.employeeId),
        eq(workSchedules.date, attendanceRecords.date),
      ),
    )
    .leftJoin(shifts, eq(shifts.id, workSchedules.shiftId))
    .leftJoin(
      mealClaims,
      and(
        eq(mealClaims.employeeId, attendanceRecords.employeeId),
        eq(mealClaims.date, attendanceRecords.date),
      ),
    )
    .where(and(...detailConditions))
    .orderBy(
      desc(attendanceRecords.date),
      asc(employees.fullName),
    )
    .limit(query.limit + 1)
    .offset(query.offset);

  return {
    data: rows.slice(0, query.limit),
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
