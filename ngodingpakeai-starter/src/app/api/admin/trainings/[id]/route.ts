import { ApiError, readJson, withApiPermission } from "@/lib/api";
import {
  deleteAnyTraining,
  updateAnyTraining,
} from "@/services/trainings.service";
import { idSchema } from "@/validators/common";
import { trainingUpdateSchema } from "@/validators/trainings";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { trainings: ["update"] }, async (session) => {
    const id = idSchema.parse((await context.params).id);
    const input = trainingUpdateSchema.parse(await readJson(request));
    const row = await updateAnyTraining(session.user.id, id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Training not found.");
    return Response.json({ data: row });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { trainings: ["delete"] }, async (session) => {
    const id = idSchema.parse((await context.params).id);
    await deleteAnyTraining(session.user.id, id);
    return new Response(null, { status: 204 });
  });
}
