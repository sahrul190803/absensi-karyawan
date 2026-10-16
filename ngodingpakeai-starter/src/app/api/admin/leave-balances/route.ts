import { readJson, withApiPermission } from "@/lib/api";
import {
  listAnyLeaveBalances,
  listAnyLeaveQuotaOverview,
  updateAnyLeaveBalances,
} from "@/services/leave.service";
import {
  adminLeaveBalanceQuerySchema,
  adminLeaveBalanceUpdateSchema,
} from "@/validators/leave";

export const runtime = "nodejs";

// Tanpa employeeId: ringkasan kuota seluruh karyawan untuk satu tahun.
// Dengan employeeId: rincian saldo satu karyawan (perilaku lama).
export function GET(request: Request) {
  return withApiPermission(
    request,
    { employees: ["read-any"] },
    async () => {
      const query = adminLeaveBalanceQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      if (!query.employeeId)
        return Response.json({
          data: await listAnyLeaveQuotaOverview(query.year),
        });
      return Response.json(
        await listAnyLeaveBalances(query.employeeId, query.year),
      );
    },
  );
}

export function PATCH(request: Request) {
  return withApiPermission(
    request,
    { employees: ["update"] },
    async (session) => {
      const input = adminLeaveBalanceUpdateSchema.parse(
        await readJson(request),
      );
      return Response.json({
        data: await updateAnyLeaveBalances(session.user.id, input),
      });
    },
  );
}
