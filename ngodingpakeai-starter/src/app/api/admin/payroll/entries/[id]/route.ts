import { readJson, withApiPermission } from "@/lib/api";
import { updateAnyPayrollEntry } from "@/services/payroll.service";
import { idSchema } from "@/validators/common";
import { updatePayrollEntrySchema } from "@/validators/payroll";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function PATCH(request: Request, context: Context) {
  return withApiPermission(request, { payroll: ["update"] }, async (session) => {
    const id = idSchema.parse((await context.params).id);
    const input = updatePayrollEntrySchema.parse(await readJson(request));
    const data = await updateAnyPayrollEntry(session.user.id, id, input);
    return Response.json({ data });
  });
}
