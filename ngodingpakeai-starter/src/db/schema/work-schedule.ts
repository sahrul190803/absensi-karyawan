import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";
import { shifts } from "./shift";
import { workLocations } from "./work-location";

export const workSchedules = pgTable(
  "work_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "restrict" }),
    workLocationId: uuid("work_location_id")
      .notNull()
      .references(() => workLocations.id, { onDelete: "restrict" }),
    note: text("note").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("work_schedules_employee_date_key").on(
      table.employeeId,
      table.date,
    ),
    index("work_schedules_date_idx").on(table.date),
  ],
);
