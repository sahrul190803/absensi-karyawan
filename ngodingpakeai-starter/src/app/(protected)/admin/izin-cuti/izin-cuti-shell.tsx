"use client";

import { useState } from "react";
import { IzinCutiView } from "./izin-cuti-view";
import { QuotaCutiView } from "./quota-cuti-view";

const TABS = [
  { value: "persetujuan", label: "Persetujuan" },
  { value: "kuota", label: "Kuota Cuti" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function IzinCutiShell() {
  const [tab, setTab] = useState<TabValue>("persetujuan");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Izin &amp; Cuti
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tinjau pengajuan cuti, sakit, izin, dinas luar, lembur, dan tukar
          shift — sekaligus atur kuota cuti tahunan karyawan.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Bagian izin dan cuti"
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
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
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

      {tab === "persetujuan" ? <IzinCutiView /> : <QuotaCutiView />}
    </div>
  );
}
