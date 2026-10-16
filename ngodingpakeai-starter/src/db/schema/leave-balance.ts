import {
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";
import { leaveTypes } from "./leave-type";

export const leaveBalances = pgTable(
  "leave_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: uuid("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id, { onDelete: "restrict" }),
    year: integer("year").notNull(),
    openingBalance: doublePrecision("opening_balance").default(0).notNull(),
    used: doublePrecision("used").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("leave_balances_employee_type_year_key").on(
      table.employeeId,
      table.leaveTypeId,
      table.year,
    ),
    index("leave_balances_employee_idx").on(table.employeeId),
  ],
);
