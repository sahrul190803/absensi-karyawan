import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Hari Libur" };

export default async function AdminHariLiburPage() {
  await requirePermission({ holidays: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Hari libur"
      description="Kelola kalender libur. Tandai izin kerja untuk hari libur khusus."
      endpoint="/api/holidays"
      columns={[
        { key: "date", label: "Tanggal", format: "date" },
        { key: "name", label: "Nama" },
        {
          key: "type",
          label: "Jenis",
          valueLabels: {
            nasional: "Nasional",
            cuti_bersama: "Cuti bersama",
            perusahaan: "Perusahaan",
            khusus: "Khusus",
          },
        },
        { key: "allowWork", label: "Kerja diizinkan", format: "boolean" },
        { key: "active", label: "Aktif", format: "boolean" },
      ]}
      fields={[
        { key: "date", label: "Tanggal", type: "date", required: true },
        { key: "name", label: "Nama", type: "text", required: true },
        {
          key: "type",
          label: "Jenis",
          type: "select",
          required: true,
          options: ["nasional", "cuti_bersama", "perusahaan", "khusus"],
          defaultValue: "nasional",
        },
        {
          key: "allowWork",
          label: "Izinkan absensi (kerja hari libur)",
          type: "boolean",
          defaultValue: false,
        },
        { key: "active", label: "Aktif", type: "boolean", defaultValue: true },
      ]}
    />
  );
}
