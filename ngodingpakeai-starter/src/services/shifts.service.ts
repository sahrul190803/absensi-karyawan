import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { shifts } from "@/db/schema";
import type { ListQueryInput } from "@/validators/common";
import type { CreateShiftInput, UpdateShiftInput } from "@/validators/shifts";

const fields = {
  id: shifts.id,
  name: shifts.name,
  startTime: shifts.startTime,
  endTime: shifts.endTime,
  toleranceMinutes: shifts.toleranceMinutes,
  crossesMidnight: shifts.crossesMidnight,
  active: shifts.active,
  createdAt: shifts.createdAt,
  updatedAt: shifts.updatedAt,
};

export async function listAnyShifts({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(fields)
    .from(shifts)
    .orderBy(asc(shifts.startTime), asc(shifts.name))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function createAnyShift(input: CreateShiftInput) {
  const [row] = await db.insert(shifts).values(input).returning(fields);
  return row;
}

export async function updateAnyShift(id: string, input: UpdateShiftInput) {
  const [row] = await db
    .update(shifts)
    .set(input)
    .where(eq(shifts.id, id))
    .returning(fields);
  return row;
}

export async function deleteAnyShift(id: string) {
  const [row] = await db
    .delete(shifts)
    .where(eq(shifts.id, id))
    .returning({ id: shifts.id });
  return Boolean(row);
}
