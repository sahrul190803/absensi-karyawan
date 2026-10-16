import { readJson, withApiPermission } from "@/lib/api";
import {
  deleteAnyEmployeeShift,
  updateAnyEmployeeShift,
} from "@/services/employee-shifts.service";
import { idSchema } from "@/validators/common";
import { employeeShiftUpdateSchema } from "@/validators/employee-shifts";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { schedules: ["update"] }, async (session) => {
    const id = idSchema.parse((await context.params).id);
    const input = employeeShiftUpdateSchema.parse(await readJson(request));
    return Response.json({
      data: await updateAnyEmployeeShift(session.user.id, id, input),
    });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { schedules: ["delete"] }, async (session) => {
    const id = idSchema.parse((await context.params).id);
    return Response.json({
      data: await deleteAnyEmployeeShift(session.user.id, id),
    });
  });
}
