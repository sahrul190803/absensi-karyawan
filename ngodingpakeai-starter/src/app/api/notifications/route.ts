import { withApiSession } from "@/lib/api";
import {
  listOwnNotifications,
  markAllOwnRead,
} from "@/services/notifications.service";
import { listQuerySchema } from "@/validators/common";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listOwnNotifications(session.user.id, query));
  });
}

export function PATCH(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await markAllOwnRead(session.user.id) }),
  );
}
