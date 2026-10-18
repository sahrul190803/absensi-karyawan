import { z } from "zod";
import { withApiPermission } from "@/lib/api";
import { toPdf, toSpreadsheetXml } from "@/lib/export";
import { getAnyPayrollPeriod } from "@/services/payroll.service";
import { idSchema } from "@/validators/common";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

const formatSchema = z.enum(["csv", "xls", "pdf"]);

const HEADERS = [
  "Nama",
  "NIK",
  "Departemen",
  "Hadir",
  "Terlambat",
  "Menit telat",
  "Alpha",
  "Izin (hari)",
  "Lembur (menit)",
  "Klaim makan",
  "Gaji pokok",
  "Tunjangan",
  "Gaji kotor",
  "Potongan telat",
  "Potongan alpha",
  "Potongan izin",
  "Upah lembur",
  "Penyesuaian",
  "Total",
];

export function GET(request: Request, context: Context) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const id = idSchema.parse((await context.params).id);
    const format = formatSchema.parse(
      new URL(request.url).searchParams.get("format") ?? "csv",
    );
    const { period, entries } = await getAnyPayrollPeriod(id);
    const month = `${period.year}-${String(period.month).padStart(2, "0")}`;
    const rows = entries.map((row) => [
      row.employeeName,
      row.employeeNik,
      row.departmentName ?? "",
      row.presentDays,
      row.lateDays,
      row.lateMinutes,
      row.alphaDays,
      row.permissionDays,
      row.overtimeMinutes,
      row.mealClaimCount,
      row.baseAmount,
      row.allowance,
      row.grossAmount,
      row.lateDeduction,
      row.alphaDeduction,
      row.permissionDeduction,
      row.overtimeAmount,
      row.otherAdjustment,
      row.total,
    ]);

    if (format === "csv") {
      const csv =
        "\uFEFF" +
        [HEADERS.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="penggajian-${month}.csv"`,
        },
      });
    }
    if (format === "xls") {
      const xml = toSpreadsheetXml(`Penggajian ${month}`, HEADERS, rows);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="penggajian-${month}.xls"`,
        },
      });
    }
    const pdf = toPdf({
      title: `Penggajian ${month}`,
      headers: HEADERS,
      rows,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="penggajian-${month}.pdf"`,
      },
    });
  });
}
