import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const onboardingSchema = z
  .object({
    fullName: z.string().trim().min(1).max(160),
    nik: z.string().trim().min(1).max(32),
    phone: z.string().trim().max(32).default(""),
    address: z.string().trim().max(500).default(""),
    joinDate: dateOnly.optional(),
  })
  .strict();

export type OnboardingInput = z.infer<typeof onboardingSchema>;
