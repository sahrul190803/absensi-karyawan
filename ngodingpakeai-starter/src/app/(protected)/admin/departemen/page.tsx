import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Departemen" };

export default async function AdminDepartemenPage() {
  await requirePermission({ departments: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Departemen"
      description="Kelola departemen, kode, dan manager."
      endpoint="/api/departments"
      columns={[
        { key: "code", label: "Kode", format: "mono" },
        { key: "name", label: "Nama" },
        { key: "managerUserId", label: "Manager (user ID)" },
        { key: "active", label: "Aktif", format: "boolean" },
      ]}
      fields={[
        { key: "code", label: "Kode", type: "text", required: true },
        { key: "name", label: "Nama", type: "text", required: true },
        { key: "managerUserId", label: "Manager (user ID)", type: "text" },
        { key: "active", label: "Aktif", type: "boolean", defaultValue: true },
      ]}
    />
  );
}
