import { withApiPermission } from "@/lib/api";
import { getDailyPayroll } from "@/services/payroll.service";
import { dailyPayrollSchema } from "@/validators/payroll";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const input = dailyPayrollSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json({ data: await getDailyPayroll(input.date) });
  });
}
