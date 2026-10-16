import { withApiPermission } from "@/lib/api";
import { listAnyDevices } from "@/services/devices.service";
import { listQuerySchema } from "@/validators/common";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { devices: ["read-any"] }, async () => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyDevices(query));
  });
}
