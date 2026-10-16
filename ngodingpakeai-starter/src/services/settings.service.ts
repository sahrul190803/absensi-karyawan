import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import type { UpdateSettingsInput } from "@/validators/settings";

const fields = {
  id: companies.id,
  name: companies.name,
  timezone: companies.timezone,
  allowHolidayWork: companies.allowHolidayWork,
  gpsAccuracyLimitM: companies.gpsAccuracyLimitM,
  defaultRadiusM: companies.defaultRadiusM,
  defaultToleranceMinutes: companies.defaultToleranceMinutes,
  payday: companies.payday,
  updatedAt: companies.updatedAt,
};

export async function getSettings() {
  const [row] = await db
    .select(fields)
    .from(companies)
    .orderBy(asc(companies.createdAt))
    .limit(1);
  if (row) return row;
  const [created] = await db
    .insert(companies)
    .values({ name: "Perusahaan" })
    .returning(fields);
  return created;
}

export async function updateSettings(input: UpdateSettingsInput) {
  const current = await getSettings();
  const [row] = await db
    .update(companies)
    .set(input)
    .where(eq(companies.id, current.id))
    .returning(fields);
  return row;
}
