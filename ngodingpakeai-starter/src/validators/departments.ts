import { z } from "zod";

export const createDepartmentSchema = z
  .object({
    code: z.string().trim().max(20).optional(),
    name: z.string().trim().min(1).max(120),
    managerUserId: z.string().trim().min(1).max(64).nullish(),
    active: z.boolean().default(true),
  })
  .strict();

export const updateDepartmentSchema = createDepartmentSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
