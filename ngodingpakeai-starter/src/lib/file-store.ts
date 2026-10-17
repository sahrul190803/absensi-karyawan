import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { storedFiles } from "@/db/schema";

export const STORED_FILE_CATEGORIES = [
  "attendance-photos",
  "employee-documents",
  "request-attachments",
  "face-profiles",
] as const;

export type StoredFileCategory = (typeof STORED_FILE_CATEGORIES)[number];

export async function putStoredFile(input: {
  category: StoredFileCategory;
  storageKey: string;
  mimeType: string;
  data: Buffer;
}) {
  await db
    .insert(storedFiles)
    .values({
      category: input.category,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      fileSize: input.data.byteLength,
      data: input.data,
    })
    .onConflictDoUpdate({
      target: [storedFiles.category, storedFiles.storageKey],
      set: {
        mimeType: input.mimeType,
        fileSize: input.data.byteLength,
        data: input.data,
        updatedAt: new Date(),
      },
    });
}

export async function getStoredFile(
  category: StoredFileCategory,
  storageKey: string,
) {
  const [row] = await db
    .select({ mimeType: storedFiles.mimeType, data: storedFiles.data })
    .from(storedFiles)
    .where(
      and(
        eq(storedFiles.category, category),
        eq(storedFiles.storageKey, storageKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function deleteStoredFile(
  category: StoredFileCategory,
  storageKey: string,
) {
  await db
    .delete(storedFiles)
    .where(
      and(
        eq(storedFiles.category, category),
        eq(storedFiles.storageKey, storageKey),
      ),
    );
}
