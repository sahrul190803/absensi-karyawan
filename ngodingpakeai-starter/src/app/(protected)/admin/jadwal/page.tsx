import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { MasterDataAdmin } from "@/components/master-data-admin";
import { RecurringShiftAdmin } from "./recurring-shift-admin";
import { ScheduleGrid } from "./schedule-grid";

export const metadata: Metadata = { title: "Jadwal Kerja" };

export default async function AdminJadwalPage() {
  await requirePermission({ schedules: ["read-any"] });
  return (
    <div className="space-y-10">
      <ScheduleGrid />
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
          Kelola shift (jam kerja, toleransi, lintas hari)
        </summary>
        <div className="border-t border-border p-5">
          <MasterDataAdmin
            title="Shift kerja"
            description="Kelola jam shift, toleransi, dan shift lintas hari. Shift di sini dipakai oleh jadwal karyawan."
            endpoint="/api/shifts"
            columns={[
              { key: "name", label: "Nama" },
              { key: "startTime", label: "Mulai", format: "time" },
              { key: "endTime", label: "Selesai", format: "time" },
              {
                key: "toleranceMinutes",
                label: "Toleransi (menit)",
                format: "mono",
              },
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
        </div>
      </details>
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
          Pola shift rutin mingguan (per karyawan)
        </summary>
        <div className="border-t border-border p-5">
          <RecurringShiftAdmin />
        </div>
      </details>
    </div>
  );
}
