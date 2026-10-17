import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  companies,
  employees,
  faceProfiles,
  faceVerificationLogs,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { deleteStoredFile, getStoredFile, putStoredFile } from "@/lib/file-store";
import {
  FACE_LIVENESS_MIN,
  faceProviderName,
  isFaceProviderConfigured,
  requestFaceVerification,
} from "@/lib/face-provider";
import type { FaceEnrollInput } from "@/validators/face";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

type FaceConfig = {
  enabled: boolean;
  similarityThreshold: number;
  livenessRequired: boolean;
};

type FaceState = FaceConfig & {
  providerConfigured: boolean;
  enrolled: boolean;
  consentAt: Date | null;
};

const requireEmployee = async (userId: string) => {
  const [employee] = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      employmentStatus: employees.employmentStatus,
    })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);
  if (!employee)
    throw new ApiError(
      404,
      "NOT_EMPLOYEE",
      "Akun ini belum terhubung ke data karyawan.",
    );
  if (employee.employmentStatus !== "active")
    throw new ApiError(403, "ACCOUNT_INACTIVE", "Akun karyawan tidak aktif.");
  return employee;
};

const getFaceConfig = async (): Promise<FaceConfig> => {
  const [config] = await db
    .select({
      enabled: companies.faceVerificationEnabled,
      similarityThreshold: companies.faceSimilarityThreshold,
      livenessRequired: companies.faceLivenessRequired,
    })
    .from(companies)
    .limit(1);
  return {
    enabled: config?.enabled ?? false,
    similarityThreshold: config?.similarityThreshold ?? 60,
    livenessRequired: config?.livenessRequired ?? true,
  };
};

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  if (!match)
    throw new ApiError(422, "INVALID_PHOTO", "Foto harus berformat JPEG atau PNG.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_PHOTO_BYTES)
    throw new ApiError(422, "PHOTO_TOO_LARGE", "Ukuran foto melebihi 3 MB.");
  return { buffer, mimeType: match[1] };
};

const removeFacePhoto = async (storageKey: string) => {
  try {
    await deleteStoredFile("face-profiles", storageKey);
  } catch {
    // File sudah tidak ada; tidak menghalangi pencabutan consent.
  }
};

const writeFaceLog = async (input: {
  employeeId: string;
  attendanceId?: string | null;
  type: "enrollment" | "check_in" | "check_out";
  status: string;
  similarity?: number | null;
  liveness?: number | null;
  provider: string;
  detail?: string;
}) => {
  await db.insert(faceVerificationLogs).values({
    employeeId: input.employeeId,
    attendanceId: input.attendanceId ?? null,
    type: input.type,
    status: input.status,
    similarity: input.similarity ?? null,
    liveness: input.liveness ?? null,
    provider: input.provider,
    detail: input.detail ?? "",
  });
};

const getProfile = async (employeeId: string) => {
  const [profile] = await db
    .select({
      id: faceProfiles.id,
      storageKey: faceProfiles.storageKey,
      mimeType: faceProfiles.mimeType,
      consentAt: faceProfiles.consentAt,
    })
    .from(faceProfiles)
    .where(eq(faceProfiles.employeeId, employeeId))
    .limit(1);
  return profile ?? null;
};

const stateForEmployee = async (employeeId: string): Promise<FaceState> => {
  const config = await getFaceConfig();
  const profile = await getProfile(employeeId);
  return {
    ...config,
    providerConfigured: isFaceProviderConfigured(),
    enrolled: Boolean(profile),
    consentAt: profile?.consentAt ?? null,
  };
};

export async function getFaceStatus(userId: string) {
  const employee = await requireEmployee(userId);
  return stateForEmployee(employee.id);
}

export async function getFaceStateForEmployee(employeeId: string) {
  return stateForEmployee(employeeId);
}

export async function enrollFace(userId: string, input: FaceEnrollInput) {
  const employee = await requireEmployee(userId);
  const { buffer, mimeType } = parseDataUrl(input.photo);
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const storageKey = `${employee.id}.${extension}`;
  await putStoredFile({
    category: "face-profiles",
    storageKey,
    mimeType,
    data: buffer,
  });

  const previous = await getProfile(employee.id);
  await db
    .insert(faceProfiles)
    .values({
      employeeId: employee.id,
      storageKey,
      mimeType,
      fileSize: buffer.byteLength,
      consentAt: new Date(),
    })
    .onConflictDoUpdate({
      target: faceProfiles.employeeId,
      set: {
        storageKey,
        mimeType,
        fileSize: buffer.byteLength,
        consentAt: new Date(),
      },
    });
  if (previous && previous.storageKey !== storageKey)
    await removeFacePhoto(previous.storageKey);

  await db.insert(auditLogs).values({
    userId,
    action: "face-enrolled",
    entity: "employees",
    entityId: employee.id,
    newValue: { consentAt: new Date().toISOString() },
  });

  return stateForEmployee(employee.id);
}

export async function revokeFace(userId: string) {
  const employee = await requireEmployee(userId);
  const profile = await getProfile(employee.id);
  if (profile) {
    await db.delete(faceProfiles).where(eq(faceProfiles.employeeId, employee.id));
    await removeFacePhoto(profile.storageKey);
    await db.insert(auditLogs).values({
      userId,
      action: "face-revoked",
      entity: "employees",
      entityId: employee.id,
      oldValue: { consentAt: profile.consentAt.toISOString() },
    });
  }
  return stateForEmployee(employee.id);
}

// Dipanggil check-in/check-out. Fail-closed: bila verifikasi diwajibkan tetapi
// provider/profil tidak siap, absensi ditolak, bukan dilewatkan.
export async function verifyAttendanceFace(input: {
  employeeId: string;
  probePhoto: string;
  type: "check_in" | "check_out";
}) {
  const config = await getFaceConfig();
  if (!config.enabled) return { required: false as const };

  const provider = faceProviderName();
  if (!provider)
    throw new ApiError(
      503,
      "FACE_NOT_CONFIGURED",
      "Verifikasi wajah diwajibkan tetapi provider belum dikonfigurasi. Hubungi HR.",
    );

  const profile = await getProfile(input.employeeId);
  if (!profile)
    throw new ApiError(
      409,
      "FACE_NOT_ENROLLED",
      "Daftarkan wajah Anda terlebih dahulu melalui menu Beranda atau Profil.",
    );

  const { buffer: probe, mimeType: probeMimeType } = parseDataUrl(input.probePhoto);
  const referenceFile = await getStoredFile("face-profiles", profile.storageKey);
  if (!referenceFile)
    throw new ApiError(
      503,
      "FACE_UNAVAILABLE",
      "Foto referensi wajah tidak ditemukan. Daftarkan ulang wajah Anda.",
    );
  const reference = referenceFile.data;

  let result;
  try {
    result = await requestFaceVerification({
      reference,
      referenceMimeType: profile.mimeType,
      probe,
      probeMimeType,
      livenessRequired: config.livenessRequired,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    await writeFaceLog({
      employeeId: input.employeeId,
      type: input.type,
      status: "provider_error",
      provider,
      detail,
    });
    throw new ApiError(
      502,
      "FACE_PROVIDER_ERROR",
      "Layanan verifikasi wajah sedang bermasalah. Coba beberapa saat lagi.",
    );
  }

  const similarity = Math.round(result.result.similarity * 100);
  const liveness = Math.round(result.result.liveness * 100);
  const log = async (status: string, detail = "") =>
    writeFaceLog({
      employeeId: input.employeeId,
      type: input.type,
      status,
      similarity,
      liveness,
      provider: result.provider,
      detail,
    });

  if (result.result.faces === 0) {
    await log("no_face", "Wajah tidak terdeteksi pada foto.");
    throw new ApiError(
      422,
      "FACE_NOT_DETECTED",
      "Wajah tidak terdeteksi. Pastikan pencahayaan cukup dan wajah terlihat jelas.",
    );
  }
  if (result.result.faces > 1) {
    await log("multiple_faces", `${result.result.faces} wajah terdeteksi.`);
    throw new ApiError(
      422,
      "MULTIPLE_FACES",
      "Terdeteksi lebih dari satu wajah. Pastikan hanya Anda di dalam bingkai.",
    );
  }
  if (config.livenessRequired && result.result.liveness < FACE_LIVENESS_MIN) {
    await log("liveness_failed", "Skor liveness di bawah ambang.");
    throw new ApiError(
      422,
      "LIVENESS_FAILED",
      "Verifikasi liveness gagal. Hadapkan wajah langsung ke kamera dan coba lagi.",
    );
  }
  if (similarity < config.similarityThreshold) {
    await log("mismatch", `Kemiripan ${similarity}% < ambang ${config.similarityThreshold}%.`);
    throw new ApiError(
      422,
      "FACE_MISMATCH",
      "Wajah tidak cocok dengan foto referensi. Pastikan hanya wajah Anda yang terlihat.",
    );
  }

  await log("verified");
  return { required: true as const, similarity, liveness };
}
