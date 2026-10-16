import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const daysOfWeek = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7);

const uniqueDays = (days: number[] | undefined) =>
  days === undefined || new Set(days).size === days.length;

const rangeValid = (start: string | undefined, end: string | undefined) =>
  start === undefined || end === undefined || end >= start;

export const employeeShiftCreateSchema = z
  .object({
    employeeId: z.string().uuid(),
    shiftId: z.string().uuid(),
    workLocationId: z.string().uuid(),
    daysOfWeek,
    startDate: dateOnly,
    endDate: dateOnly.optional(),
    active: z.boolean().default(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!uniqueDays(value.daysOfWeek)) {
      ctx.addIssue({
        code: "custom",
        message: "Hari tidak boleh duplikat.",
        path: ["daysOfWeek"],
      });
    }
    if (!rangeValid(value.startDate, value.endDate)) {
      ctx.addIssue({
        code: "custom",
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
        path: ["endDate"],
      });
    }
  });

export const employeeShiftUpdateSchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    shiftId: z.string().uuid().optional(),
    workLocationId: z.string().uuid().optional(),
    daysOfWeek: daysOfWeek.optional(),
    startDate: dateOnly.optional(),
    endDate: dateOnly.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a field to update.",
      });
    }
    if (!uniqueDays(value.daysOfWeek)) {
      ctx.addIssue({
        code: "custom",
        message: "Hari tidak boleh duplikat.",
        path: ["daysOfWeek"],
      });
    }
    if (!rangeValid(value.startDate, value.endDate)) {
      ctx.addIssue({
        code: "custom",
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
        path: ["endDate"],
      });
    }
  });

export type EmployeeShiftCreateInput = z.infer<typeof employeeShiftCreateSchema>;
export type EmployeeShiftUpdateInput = z.infer<typeof employeeShiftUpdateSchema>;
