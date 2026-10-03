"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Settings = {
  name: string;
  timezone: string;
  allowHolidayWork: boolean;
  gpsAccuracyLimitM: number;
  defaultRadiusM: number;
  defaultToleranceMinutes: number;
};

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat pengaturan.");
        return;
      }
      setSettings(body.data);
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = useCallback(async () => {
    if (!settings) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          timezone: settings.timezone,
          allowHolidayWork: settings.allowHolidayWork,
          gpsAccuracyLimitM: settings.gpsAccuracyLimitM,
          defaultRadiusM: settings.defaultRadiusM,
          defaultToleranceMinutes: settings.defaultToleranceMinutes,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Pengaturan gagal disimpan.",
        );
        return;
      }
      setSettings(body.data);
      setNotice("Pengaturan disimpan.");
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [settings]);

  if (loading) {
    return (
      <p className="mx-auto max-w-xl text-sm text-muted-foreground">
        Memuat pengaturan…
      </p>
    );
  }

  if (!settings) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-xl rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
      >
        {error ?? "Pengaturan tidak tersedia."}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Pengaturan
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Konfigurasi perusahaan, geofence default, dan toleransi.
      </p>

      {notice && (
        <p role="status" className="mt-4 rounded-xl border bg-card px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <section className="mt-6 grid gap-3 rounded-2xl border bg-card p-5">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Nama perusahaan</span>
          <input
            className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
            value={settings.name}
            onChange={(event) =>
              setSettings({ ...settings, name: event.target.value })
            }
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Zona waktu</span>
          <select
            className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
            value={settings.timezone}
            onChange={(event) =>
              setSettings({ ...settings, timezone: event.target.value })
            }
          >
            <option value="Asia/Jakarta">WIB (UTC+7)</option>
            <option value="Asia/Makassar">WITA (UTC+8)</option>
            <option value="Asia/Jayapura">WIT (UTC+9)</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Batas akurasi GPS (m)</span>
            <input
              type="number"
              className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
              value={settings.gpsAccuracyLimitM}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  gpsAccuracyLimitM: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Radius default (m)</span>
            <input
              type="number"
              className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
              value={settings.defaultRadiusM}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  defaultRadiusM: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Toleransi terlambat default (menit)</span>
          <input
            type="number"
            className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
            value={settings.defaultToleranceMinutes}
            onChange={(event) =>
              setSettings({
                ...settings,
                defaultToleranceMinutes: Number(event.target.value),
              })
            }
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-current"
            checked={settings.allowHolidayWork}
            onChange={(event) =>
              setSettings({
                ...settings,
                allowHolidayWork: event.target.checked,
              })
            }
          />
          <span>Izinkan absensi pada hari libur</span>
        </label>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "Menyimpan…" : "Simpan pengaturan"}
        </Button>
      </section>
    </div>
  );
}
