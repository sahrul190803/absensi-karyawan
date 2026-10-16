import { readFile } from "node:fs/promises";
import { ApiError, sessionHasPermission, withApiSession } from "@/lib/api";
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
    let buffer: Buffer;
    try {
      buffer = await readFile(file.absolutePath);
    } catch {
      throw new ApiError(404, "NOT_FOUND", "Berkas lampiran tidak ditemukan.");
    }
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": "inline",
      },
    });
  });
}
