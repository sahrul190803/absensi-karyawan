import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notificationLogs, notifications, user } from "@/db/schema";
import { sendMail } from "@/lib/mail";
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

type NotifyInput = {
  event: string;
  type: string;
  title: string;
  body: string;
  // Bila diisi, pengiriman email di-dedupe memakai kunci ini (mis.
  // `reminder-check-in:<userId>:<date>`), supaya tidak spam di hari yang sama.
  dedupeKey?: string;
};

async function sendEmailAndLog(
  target: { id: string; email: string },
  input: NotifyInput,
) {
  const result = await sendMail({
    to: target.email,
    subject: `${input.title} — Hadirku Lecarassa`,
    text: input.body,
  });
  await db.insert(notificationLogs).values({
    userId: target.id,
    channel: "email",
    event: input.event,
    target: target.email,
    status: result.sent ? "sent" : "failed",
    error: result.sent ? null : result.reason,
    dedupeKey: input.dedupeKey ?? null,
  });
  return result.sent;
}

// Notifikasi in-app + email untuk satu user. Pemanggil tidak perlu menunggu;
// email dikirim di background dan error tidak menggagalkan operasi utama.
export async function notifyUser(userId: string, input: NotifyInput) {
  const [target] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!target) return { inApp: false, email: false };

  if (input.dedupeKey) {
    const [existing] = await db
      .select({ id: notificationLogs.id })
      .from(notificationLogs)
      .where(eq(notificationLogs.dedupeKey, input.dedupeKey))
      .limit(1);
    if (existing) return { inApp: false, email: false };
  }

  await db.insert(notifications).values({
    userId: target.id,
    type: input.type,
    title: input.title,
    body: input.body,
  });

  let email = false;
  try {
    email = await sendEmailAndLog(target, input);
  } catch (error) {
    console.error(
      "Email delivery failed:",
      error instanceof Error ? error.message : error,
    );
  }
  return { inApp: true, email };
}

export function notifyUserInBackground(userId: string, input: NotifyInput) {
  void notifyUser(userId, input).catch((error) => {
    console.error(
      "Notification failed:",
      error instanceof Error ? error.message : error,
    );
  });
}
