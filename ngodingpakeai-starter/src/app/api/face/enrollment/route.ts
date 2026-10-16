import { readJson, withApiSession } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import {
  enrollFace,
  getFaceStatus,
  revokeFace,
} from "@/services/face.service";
import { faceEnrollSchema } from "@/validators/face";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await getFaceStatus(session.user.id) }),
  );
}

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    rateLimit(`face:enroll:${session.user.id}`, 5, 60_000);
    const input = faceEnrollSchema.parse(await readJson(request));
    return Response.json(
      { data: await enrollFace(session.user.id, input) },
      { status: 201 },
    );
  });
}

export function DELETE(request: Request) {
  return withApiSession(request, async (session) => {
    rateLimit(`face:enroll:${session.user.id}`, 5, 60_000);
    return Response.json({ data: await revokeFace(session.user.id) });
  });
}
