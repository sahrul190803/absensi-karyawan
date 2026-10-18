import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportQuerySchema = z
  .object({
    period: z.enum(["day", "month", "year"]).optional(),
    date: dateOnly.optional(),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    departmentId: z.string().uuid().optional(),
    positionId: z.string().uuid().optional(),
  })
  .strict();

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
