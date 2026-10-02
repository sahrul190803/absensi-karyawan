import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments } from "@/db/schema";
import type { ListQueryInput } from "@/validators/common";
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "@/validators/departments";

const fields = {
  id: departments.id,
  code: departments.code,
  name: departments.name,
  managerUserId: departments.managerUserId,
  active: departments.active,
  createdAt: departments.createdAt,
  updatedAt: departments.updatedAt,
};

// Cross-account reads and writes. Only call behind a permission check.
export async function listAnyDepartments({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(fields)
    .from(departments)
    .orderBy(asc(departments.name))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function createAnyDepartment(input: CreateDepartmentInput) {
  const [row] = await db.insert(departments).values(input).returning(fields);
  return row;
}

export async function updateAnyDepartment(
  id: string,
  input: UpdateDepartmentInput,
) {
  const [row] = await db
    .update(departments)
    .set(input)
    .where(eq(departments.id, id))
    .returning(fields);
  return row;
}

export async function deleteAnyDepartment(id: string) {
  const [row] = await db
    .delete(departments)
    .where(eq(departments.id, id))
    .returning({ id: departments.id });
  return Boolean(row);
}
