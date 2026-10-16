import { z } from "zod";

const year = z.coerce.number().int().min(2000).max(2100);

export const leaveBalanceQuerySchema = z
  .object({
    year: year.optional(),
  })
  .strict();

export const adminLeaveBalanceQuerySchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    year: year.optional(),
  })
  .strict();

// HRD mengatur kuota per karyawan per tahun. Satu PATCH mengirim beberapa
// jenis cuti sekaligus supaya satu baris karyawan tersimpan atomik dari UI.
export const adminLeaveBalanceUpdateSchema = z
  .object({
    employeeId: z.string().uuid(),
    year,
    balances: z
      .array(
        z.object({
          leaveTypeId: z.string().uuid(),
          openingBalance: z.coerce.number().min(0).max(366),
        }),
      )
      .min(1)
      .max(24),
  })
  .strict();

export type LeaveBalanceQueryInput = z.infer<typeof leaveBalanceQuerySchema>;
export type AdminLeaveBalanceQueryInput = z.infer<
  typeof adminLeaveBalanceQuerySchema
>;
export type AdminLeaveBalanceUpdateInput = z.infer<
  typeof adminLeaveBalanceUpdateSchema
>;
