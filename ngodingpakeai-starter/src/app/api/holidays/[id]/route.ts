import { ApiError, readJson, withApiPermission } from "@/lib/api";
import { deleteAnyHoliday, updateAnyHoliday } from "@/services/holidays.service";
import { idSchema } from "@/validators/common";
import { updateHolidaySchema } from "@/validators/holidays";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { holidays: ["update"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    const input = updateHolidaySchema.parse(await readJson(request));
    const row = await updateAnyHoliday(id, input);
    if (!row) throw new ApiError(404, "NOT_FOUND", "Holiday not found.");
    return Response.json({ data: row });
  });
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { holidays: ["delete"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    if (!(await deleteAnyHoliday(id)))
      throw new ApiError(404, "NOT_FOUND", "Holiday not found.");
    return new Response(null, { status: 204 });
  });
}
