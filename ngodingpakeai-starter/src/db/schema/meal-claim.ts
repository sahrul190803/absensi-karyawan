import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";

// Klaim jatah makan harian (1x per hari). Tanpa nilai uang: hanya catatan
// pembagian makan pagi/siang/malam.
export const mealClaims = pgTable(
  "meal_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    session: varchar("session", { length: 16 }).notNull(),
    note: text("note").default("").notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("meal_claims_employee_date_key").on(
      table.employeeId,
      table.date,
    ),
    index("meal_claims_date_idx").on(table.date),
  ],
);
