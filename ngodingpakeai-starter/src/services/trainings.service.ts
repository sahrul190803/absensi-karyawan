import "server-only";
import { and, asc, eq, gte, isNull, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, companies, departments, employees, trainings } from "@/db/schema";
import { ApiError } from "@/lib/api";
import type {
  TrainingCreateInput,
  TrainingQueryInput,
  TrainingUpdateInput,
} from "@/validators/trainings";

const fields = {
  id: trainings.id,
  title: trainings.title,
  date: trainings.date,
  startTime: trainings.startTime,
  endTime: trainings.endTime,
  place: trainings.place,
  departmentId: trainings.departmentId,
  departmentName: departments.name,
  notes: trainings.notes,
  createdAt: trainings.createdAt,
  updatedAt: trainings.updatedAt,
};

const dateInTimezone = (timeZone: string, value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const getTrainingRow = async (id: string) => {
  const [row] = await db
    .select(fields)
    .from(trainings)
    .leftJoin(departments, eq(departments.id, trainings.departmentId))
    .where(eq(trainings.id, id))
    .limit(1);
  return row;
};

const assertDepartment = async (departmentId: string) => {
  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.id, departmentId))
    .limit(1);
  if (!department)
    throw new ApiError(404, "NOT_FOUND", "Departemen tidak ditemukan.");
};

export async function listAnyTrainings(query: TrainingQueryInput) {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(trainings.date, query.from));
  if (query.to) conditions.push(lte(trainings.date, query.to));
  if (query.departmentId)
    conditions.push(eq(trainings.departmentId, query.departmentId));

  const rows = await db
    .select(fields)
    .from(trainings)
    .leftJoin(departments, eq(departments.id, trainings.departmentId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(trainings.date), asc(trainings.startTime))
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

export async function listOwnTrainings(userId: string) {
  const [employee] = await db
    .select({ id: employees.id, departmentId: employees.departmentId })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);
  if (!employee)
    throw new ApiError(
      404,
      "NOT_EMPLOYEE",
      "Akun ini belum terhubung ke data karyawan.",
    );

  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .limit(1);
  const today = dateInTimezone(company?.timezone ?? "Asia/Jakarta", new Date());

  const scope = employee.departmentId
    ? or(
        isNull(trainings.departmentId),
        eq(trainings.departmentId, employee.departmentId),
      )
    : isNull(trainings.departmentId);

  const rows = await db
    .select(fields)
    .from(trainings)
    .leftJoin(departments, eq(departments.id, trainings.departmentId))
    .where(and(gte(trainings.date, today), scope))
    .orderBy(asc(trainings.date), asc(trainings.startTime))
    .limit(50);

  return { data: rows, meta: { from: today } };
}

export async function createAnyTraining(
  actorId: string,
  input: TrainingCreateInput,
) {
  if (input.departmentId) await assertDepartment(input.departmentId);
  const [row] = await db
    .insert(trainings)
    .values({
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      place: input.place,
      departmentId: input.departmentId ?? null,
      notes: input.notes,
      createdBy: actorId,
    })
    .returning({ id: trainings.id });
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "training-create",
    entity: "trainings",
    entityId: row.id,
    newValue: {
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      departmentId: input.departmentId ?? null,
    },
  });
  return getTrainingRow(row.id);
}

export async function updateAnyTraining(
  actorId: string,
  id: string,
  input: TrainingUpdateInput,
) {
  const existing = await getTrainingRow(id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Training tidak ditemukan.");
  if (input.departmentId) await assertDepartment(input.departmentId);

  await db
    .update(trainings)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      ...(input.place !== undefined ? { place: input.place } : {}),
      ...(input.departmentId !== undefined
        ? { departmentId: input.departmentId ?? null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    })
    .where(eq(trainings.id, id));

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "training-update",
    entity: "trainings",
    entityId: id,
    oldValue: {
      title: existing.title,
      date: existing.date,
      startTime: existing.startTime,
      endTime: existing.endTime,
      departmentId: existing.departmentId,
    },
    newValue: input,
  });
  return getTrainingRow(id);
}

export async function deleteAnyTraining(actorId: string, id: string) {
  const existing = await getTrainingRow(id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Training tidak ditemukan.");
  await db.delete(trainings).where(eq(trainings.id, id));
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "training-delete",
    entity: "trainings",
    entityId: id,
    oldValue: {
      title: existing.title,
      date: existing.date,
      departmentId: existing.departmentId,
    },
  });
  return { id };
}
