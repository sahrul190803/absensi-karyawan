import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";
import { CsvImport } from "@/components/csv-import";

export const metadata: Metadata = { title: "Karyawan" };

export default async function AdminKaryawanPage() {
  await requirePermission({ employees: ["read-any"] });
  return (
    <div className="space-y-6">
      <CsvImport
        endpoint="/api/employees/import"
        columns={[
          "nik",
          "full_name",
          "email",
          "phone",
          "address",
          "join_date",
          "department_code",
          "employment_status",
        ]}
      />
      <MasterDataAdmin
      title="Data karyawan"
      description="Hubungkan akun (user ID) ke profil karyawan, departemen, dan lokasi."
      endpoint="/api/employees"
      columns={[
        { key: "fullName", label: "Nama" },
        { key: "nik", label: "NIK", format: "mono" },
        { key: "bankName", label: "Bank" },
        { key: "bankAccount", label: "No. rekening", format: "mono" },
        { key: "ktpNumber", label: "No. KTP", format: "mono" },
        { key: "photoUrl", label: "Foto profil", format: "document" },
        { key: "ktpPhotoUrl", label: "Foto KTP", format: "document" },
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
        {
          key: "salaryType",
          label: "Tipe gaji",
          valueLabels: { monthly: "Bulanan", daily: "Harian" },
        },
        { key: "baseSalary", label: "Gaji pokok", format: "mono" },
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
        { key: "bankName", label: "Nama bank", type: "text" },
        { key: "bankAccount", label: "Nomor rekening", type: "text" },
        { key: "ktpNumber", label: "Nomor KTP", type: "text" },
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
        {
          key: "salaryType",
          label: "Tipe gaji",
          type: "select",
          options: ["monthly", "daily"],
          defaultValue: "monthly",
        },
        {
          key: "baseSalary",
          label: "Gaji pokok (Rp)",
          type: "number",
          defaultValue: 0,
        },
      ]}
    />
    </div>
  );
}
