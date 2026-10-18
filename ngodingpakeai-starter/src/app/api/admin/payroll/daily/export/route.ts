import { z } from "zod";
import { withApiPermission } from "@/lib/api";
import { toPdf, toSpreadsheetXml } from "@/lib/export";
import { getDailyPayroll } from "@/services/payroll.service";
import { dailyPayrollSchema } from "@/validators/payroll";

export const runtime = "nodejs";

const formatSchema = z.enum(["csv", "xls", "pdf"]);
const HEADERS = [
  "Nama",
  "Jabatan",
  "Gaji Harian",
  "Denda Telat",
  "Potongan Alpha",
  "Potongan Izin",
  "Gaji Bersih",
  "Status",
];

export function GET(request: Request) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const url = new URL(request.url);
    const format = formatSchema.parse(url.searchParams.get("format") ?? "csv");
    const params = Object.fromEntries(url.searchParams);
    delete params.format;
    const { date } = dailyPayrollSchema.parse(params);
    const { rows: data } = await getDailyPayroll(date);
    const rows = data.map((row) => [
      row.employeeName,
      row.positionName ?? "",
      Number(row.baseAmount),
      Number(row.lateDeduction),
      Number(row.alphaDeduction),
      Number(row.permissionDeduction),
      Number(row.netAmount),
      row.isPaid ? "Lunas" : "Belum dibayar",
    ]);

    if (format === "csv") {
      const csv =
        "\uFEFF" +
        [HEADERS.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="gaji-harian-${date}.csv"`,
        },
      });
    }
    if (format === "xls") {
      const xml = toSpreadsheetXml(`Gaji Harian ${date}`, HEADERS, rows);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="gaji-harian-${date}.xls"`,
        },
      });
    }
    const pdf = toPdf({
      title: `Gaji Harian ${date}`,
      headers: HEADERS,
      rows,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gaji-harian-${date}.pdf"`,
      },
    });
  });
}
