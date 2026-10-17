import { sessionHasPermission, withApiSession } from "@/lib/api";
import { getRequestAttachment } from "@/services/requests.service";
import { requestIdSchema } from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = requestIdSchema.parse((await context.params).id);
    const canReadAny = await sessionHasPermission(session, {
      requests: ["read-any"],
    });
    const file = await getRequestAttachment(session.user.id, canReadAny, id);
    return new Response(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": "inline",
      },
    });
  });
}
