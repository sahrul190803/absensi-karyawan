import { z } from "zod";

export const adminAttendanceListSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    status: z
      .enum(["present", "late", "early_leave", "alpha", "holiday_work"])
      .optional(),
  })
  .strict();

export type AdminAttendanceListInput = z.infer<
  typeof adminAttendanceListSchema
>;
