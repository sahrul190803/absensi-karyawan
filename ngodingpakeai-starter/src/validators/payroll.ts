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
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide a field to update.",
  );

export const updatePayrollEntrySchema = z
  .object({
    otherAdjustment: money.optional(),
    adjustmentNote: z.string().trim().max(500).optional(),
    isHidden: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide a field to update.",
  );

export const payPayrollEntriesSchema = z
  .object({
    entryIds: z.array(z.string().uuid()).min(1).max(500),
  })
  .strict()
  .transform((value) => ({ entryIds: [...new Set(value.entryIds)] }));

export const dailyPayrollSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export const payDailyPayrollSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    employeeIds: z.array(z.string().uuid()).min(1).max(500),
    method: z.enum(["transfer", "cash"]).default("transfer"),
  })
  .strict()
  .transform((value) => ({
    ...value,
    employeeIds: [...new Set(value.employeeIds)],
  }));

export const payrollPaymentListSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    positionId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type UpdatePayrollPeriodInput = z.infer<
  typeof updatePayrollPeriodSchema
>;
export type UpdatePayrollEntryInput = z.infer<typeof updatePayrollEntrySchema>;
export type PayPayrollEntriesInput = z.infer<typeof payPayrollEntriesSchema>;
export type DailyPayrollInput = z.infer<typeof dailyPayrollSchema>;
export type PayDailyPayrollInput = z.infer<typeof payDailyPayrollSchema>;
export type PayrollPaymentListInput = z.infer<typeof payrollPaymentListSchema>;
