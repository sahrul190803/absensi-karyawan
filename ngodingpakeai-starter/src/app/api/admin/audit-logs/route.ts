import { withApiPermission } from "@/lib/api";
import { listAnyAuditLogs } from "@/services/audit-logs.service";
import { auditListSchema } from "@/validators/audit-logs";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { audit: ["read-any"] }, async () => {
    const query = auditListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyAuditLogs(query));
  });
}
