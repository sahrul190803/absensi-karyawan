import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const holidays = pgTable("holidays", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  description: text("description").default("").notNull(),
  allowWork: boolean("allow_work").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
