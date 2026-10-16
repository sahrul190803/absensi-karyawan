import { readFile } from "node:fs/promises";
import { z } from "zod";
import { sessionHasPermission, withApiSession } from "@/lib/api";
import { getEmployeeDocument } from "@/services/employees.service";
import { idSchema } from "@/validators/common";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; type: string }> };

const typeSchema = z.enum(["photo", "ktp"]);

// Foto profil / KTP: pemilik sendiri, atau peran dengan employees:read-any.
export function GET(request: Request, context: Context) {
  return withApiSession(request, async (session) => {
    const params = await context.params;
    const id = idSchema.parse(params.id);
    const type = typeSchema.parse(params.type);
    const canReadAny = await sessionHasPermission(session, {
      employees: ["read-any"],
    });
    const document = await getEmployeeDocument(
      session.user.id,
      canReadAny,
      id,
      type,
    );
    const file = await readFile(document.absolutePath);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": document.mimeType,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
