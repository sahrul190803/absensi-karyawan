import "server-only";
import {
  and,
  asc,
  eq,
  exists,
  gte,
  inArray,
  lte,
  notExists,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  companies,
  departments,
  employees,
  positions,
  trainingParticipants,
  trainings,
} from "@/db/schema";
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
  notes: trainings.notes,
  createdAt: trainings.createdAt,
  updatedAt: trainings.updatedAt,
};

type Participant = {
  employeeId: string;
  fullName: string;
  nik: string;
  departmentName: string | null;
  positionName: string | null;
};

const participantsForTrainings = async (trainingIds: string[]) => {
  const grouped = new Map<string, Participant[]>();
  if (trainingIds.length === 0) return grouped;
  const rows = await db
    .select({
      trainingId: trainingParticipants.trainingId,
      employeeId: trainingParticipants.employeeId,
      fullName: employees.fullName,
      nik: employees.nik,
      departmentName: departments.name,
      positionName: positions.name,
    })
    .from(trainingParticipants)
    .innerJoin(employees, eq(employees.id, trainingParticipants.employeeId))
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(positions, eq(positions.id, employees.positionId))
    .where(inArray(trainingParticipants.trainingId, trainingIds))
    .orderBy(asc(employees.fullName));
  for (const row of rows) {
    const bucket = grouped.get(row.trainingId) ?? [];
    bucket.push({
      employeeId: row.employeeId,
      fullName: row.fullName,
      nik: row.nik,
      departmentName: row.departmentName,
      positionName: row.positionName,
    });
    grouped.set(row.trainingId, bucket);
  }
  return grouped;
};

const withParticipants = async <T extends { id: string }>(rows: T[]) => {
  const grouped = await participantsForTrainings(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    participants: grouped.get(row.id) ?? [],
  }));
};

const getTrainingRow = async (id: string) => {
  const [row] = await db
    .select(fields)
    .from(trainings)
    .where(eq(trainings.id, id))
    .limit(1);
  if (!row) return undefined;
  const [withList] = await withParticipants([row]);
  return withList;
};

const normalizeEmployeeIds = async (employeeIds: string[]) => {
  const unique = [...new Set(employeeIds)];
  if (unique.length === 0) return unique;
  const rows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(inArray(employees.id, unique));
  if (rows.length !== unique.length)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Ada karyawan yang tidak ditemukan pada daftar peserta.",
    );
  return unique;
};

const dateInTimezone = (timeZone: string, value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

export async function listAnyTrainings(query: TrainingQueryInput) {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(trainings.date, query.from));
  if (query.to) conditions.push(lte(trainings.date, query.to));

  const rows = await db
    .select(fields)
    .from(trainings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(trainings.date), asc(trainings.startTime))
    .limit(query.limit + 1)
    .offset(query.offset);

  const data = await withParticipants(rows.slice(0, query.limit));

  return {
    data,
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}

// Jadwal untuk satu karyawan: training tanpa peserta (semua karyawan) atau
// training yang mencantumkan karyawan ini sebagai peserta.
export async function listOwnTrainings(userId: string) {
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

  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .limit(1);
  const today = dateInTimezone(company?.timezone ?? "Asia/Jakarta", new Date());

  const rows = await db
    .select(fields)
    .from(trainings)
    .where(
      and(
        gte(trainings.date, today),
        or(
          notExists(
            db
              .select({ id: trainingParticipants.id })
              .from(trainingParticipants)
              .where(eq(trainingParticipants.trainingId, trainings.id)),
          ),
          exists(
            db
              .select({ id: trainingParticipants.id })
              .from(trainingParticipants)
              .where(
                and(
                  eq(trainingParticipants.trainingId, trainings.id),
                  eq(trainingParticipants.employeeId, employee.id),
                ),
              ),
          ),
        ),
      ),
    )
    .orderBy(asc(trainings.date), asc(trainings.startTime))
    .limit(50);

  return { data: rows, meta: { from: today } };
}

export async function createAnyTraining(
  actorId: string,
  input: TrainingCreateInput,
) {
  const employeeIds = await normalizeEmployeeIds(input.employeeIds);
  const trainingId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(trainings)
      .values({
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        place: input.place,
        notes: input.notes,
        createdBy: actorId,
      })
      .returning({ id: trainings.id });
    if (employeeIds.length > 0) {
      await tx.insert(trainingParticipants).values(
        employeeIds.map((employeeId) => ({
          trainingId: row.id,
          employeeId,
        })),
      );
    }
    return row.id;
  });

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "training-create",
    entity: "trainings",
    entityId: trainingId,
    newValue: {
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      employeeIds,
    },
  });
  const created = await getTrainingRow(trainingId);
  if (!created)
    throw new ApiError(500, "INTERNAL", "Training gagal dimuat ulang.");
  return created;
}

export async function updateAnyTraining(
  actorId: string,
  id: string,
  input: TrainingUpdateInput,
) {
  const existing = await getTrainingRow(id);
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Training tidak ditemukan.");
  const employeeIds =
    input.employeeIds !== undefined
      ? await normalizeEmployeeIds(input.employeeIds)
      : undefined;

  await db.transaction(async (tx) => {
    await tx
      .update(trainings)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
        ...(input.place !== undefined ? { place: input.place } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .where(eq(trainings.id, id));

    if (employeeIds !== undefined) {
      await tx
        .delete(trainingParticipants)
        .where(eq(trainingParticipants.trainingId, id));
      if (employeeIds.length > 0) {
        await tx.insert(trainingParticipants).values(
          employeeIds.map((employeeId) => ({
            trainingId: id,
            employeeId,
          })),
        );
      }
    }
  });

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
      employeeIds: existing.participants.map((row) => row.employeeId),
    },
    newValue: input,
  });
  const updated = await getTrainingRow(id);
  if (!updated)
    throw new ApiError(500, "INTERNAL", "Training gagal dimuat ulang.");
  return updated;
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
      employeeIds: existing.participants.map((row) => row.employeeId),
    },
  });
  return { id };
}
