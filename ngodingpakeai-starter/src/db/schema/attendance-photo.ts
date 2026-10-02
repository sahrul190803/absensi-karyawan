import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { attendanceRecords } from "./attendance-record";

export const attendancePhotos = pgTable(
  "attendance_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 16 }).notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 64 }).notNull(),
    fileSize: integer("file_size").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("attendance_photos_attendance_idx").on(table.attendanceId),
  ],
);
