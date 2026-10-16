import { z } from "zod";

export const updateSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    allowHolidayWork: z.boolean().optional(),
    gpsAccuracyLimitM: z.coerce.number().int().min(5).max(2000).optional(),
    defaultRadiusM: z.coerce.number().int().min(10).max(5000).optional(),
    defaultToleranceMinutes: z.coerce
      .number()
      .int()
      .min(0)
      .max(120)
      .optional(),
    payday: z.coerce.number().int().min(1).max(28).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide a field to update.",
  );

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
