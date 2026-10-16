import { z } from "zod";
import { readJson, withApiPermission } from "@/lib/api";
import { sendRemindersForDate } from "@/services/reminders.service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export function POST(request: Request) {
  return withApiPermission(request, { settings: ["update"] }, async () => {
    const input = bodySchema.parse(await readJson(request));
    return Response.json({ data: await sendRemindersForDate(input.date) });
  });
}
