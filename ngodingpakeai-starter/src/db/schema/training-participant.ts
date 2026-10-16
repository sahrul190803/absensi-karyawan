import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";
import { trainings } from "./training";

// Peserta training yang dipilih HOD/HRD. Bila sebuah training tidak punya
// peserta, jadwalnya berlaku untuk semua karyawan.
export const trainingParticipants = pgTable(
  "training_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("training_participants_training_employee_key").on(
      table.trainingId,
      table.employeeId,
    ),
    index("training_participants_employee_idx").on(table.employeeId),
  ],
);
