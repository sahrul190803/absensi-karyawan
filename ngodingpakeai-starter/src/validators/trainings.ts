import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clockTime = z.string().regex(/^\d{2}:\d{2}$/);

export const trainingQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();

export const trainingCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    date: dateOnly,
    startTime: clockTime,
    endTime: clockTime,
    place: z.string().trim().max(200).default(""),
    notes: z.string().trim().max(500).default(""),
    employeeIds: z.array(z.string().uuid()).max(500).default([]),
  })
  .strict()
  .refine(
    (value) => value.endTime > value.startTime,
    "Jam selesai harus setelah jam mulai.",
  );

export const trainingUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    date: dateOnly.optional(),
    startTime: clockTime.optional(),
    endTime: clockTime.optional(),
    place: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
    employeeIds: z.array(z.string().uuid()).max(500).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan.");

export type TrainingQueryInput = z.infer<typeof trainingQuerySchema>;
export type TrainingCreateInput = z.infer<typeof trainingCreateSchema>;
export type TrainingUpdateInput = z.infer<typeof trainingUpdateSchema>;
