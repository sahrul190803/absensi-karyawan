import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    channel: varchar("channel", { length: 16 }).notNull(),
    event: varchar("event", { length: 64 }).notNull(),
    target: varchar("target", { length: 254 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    error: text("error"),
    dedupeKey: varchar("dedupe_key", { length: 160 }),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notification_logs_event_idx").on(table.event),
    index("notification_logs_dedupe_idx").on(table.dedupeKey),
    index("notification_logs_user_idx").on(table.userId),
  ],
);
