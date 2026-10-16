import "server-only";
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, calendarEvents } from "@/db/schema";
import { ApiError } from "@/lib/api";
import type {
  CalendarEventCreateInput,
  CalendarEventQueryInput,
  CalendarEventUpdateInput,
} from "@/validators/calendar-events";

const fields = {
  id: calendarEvents.id,
  title: calendarEvents.title,
  type: calendarEvents.type,
  date: calendarEvents.date,
  note: calendarEvents.note,
  createdBy: calendarEvents.createdBy,
  createdAt: calendarEvents.createdAt,
};

export async function listCalendarEvents(query: CalendarEventQueryInput) {
  const conditions: SQL[] = [];
  if (query.from) conditions.push(gte(calendarEvents.date, query.from));
  if (query.to) conditions.push(lte(calendarEvents.date, query.to));

  const data = await db
    .select(fields)
    .from(calendarEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(calendarEvents.date), asc(calendarEvents.createdAt))
    .limit(query.limit);

  return { data };
}

export async function createCalendarEvent(
  actorId: string,
  input: CalendarEventCreateInput,
) {
  const [row] = await db
    .insert(calendarEvents)
    .values({
      title: input.title,
      type: input.type,
      date: input.date,
      note: input.note,
      createdBy: actorId,
    })
    .returning(fields);

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "calendar-event-create",
    entity: "calendar_events",
    entityId: row.id,
    newValue: { title: row.title, type: row.type, date: row.date },
  });

  return row;
}

export async function updateCalendarEvent(
  actorId: string,
  id: string,
  input: CalendarEventUpdateInput,
) {
  const [before] = await db
    .select(fields)
    .from(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .limit(1);
  if (!before)
    throw new ApiError(404, "NOT_FOUND", "Agenda kalender tidak ditemukan.");

  const [row] = await db
    .update(calendarEvents)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    })
    .where(eq(calendarEvents.id, id))
    .returning(fields);

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "calendar-event-update",
    entity: "calendar_events",
    entityId: id,
    oldValue: { title: before.title, type: before.type, date: before.date },
    newValue: { title: row.title, type: row.type, date: row.date },
  });

  return row;
}

export async function deleteCalendarEvent(actorId: string, id: string) {
  const [row] = await db
    .delete(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .returning(fields);
  if (!row)
    throw new ApiError(404, "NOT_FOUND", "Agenda kalender tidak ditemukan.");

  await db.insert(auditLogs).values({
    userId: actorId,
    action: "calendar-event-delete",
    entity: "calendar_events",
    entityId: id,
    oldValue: { title: row.title, type: row.type, date: row.date },
  });

  return row;
}
