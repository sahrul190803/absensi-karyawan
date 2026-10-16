import { readJson, withApiSession } from "@/lib/api";
import {
  createOwnCorrection,
  listOwnCorrections,
} from "@/services/corrections.service";
import {
  correctionCreateSchema,
  correctionListSchema,
} from "@/validators/corrections";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) => {
    const query = correctionListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(
      await listOwnCorrections(session.user.id, query),
    );
  });
}

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const input = correctionCreateSchema.parse(await readJson(request));
    const row = await createOwnCorrection(session.user.id, input);
    return Response.json({ data: row }, { status: 201 });
  });
}
