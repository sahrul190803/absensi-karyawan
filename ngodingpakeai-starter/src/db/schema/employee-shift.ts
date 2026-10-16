import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";
import { shifts } from "./shift";
import { workLocations } from "./work-location";

// Penugasan shift berulang per karyawan (pola hari mingguan).
// Dasar untuk membuat work_schedules otomatis di kalender kerja.
export const employeeShifts = pgTable(
  "employee_shifts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "restrict" }),
    workLocationId: uuid("work_location_id")
      .notNull()
      .references(() => workLocations.id, { onDelete: "restrict" }),
    // 0 = Minggu … 6 = Sabtu.
    daysOfWeek: integer("days_of_week").array().notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("employee_shifts_employee_idx").on(table.employeeId),
    index("employee_shifts_start_date_idx").on(table.startDate),
  ],
);
