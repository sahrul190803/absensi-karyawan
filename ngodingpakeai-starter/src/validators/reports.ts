import { z } from "zod";

export const reportQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    departmentId: z.string().uuid().optional(),
  })
  .strict();

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
