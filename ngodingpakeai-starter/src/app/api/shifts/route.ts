import { readJson, withApiPermission } from "@/lib/api";
import { createAnyShift, listAnyShifts } from "@/services/shifts.service";
import { listQuerySchema } from "@/validators/common";
import { createShiftSchema } from "@/validators/shifts";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { shifts: ["read-any"] }, async () => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyShifts(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { shifts: ["create"] }, async () => {
    const input = createShiftSchema.parse(await readJson(request));
    const row = await createAnyShift(input);
    return Response.json(
      { data: row },
      { status: 201, headers: { Location: `/api/shifts/${row.id}` } },
    );
  });
}
