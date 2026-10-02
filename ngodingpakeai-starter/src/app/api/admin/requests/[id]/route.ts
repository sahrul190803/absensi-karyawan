import { readJson, withApiPermission } from "@/lib/api";
import { decideAnyRequest } from "@/services/requests.service";
import { decisionSchema, requestIdSchema } from "@/validators/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { requests: ["approve"] }, async (session) => {
    const id = requestIdSchema.parse((await context.params).id);
    const input = decisionSchema.parse(await readJson(request));
    const row = await decideAnyRequest(session.user.id, id, input);
    return Response.json({ data: row });
  });
}
