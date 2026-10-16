import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { attendanceRecords } from "./attendance-record";
import { user } from "./user";

export const attendanceCorrections = pgTable(
  "attendance_corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: "cascade" }),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    oldValue: jsonb("old_value")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    newValue: jsonb("new_value")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    status: varchar("status", { length: 16 }).default("pending").notNull(),
    decidedBy: text("decided_by").references(() => user.id, {
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
    index("attendance_corrections_attendance_idx").on(table.attendanceId),
    index("attendance_corrections_status_idx").on(table.status),
    index("attendance_corrections_requester_idx").on(table.requestedBy),
  ],
);
