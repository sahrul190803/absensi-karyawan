import { readJson, withApiPermission } from "@/lib/api";
import {
  createAnyTraining,
  listAnyTrainings,
} from "@/services/trainings.service";
import {
  trainingCreateSchema,
  trainingQuerySchema,
} from "@/validators/trainings";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { trainings: ["read-any"] }, async () => {
    const query = trainingQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyTrainings(query));
  });
}

export function POST(request: Request) {
  return withApiPermission(request, { trainings: ["create"] }, async (session) => {
    const input = trainingCreateSchema.parse(await readJson(request));
    const row = await createAnyTraining(session.user.id, input);
    return Response.json(
      { data: row },
      { status: 201, headers: { Location: `/api/admin/trainings/${row.id}` } },
    );
  });
}
