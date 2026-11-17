import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crosshair,
  LoaderCircle,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import type { WorkLocationRow } from "@/lib/admin-types";
import { getCurrentPosition } from "@/lib/geolocation";

type LocationResponse = { data: WorkLocationRow[] };

export function AdminLocationsScreen() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLocationRow | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusM, setRadiusM] = useState("100");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: ["admin", "locations"],
    queryFn: () =>
      apiFetch<LocationResponse>("/api/work-locations?limit=200&offset=0"),
    retry: false,
  });
  const rows = locationsQuery.data?.data ?? [];

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setRadiusM("100");
    setActive(true);
    setFormOpen(true);
    setNotice(null);
    setError(null);
  }

  function openEdit(row: WorkLocationRow) {
    setEditing(row);
    setName(row.name);
    setAddress(row.address);
    setLatitude(row.latitude);
    setLongitude(row.longitude);
    setRadiusM(String(row.radiusM));
    setActive(row.active);
    setFormOpen(true);
    setNotice(null);
    setError(null);
  }

  async function fillCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const position = await getCurrentPosition();
      setLatitude(position.latitude.toFixed(6));
      setLongitude(position.longitude.toFixed(6));
      setNotice(
        `Koordinat diambil dari GPS (akurasi ±${Math.round(position.accuracy)} m).`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Lokasi gagal diambil.",
      );
    } finally {
      setLocating(false);
    }
  }

  async function submit() {
    if (name.trim().length < 1) {
      setError("Nama lokasi wajib diisi.");
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Koordinat lintang dan bujur wajib berupa angka.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body = {
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        radiusM: Number(radiusM),
        active,
      };
      if (editing) {
        await apiFetch(`/api/work-locations/${editing.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiFetch("/api/work-locations", { method: "POST", body });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
      setFormOpen(false);
      setNotice(editing ? "Lokasi diperbarui." : "Lokasi berhasil dibuat.");
      setEditing(null);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Lokasi gagal disimpan.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: WorkLocationRow) {
    if (!window.confirm(`Hapus lokasi ${row.name}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/work-locations/${row.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
      setNotice("Lokasi dihapus.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Lokasi & Radius</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur titik lokasi kerja dan radius absensi yang diizinkan.
        </p>
      </header>

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

      {!formOpen ? (
        <Button className="h-11 w-full" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Tambah lokasi
        </Button>
      ) : (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              {editing ? "Ubah lokasi" : "Lokasi baru"}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="grid size-10 place-items-center rounded-md border text-muted-foreground"
              aria-label="Tutup form lokasi"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="location-name">Nama lokasi</Label>
              <input
                id="location-name"
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="location-address">Alamat</Label>
              <input
                id="location-address"
                value={address}
                maxLength={500}
                onChange={(event) => setAddress(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <Button
              variant="outline"
              className="h-11 w-full"
              disabled={locating}
              onClick={() => void fillCurrentLocation()}
            >
              {locating ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Crosshair aria-hidden="true" />
              )}
              {locating ? "Mengambil lokasi…" : "Gunakan lokasi saya sekarang"}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="location-lat">Lintang</Label>
                <input
                  id="location-lat"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="-6.200000"
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="location-lng">Bujur</Label>
                <input
                  id="location-lng"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="106.816666"
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="location-radius">Radius (meter)</Label>
              <input
                id="location-radius"
                type="number"
                min={10}
                max={5000}
                value={radiusM}
                onChange={(event) => setRadiusM(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="size-4"
              />
              Lokasi aktif
            </label>
            <Button className="h-11 w-full" disabled={busy} onClick={() => void submit()}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {busy ? "Menyimpan…" : "Simpan lokasi"}
            </Button>
          </div>
        </section>
      )}

      {locationsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat lokasi…
        </p>
      ) : locationsQuery.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {locationsQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <MapPin className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada lokasi kerja.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openEdit(row)}
                >
                  <p className="font-medium">{row.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.address || "Tanpa alamat"}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {row.latitude}, {row.longitude} · radius {row.radiusM} m
                    {row.active ? "" : " · Nonaktif"}
                  </p>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(row)}
                  className="grid size-10 shrink-0 place-items-center rounded-md border text-muted-foreground"
                  aria-label={`Hapus lokasi ${row.name}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
