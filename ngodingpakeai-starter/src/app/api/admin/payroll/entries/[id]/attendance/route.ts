import { withApiPermission } from "@/lib/api";
import { getAnyPayrollEntryAttendance } from "@/services/payroll.service";
import { idSchema } from "@/validators/common";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    return Response.json({ data: await getAnyPayrollEntryAttendance(id) });
  });
}
