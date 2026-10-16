import { withApiPermission } from "@/lib/api";
import { deleteAnyMealClaim } from "@/services/meals.service";
import { idSchema } from "@/validators/common";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export function DELETE(request: Request, context: Context) {
  return withApiPermission(request, { meals: ["delete-any"] }, async (session) => {
    const id = idSchema.parse((await context.params).id);
    await deleteAnyMealClaim(session.user.id, id);
    return new Response(null, { status: 204 });
  });
}
