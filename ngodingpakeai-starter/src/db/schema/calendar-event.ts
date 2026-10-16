import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// Agenda kalender manual yang diatur HRD: libur khusus, payday, catatan
// penting. Jadwal shift tetap berasal dari work_schedules.
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 160 }).notNull(),
    type: varchar("type", { length: 16 }).default("agenda").notNull(),
    date: date("date").notNull(),
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
  (table) => [index("calendar_events_date_idx").on(table.date)],
);
