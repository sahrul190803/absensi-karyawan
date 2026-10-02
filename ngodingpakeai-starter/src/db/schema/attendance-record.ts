import {
  date,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";
import { workSchedules } from "./work-schedule";
import { workLocations } from "./work-location";
import { devices } from "./device";

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    workScheduleId: uuid("work_schedule_id").references(() => workSchedules.id, {
      onDelete: "set null",
    }),
    workLocationId: uuid("work_location_id")
      .notNull()
      .references(() => workLocations.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    checkInPhotoId: uuid("check_in_photo_id"),
    checkOutPhotoId: uuid("check_out_photo_id"),
    checkInLatitude: doublePrecision("check_in_latitude"),
    checkInLongitude: doublePrecision("check_in_longitude"),
    checkInAccuracy: doublePrecision("check_in_accuracy"),
    checkInDistance: doublePrecision("check_in_distance"),
    checkOutLatitude: doublePrecision("check_out_latitude"),
    checkOutLongitude: doublePrecision("check_out_longitude"),
    checkOutAccuracy: doublePrecision("check_out_accuracy"),
    checkOutDistance: doublePrecision("check_out_distance"),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 24 }).notNull(),
    notes: text("notes").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("attendance_records_employee_date_key").on(
      table.employeeId,
      table.date,
    ),
    index("attendance_records_date_idx").on(table.date),
    index("attendance_records_status_idx").on(table.status),
    index("attendance_records_location_idx").on(table.workLocationId),
  ],
);
