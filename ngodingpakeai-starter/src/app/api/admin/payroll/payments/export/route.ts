import { z } from "zod";
import { withApiPermission } from "@/lib/api";
import { toPdf, toSpreadsheetXml } from "@/lib/export";
import { listAnyPayrollPayments } from "@/services/payroll.service";
import { payrollPaymentListSchema } from "@/validators/payroll";

export const runtime = "nodejs";

const formatSchema = z.enum(["csv", "xls", "pdf"]);
const HEADERS = [
  "Tanggal Bayar",
  "Periode",
  "Nama",
  "Jabatan",
  "Gaji Pokok",
  "Total Potongan",
  "Gaji Bersih",
  "Status",
  "Metode",
];

export function GET(request: Request) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const url = new URL(request.url);
    const format = formatSchema.parse(url.searchParams.get("format") ?? "csv");
    const params = Object.fromEntries(url.searchParams);
    delete params.format;
    const query = payrollPaymentListSchema.parse(params);
    const { data } = await listAnyPayrollPayments({
      ...query,
      limit: 2000,
      offset: 0,
    });
    const rows = data.map((row) => [
      new Date(row.paymentDate).toLocaleDateString("id-ID"),
      row.periodLabel,
      row.employeeName,
      row.positionName ?? "",
      Number(row.baseSalary),
      Number(row.totalDeduction),
      Number(row.netAmount),
      row.status,
      row.method,
    ]);

    if (format === "csv") {
      const csv =
        "\uFEFF" +
        [HEADERS.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition":
            'attachment; filename="riwayat-pembayaran.csv"',
        },
      });
    }
    if (format === "xls") {
      const xml = toSpreadsheetXml("Riwayat Pembayaran", HEADERS, rows);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition":
            'attachment; filename="riwayat-pembayaran.xls"',
        },
      });
    }
    const pdf = toPdf({
      title: "Riwayat Pembayaran Gaji",
      headers: HEADERS,
      rows,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="riwayat-pembayaran.pdf"',
      },
    });
  });
}
