import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createHolidaySchema = z
  .object({
    date: dateOnly,
    name: z.string().trim().min(1).max(160),
    type: z.enum(["nasional", "cuti_bersama", "perusahaan", "khusus"]),
    description: z.string().trim().max(500).default(""),
    allowWork: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .strict();

export const updateHolidaySchema = createHolidaySchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
