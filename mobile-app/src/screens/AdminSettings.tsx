import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import type { SettingsResponse } from "@/lib/admin-types";

type SettingsData = SettingsResponse["data"];

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Asia/Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura" },
];

function SettingsForm({ initial }: { initial: SettingsData }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial.name);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [allowHolidayWork, setAllowHolidayWork] = useState(
    initial.allowHolidayWork,
  );
  const [gpsAccuracyLimitM, setGpsAccuracyLimitM] = useState(
    String(initial.gpsAccuracyLimitM),
  );
  const [defaultRadiusM, setDefaultRadiusM] = useState(
    String(initial.defaultRadiusM),
  );
  const [defaultToleranceMinutes, setDefaultToleranceMinutes] = useState(
    String(initial.defaultToleranceMinutes),
  );
  const [payday, setPayday] = useState(String(initial.payday));
  const [lateRate, setLateRate] = useState(initial.payrollLateRatePerMinute);
  const [alphaRate, setAlphaRate] = useState(initial.payrollAlphaRatePerDay);
  const [permissionPercent, setPermissionPercent] = useState(
    String(initial.payrollPermissionPercent),
  );
  const [faceEnabled, setFaceEnabled] = useState(
    initial.faceVerificationEnabled,
  );
  const [faceThreshold, setFaceThreshold] = useState(
    String(initial.faceSimilarityThreshold),
  );
  const [faceLiveness, setFaceLiveness] = useState(
    initial.faceLivenessRequired,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (name.trim().length < 1) {
      setError("Nama perusahaan wajib diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: {
          name: name.trim(),
          timezone,
          allowHolidayWork,
          gpsAccuracyLimitM: Number(gpsAccuracyLimitM),
          defaultRadiusM: Number(defaultRadiusM),
          defaultToleranceMinutes: Number(defaultToleranceMinutes),
          payday: Number(payday),
          payrollLateRatePerMinute: Number(lateRate),
          payrollAlphaRatePerDay: Number(alphaRate),
          payrollPermissionPercent: Number(permissionPercent),
          faceVerificationEnabled: faceEnabled,
          faceSimilarityThreshold: Number(faceThreshold),
          faceLivenessRequired: faceLiveness,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      setNotice("Pengaturan berhasil disimpan.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Pengaturan gagal disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {notice && (
        <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm text-positive">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Profil perusahaan</h2>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-name">Nama perusahaan</Label>
            <input
              id="settings-name"
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-timezone">Zona waktu</Label>
            <select
              id="settings-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            >
              {TIMEZONES.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-payday">Tanggal gajian (1–28)</Label>
            <input
              id="settings-payday"
              type="number"
              min={1}
              max={28}
              value={payday}
              onChange={(event) => setPayday(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Aturan absensi</h2>
        <div className="mt-3 grid gap-3">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowHolidayWork}
              onChange={(event) => setAllowHolidayWork(event.target.checked)}
              className="size-4"
            />
            Izinkan absensi pada hari libur
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-accuracy">
              Batas akurasi GPS (meter)
            </Label>
            <input
              id="settings-accuracy"
              type="number"
              min={5}
              max={2000}
              value={gpsAccuracyLimitM}
              onChange={(event) => setGpsAccuracyLimitM(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-radius">Radius default (meter)</Label>
            <input
              id="settings-radius"
              type="number"
              min={10}
              max={5000}
              value={defaultRadiusM}
              onChange={(event) => setDefaultRadiusM(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-tolerance">
              Toleransi terlambat (menit)
            </Label>
            <input
              id="settings-tolerance"
              type="number"
              min={0}
              max={120}
              value={defaultToleranceMinutes}
              onChange={(event) =>
                setDefaultToleranceMinutes(event.target.value)
              }
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Potongan penggajian</h2>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-late">Potongan per menit terlambat</Label>
            <input
              id="settings-late"
              inputMode="decimal"
              value={lateRate}
              onChange={(event) => setLateRate(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-alpha">Potongan per hari alpha</Label>
            <input
              id="settings-alpha"
              inputMode="decimal"
              value={alphaRate}
              onChange={(event) => setAlphaRate(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-permission">
              Persentase gaji saat izin (%)
            </Label>
            <input
              id="settings-permission"
              type="number"
              min={0}
              max={100}
              value={permissionPercent}
              onChange={(event) => setPermissionPercent(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Verifikasi wajah</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {initial.faceProviderConfigured
            ? "Provider verifikasi wajah sudah dikonfigurasi di server."
            : "Provider belum dikonfigurasi. Verifikasi wajah tidak bisa diaktifkan."}
        </p>
        <div className="mt-3 grid gap-3">
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={faceEnabled}
              disabled={!initial.faceProviderConfigured}
              onChange={(event) => setFaceEnabled(event.target.checked)}
              className="size-4"
            />
            Wajibkan verifikasi wajah saat absen
          </label>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="settings-face-threshold">
              Ambang kemiripan (1–100)
            </Label>
            <input
              id="settings-face-threshold"
              type="number"
              min={1}
              max={100}
              value={faceThreshold}
              onChange={(event) => setFaceThreshold(event.target.value)}
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={faceLiveness}
              disabled={!initial.faceProviderConfigured}
              onChange={(event) => setFaceLiveness(event.target.checked)}
              className="size-4"
            />
            Wajibkan liveness detection
          </label>
        </div>
      </section>

      <Button className="h-11 w-full" disabled={busy} onClick={() => void save()}>
        {busy ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Save aria-hidden="true" />
        )}
        {busy ? "Menyimpan…" : "Simpan pengaturan"}
      </Button>
    </>
  );
}

export function AdminSettingsScreen() {
  const settingsQuery = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiFetch<SettingsResponse>("/api/admin/settings"),
    retry: false,
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profil perusahaan, aturan absensi, dan kebijakan penggajian.
        </p>
      </header>

      {settingsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat pengaturan…
        </p>
      ) : settingsQuery.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {settingsQuery.error.message}
        </p>
      ) : settingsQuery.data ? (
        <SettingsForm
          key={JSON.stringify(settingsQuery.data.data)}
          initial={settingsQuery.data.data}
        />
      ) : null}

      <p className="flex items-center gap-2 rounded-lg border border-border bg-primary-quiet/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <Settings className="size-4 shrink-0" aria-hidden="true" />
        Perubahan pengaturan berlaku untuk absensi dan penggajian berikutnya.
      </p>
    </div>
  );
}
