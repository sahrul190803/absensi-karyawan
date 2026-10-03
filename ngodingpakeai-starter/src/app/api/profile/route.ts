import { withApiSession } from "@/lib/api";
import { getOwnProfile } from "@/services/employees.service";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await getOwnProfile(session.user.id) }),
  );
}
