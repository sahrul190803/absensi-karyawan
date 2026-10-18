import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workLocations } from "@/db/schema";
import type { ListQueryInput } from "@/validators/common";
import type {
  CreateWorkLocationInput,
  UpdateWorkLocationInput,
} from "@/validators/work-locations";

const fields = {
  id: workLocations.id,
  name: workLocations.name,
  address: workLocations.address,
  latitude: workLocations.latitude,
  longitude: workLocations.longitude,
  radiusM: workLocations.radiusM,
  description: workLocations.description,
  active: workLocations.active,
  createdAt: workLocations.createdAt,
  updatedAt: workLocations.updatedAt,
};

export async function listAnyWorkLocations({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(fields)
    .from(workLocations)
    .orderBy(desc(workLocations.active), desc(workLocations.updatedAt))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function createAnyWorkLocation(input: CreateWorkLocationInput) {
  const [row] = await db.insert(workLocations).values(input).returning(fields);
  return row;
}

export async function updateAnyWorkLocation(
  id: string,
  input: UpdateWorkLocationInput,
) {
  const [row] = await db
    .update(workLocations)
    .set(input)
    .where(eq(workLocations.id, id))
    .returning(fields);
  return row;
}

export async function deleteAnyWorkLocation(id: string) {
  const [row] = await db
    .delete(workLocations)
    .where(eq(workLocations.id, id))
    .returning({ id: workLocations.id });
  return Boolean(row);
}
