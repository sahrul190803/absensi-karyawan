import { z } from "zod";

export const idSchema = z.string().uuid();

export const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  })
  .strict();

export type ListQueryInput = z.infer<typeof listQuerySchema>;
