import { withApiPermission } from "@/lib/api";
import { listAnyAttendance } from "@/services/admin-attendance.service";
import { adminAttendanceListSchema } from "@/validators/admin-attendance";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { attendance: ["read-any"] }, async () => {
    const query = adminAttendanceListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyAttendance(query));
  });
}
