import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const scheduleRangeSchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();

export const scheduleListSchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    employeeId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export const scheduleCreateSchema = z
  .object({
    employeeId: z.string().uuid(),
    date: dateOnly,
    shiftId: z.string().uuid(),
    workLocationId: z.string().uuid(),
    allowedLocationIds: z.array(z.string().uuid()).max(10).default([]),
    note: z.string().trim().max(500).default(""),
  })
  .strict()
  .refine(
    (value) => !value.allowedLocationIds.includes(value.workLocationId),
    "Lokasi utama tidak perlu diulang di lokasi tambahan.",
  );

export const scheduleUpdateSchema = z
  .object({
    date: dateOnly.optional(),
    shiftId: z.string().uuid().optional(),
    workLocationId: z.string().uuid().optional(),
    allowedLocationIds: z.array(z.string().uuid()).max(10).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan.");

export const scheduleIdSchema = z.string().uuid();

export type ScheduleRangeInput = z.infer<typeof scheduleRangeSchema>;
export type ScheduleListInput = z.infer<typeof scheduleListSchema>;
export type ScheduleCreateInput = z.infer<typeof scheduleCreateSchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateSchema>;
