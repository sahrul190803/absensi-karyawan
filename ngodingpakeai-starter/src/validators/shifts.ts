import { z } from "zod";

const clockTime = z.string().regex(/^\d{2}:\d{2}$/);

export const createShiftSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    startTime: clockTime,
    endTime: clockTime,
    toleranceMinutes: z.coerce.number().int().min(0).max(120).default(15),
    crossesMidnight: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .strict();

export const updateShiftSchema = createShiftSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
