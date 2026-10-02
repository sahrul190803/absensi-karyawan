import { readJson, withApiPermission } from "@/lib/api";
import { createAnyEmployee, listAnyEmployees } from "@/services/employees.service";
import { listQuerySchema } from "@/validators/common";
import { createEmployeeSchema } from "@/validators/employees";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { employees: ["read-any"] }, async () => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyEmployees(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { employees: ["create"] }, async () => {
    const input = createEmployeeSchema.parse(await readJson(request));
    const row = await createAnyEmployee(input);
    return Response.json(
      { data: row },
      { status: 201, headers: { Location: `/api/employees/${row.id}` } },
    );
  });
}
