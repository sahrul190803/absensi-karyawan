import { ApiError, readJson, withApiPermission } from "@/lib/api";
import {
  deleteAnyEmployee,
  getAnyEmployee,
  updateAnyEmployee,
} from "@/services/employees.service";
import { idSchema } from "@/validators/common";
import { updateEmployeeSchema } from "@/validators/employees";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiPermission(request, { employees: ["read-any"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    const row = await getAnyEmployee(id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Employee not found.");
    return Response.json({ data: row });
  });
}

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { employees: ["update"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    const input = updateEmployeeSchema.parse(await readJson(request));
    const row = await updateAnyEmployee(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Employee not found.");
    return Response.json({ data: row });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { employees: ["delete"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    if (!(await deleteAnyEmployee(id)))
      throw new ApiError(404, "NOT_FOUND", "Employee not found.");
    return new Response(null, { status: 204 });
  });
}
