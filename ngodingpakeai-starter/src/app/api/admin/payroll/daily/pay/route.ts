import { readJson, withApiPermission } from "@/lib/api";
import { payDailyPayroll } from "@/services/payroll.service";
import { payDailyPayrollSchema } from "@/validators/payroll";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { payroll: ["update"] },
    async (session) => {
      const input = payDailyPayrollSchema.parse(await readJson(request));
      const data = await payDailyPayroll(session.user.id, input);
      return Response.json({ data });
    },
  );
}
