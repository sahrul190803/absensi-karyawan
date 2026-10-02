import { ApiError, readJson, withApiPermission } from "@/lib/api";
import {
  deleteAnyPosition,
  updateAnyPosition,
} from "@/services/positions.service";
import { idSchema } from "@/validators/common";
import { updatePositionSchema } from "@/validators/positions";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { positions: ["update"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    const input = updatePositionSchema.parse(await readJson(request));
    const row = await updateAnyPosition(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Position not found.");
    return Response.json({ data: row });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { positions: ["delete"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    if (!(await deleteAnyPosition(id)))
      throw new ApiError(404, "NOT_FOUND", "Position not found.");
    return new Response(null, { status: 204 });
  });
}
