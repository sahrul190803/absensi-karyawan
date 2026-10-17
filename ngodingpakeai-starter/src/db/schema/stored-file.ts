import {
  customType,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// bytea stores JPEG/PNG/PDF/WEBP bytes directly so uploads survive hosts
// without a persistent filesystem (e.g. serverless deploys).
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const storedFiles = pgTable(
  "stored_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 64 }).notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 64 }).notNull(),
    fileSize: integer("file_size").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stored_files_category_key_idx").on(
      table.category,
      table.storageKey,
    ),
  ],
);
