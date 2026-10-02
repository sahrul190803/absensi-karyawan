import { readJson, withApiPermission } from "@/lib/api";
import {
  createAnyWorkLocation,
  listAnyWorkLocations,
} from "@/services/work-locations.service";
import { listQuerySchema } from "@/validators/common";
import { createWorkLocationSchema } from "@/validators/work-locations";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(
    request,
    { workLocations: ["read-any"] },
    async () => {
      const query = listQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      return Response.json(await listAnyWorkLocations(query));
    },
  );
}

export function POST(request: Request) {
  return withApiPermission(
    request,
    { workLocations: ["create"] },
    async () => {
      const input = createWorkLocationSchema.parse(await readJson(request));
      const row = await createAnyWorkLocation(input);
      return Response.json(
        { data: row },
        { status: 201, headers: { Location: `/api/work-locations/${row.id}` } },
      );
    },
  );
}
