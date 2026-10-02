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
  })
  .strict();

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a field to update.");

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
