import "server-only";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, notifications, requests, user } from "@/db/schema";
import { ApiError } from "@/lib/api";
import type {
  CreateRequestInput,
  DecisionInput,
  RequestListInput,
} from "@/validators/requests";

const requestFields = {
  id: requests.id,
  userId: requests.userId,
  type: requests.type,
  startDate: requests.startDate,
  endDate: requests.endDate,
  startTime: requests.startTime,
  endTime: requests.endTime,
  reason: requests.reason,
  status: requests.status,
  approvedBy: requests.approvedBy,
  decidedAt: requests.decidedAt,
  decisionNote: requests.decisionNote,
  createdAt: requests.createdAt,
  updatedAt: requests.updatedAt,
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
  const [row] = await db
    .insert(requests)
    .values({ userId, ...input })
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
  await db.insert(auditLogs).values({
    userId: approverId,
    action: `request-${input.status}`,
    entity: "requests",
    entityId: id,
    newValue: { status: input.status, note: input.decisionNote },
  });
  await db.insert(notifications).values({
    userId: row.userId,
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
