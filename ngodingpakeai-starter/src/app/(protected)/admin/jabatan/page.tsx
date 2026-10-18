import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Jabatan" };

export default async function AdminJabatanPage() {
  await requirePermission({ positions: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Jabatan"
      description="Kelola jabatan per departemen."
      endpoint="/api/positions"
      columns={[
        { key: "name", label: "Nama" },
        { key: "departmentId", label: "Departemen" },
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
        { key: "active", label: "Aktif", type: "boolean", defaultValue: true },
      ]}
    />
  );
}
