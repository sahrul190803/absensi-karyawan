import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  departments,
  employees,
  positions,
  workLocations,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { getStoredFile, putStoredFile } from "@/lib/file-store";
import { notifyUserInBackground } from "@/services/notifications.service";
import type { ListQueryInput } from "@/validators/common";
import type {
  CreateEmployeeInput,
  ProfileUpdateInput,
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
  bankName: employees.bankName,
  bankAccount: employees.bankAccount,
  bankAccountName: employees.bankAccountName,
  ktpNumber: employees.ktpNumber,
  ktpPhotoUrl: employees.ktpPhotoUrl,
  salaryType: employees.salaryType,
  baseSalary: employees.baseSalary,
  allowance: employees.allowance,
  createdAt: employees.createdAt,
  updatedAt: employees.updatedAt,
};

export async function listAnyEmployees({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select({
      ...fields,
      departmentName: departments.name,
      positionName: positions.name,
    })
    .from(employees)
    .leftJoin(departments, eq(departments.id, employees.departmentId))
    .leftJoin(positions, eq(positions.id, employees.positionId))
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
  const [existing] = await db
    .select({
      userId: employees.userId,
      fullName: employees.fullName,
      employmentStatus: employees.employmentStatus,
    })
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  const [row] = await db
    .update(employees)
    .set(input)
    .where(eq(employees.id, id))
    .returning(fields);
  if (
    existing &&
    existing.employmentStatus !== "active" &&
    row?.employmentStatus === "active"
  ) {
    notifyUserInBackground(existing.userId, {
      event: "employee-approved",
      type: "employee",
      title: "Akun karyawan disetujui",
      body: "Akun Anda sudah diverifikasi HRD/HOD dan bisa dipakai untuk absensi, jadwal, pengajuan, serta klaim makan.",
    });
  }
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
      bankName: employees.bankName,
      bankAccount: employees.bankAccount,
      ktpNumber: employees.ktpNumber,
      photoUrl: employees.photoUrl,
      ktpPhotoUrl: employees.ktpPhotoUrl,
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

const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

const storeDocument = async (dataUrl: string, name: string) => {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match)
    throw new ApiError(
      422,
      "INVALID_DOCUMENT",
      "Dokumen harus berformat JPG, PNG, atau WEBP.",
    );
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_DOCUMENT_BYTES)
    throw new ApiError(
      422,
      "DOCUMENT_TOO_LARGE",
      "Ukuran dokumen melebihi 3 MB.",
    );
  const extension =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : "jpg";
  const storageKey = `${name}.${extension}`;
  await putStoredFile({
    category: "employee-documents",
    storageKey,
    mimeType,
    data: buffer,
  });
  return { storageKey, mimeType, fileSize: buffer.byteLength };
};

// Karyawan mengubah data dirinya sendiri: kontak, domisili, rekening, KTP.
// Data kepegawaian (NIK, jabatan, gaji) tetap wewenang HRD.
export async function updateOwnProfile(
  userId: string,
  input: ProfileUpdateInput,
) {
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

  const updates: Partial<typeof employees.$inferInsert> = {};
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.address !== undefined) updates.address = input.address;
  if (input.bankName !== undefined) updates.bankName = input.bankName;
  if (input.bankAccount !== undefined) updates.bankAccount = input.bankAccount;
  if (input.ktpNumber !== undefined) updates.ktpNumber = input.ktpNumber;
  if (input.photo) {
    const stored = await storeDocument(input.photo, `${employee.id}-photo`);
    updates.photoUrl = stored.storageKey;
  }
  if (input.ktpPhoto) {
    const stored = await storeDocument(input.ktpPhoto, `${employee.id}-ktp`);
    updates.ktpPhotoUrl = stored.storageKey;
  }

  await db.update(employees).set(updates).where(eq(employees.id, employee.id));

  await db.insert(auditLogs).values({
    userId,
    action: "profile-update",
    entity: "employees",
    entityId: employee.id,
    newValue: {
      fields: Object.keys(updates),
      hasPhoto: Boolean(input.photo),
      hasKtpPhoto: Boolean(input.ktpPhoto),
    },
  });

  return getOwnProfile(userId);
}

// Foto profil / KTP: pemilik sendiri atau peran dengan employees:read-any (HRD/HOD).
export async function getEmployeeDocument(
  sessionUserId: string,
  canReadAny: boolean,
  employeeId: string,
  type: "photo" | "ktp",
) {
  const [row] = await db
    .select({
      userId: employees.userId,
      fullName: employees.fullName,
      photoUrl: employees.photoUrl,
      ktpPhotoUrl: employees.ktpPhotoUrl,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!row) throw new ApiError(404, "NOT_FOUND", "Karyawan tidak ditemukan.");
  if (!canReadAny && row.userId !== sessionUserId)
    throw new ApiError(404, "NOT_FOUND", "Dokumen tidak ditemukan.");

  const storageKey = type === "ktp" ? row.ktpPhotoUrl : row.photoUrl;
  if (!storageKey)
    throw new ApiError(
      404,
      "NOT_FOUND",
      type === "ktp"
        ? "Foto KTP belum diunggah."
        : "Foto profil belum diunggah.",
    );

  const file = await getStoredFile("employee-documents", storageKey);
  if (!file)
    throw new ApiError(404, "NOT_FOUND", "Berkas dokumen tidak ditemukan.");

  return { data: file.data, mimeType: file.mimeType };
}
