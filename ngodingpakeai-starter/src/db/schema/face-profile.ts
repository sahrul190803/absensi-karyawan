import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { employees } from "./employee";

// Foto referensi wajah milik satu karyawan (data biometrik). Hanya dipakai
// server-side untuk pencocokan; tidak pernah disajikan lewat API publik.
// Menghapus profil = mencabut consent dan menghapus file referensi.
export const faceProfiles = pgTable("face_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .unique()
    .references(() => employees.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  mimeType: varchar("mime_type", { length: 64 }).notNull(),
  fileSize: integer("file_size").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
