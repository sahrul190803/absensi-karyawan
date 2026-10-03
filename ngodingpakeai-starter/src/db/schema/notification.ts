import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").default("").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
  ],
);
