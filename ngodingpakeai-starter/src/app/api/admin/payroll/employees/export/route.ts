import { z } from "zod";
import { withApiPermission } from "@/lib/api";
import { toPdf, toSpreadsheetXml } from "@/lib/export";
import { listAnyEmployees } from "@/services/employees.service";

export const runtime = "nodejs";

const formatSchema = z.enum(["csv", "xls", "pdf"]);
const HEADERS = [
  "Nama",
  "NIK",
  "Jabatan",
  "Gaji Pokok",
  "Tunjangan",
  "No Rekening",
  "Nama Bank",
  "Atas Nama",
];

export function GET(request: Request) {
  return withApiPermission(request, { payroll: ["read-any"] }, async () => {
    const format = formatSchema.parse(
      new URL(request.url).searchParams.get("format") ?? "csv",
    );
    const { data } = await listAnyEmployees({ limit: 2000, offset: 0 });
    const rows = data.map((row) => [
      row.fullName,
      row.nik,
      row.positionName ?? "",
      Number(row.baseSalary),
      Number(row.allowance),
      row.bankAccount,
      row.bankName,
      row.bankAccountName,
    ]);

    if (format === "csv") {
      const csv =
        "\uFEFF" +
        [HEADERS.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": 'attachment; filename="setting-gaji.csv"',
        },
      });
    }
    if (format === "xls") {
      const xml = toSpreadsheetXml("Setting Gaji", HEADERS, rows);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": 'attachment; filename="setting-gaji.xls"',
        },
      });
    }
    const pdf = toPdf({
      title: "Setting Gaji Karyawan",
      headers: HEADERS,
      rows,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="setting-gaji.pdf"',
      },
    });
  });
}
