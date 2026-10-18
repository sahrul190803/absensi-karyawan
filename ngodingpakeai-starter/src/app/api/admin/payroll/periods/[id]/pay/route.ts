import { readJson, withApiPermission } from "@/lib/api";
import { payAnyPayrollEntries } from "@/services/payroll.service";
import { idSchema } from "@/validators/common";
import { payPayrollEntriesSchema } from "@/validators/payroll";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function POST(request: Request, context: Context) {
  return withApiPermission(
    request,
    { payroll: ["update"] },
    async (session) => {
      const id = idSchema.parse((await context.params).id);
      const input = payPayrollEntriesSchema.parse(await readJson(request));
      const data = await payAnyPayrollEntries(session.user.id, id, input);
      return Response.json({ data });
    },
  );
}
