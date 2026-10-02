import { readJson, withApiSession } from "@/lib/api";
import { checkIn } from "@/services/attendance.service";
import { attendancePingSchema } from "@/validators/attendance";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const input = attendancePingSchema.parse(await readJson(request));
    const record = await checkIn(session.user.id, input);
    return Response.json({ data: record }, { status: 201 });
  });
}
