import { ApiError, readJson, withApiPermission } from "@/lib/api";
import {
  deleteAnyDepartment,
  updateAnyDepartment,
} from "@/services/departments.service";
import { idSchema } from "@/validators/common";
import { updateDepartmentSchema } from "@/validators/departments";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { departments: ["update"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    const input = updateDepartmentSchema.parse(await readJson(request));
    const row = await updateAnyDepartment(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Department not found.");
    return Response.json({ data: row });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { departments: ["delete"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    if (!(await deleteAnyDepartment(id)))
      throw new ApiError(404, "NOT_FOUND", "Department not found.");
    return new Response(null, { status: 204 });
  });
}
