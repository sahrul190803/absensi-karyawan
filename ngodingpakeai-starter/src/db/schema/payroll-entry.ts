import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";
import { payrollPeriods } from "./payroll-period";

// Baris gaji per karyawan dalam satu periode. Nilai default dihitung sistem
// dari absensi + pengajuan; HRD dapat menyesuaikan sebelum periode difinalkan.
export const payrollEntries = pgTable(
  "payroll_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    periodId: uuid("period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    salaryType: varchar("salary_type", { length: 16 }).notNull(),
    baseSalary: numeric("base_salary", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    scheduledDays: integer("scheduled_days").default(0).notNull(),
    presentDays: integer("present_days").default(0).notNull(),
    lateDays: integer("late_days").default(0).notNull(),
    alphaDays: integer("alpha_days").default(0).notNull(),
    excusedDays: integer("excused_days").default(0).notNull(),
    overtimeMinutes: integer("overtime_minutes").default(0).notNull(),
    mealClaimCount: integer("meal_claim_count").default(0).notNull(),
    baseAmount: numeric("base_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    lateDeduction: numeric("late_deduction", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    alphaDeduction: numeric("alpha_deduction", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    overtimeAmount: numeric("overtime_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    otherAdjustment: numeric("other_adjustment", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    adjustmentNote: text("adjustment_note").default("").notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("payroll_entries_period_employee_key").on(
      table.periodId,
      table.employeeId,
    ),
    index("payroll_entries_employee_idx").on(table.employeeId),
  ],
);
