import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";

export const metadata: Metadata = { title: "Shift" };

export default async function AdminShiftPage() {
  await requirePermission({ shifts: ["read-any"] });
  return (
    <MasterDataAdmin
      title="Shift kerja"
      description="Kelola jam shift, toleransi, dan shift lintas hari."
      endpoint="/api/shifts"
      columns={[
        { key: "name", label: "Nama" },
        { key: "startTime", label: "Mulai", format: "time" },
        { key: "endTime", label: "Selesai", format: "time" },
        { key: "toleranceMinutes", label: "Toleransi (menit)", format: "mono" },
        { key: "crossesMidnight", label: "Lintas hari", format: "boolean" },
        { key: "active", label: "Aktif", format: "boolean" },
      ]}
      fields={[
        { key: "name", label: "Nama shift", type: "text", required: true },
        { key: "startTime", label: "Jam mulai", type: "time", required: true },
        { key: "endTime", label: "Jam selesai", type: "time", required: true },
        {
          key: "toleranceMinutes",
          label: "Toleransi (menit)",
          type: "number",
          defaultValue: 15,
        },
        {
          key: "crossesMidnight",
          label: "Melewati tengah malam",
          type: "boolean",
          defaultValue: false,
        },
        { key: "active", label: "Aktif", type: "boolean", defaultValue: true },
      ]}
    />
  );
}
