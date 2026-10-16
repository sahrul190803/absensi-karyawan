import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// Catatan pemasukan & pengeluaran perusahaan untuk laporan keuangan
// mingguan/bulanan/tahunan (dipakai halaman Laporan & kartu di Penggajian).
export const financeEntries = pgTable(
  "finance_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    // "income" untuk pemasukan, "expense" untuk pengeluaran.
    type: varchar("type", { length: 16 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    note: text("note").default("").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("finance_entries_date_idx").on(table.date),
    index("finance_entries_type_idx").on(table.type),
  ],
);
