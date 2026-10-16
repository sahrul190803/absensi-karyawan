import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";

// Health check publik untuk uptime monitor (Vercel/uptime bot). Tidak
// membocorkan detail internal, hanya status aplikasi + koneksi database.
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json(
      { status: "ok", database: "up" },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error(
      "Health check failed:",
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      { status: "degraded", database: "down" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
