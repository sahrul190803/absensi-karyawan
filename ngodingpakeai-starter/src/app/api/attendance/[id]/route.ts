import { idSchema } from "@/validators/common";
import { sessionHasPermission, withApiSession } from "@/lib/api";
import { getAttendanceDetail } from "@/services/attendance.service";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = idSchema.parse((await context.params).id);
    const canReadAny = await sessionHasPermission(session, {
      attendance: ["read-any"],
    });
    return Response.json({
      data: await getAttendanceDetail(session.user.id, canReadAny, id),
    });
  });
}
