import { withApiPermission } from "@/lib/api";
import { listAnyMealClaims } from "@/services/meals.service";
import { mealQuerySchema } from "@/validators/meals";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { meals: ["read-any"] }, async () => {
    const query = mealQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listAnyMealClaims(query));
  });
}
