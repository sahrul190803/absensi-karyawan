import { withApiSession } from "@/lib/api";
import { deleteOwnNotification } from "@/services/notifications.service";
import { idSchema } from "@/validators/common";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = idSchema.parse((await context.params).id);
    await deleteOwnNotification(session.user.id, id);
    return new Response(null, { status: 204 });
  });
}
