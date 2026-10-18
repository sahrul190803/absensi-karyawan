import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";
import { CsvImport } from "@/components/csv-import";

export const metadata: Metadata = { title: "Karyawan" };

export default async function AdminKaryawanPage() {
  const session = await requirePermission({ employees: ["read-any"] });
  const roles = (session.user.role ?? "user")
    .split(",")
    .map((role) => role.trim());
  const isAdmin = roles.some((role) => ["hrd", "admin"].includes(role));

  return (
    <div className="space-y-6">
      {isAdmin && (
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
      )}
      <MasterDataAdmin
        title="Data karyawan"
        description="Karyawan baru yang mendaftar muncul di sini dengan status menunggu verifikasi. Periksa data, atur departemen dan jabatan, lalu klik Verifikasi."
        endpoint="/api/employees"
        canCreate={isAdmin}
        canDelete={isAdmin}
        columns={[
          { key: "fullName", label: "Nama" },
          { key: "nik", label: "NIK", format: "mono" },
          { key: "bankName", label: "Bank" },
          { key: "bankAccount", label: "No. rekening", format: "mono" },
          { key: "ktpNumber", label: "No. KTP", format: "mono" },
          { key: "photoUrl", label: "Foto profil", format: "document" },
          { key: "ktpPhotoUrl", label: "Foto KTP", format: "document" },
          { key: "departmentId", label: "Departemen" },
          { key: "positionId", label: "Jabatan" },
          {
            key: "employmentStatus",
            label: "Status",
            valueLabels: {
              pending: "Menunggu verifikasi",
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
          {
            key: "fullName",
            label: "Nama lengkap",
            type: "text",
            required: true,
          },
          { key: "phone", label: "Telepon", type: "text" },
          { key: "bankName", label: "Nama bank", type: "text" },
          { key: "bankAccount", label: "Nomor rekening", type: "text" },
          { key: "ktpNumber", label: "Nomor KTP", type: "text" },
          {
            key: "departmentId",
            label: "Departemen",
            type: "select",
            optionsFrom: {
              endpoint: "/api/departments",
              labelKey: "name",
              create: { nameKey: "name" },
            },
          },
          {
            key: "positionId",
            label: "Jabatan",
            type: "select",
            optionsFrom: {
              endpoint: "/api/positions",
              labelKey: "name",
              create: { nameKey: "name" },
            },
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
        filters={[
          {
            key: "positionId",
            label: "Jabatan",
            optionsFrom: {
              endpoint: "/api/positions",
              labelKey: "name",
            },
          },
          {
            key: "employmentStatus",
            label: "Status",
            options: [
              { value: "pending", label: "Menunggu verifikasi" },
              { value: "active", label: "Aktif" },
              { value: "inactive", label: "Nonaktif" },
              { value: "resigned", label: "Resign" },
            ],
          },
        ]}
        approve={{
          key: "employmentStatus",
          when: "pending",
          value: "active",
          label: "Verifikasi",
        }}
      />
    </div>
  );
}
