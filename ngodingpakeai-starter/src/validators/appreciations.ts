import { z } from "zod";

export const appreciationSchema = z
  .object({
    employeeId: z.string().uuid(),
    kind: z.enum(["praise", "warn"]),
    message: z.string().trim().min(3).max(500),
  })
  .strict();

export type AppreciationInput = z.infer<typeof appreciationSchema>;
