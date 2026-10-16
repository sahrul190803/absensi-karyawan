import { withApiSession } from "@/lib/api";
import { listOwnDevices } from "@/services/devices.service";
import { listQuerySchema } from "@/validators/common";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listOwnDevices(session.user.id, query));
  });
}
