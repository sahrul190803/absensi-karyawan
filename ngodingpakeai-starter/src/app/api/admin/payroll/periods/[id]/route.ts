import { readJson, withApiPermission } from "@/lib/api";
import {
  getAnyPayrollPeriod,
  updateAnyPayrollPeriod,
} from "@/services/payroll.service";
import { idSchema } from "@/validators/common";
import { updatePayrollPeriodSchema } from "@/validators/payroll";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function GET(request: Request, context: Context) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    return Response.json({ data: await getAnyPayrollPeriod(id) });
  });
}

export function PATCH(request: Request, context: Context) {
  return withApiPermission(
    request,
    { payroll: ["update"] },
    async (session) => {
      const id = idSchema.parse((await context.params).id);
      const input = updatePayrollPeriodSchema.parse(await readJson(request));
      const data = await updateAnyPayrollPeriod(session.user.id, id, input);
      return Response.json({ data });
    },
  );
}
