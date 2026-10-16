import { readJson, withApiPermission } from "@/lib/api";
import {
  generateAnyPayrollPeriod,
  listAnyPayrollPeriods,
} from "@/services/payroll.service";
import { listQuerySchema } from "@/validators/common";
import { generatePayrollSchema } from "@/validators/payroll";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyPayrollPeriods(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { payroll: ["create"] }, async (session) => {
    const input = generatePayrollSchema.parse(await readJson(request));
    const result = await generateAnyPayrollPeriod(session.user.id, input);
    return Response.json(
      { data: result },
      {
        status: 201,
        headers: { Location: `/api/admin/payroll/periods/${result.period.id}` },
      },
    );
  });
}
