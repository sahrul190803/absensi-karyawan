import "server-only";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, requests, user } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { getStoredFile, putStoredFile } from "@/lib/file-store";
import { cancelAlphaForRange } from "@/services/alpha.service";
import { deductLeaveForApprovedRequest } from "@/services/leave.service";
import { notifyUserInBackground } from "@/services/notifications.service";
import type {
  CreateRequestInput,
  DecisionInput,
  RequestListInput,
} from "@/validators/requests";

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

const ALPHA_EXCUSED_TYPES = new Set([
  "permission",
  "sick",
  "leave",
  "business_trip",
]);

const requestFields = {
  id: requests.id,
  userId: requests.userId,
  type: requests.type,
  startDate: requests.startDate,
  endDate: requests.endDate,
  startTime: requests.startTime,
  endTime: requests.endTime,
  reason: requests.reason,
  attachmentUrl: requests.attachmentUrl,
  status: requests.status,
  approvedBy: requests.approvedBy,
  decidedAt: requests.decidedAt,
  decisionNote: requests.decisionNote,
  createdAt: requests.createdAt,
  updatedAt: requests.updatedAt,
};

const storeAttachment = async (dataUrl: string, name: string) => {
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,(.+)$/,
  );
  if (!match)
    throw new ApiError(
      422,
      "INVALID_ATTACHMENT",
      "Lampiran harus berformat JPG, PNG, WEBP, atau PDF.",
    );
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES)
    throw new ApiError(
      422,
      "ATTACHMENT_TOO_LARGE",
      "Ukuran lampiran melebihi 3 MB.",
    );
  const extension =
    mimeType === "application/pdf"
      ? "pdf"
      : mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : "jpg";
  const storageKey = `${name}.${extension}`;
  await putStoredFile({
    category: "request-attachments",
    storageKey,
    mimeType,
    data: buffer,
  });
  return { storageKey, mimeType, fileSize: buffer.byteLength };
};

export async function listOwnRequests(
  userId: string,
  query: RequestListInput,
) {
  const conditions: SQL[] = [eq(requests.userId, userId)];
  if (query.status) conditions.push(eq(requests.status, query.status));
  if (query.type) conditions.push(eq(requests.type, query.type));

  const rows = await db
    .select(requestFields)
    .from(requests)
    .where(and(...conditions))
    .orderBy(desc(requests.createdAt))
    .limit(query.limit + 1)
    .offset(query.offset);

  return {
    data: rows.slice(0, query.limit),
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}

export async function createOwnRequest(
  userId: string,
  input: CreateRequestInput,
) {
  const id = crypto.randomUUID();
  let attachmentUrl: string | null = null;
  if (input.attachment) {
    const stored = await storeAttachment(input.attachment, `${id}-attachment`);
    attachmentUrl = stored.storageKey;
  }
  const [row] = await db
    .insert(requests)
    .values({
      id,
      userId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      reason: input.reason,
      attachmentUrl,
    })
    .returning(requestFields);
  await db.insert(auditLogs).values({
    userId,
    action: "request-create",
    entity: "requests",
    entityId: row.id,
    newValue: {
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      attachment: Boolean(attachmentUrl),
    },
  });
  return row;
}

export async function cancelOwnRequest(userId: string, id: string) {
  const [row] = await db
    .update(requests)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(requests.id, id),
        eq(requests.userId, userId),
        eq(requests.status, "pending"),
      ),
    )
    .returning(requestFields);
  if (!row)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Pengajuan tidak ditemukan atau sudah diputus.",
    );
  await db.insert(auditLogs).values({
    userId,
    action: "request-cancel",
    entity: "requests",
    entityId: id,
  });
  return row;
}

export async function listAnyRequests(query: RequestListInput) {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(requests.status, query.status));
  if (query.type) conditions.push(eq(requests.type, query.type));

  const rows = await db
    .select({
      ...requestFields,
      employeeName: user.name,
      employeeEmail: user.email,
    })
    .from(requests)
    .innerJoin(user, eq(user.id, requests.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(requests.createdAt))
    .limit(query.limit + 1)
    .offset(query.offset);

  return {
    data: rows.slice(0, query.limit),
    meta: {
      limit: query.limit,
      offset: query.offset,
      hasMore: rows.length > query.limit,
    },
  };
}

export async function decideAnyRequest(
  approverId: string,
  id: string,
  input: DecisionInput,
) {
  const [existing] = await db
    .select(requestFields)
    .from(requests)
    .where(and(eq(requests.id, id), eq(requests.status, "pending")))
    .limit(1);
  if (!existing)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Pengajuan tidak ditemukan atau sudah diputus.",
    );

  const startDate = existing.startDate;
  const endDate = existing.endDate ?? existing.startDate;

  let leaveDays: number | null = null;
  if (input.status === "approved" && existing.type === "leave") {
    const result = await deductLeaveForApprovedRequest(
      existing.userId,
      startDate,
      endDate,
    );
    leaveDays = result.days;
  }

  const [row] = await db
    .update(requests)
    .set({
      status: input.status,
      approvedBy: approverId,
      decidedAt: new Date(),
      decisionNote: input.decisionNote,
    })
    .where(and(eq(requests.id, id), eq(requests.status, "pending")))
    .returning(requestFields);
  if (!row)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "Pengajuan tidak ditemukan atau sudah diputus.",
    );

  let cancelledAlpha = 0;
  if (input.status === "approved" && ALPHA_EXCUSED_TYPES.has(existing.type)) {
    const result = await cancelAlphaForRange(
      existing.userId,
      startDate,
      endDate,
      approverId,
      `request-approved:${row.id}`,
    );
    cancelledAlpha = result.cancelled;
  }

  await db.insert(auditLogs).values({
    userId: approverId,
    action: `request-${input.status}`,
    entity: "requests",
    entityId: id,
    oldValue: { status: existing.status, type: existing.type },
    newValue: {
      status: input.status,
      note: input.decisionNote,
      leaveDays,
      cancelledAlpha,
    },
  });
  notifyUserInBackground(row.userId, {
    event: `request-${input.status}`,
    type: `request-${input.status}`,
    title:
      input.status === "approved"
        ? "Pengajuan disetujui"
        : "Pengajuan ditolak",
    body:
      input.decisionNote ||
      "Buka halaman Pengajuan untuk melihat detail terbaru.",
  });
  return row;
}

const ATTACHMENT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function getRequestAttachment(
  userId: string,
  canReadAny: boolean,
  id: string,
) {
  const [row] = await db
    .select({
      userId: requests.userId,
      attachmentUrl: requests.attachmentUrl,
    })
    .from(requests)
    .where(eq(requests.id, id))
    .limit(1);
  if (!row || !row.attachmentUrl)
    throw new ApiError(404, "NOT_FOUND", "Lampiran tidak ditemukan.");
  if (!canReadAny && row.userId !== userId)
    throw new ApiError(404, "NOT_FOUND", "Lampiran tidak ditemukan.");

  const file = await getStoredFile("request-attachments", row.attachmentUrl);
  if (!file)
    throw new ApiError(404, "NOT_FOUND", "Berkas lampiran tidak ditemukan.");

  const extension = row.attachmentUrl.split(".").pop()?.toLowerCase() ?? "";
  return {
    data: file.data,
    mimeType: file.mimeType || ATTACHMENT_MIME[extension] || "application/octet-stream",
  };
}
