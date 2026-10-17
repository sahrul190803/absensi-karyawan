import { sessionHasPermission, withApiSession } from "@/lib/api";
import { getPhotoForViewer } from "@/services/attendance.service";
import { idSchema } from "@/validators/common";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const id = idSchema.parse((await context.params).id);
    const canReadAny = await sessionHasPermission(session, {
      attendance: ["read-any"],
    });
    const photo = await getPhotoForViewer(session.user.id, canReadAny, id);
    return new Response(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Disposition": "inline",
      },
    });
  });
}
