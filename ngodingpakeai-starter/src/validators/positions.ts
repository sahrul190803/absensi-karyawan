import { z } from "zod";

export const createPositionSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    departmentId: z.string().uuid().nullish(),
    level: z.coerce.number().int().min(1).max(10).default(1),
    active: z.boolean().default(true),
  })
  .strict();

export const updatePositionSchema = createPositionSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
