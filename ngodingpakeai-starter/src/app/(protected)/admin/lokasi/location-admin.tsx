"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

const LocationMap = dynamic(
  () =>
    import("@/components/location-map").then((module) => module.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-80 place-items-center rounded-md border border-dashed bg-muted/40 text-sm text-muted-foreground">
        Memuat peta…
      </div>
    ),
  },
);

type WorkLocation = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  active: boolean;
};

type Draft = {
  id: string | null;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusM: number;
};

const DEFAULT_CENTER = { latitude: -6.2088, longitude: 106.8456 };

const emptyDraft = (): Draft => ({
  id: null,
  name: "",
  address: "",
  latitude: DEFAULT_CENTER.latitude,
  longitude: DEFAULT_CENTER.longitude,
  radiusM: 100,
});

export function LocationAdmin() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/work-locations?limit=100", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat lokasi kerja.");
        return;
      }
      const [primary] = (body.data ?? []) as WorkLocation[];
      setDraft(
        primary
          ? {
              id: primary.id,
              name: primary.name,
              address: primary.address,
              latitude: primary.latitude,
              longitude: primary.longitude,
              radiusM: primary.radiusM,
            }
          : emptyDraft(),
      );
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

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Perangkat tidak mendukung GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) =>
          current
            ? {
                ...current,
                latitude: Number(position.coords.latitude.toFixed(6)),
                longitude: Number(position.coords.longitude.toFixed(6)),
              }
            : current,
        );
      },
      () => setError("Izin lokasi ditolak atau GPS tidak tersedia."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        name: draft.name,
        address: draft.address,
        latitude: draft.latitude,
        longitude: draft.longitude,
        radiusM: draft.radiusM,
        active: true,
      };
      const response = await fetch(
        draft.id ? `/api/work-locations/${draft.id}` : "/api/work-locations",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Lokasi gagal disimpan.",
        );
        return;
      }
      setNotice("Lokasi kerja tersimpan.");
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Lokasi &amp; Radius
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tentukan titik cafe dan radius absen. Hanya ada satu lokasi kerja,
          jadi semua jadwal dan absensi memakai lokasi ini.
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {loading || !draft ? (
        <p className="text-sm text-muted-foreground">Memuat lokasi…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-5">
          <section className="space-y-3 lg:col-span-2">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {draft.name || "Lokasi kerja belum dinamai"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {draft.address || "Tanpa alamat"}
                  </p>
                </div>
                <span className="rounded-full bg-positive px-2.5 py-0.5 text-xs font-semibold text-white">
                  Aktif
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} ·
                radius {draft.radiusM} m
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Klik peta atau geser pin untuk memindahkan titik. Semua jadwal
              baru otomatis memakai lokasi ini.
            </p>
          </section>

          <section className="lg:col-span-3">
            <div className="space-y-4 rounded-lg border border-border-strong bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Atur lokasi cafe</h2>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={useMyLocation}
                  type="button"
                >
                  <Crosshair aria-hidden="true" />
                  Pakai lokasi saya
                </Button>
              </div>

              <LocationMap
                latitude={draft.latitude}
                longitude={draft.longitude}
                radiusM={draft.radiusM}
                onPick={(latitude, longitude) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          latitude: Number(latitude.toFixed(6)),
                          longitude: Number(longitude.toFixed(6)),
                        }
                      : current,
                  )
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">Nama lokasi</span>
                  <input
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    placeholder="Contoh: Cafe Kemang"
                  />
                </label>
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">Alamat (opsional)</span>
                  <input
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={draft.address}
                    onChange={(event) =>
                      setDraft({ ...draft, address: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Latitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-sm"
                    value={draft.latitude}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        latitude: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Longitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-sm"
                    value={draft.longitude}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        longitude: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">
                    Radius absen:{" "}
                    <span className="font-mono">{draft.radiusM} m</span>
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={2000}
                    step={10}
                    value={draft.radiusM}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        radiusM: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy || draft.name.trim().length === 0}
                  onClick={() => void save()}
                >
                  {busy ? "Menyimpan…" : "Simpan lokasi"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void load()}
                >
                  Muat ulang
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
