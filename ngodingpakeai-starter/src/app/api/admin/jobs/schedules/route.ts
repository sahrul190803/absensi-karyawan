import { z } from "zod";
import { readJson, withApiPermission } from "@/lib/api";
import { generateSchedulesFromAssignments } from "@/services/employee-shifts.service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export function POST(request: Request) {
  return withApiPermission(request, { schedules: ["create"] }, async (session) => {
    const input = bodySchema.parse(await readJson(request));
    return Response.json({
      data: await generateSchedulesFromAssignments(
        session.user.id,
        input.from,
        input.to,
      ),
    });
  });
}
