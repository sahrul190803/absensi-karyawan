import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Training" };

export default async function AdminTrainingPage() {
  await requirePermission({ trainings: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Jadwal training"
      description="Atur training untuk semua karyawan atau per departemen. HOD/HRD dapat mengelola di sini."
      endpoint="/api/admin/trainings"
      columns={[
        { key: "title", label: "Judul" },
        { key: "date", label: "Tanggal", format: "date" },
        { key: "startTime", label: "Mulai", format: "time" },
        { key: "endTime", label: "Selesai", format: "time" },
        { key: "place", label: "Tempat" },
        { key: "departmentId", label: "Departemen" },
      ]}
      fields={[
        { key: "title", label: "Judul", type: "text", required: true },
        { key: "date", label: "Tanggal", type: "date", required: true },
        { key: "startTime", label: "Jam mulai", type: "time", required: true },
        { key: "endTime", label: "Jam selesai", type: "time", required: true },
        { key: "place", label: "Tempat", type: "text" },
        {
          key: "departmentId",
          label: "Departemen (kosong = semua)",
          type: "select",
          optionsFrom: { endpoint: "/api/departments", labelKey: "name" },
        },
        { key: "notes", label: "Catatan", type: "text" },
      ]}
    />
  );
}
