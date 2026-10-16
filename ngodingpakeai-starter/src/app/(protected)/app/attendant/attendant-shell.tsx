"use client";

import { useState } from "react";
import { ScheduleView } from "../jadwal/schedule-view";
import { RequestsView } from "./requests-view";

const TABS = [
  { value: "request", label: "Request" },
  { value: "view", label: "View" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

// Jenis pengajuan untuk karyawan: izin, sakit, cuti, dan tukar shift.
const EMPLOYEE_REQUEST_TYPES = ["permission", "sick", "leave", "shift_swap"];

export function AttendantShell() {
  const [tab, setTab] = useState<TabValue>("request");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Attendant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajukan izin, sakit, cuti, atau tukar shift, lalu lihat jadwal kerja
          dan hasil pengajuanmu.
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

      {tab === "request" ? (
        <RequestsView allowedTypes={EMPLOYEE_REQUEST_TYPES} embedded />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="attendant-jadwal-title">
            <h2
              id="attendant-jadwal-title"
              className="text-lg font-semibold tracking-tight"
            >
              Jadwal Kerja
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jadwal shift yang dibuat HOD/HRD untukmu.
            </p>
            <div className="mt-3">
              <ScheduleView embedded />
            </div>
          </section>

          <section aria-labelledby="attendant-hasil-title">
            <h2
              id="attendant-hasil-title"
              className="text-lg font-semibold tracking-tight"
            >
              Hasil Pengajuan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Status izin, sakit, cuti, dan tukar shift yang kamu ajukan.
            </p>
            <div className="mt-3">
              <RequestsView
                allowedTypes={EMPLOYEE_REQUEST_TYPES}
                readOnly
                embedded
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
