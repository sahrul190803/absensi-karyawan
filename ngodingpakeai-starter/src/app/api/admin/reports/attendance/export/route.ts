import { z } from "zod";
import { withApiPermission } from "@/lib/api";
import { toPdf, toSpreadsheetXml } from "@/lib/export";
import { getAttendanceReport } from "@/services/reports.service";
import { reportQuerySchema } from "@/validators/reports";

export const runtime = "nodejs";

const formatSchema = z.enum(["csv", "xls", "pdf"]);

const HEADERS = [
  "Nama",
  "NIK",
  "Departemen",
  "Hadir",
  "Terlambat",
  "Pulang cepat",
  "Alpha",
  "Lembur (jam)",
];

export function GET(request: Request) {
  return withApiPermission(request, { reports: ["read-any"] }, async () => {
    const url = new URL(request.url);
    const format = formatSchema.parse(url.searchParams.get("format") ?? "csv");
    url.searchParams.delete("format");
    const query = reportQuerySchema.parse(Object.fromEntries(url.searchParams));
    const report = await getAttendanceReport(query);
    const { label } = report.meta;
    const rows = report.data.map((row) => [
      row.fullName,
      row.nik,
      row.departmentName ?? "",
      row.hadir,
      row.terlambat,
      row.pulangCepat,
      row.alpha,
      row.lemburJam,
    ]);

    if (format === "csv") {
      const csv =
        "\uFEFF" +
        [HEADERS.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="rekap-${label}.csv"`,
        },
      });
    }
    if (format === "xls") {
      const xml = toSpreadsheetXml(`Rekap ${label}`, HEADERS, rows);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="rekap-${label}.xls"`,
        },
      });
    }
    const pdf = toPdf({
      title: `Rekap kehadiran ${label}`,
      headers: HEADERS,
      rows,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rekap-${label}.pdf"`,
      },
    });
  });
}
