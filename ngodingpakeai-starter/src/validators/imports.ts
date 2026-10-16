import { z } from "zod";

export const importCsvSchema = z
  .object({
    csv: z.string().min(1).max(2_000_000),
  })
  .strict();

export type ImportCsvInput = z.infer<typeof importCsvSchema>;
