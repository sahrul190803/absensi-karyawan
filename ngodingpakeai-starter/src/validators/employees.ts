import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createEmployeeSchema = z
  .object({
    userId: z.string().trim().min(1).max(64),
    nik: z.string().trim().min(1).max(32),
    fullName: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(32).default(""),
    address: z.string().trim().max(500).default(""),
    departmentId: z.string().uuid().nullish(),
    positionId: z.string().uuid().nullish(),
    workLocationId: z.string().uuid().nullish(),
    joinDate: dateOnly.nullish(),
    employmentStatus: z.enum(["active", "inactive", "resigned"]).default("active"),
    bankName: z.string().trim().max(80).default(""),
    bankAccount: z.string().trim().max(40).default(""),
    ktpNumber: z.string().trim().max(32).default(""),
    salaryType: z.enum(["monthly", "daily"]).default("monthly"),
    baseSalary: z
      .number()
      .min(0)
      .max(1_000_000_000)
      .transform((value) => value.toFixed(2))
      .default("0"),
  })
  .strict();

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

const documentDataUrl = z
  .string()
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  .max(4_500_000);

// Edit data diri oleh karyawan sendiri (bukan data kepegawaian).
export const profileUpdateSchema = z
  .object({
    phone: z.string().trim().max(32).optional(),
    address: z.string().trim().max(500).optional(),
    bankName: z.string().trim().max(80).optional(),
    bankAccount: z.string().trim().max(40).optional(),
    ktpNumber: z.string().trim().max(32).optional(),
    photo: documentDataUrl.optional(),
    ktpPhoto: documentDataUrl.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Tidak ada perubahan.");

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
