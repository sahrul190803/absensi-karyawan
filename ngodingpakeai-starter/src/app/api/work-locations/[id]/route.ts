import { ApiError, readJson, withApiPermission } from "@/lib/api";
import {
  deleteAnyWorkLocation,
  updateAnyWorkLocation,
} from "@/services/work-locations.service";
import { idSchema } from "@/validators/common";
import { updateWorkLocationSchema } from "@/validators/work-locations";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { workLocations: ["update"] },
    async () => {
      const id = idSchema.parse((await context.params).id);
      const input = updateWorkLocationSchema.parse(await readJson(request));
      const row = await updateAnyWorkLocation(id, input);
      if (!row) throw new ApiError(404, "NOT_FOUND", "Work location not found.");
      return Response.json({ data: row });
    },
  );
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { workLocations: ["delete"] },
    async () => {
      const id = idSchema.parse((await context.params).id);
      if (!(await deleteAnyWorkLocation(id)))
        throw new ApiError(404, "NOT_FOUND", "Work location not found.");
      return new Response(null, { status: 204 });
    },
  );
}
