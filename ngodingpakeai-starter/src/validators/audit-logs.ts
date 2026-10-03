import { z } from "zod";

export const auditListSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
    action: z.string().trim().max(64).optional(),
    entity: z.string().trim().max(64).optional(),
  })
  .strict();

export type AuditListInput = z.infer<typeof auditListSchema>;
