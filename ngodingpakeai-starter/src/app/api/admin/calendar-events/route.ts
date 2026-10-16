import { readJson, withApiPermission } from "@/lib/api";
import {
  createCalendarEvent,
  listCalendarEvents,
} from "@/services/calendar-events.service";
import {
  calendarEventCreateSchema,
  calendarEventQuerySchema,
} from "@/validators/calendar-events";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { calendar: ["read-any"] }, async () => {
    const query = calendarEventQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listCalendarEvents(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { calendar: ["manage"] },
    async (session) => {
      const input = calendarEventCreateSchema.parse(await readJson(request));
      const row = await createCalendarEvent(session.user.id, input);
      return Response.json({ data: row }, { status: 201 });
    },
  );
}
