import { readJson, withApiPermission } from "@/lib/api";
import { sendAppreciation } from "@/services/appreciations.service";
import { appreciationSchema } from "@/validators/appreciations";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(
    request,
    { appreciations: ["send"] },
    async (session) => {
      const input = appreciationSchema.parse(await readJson(request));
      const result = await sendAppreciation(session.user.id, input);
      return Response.json({ data: result }, { status: 201 });
    },
  );
}
