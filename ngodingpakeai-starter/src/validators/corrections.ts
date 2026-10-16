import { z } from "zod";

export const correctionCreateSchema = z
  .object({
    attendanceId: z.string().uuid(),
    reason: z.string().trim().min(3).max(1000),
    checkInTime: z.string().datetime({ offset: true }).optional(),
    checkOutTime: z.string().datetime({ offset: true }).optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.checkInTime !== undefined ||
      value.checkOutTime !== undefined ||
      value.notes !== undefined,
    "Pilih minimal satu perubahan.",
  );

export const correctionDecisionSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    decisionNote: z.string().trim().max(500).default(""),
  })
  .strict();

export const correctionListSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export const correctionIdSchema = z.string().uuid();

export type CorrectionCreateInput = z.infer<typeof correctionCreateSchema>;
export type CorrectionDecisionInput = z.infer<typeof correctionDecisionSchema>;
export type CorrectionListInput = z.infer<typeof correctionListSchema>;
