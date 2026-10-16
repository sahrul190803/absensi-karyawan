"use client";

import { useState } from "react";
import { CsvImport } from "@/components/csv-import";
import { MasterDataAdmin } from "@/components/master-data-admin";
import { IzinCutiShell } from "../izin-cuti/izin-cuti-shell";
import { AttendantView } from "./attendant-view";
import { RecurringShiftAdmin } from "./recurring-shift-admin";
import { ScheduleGrid } from "./schedule-grid";

const TABS = [
  { value: "create", label: "Create" },
  { value: "request", label: "Request" },
  { value: "view", label: "View" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

// Jenis pengajuan yang ditinjau HOD/HRD: izin, sakit, cuti, dinas luar, tukar shift.
const MANAGER_REQUEST_TYPES = [
  "permission",
  "sick",
  "leave",
  "business_trip",
  "shift_swap",
];

export function AttendantShell() {
  const [tab, setTab] = useState<TabValue>("create");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Attendant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat jadwal kerja karyawan, tinjau pengajuan izin/sakit/cuti/dinas
          luar/tukar shift, lalu lihat hasilnya dalam satu tempat.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Bagian attendant"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {TABS.map((item) => {
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.value)}
              className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-border-strong bg-primary-quiet text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "create" ? (
        <div className="space-y-6">
          <ScheduleGrid embedded />
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
                  {
                    key: "crossesMidnight",
                    label: "Lintas hari",
                    format: "boolean",
                  },
                  { key: "active", label: "Aktif", format: "boolean" },
                ]}
                fields={[
                  {
                    key: "name",
                    label: "Nama shift",
                    type: "text",
                    required: true,
                  },
                  {
                    key: "startTime",
                    label: "Jam mulai",
                    type: "time",
                    required: true,
                  },
                  {
                    key: "endTime",
                    label: "Jam selesai",
                    type: "time",
                    required: true,
                  },
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
                  {
                    key: "active",
                    label: "Aktif",
                    type: "boolean",
                    defaultValue: true,
                  },
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
          <details className="rounded-lg border bg-card">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold">
              Hari libur (kalender libur &amp; izin kerja)
            </summary>
            <div className="space-y-6 border-t border-border p-5">
              <p className="text-sm text-muted-foreground">
                Absensi otomatis ditolak pada hari libur yang aktif kecuali
                &quot;kerja diizinkan&quot; menyala atau pengaturan perusahaan
                mengizinkan absensi hari libur.
              </p>
              <CsvImport
                endpoint="/api/holidays/import"
                columns={[
                  "date",
                  "name",
                  "type",
                  "description",
                  "allow_work",
                  "active",
                ]}
              />
              <MasterDataAdmin
                title="Hari libur"
                description="Kelola kalender libur nasional, cuti bersama, dan libur perusahaan."
                endpoint="/api/holidays"
                columns={[
                  { key: "date", label: "Tanggal", format: "date" },
                  { key: "name", label: "Nama" },
                  {
                    key: "type",
                    label: "Jenis",
                    valueLabels: {
                      nasional: "Nasional",
                      cuti_bersama: "Cuti bersama",
                      perusahaan: "Perusahaan",
                      khusus: "Khusus",
                    },
                  },
                  { key: "allowWork", label: "Kerja diizinkan", format: "boolean" },
                  { key: "active", label: "Aktif", format: "boolean" },
                ]}
                fields={[
                  { key: "date", label: "Tanggal", type: "date", required: true },
                  { key: "name", label: "Nama", type: "text", required: true },
                  {
                    key: "type",
                    label: "Jenis",
                    type: "select",
                    required: true,
                    options: ["nasional", "cuti_bersama", "perusahaan", "khusus"],
                    defaultValue: "nasional",
                  },
                  {
                    key: "allowWork",
                    label: "Izinkan absensi (kerja hari libur)",
                    type: "boolean",
                    defaultValue: false,
                  },
                  {
                    key: "active",
                    label: "Aktif",
                    type: "boolean",
                    defaultValue: true,
                  },
                ]}
              />
            </div>
          </details>
        </div>
      ) : tab === "request" ? (
        <IzinCutiShell embedded allowedTypes={MANAGER_REQUEST_TYPES} />
      ) : (
        <AttendantView />
      )}
    </div>
  );
}
