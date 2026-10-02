import { withApiPermission } from "@/lib/api";
import { listAnyRequests } from "@/services/requests.service";
import { requestListSchema } from "@/validators/requests";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { requests: ["read-any"] }, async () => {
    const query = requestListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyRequests(query));
  });
}
