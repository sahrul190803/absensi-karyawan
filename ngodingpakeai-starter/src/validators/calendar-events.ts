import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const eventType = z.enum(["agenda", "libur", "gajian"]);

export const calendarEventCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    type: eventType.default("agenda"),
    date: dateOnly,
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const calendarEventUpdateSchema = calendarEventCreateSchema
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Tidak ada perubahan.",
  );

export const calendarEventQuerySchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export type CalendarEventCreateInput = z.infer<typeof calendarEventCreateSchema>;
export type CalendarEventUpdateInput = z.infer<typeof calendarEventUpdateSchema>;
export type CalendarEventQueryInput = z.infer<typeof calendarEventQuerySchema>;
