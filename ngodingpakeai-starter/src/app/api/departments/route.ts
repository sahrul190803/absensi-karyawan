import { readJson, withApiPermission } from "@/lib/api";
import {
  createAnyDepartment,
  listAnyDepartments,
} from "@/services/departments.service";
import { listQuerySchema } from "@/validators/common";
import { createDepartmentSchema } from "@/validators/departments";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { departments: ["read-any"] }, async () => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyDepartments(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { departments: ["create"] }, async () => {
    const input = createDepartmentSchema.parse(await readJson(request));
    const row = await createAnyDepartment(input);
    return Response.json(
      { data: row },
      { status: 201, headers: { Location: `/api/departments/${row.id}` } },
    );
  });
}
