import { withApiSession } from "@/lib/api";
import { listHistory } from "@/services/attendance.service";
import { attendanceHistorySchema } from "@/validators/attendance";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = attendanceHistorySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listHistory(session.user.id, query));
  });
}
