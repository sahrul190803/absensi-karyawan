import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { ListQueryInput } from "@/validators/common";

const fields = {
  id: notifications.id,
  type: notifications.type,
  title: notifications.title,
  body: notifications.body,
  readAt: notifications.readAt,
  createdAt: notifications.createdAt,
};

export async function listOwnNotifications(
  userId: string,
  { limit, offset }: ListQueryInput,
) {
  const rows = await db
    .select(fields)
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const [unread] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );

  return {
    data: rows.slice(0, limit),
    meta: {
      limit,
      offset,
      hasMore: rows.length > limit,
      unread: unread?.value ?? 0,
    },
  };
}

export async function markAllOwnRead(userId: string) {
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    )
    .returning({ id: notifications.id });
  return { updated: updated.length };
}
