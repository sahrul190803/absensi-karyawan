import { readJson, withApiSession } from "@/lib/api";
import { createOwnRequest, listOwnRequests } from "@/services/requests.service";
import { createRequestSchema, requestListSchema } from "@/validators/requests";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = requestListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listOwnRequests(session.user.id, query));
  });
}

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const input = createRequestSchema.parse(await readJson(request));
    const row = await createOwnRequest(session.user.id, input);
    return Response.json({ data: row }, { status: 201 });
  });
}
