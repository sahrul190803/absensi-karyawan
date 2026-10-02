import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { deleteAnyShift, updateAnyShift } from "@/services/shifts.service";
import { idSchema } from "@/validators/common";
import { updateShiftSchema } from "@/validators/shifts";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { shifts: ["update"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    const input = updateShiftSchema.parse(await readJson(request));
    const row = await updateAnyShift(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Shift not found.");
    return Response.json({ data: row });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { shifts: ["delete"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    if (!(await deleteAnyShift(id)))
      throw new ApiError(404, "NOT_FOUND", "Shift not found.");
    return new Response(null, { status: 204 });
  });
}
