import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const scheduleRangeSchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();

export type ScheduleRangeInput = z.infer<typeof scheduleRangeSchema>;
