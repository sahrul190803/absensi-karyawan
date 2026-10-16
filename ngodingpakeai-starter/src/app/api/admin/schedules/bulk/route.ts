import { readJson, withApiPermission } from "@/lib/api";
import { bulkUpsertAnySchedules } from "@/services/schedules.service";
import { scheduleBulkCreateSchema } from "@/validators/schedules";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { schedules: ["create"] },
    async (session) => {
      const input = scheduleBulkCreateSchema.parse(await readJson(request));
      const row = await bulkUpsertAnySchedules(session.user.id, input);
      return Response.json({ data: row }, { status: 201 });
    },
  );
}
