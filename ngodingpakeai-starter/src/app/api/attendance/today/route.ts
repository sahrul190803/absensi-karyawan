import { withApiSession } from "@/lib/api";
import { getToday } from "@/services/attendance.service";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await getToday(session.user.id) }),
  );
}
