import { withApiSession } from "@/lib/api";
import { listOwnSchedule } from "@/services/schedules.service";
import { scheduleRangeSchema } from "@/validators/schedules";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = scheduleRangeSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listOwnSchedule(session.user.id, query));
  });
}
