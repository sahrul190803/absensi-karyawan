import { readJson, withApiPermission } from "@/lib/api";
import { getSettings, updateSettings } from "@/services/settings.service";
import { updateSettingsSchema } from "@/validators/settings";

export const runtime = "nodejs";

export function GET(request: Request) {
  return withApiPermission(request, { settings: ["read-any"] }, async () =>
    Response.json({ data: await getSettings() }),
  );
}

export function PATCH(request: Request) {
  return withApiPermission(request, { settings: ["update"] }, async () => {
    const input = updateSettingsSchema.parse(await readJson(request));
    return Response.json({ data: await updateSettings(input) });
  });
}
