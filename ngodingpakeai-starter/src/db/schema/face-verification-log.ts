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
import { employees } from "./employee";

// Catatan setiap percobaan verifikasi wajah. Append-only untuk audit dan
// analisis anti-fraud. Idempotent replay tidak membuat baris baru karena
// verifikasi tidak dijalankan ulang.
export const faceVerificationLogs = pgTable(
  "face_verification_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    attendanceId: uuid("attendance_id").references(() => attendanceRecords.id, {
      onDelete: "set null",
    }),
    type: varchar("type", { length: 16 }).notNull(),
    status: varchar("status", { length: 24 }).notNull(),
    similarity: integer("similarity"),
    liveness: integer("liveness"),
    provider: varchar("provider", { length: 32 }).notNull(),
    detail: text("detail").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("face_verification_logs_employee_idx").on(
      table.employeeId,
      table.createdAt,
    ),
  ],
);
