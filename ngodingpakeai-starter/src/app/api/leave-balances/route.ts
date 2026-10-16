import { withApiSession } from "@/lib/api";
import { listOwnLeaveBalances } from "@/services/leave.service";
import { leaveBalanceQuerySchema } from "@/validators/leave";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = leaveBalanceQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(
      await listOwnLeaveBalances(session.user.id, query.year),
    );
  });
}
