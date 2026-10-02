import { readJson, withApiPermission } from "@/lib/api";
import {
  createAnyPosition,
  listAnyPositions,
} from "@/services/positions.service";
import { listQuerySchema } from "@/validators/common";
import { createPositionSchema } from "@/validators/positions";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { positions: ["read-any"] }, async () => {
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyPositions(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { positions: ["create"] }, async () => {
    const input = createPositionSchema.parse(await readJson(request));
    const row = await createAnyPosition(input);
    return Response.json(
      { data: row },
      { status: 201, headers: { Location: `/api/positions/${row.id}` } },
    );
  });
}
