import { readJson, withApiSession } from "@/lib/api";
import { claimOwnMeal, getOwnMeals } from "@/services/meals.service";
import { mealClaimSchema } from "@/validators/meals";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiSession(request, async (session) =>
    Response.json(await getOwnMeals(session.user.id)),
  );
}

export function POST(request: Request) {
  return withApiSession(request, async (session) => {
    const input = mealClaimSchema.parse(await readJson(request));
    const row = await claimOwnMeal(session.user.id, input);
    return Response.json({ data: row }, { status: 201 });
  });
}
