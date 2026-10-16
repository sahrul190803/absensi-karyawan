import { readJson, withApiPermission } from "@/lib/api";
import {
  listAnySchedules,
  upsertAnySchedule,
} from "@/services/schedules.service";
import {
  scheduleCreateSchema,
  scheduleListSchema,
} from "@/validators/schedules";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { schedules: ["read-any"] }, async () => {
    const query = scheduleListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnySchedules(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { schedules: ["create"] },
    async (session) => {
      const input = scheduleCreateSchema.parse(await readJson(request));
      const row = await upsertAnySchedule(session.user.id, input);
      return Response.json({ data: row }, { status: 201 });
    },
  );
}
