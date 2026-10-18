import { withApiPermission } from "@/lib/api";
import { listAnyPayrollPayments } from "@/services/payroll.service";
import { payrollPaymentListSchema } from "@/validators/payroll";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const query = payrollPaymentListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyPayrollPayments(query));
  });
}
