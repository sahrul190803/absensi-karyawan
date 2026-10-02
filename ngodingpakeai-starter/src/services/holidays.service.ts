import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { holidays } from "@/db/schema";
import type { ListQueryInput } from "@/validators/common";
import type {
  CreateHolidayInput,
  UpdateHolidayInput,
} from "@/validators/holidays";

const fields = {
  id: holidays.id,
  date: holidays.date,
  name: holidays.name,
  type: holidays.type,
  description: holidays.description,
  allowWork: holidays.allowWork,
  active: holidays.active,
  createdAt: holidays.createdAt,
  updatedAt: holidays.updatedAt,
};

export async function listAnyHolidays({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(fields)
    .from(holidays)
    .orderBy(asc(holidays.date))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function createAnyHoliday(input: CreateHolidayInput) {
  const [row] = await db.insert(holidays).values(input).returning(fields);
  return row;
}

export async function updateAnyHoliday(id: string, input: UpdateHolidayInput) {
  const [row] = await db
    .update(holidays)
    .set(input)
    .where(eq(holidays.id, id))
    .returning(fields);
  return row;
}

export async function deleteAnyHoliday(id: string) {
  const [row] = await db
    .delete(holidays)
    .where(eq(holidays.id, id))
    .returning({ id: holidays.id });
  return Boolean(row);
}
