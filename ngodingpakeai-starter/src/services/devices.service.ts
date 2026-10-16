import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, devices, employees, user } from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { ListQueryInput } from "@/validators/common";

const deviceFields = {
  id: devices.id,
  os: devices.os,
  model: devices.model,
  browser: devices.browser,
  trusted: devices.trusted,
  lastLoginAt: devices.lastLoginAt,
  createdAt: devices.createdAt,
};

export async function listOwnDevices(userId: string, { limit, offset }: ListQueryInput) {
  const rows = await db
    .select(deviceFields)
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.lastLoginAt))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function revokeOwnDevice(userId: string, id: string) {
  const removed = await db
    .delete(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId)))
    .returning({ id: devices.id });
  if (removed.length === 0)
    throw new ApiError(404, "NOT_FOUND", "Perangkat tidak ditemukan.");
  await db.insert(auditLogs).values({
    userId,
    action: "device-revoke",
    entity: "devices",
    entityId: id,
  });
  return { revoked: removed.length };
}

export async function listAnyDevices({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select({
      id: devices.id,
      os: devices.os,
      model: devices.model,
      browser: devices.browser,
      trusted: devices.trusted,
      lastLoginAt: devices.lastLoginAt,
      createdAt: devices.createdAt,
      employeeName: employees.fullName,
      employeeNik: employees.nik,
      userEmail: user.email,
    })
    .from(devices)
    .leftJoin(user, eq(user.id, devices.userId))
    .leftJoin(employees, eq(employees.userId, devices.userId))
    .orderBy(desc(devices.lastLoginAt))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

export async function revokeAnyDevice(actorId: string, id: string) {
  const [existing] = await db
    .select({ id: devices.id, userId: devices.userId })
    .from(devices)
    .where(eq(devices.id, id))
    .limit(1);
  if (!existing)
    throw new ApiError(404, "NOT_FOUND", "Perangkat tidak ditemukan.");
  await db.delete(devices).where(eq(devices.id, id));
  await db.insert(auditLogs).values({
    userId: actorId,
    action: "device-revoke",
    entity: "devices",
    entityId: id,
    newValue: { revokedUserId: existing.userId },
  });
  return { revoked: 1 };
}
