import { withApiPermission } from "@/lib/api";
import { listAnyCorrections } from "@/services/corrections.service";
import { correctionListSchema } from "@/validators/corrections";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { attendance: ["read-any"] },
    async () => {
      const query = correctionListSchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      return Response.json(await listAnyCorrections(query));
    },
  );
}
