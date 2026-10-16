import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// Periode penggajian bulanan. Satu periode per bulan; draft bisa dihitung
// ulang, final mengunci nilai.
export const payrollPeriods = pgTable(
  "payroll_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    status: varchar("status", { length: 16 }).default("draft").notNull(),
    note: text("note").default("").notNull(),
    generatedBy: text("generated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    finalizedBy: text("finalized_by").references(() => user.id, {
      onDelete: "set null",
    }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    paidBy: text("paid_by").references(() => user.id, {
      onDelete: "set null",
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("payroll_periods_year_month_key").on(table.year, table.month),
    index("payroll_periods_status_idx").on(table.status),
  ],
);
