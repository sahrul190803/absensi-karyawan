import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { isFaceProviderConfigured } from "@/lib/face-provider";
import type { UpdateSettingsInput } from "@/validators/settings";

const fields = {
  id: companies.id,
  name: companies.name,
  timezone: companies.timezone,
  allowHolidayWork: companies.allowHolidayWork,
  gpsAccuracyLimitM: companies.gpsAccuracyLimitM,
  defaultRadiusM: companies.defaultRadiusM,
  defaultToleranceMinutes: companies.defaultToleranceMinutes,
  payrollLateRatePerMinute: companies.payrollLateRatePerMinute,
  payrollAlphaRatePerDay: companies.payrollAlphaRatePerDay,
  payrollPermissionPercent: companies.payrollPermissionPercent,
  payday: companies.payday,
  faceVerificationEnabled: companies.faceVerificationEnabled,
  faceSimilarityThreshold: companies.faceSimilarityThreshold,
  faceLivenessRequired: companies.faceLivenessRequired,
  updatedAt: companies.updatedAt,
};

// Provider status dikirim ke UI supaya admin tidak mengaktifkan verifikasi
// wajah saat provider belum dikonfigurasi (absensi jadi gagal total).
const withProviderStatus = <T extends object>(row: T) => ({
  ...row,
  faceProviderConfigured: isFaceProviderConfigured(),
});

export async function getSettings() {
  const [row] = await db
    .select(fields)
    .from(companies)
    .orderBy(asc(companies.createdAt))
    .limit(1);
  if (row) return withProviderStatus(row);
  const [created] = await db
    .insert(companies)
    .values({ name: "Perusahaan" })
    .returning(fields);
  return withProviderStatus(created);
}

export async function updateSettings(input: UpdateSettingsInput) {
  const current = await getSettings();
  if (input.faceVerificationEnabled && !current.faceProviderConfigured)
    throw new ApiError(
      422,
      "FACE_PROVIDER_NOT_CONFIGURED",
      "Verifikasi wajah belum bisa diaktifkan: provider belum dikonfigurasi di env (FACE_PROVIDER/FACE_API_URL/FACE_API_KEY).",
    );
  const [row] = await db
    .update(companies)
    .set(input)
    .where(eq(companies.id, current.id))
    .returning(fields);
  return withProviderStatus(row);
}
