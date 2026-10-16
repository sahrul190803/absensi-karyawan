import { readJson, withApiPermission } from "@/lib/api";
import {
  deleteAnySchedule,
  updateAnySchedule,
} from "@/services/schedules.service";
import { scheduleIdSchema, scheduleUpdateSchema } from "@/validators/schedules";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { schedules: ["update"] },
    async (session) => {
      const id = scheduleIdSchema.parse((await context.params).id);
      const input = scheduleUpdateSchema.parse(await readJson(request));
      return Response.json({
        data: await updateAnySchedule(session.user.id, id, input),
      });
    },
  );
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { schedules: ["delete"] },
    async (session) => {
      const id = scheduleIdSchema.parse((await context.params).id);
      return Response.json({
        data: await deleteAnySchedule(session.user.id, id),
      });
    },
  );
}
