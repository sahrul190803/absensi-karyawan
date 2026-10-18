import { readJson, withApiSession } from "@/lib/api";
import { submitOnboarding } from "@/services/onboarding.service";
import { onboardingSchema } from "@/validators/onboarding";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiSession(
    request,
    async (session) => {
      const input = onboardingSchema.parse(await readJson(request));
      const result = await submitOnboarding(session.user.id, input);
      return Response.json(
        { data: result.employee, meta: { created: result.created } },
        { status: result.created ? 201 : 200 },
      );
    },
    { allowPending: true },
  );
}
