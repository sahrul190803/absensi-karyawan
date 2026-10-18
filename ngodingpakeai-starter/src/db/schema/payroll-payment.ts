import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";
import { payrollEntries } from "./payroll-entry";
import { payrollPeriods } from "./payroll-period";
import { user } from "./user";

// Riwayat pembayaran gaji. Satu baris per pembayaran karyawan, baik dari
// periode bulanan maupun pembayaran harian.
export const payrollPayments = pgTable(
  "payroll_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    periodId: uuid("period_id").references(() => payrollPeriods.id, {
      onDelete: "set null",
    }),
    entryId: uuid("entry_id").references(() => payrollEntries.id, {
      onDelete: "set null",
    }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    periodLabel: varchar("period_label", { length: 40 }).notNull(),
    periodYear: integer("period_year").notNull(),
    periodMonth: integer("period_month").notNull(),
    paymentDate: timestamp("payment_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    baseSalary: numeric("base_salary", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    allowance: numeric("allowance", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    grossAmount: numeric("gross_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    totalDeduction: numeric("total_deduction", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    overtimeAmount: numeric("overtime_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    adjustment: numeric("adjustment", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    netAmount: numeric("net_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    status: varchar("status", { length: 24 }).default("paid").notNull(),
    method: varchar("method", { length: 24 }).default("transfer").notNull(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    paidBy: text("paid_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("payroll_payments_employee_idx").on(table.employeeId),
    index("payroll_payments_period_idx").on(
      table.periodYear,
      table.periodMonth,
    ),
    index("payroll_payments_date_idx").on(table.paymentDate),
  ],
);
