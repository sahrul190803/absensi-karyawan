import {
  boolean,
  integer,
  pgTable,
  time,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  toleranceMinutes: integer("tolerance_minutes").default(15).notNull(),
  crossesMidnight: boolean("crosses_midnight").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
