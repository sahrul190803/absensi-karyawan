import { sessionHasPermission, withApiSession } from "@/lib/api";
import { revokeAnyDevice, revokeOwnDevice } from "@/services/devices.service";
import { idSchema } from "@/validators/common";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = idSchema.parse((await context.params).id);
    const canRevokeAny = await sessionHasPermission(session, {
      devices: ["delete-any"],
    });
    const result = canRevokeAny
      ? await revokeAnyDevice(session.user.id, id)
      : await revokeOwnDevice(session.user.id, id);
    return Response.json({ data: result });
  });
}
