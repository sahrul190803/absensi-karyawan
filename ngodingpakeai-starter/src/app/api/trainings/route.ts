import { withApiSession } from "@/lib/api";
import { listOwnTrainings } from "@/services/trainings.service";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json(await listOwnTrainings(session.user.id)),
  );
}
