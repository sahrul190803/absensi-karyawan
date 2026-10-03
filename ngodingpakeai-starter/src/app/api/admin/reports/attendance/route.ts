import { withApiPermission } from "@/lib/api";
import { getAttendanceReport } from "@/services/reports.service";
import { reportQuerySchema } from "@/validators/reports";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { reports: ["read-any"] }, async () => {
    const query = reportQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await getAttendanceReport(query));
  });
}
