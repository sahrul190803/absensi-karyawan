import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Karyawan" };

export default async function AdminKaryawanPage() {
  await requirePermission({ employees: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Data karyawan"
      description="Hubungkan akun (user ID) ke profil karyawan, departemen, dan lokasi."
      endpoint="/api/employees"
      columns={[
        { key: "fullName", label: "Nama" },
        { key: "nik", label: "NIK", format: "mono" },
        { key: "departmentId", label: "Departemen" },
        { key: "workLocationId", label: "Lokasi" },
        {
          key: "employmentStatus",
          label: "Status",
          valueLabels: {
            active: "Aktif",
            inactive: "Nonaktif",
            resigned: "Resign",
          },
        },
      ]}
      fields={[
        {
          key: "userId",
          label: "User ID akun",
          type: "text",
          required: true,
        },
        { key: "nik", label: "NIK", type: "text", required: true },
        { key: "fullName", label: "Nama lengkap", type: "text", required: true },
        { key: "phone", label: "Telepon", type: "text" },
        {
          key: "departmentId",
          label: "Departemen",
          type: "select",
          optionsFrom: { endpoint: "/api/departments", labelKey: "name" },
        },
        {
          key: "workLocationId",
          label: "Lokasi kerja",
          type: "select",
          optionsFrom: { endpoint: "/api/work-locations", labelKey: "name" },
        },
        {
          key: "employmentStatus",
          label: "Status kepegawaian",
          type: "select",
          options: ["active", "inactive", "resigned"],
          defaultValue: "active",
        },
      ]}
    />
  );
}
