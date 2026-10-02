import { withApiSession } from "@/lib/api";
import { cancelOwnRequest } from "@/services/requests.service";
import { requestIdSchema } from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = requestIdSchema.parse((await context.params).id);
    const row = await cancelOwnRequest(session.user.id, id);
    return Response.json({ data: row });
  });
}
