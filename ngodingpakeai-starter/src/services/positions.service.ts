import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { positions } from "@/db/schema";
import type { ListQueryInput } from "@/validators/common";
import type {
  CreatePositionInput,
  UpdatePositionInput,
} from "@/validators/positions";

const fields = {
  id: positions.id,
  name: positions.name,
  departmentId: positions.departmentId,
  level: positions.level,
  active: positions.active,
  createdAt: positions.createdAt,
  updatedAt: positions.updatedAt,
};

export async function listAnyPositions({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(fields)
    .from(positions)
    .orderBy(asc(positions.name))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function createAnyPosition(input: CreatePositionInput) {
  const [row] = await db.insert(positions).values(input).returning(fields);
  return row;
}

export async function updateAnyPosition(
  id: string,
  input: UpdatePositionInput,
) {
  const [row] = await db
    .update(positions)
    .set(input)
    .where(eq(positions.id, id))
    .returning(fields);
  return row;
}

export async function deleteAnyPosition(id: string) {
  const [row] = await db
    .delete(positions)
    .where(eq(positions.id, id))
    .returning({ id: positions.id });
  return Boolean(row);
}
