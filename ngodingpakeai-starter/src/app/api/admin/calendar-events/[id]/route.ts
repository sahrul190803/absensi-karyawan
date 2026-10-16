import { readJson, withApiPermission } from "@/lib/api";
import {
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/services/calendar-events.service";
import { idSchema } from "@/validators/common";
import { calendarEventUpdateSchema } from "@/validators/calendar-events";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { calendar: ["manage"] },
    async (session) => {
      const id = idSchema.parse((await context.params).id);
      const input = calendarEventUpdateSchema.parse(await readJson(request));
      const row = await updateCalendarEvent(session.user.id, id, input);
      return Response.json({ data: row });
    },
  );
}

export function DELETE(request: Request, context: Context) {
  return withApiPermission(
    request,
    { calendar: ["manage"] },
    async (session) => {
      const id = idSchema.parse((await context.params).id);
      await deleteCalendarEvent(session.user.id, id);
      return new Response(null, { status: 204 });
    },
  );
}
