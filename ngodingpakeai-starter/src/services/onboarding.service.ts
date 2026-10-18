import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { employees, user } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { notifyManagersInApp } from "@/services/notifications.service";
import type { OnboardingInput } from "@/validators/onboarding";

export async function submitOnboarding(
  userId: string,
  input: OnboardingInput,
) {
  const [account] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!account)
    throw new ApiError(404, "NOT_FOUND", "Akun tidak ditemukan.");

  const [existing] = await db
    .select({ id: employees.id, employmentStatus: employees.employmentStatus })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);

  if (existing) {
    const [conflict] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.nik, input.nik), ne(employees.id, existing.id)))
      .limit(1);
    if (conflict)
      throw new ApiError(
        409,
        "NIK_TAKEN",
        "NIK sudah dipakai karyawan lain. Periksa kembali data Anda atau hubungi HRD.",
      );

    const [row] = await db
      .update(employees)
      .set({
        nik: input.nik,
        fullName: input.fullName,
        phone: input.phone,
        address: input.address,
        ...(input.joinDate !== undefined ? { joinDate: input.joinDate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(employees.id, existing.id))
      .returning({
        id: employees.id,
        nik: employees.nik,
        fullName: employees.fullName,
        phone: employees.phone,
        address: employees.address,
        employmentStatus: employees.employmentStatus,
      });

    return { employee: row, created: false };
  }

  const [conflict] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.nik, input.nik))
    .limit(1);
  if (conflict)
    throw new ApiError(
      409,
      "NIK_TAKEN",
      "NIK sudah terdaftar. Jika ini akun Anda, hubungi HRD untuk menghubungkan data.",
    );

  const [row] = await db
    .insert(employees)
    .values({
      userId,
      nik: input.nik,
      fullName: input.fullName || account.name,
      phone: input.phone,
      address: input.address,
      joinDate: input.joinDate ?? null,
      employmentStatus: "pending",
    })
    .returning({
      id: employees.id,
      nik: employees.nik,
      fullName: employees.fullName,
      phone: employees.phone,
      address: employees.address,
      employmentStatus: employees.employmentStatus,
    });

  await notifyManagersInApp({
    type: "employee",
    title: "Karyawan baru menunggu verifikasi",
    body: `${row.fullName} (${row.nik}) baru mendaftar dan menunggu verifikasi HRD/HOD.`,
  }).catch(() => undefined);

  return { employee: row, created: true };
}
