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
import { departments } from "./department";
import { positions } from "./position";
import { workLocations } from "./work-location";

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    nik: varchar("nik", { length: 32 }).notNull().unique(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }).default("").notNull(),
    address: text("address").default("").notNull(),
    photoUrl: text("photo_url"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    positionId: uuid("position_id").references(() => positions.id, {
      onDelete: "set null",
    }),
    workLocationId: uuid("work_location_id").references(
      () => workLocations.id,
      { onDelete: "set null" },
    ),
    joinDate: date("join_date"),
    employmentStatus: varchar("employment_status", { length: 24 })
      .default("active")
      .notNull(),
    // Dasar perhitungan payroll. "monthly" = gaji bulanan tetap;
    // "daily" = upah harian, dibayar per hari hadir.
    salaryType: varchar("salary_type", { length: 16 })
      .default("monthly")
      .notNull(),
    baseSalary: numeric("base_salary", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    allowance: numeric("allowance", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    // Data diri untuk pembayaran & verifikasi: rekening dan KTP.
    bankName: varchar("bank_name", { length: 80 }).default("").notNull(),
    bankAccount: varchar("bank_account", { length: 40 }).default("").notNull(),
    bankAccountName: varchar("bank_account_name", { length: 120 })
      .default("")
      .notNull(),
    ktpNumber: varchar("ktp_number", { length: 32 }).default("").notNull(),
    ktpPhotoUrl: text("ktp_photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("employees_department_idx").on(table.departmentId),
    index("employees_status_idx").on(table.employmentStatus),
  ],
);
