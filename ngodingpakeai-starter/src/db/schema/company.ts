import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  timezone: varchar("timezone", { length: 64 })
    .default("Asia/Jakarta")
    .notNull(),
  allowHolidayWork: boolean("allow_holiday_work").default(false).notNull(),
  gpsAccuracyLimitM: integer("gps_accuracy_limit_m").default(50).notNull(),
  defaultRadiusM: integer("default_radius_m").default(100).notNull(),
  defaultToleranceMinutes: integer("default_tolerance_minutes")
    .default(15)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
