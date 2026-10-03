import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  departments,
  employees,
  positions,
  workLocations,
} from "@/db/schema";
import type { ListQueryInput } from "@/validators/common";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "@/validators/employees";

const fields = {
  id: employees.id,
  userId: employees.userId,
  nik: employees.nik,
  fullName: employees.fullName,
  phone: employees.phone,
  address: employees.address,
  photoUrl: employees.photoUrl,
  departmentId: employees.departmentId,
  positionId: employees.positionId,
  workLocationId: employees.workLocationId,
  joinDate: employees.joinDate,
  employmentStatus: employees.employmentStatus,
  createdAt: employees.createdAt,
  updatedAt: employees.updatedAt,
};

export async function listAnyEmployees({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(fields)
    .from(employees)
    .orderBy(asc(employees.fullName))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function getAnyEmployee(id: string) {
  const [row] = await db
    .select(fields)
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  return row;
}

export async function createAnyEmployee(input: CreateEmployeeInput) {
  const [row] = await db.insert(employees).values(input).returning(fields);
  return row;
}

export async function updateAnyEmployee(
  id: string,
  input: UpdateEmployeeInput,
) {
  const [row] = await db
    .update(employees)
    .set(input)
    .where(eq(employees.id, id))
    .returning(fields);
  return row;
}

export async function deleteAnyEmployee(id: string) {
  const [row] = await db
    .delete(employees)
    .where(eq(employees.id, id))
    .returning({ id: employees.id });
  return Boolean(row);
}

export async function getOwnProfile(userId: string) {
  const [row] = await db
    .select({
      id: employees.id,
      nik: employees.nik,
      fullName: employees.fullName,
      phone: employees.phone,
      address: employees.address,
      joinDate: employees.joinDate,
      employmentStatus: employees.employmentStatus,
      departmentName: departments.name,
      positionName: positions.name,
      locationName: workLocations.name,
    })
    .from(employees)
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(positions, eq(positions.id, employees.positionId))
    .leftJoin(workLocations, eq(workLocations.id, employees.workLocationId))
    .where(eq(employees.userId, userId))
    .limit(1);
  return row ?? null;
}
