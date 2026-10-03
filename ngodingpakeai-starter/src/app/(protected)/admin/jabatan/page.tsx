import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Jabatan" };

export default async function AdminJabatanPage() {
  await requirePermission({ positions: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Jabatan"
      description="Kelola jabatan per departemen dan levelnya."
      endpoint="/api/positions"
      columns={[
        { key: "name", label: "Nama" },
        { key: "departmentId", label: "Departemen" },
        { key: "level", label: "Level", format: "mono" },
        { key: "active", label: "Aktif", format: "boolean" },
      ]}
      fields={[
        { key: "name", label: "Nama jabatan", type: "text", required: true },
        {
          key: "departmentId",
          label: "Departemen",
          type: "select",
          optionsFrom: { endpoint: "/api/departments", labelKey: "name" },
        },
        { key: "level", label: "Level (1–10)", type: "number", defaultValue: 1 },
        { key: "active", label: "Aktif", type: "boolean", defaultValue: true },
      ]}
    />
  );
}
