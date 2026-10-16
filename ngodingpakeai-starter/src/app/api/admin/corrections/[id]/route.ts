import { readJson, withApiPermission } from "@/lib/api";
import { decideAnyCorrection } from "@/services/corrections.service";
import {
  correctionDecisionSchema,
  correctionIdSchema,
} from "@/validators/corrections";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { attendance: ["update"] },
    async (session) => {
      const id = correctionIdSchema.parse((await context.params).id);
      const input = correctionDecisionSchema.parse(await readJson(request));
      const row = await decideAnyCorrection(session.user.id, id, input);
      return Response.json({ data: row });
    },
  );
}
