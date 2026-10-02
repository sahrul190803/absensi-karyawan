import { z } from "zod";

export const createWorkLocationSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().max(500).default(""),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radiusM: z.coerce.number().int().min(10).max(5000).default(100),
    description: z.string().trim().max(500).default(""),
    active: z.boolean().default(true),
  })
  .strict();

export const updateWorkLocationSchema = createWorkLocationSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type CreateWorkLocationInput = z.infer<typeof createWorkLocationSchema>;
export type UpdateWorkLocationInput = z.infer<typeof updateWorkLocationSchema>;
