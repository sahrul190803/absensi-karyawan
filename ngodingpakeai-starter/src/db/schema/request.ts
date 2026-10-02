import {
  date,
  index,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 24 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason").notNull(),
    attachmentUrl: text("attachment_url"),
    status: varchar("status", { length: 16 }).default("pending").notNull(),
    approvedBy: text("approved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("requests_user_idx").on(table.userId),
    index("requests_status_idx").on(table.status),
    index("requests_type_idx").on(table.type),
  ],
);
