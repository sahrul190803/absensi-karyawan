import { z } from "zod";

export const financeSummaryQuerySchema = z
  .object({
    period: z.enum(["week", "month", "year"]).default("month"),
  })
  .strict();

export type FinanceSummaryQueryInput = z.infer<
  typeof financeSummaryQuerySchema
>;
