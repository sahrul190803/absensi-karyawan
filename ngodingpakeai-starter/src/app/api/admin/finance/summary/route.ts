import { withApiPermission } from "@/lib/api";
import { summarizeFinance } from "@/services/finance.service";
import { financeSummaryQuerySchema } from "@/validators/finance";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { finance: ["read-any"] }, async () => {
    const query = financeSummaryQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await summarizeFinance(query));
  });
}
