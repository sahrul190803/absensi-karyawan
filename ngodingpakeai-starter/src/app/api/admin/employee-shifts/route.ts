import { z } from "zod";
import { readJson, withApiPermission } from "@/lib/api";
import {
  createAnyEmployeeShift,
  listAnyEmployeeShifts,
} from "@/services/employee-shifts.service";
import { listQuerySchema } from "@/validators/common";
import { employeeShiftCreateSchema } from "@/validators/employee-shifts";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { schedules: ["read-any"] }, async () => {
    const params = new URL(request.url).searchParams;
    const query = listQuerySchema.parse(Object.fromEntries(params));
    const employeeId = z.string().uuid().optional().parse(
      params.get("employeeId") ?? undefined,
    );
    return Response.json(await listAnyEmployeeShifts(query, { employeeId }));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { schedules: ["create"] }, async (session) => {
    const input = employeeShiftCreateSchema.parse(await readJson(request));
    const row = await createAnyEmployeeShift(session.user.id, input);
    return Response.json({ data: row }, { status: 201 });
  });
}
