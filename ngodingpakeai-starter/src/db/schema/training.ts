import {
  date,
  index,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./user";

// Jadwal training yang diatur HOD/HRD. Peserta dipilih pada tabel
// training_participants; training tanpa peserta berlaku untuk semua karyawan.
export const trainings = pgTable(
  "trainings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 160 }).notNull(),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    place: varchar("place", { length: 200 }).default("").notNull(),
    notes: text("notes").default("").notNull(),
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
  (table) => [index("trainings_date_idx").on(table.date)],
);
