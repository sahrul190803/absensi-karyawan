import { readJson, withApiSession } from "@/lib/api";
import {
  getOwnProfile,
  updateOwnProfile,
} from "@/services/employees.service";
import { profileUpdateSchema } from "@/validators/employees";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json({ data: await getOwnProfile(session.user.id) }),
  );
}

export function PATCH(request: Request) {
  return withApiSession(request, async (session) => {
    const input = profileUpdateSchema.parse(await readJson(request));
    const data = await updateOwnProfile(session.user.id, input);
    return Response.json({ data });
  });
}
