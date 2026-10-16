import { readJson, withApiPermission } from "@/lib/api";
import { importEmployeesCsv } from "@/services/imports.service";
import { importCsvSchema } from "@/validators/imports";

export const runtime = "nodejs";

export function POST(request: Request) {
  return withApiPermission(request, { employees: ["create"] }, async (session) => {
    const { csv } = importCsvSchema.parse(await readJson(request));
    const result = await importEmployeesCsv(session.user.id, csv);
    if (result.errors.length > 0) {
      return Response.json(
        {
          error: {
            code: "IMPORT_INVALID",
            message: `${result.errors.length} baris tidak valid. Tidak ada data yang diimpor.`,
            details: result.errors,
          },
        },
        { status: 422 },
      );
    }
    return Response.json({ data: result }, { status: 201 });
  });
}
