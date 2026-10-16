import { z } from "zod";

const money = z
  .number()
  .min(-1_000_000_000)
  .max(1_000_000_000)
  .transform((value) => value.toFixed(2));

export const generatePayrollSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const updatePayrollPeriodSchema = z
  .object({
    status: z.enum(["draft", "finalized", "paid"]).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export const updatePayrollEntrySchema = z
  .object({
    otherAdjustment: money.optional(),
    adjustmentNote: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type UpdatePayrollPeriodInput = z.infer<
  typeof updatePayrollPeriodSchema
>;
export type UpdatePayrollEntryInput = z.infer<typeof updatePayrollEntrySchema>;
