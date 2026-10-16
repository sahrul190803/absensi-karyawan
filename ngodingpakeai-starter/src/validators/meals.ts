import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const mealClaimSchema = z
  .object({
    session: z.enum(["pagi", "siang", "malam"]),
    note: z.string().trim().max(200).default(""),
  })
  .strict();

export const mealQuerySchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    departmentId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export type MealClaimInput = z.infer<typeof mealClaimSchema>;
export type MealQueryInput = z.infer<typeof mealQuerySchema>;
