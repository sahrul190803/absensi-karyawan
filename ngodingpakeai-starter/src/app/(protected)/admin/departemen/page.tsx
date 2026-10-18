import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Departemen" };

export default async function AdminDepartemenPage() {
  await requirePermission({ departments: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Departemen"
      description="Kelola departemen, kode, dan kepala divisi. Menunjuk kepala divisi otomatis memberi akses HOD; melepasnya mencabut akses itu bila ia tidak memimpin divisi lain."
      endpoint="/api/departments"
      columns={[
        { key: "code", label: "Kode", format: "mono" },
        { key: "name", label: "Departemen" },
        { key: "managerUserId", label: "Kepala divisi (HOD)" },
        { key: "active", label: "Aktif", format: "boolean" },
      ]}
      fields={[
        { key: "code", label: "Kode", type: "text", required: true },
        { key: "name", label: "Departemen", type: "text", required: true },
        {
          key: "managerUserId",
          label: "Kepala divisi (HOD)",
          type: "select",
          searchable: true,
          optionsFrom: {
            endpoint: "/api/employees",
            labelKey: "fullName",
            valueKey: "userId",
          },
          nullable: true,
        },
        { key: "active", label: "Aktif", type: "boolean", defaultValue: true },
      ]}
    />
  );
}
