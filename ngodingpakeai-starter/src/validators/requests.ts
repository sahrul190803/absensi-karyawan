import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clockTime = z.string().regex(/^\d{2}:\d{2}$/);
const typeEnum = z.enum([
  "permission",
  "sick",
  "leave",
  "business_trip",
  "overtime",
  "shift_swap",
]);
const statusEnum = z.enum(["pending", "approved", "rejected", "cancelled"]);
const attachmentDataUrl = z
  .string()
  .regex(
    /^data:(?:image\/(?:jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/,
  )
  .max(4_000_000)
  .optional();

export const createRequestSchema = z
  .object({
    type: typeEnum,
    startDate: dateOnly,
    endDate: dateOnly.optional(),
    startTime: clockTime.optional(),
    endTime: clockTime.optional(),
    reason: z.string().trim().min(3).max(1000),
    attachment: attachmentDataUrl,
  })
  .strict()
  .refine(
    (value) => !value.endDate || value.endDate >= value.startDate,
    "Tanggal selesai tidak boleh sebelum tanggal mulai.",
  )
  .refine(
    (value) =>
      value.type !== "overtime" || (value.startTime && value.endTime),
    "Lembur wajib mengisi jam mulai dan jam selesai.",
  );

export const decisionSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    decisionNote: z.string().trim().max(500).default(""),
  })
  .strict();

export const requestListSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
    status: statusEnum.optional(),
    type: typeEnum.optional(),
  })
  .strict();

export const requestIdSchema = z.string().uuid();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type RequestListInput = z.infer<typeof requestListSchema>;
