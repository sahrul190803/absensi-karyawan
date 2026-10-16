import { z } from "zod";

const dataUrl = z
  .string()
  .regex(/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/)
  .max(4_500_000);

export const faceEnrollSchema = z
  .object({
    photo: dataUrl,
    // Consent eksplisit: tanpa ini data biometrik tidak boleh disimpan.
    consent: z.literal(true, {
      error: "Persetujuan penyimpanan data wajah wajib diberikan.",
    }),
  })
  .strict();

export type FaceEnrollInput = z.infer<typeof faceEnrollSchema>;
