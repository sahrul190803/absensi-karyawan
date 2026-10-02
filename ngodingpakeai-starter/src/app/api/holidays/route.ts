import { readJson, withApiPermission } from "@/lib/api";
import { createAnyHoliday, listAnyHolidays } from "@/services/holidays.service";
import { listQuerySchema } from "@/validators/common";
import { createHolidaySchema } from "@/validators/holidays";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { holidays: ["read-any"] }, async () => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyHolidays(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { holidays: ["create"] }, async () => {
    const input = createHolidaySchema.parse(await readJson(request));
    const row = await createAnyHoliday(input);
    return Response.json(
      { data: row },
      { status: 201, headers: { Location: `/api/holidays/${row.id}` } },
    );
  });
}
