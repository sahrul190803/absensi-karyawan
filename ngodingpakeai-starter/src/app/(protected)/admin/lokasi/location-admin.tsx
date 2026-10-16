"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, MapPin, Plus, Trash2 } from "lucide-react";
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
  description: string;
  active: boolean;
};

type Draft = {
  id: string | null;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  description: string;
  active: boolean;
};

const DEFAULT_CENTER = { latitude: -6.2088, longitude: 106.8456 };

const emptyDraft = (): Draft => ({
  id: null,
  name: "",
  address: "",
  latitude: DEFAULT_CENTER.latitude,
  longitude: DEFAULT_CENTER.longitude,
  radiusM: 100,
  description: "",
  active: true,
});

export function LocationAdmin() {
  const [locations, setLocations] = useState<WorkLocation[]>([]);
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
      setLocations(body.data ?? []);
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
        description: draft.description,
        active: draft.active,
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
      setNotice(draft.id ? "Lokasi diperbarui." : "Lokasi baru ditambahkan.");
      setDraft(null);
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Hapus lokasi kerja ini?")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/work-locations/${id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Lokasi gagal dihapus.");
        return;
      }
      setNotice("Lokasi dihapus.");
      if (draft?.id === id) setDraft(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Lokasi &amp; Radius
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur titik kantor dan radius geofence langsung dari peta. Klik peta
            atau geser pin untuk memindahkan titik.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            setDraft((current) =>
              current ? null : { ...emptyDraft(), ...DEFAULT_CENTER },
            )
          }
        >
          <Plus aria-hidden="true" />
          {draft && !draft.id ? "Tutup form" : "Tambah lokasi"}
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm">
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

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat lokasi…</p>
          ) : locations.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
              <MapPin
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada lokasi kerja. Tambahkan lokasi pertama.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {locations.map((location) => (
                <li
                  key={location.id}
                  className={`rounded-lg border p-4 ${
                    draft?.id === location.id
                      ? "border-border-strong bg-primary-quiet/50"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{location.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {location.address || "Tanpa alamat"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        location.active
                          ? "bg-positive text-white"
                          : "border border-border-strong bg-muted text-muted-foreground"
                      }`}
                    >
                      {location.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {location.latitude.toFixed(5)},{" "}
                    {location.longitude.toFixed(5)} · radius {location.radiusM} m
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        setDraft({
                          id: location.id,
                          name: location.name,
                          address: location.address,
                          latitude: location.latitude,
                          longitude: location.longitude,
                          radiusM: location.radiusM,
                          description: location.description,
                          active: location.active,
                        })
                      }
                    >
                      Ubah di peta
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={busy}
                      onClick={() => void remove(location.id)}
                    >
                      <Trash2 aria-hidden="true" />
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-3">
          {draft ? (
            <div className="space-y-4 rounded-lg border border-border-strong bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {draft.id ? `Ubah: ${draft.name}` : "Lokasi baru"}
                </h2>
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
                    placeholder="Contoh: Lecarassa Cabang Kemang"
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
                <label className="grid gap-1.5 text-sm">
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
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={draft.active}
                    onChange={(event) =>
                      setDraft({ ...draft, active: event.target.checked })
                    }
                  />
                  Lokasi aktif dipakai untuk absensi
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
                  onClick={() => setDraft(null)}
                >
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-72 place-items-center rounded-lg border border-dashed bg-card px-6 py-12 text-center">
              <div>
                <MapPin
                  className="mx-auto size-7 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  Pilih &quot;Ubah di peta&quot; pada salah satu lokasi, atau
                  tambahkan lokasi baru untuk mulai mengatur radius.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
