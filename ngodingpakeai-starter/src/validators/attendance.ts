import { z } from "zod";

const coordinate = z.coerce.number();
const dataUrl = z
  .string()
  .regex(/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/)
  .max(4_500_000);

export const attendancePingSchema = z
  .object({
    latitude: coordinate.min(-90).max(90),
    longitude: coordinate.min(-180).max(180),
    accuracy: z.coerce.number().positive().max(10_000),
    photo: dataUrl,
    deviceKey: z.string().trim().min(1).max(160).optional(),
    idempotencyKey: z.string().trim().min(8).max(64).optional(),
  })
  .strict();

export const attendanceHistorySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export type AttendancePingInput = z.infer<typeof attendancePingSchema>;
export type AttendanceHistoryInput = z.infer<typeof attendanceHistorySchema>;
