"use client";

import { useCallback, useEffect, useState } from "react";

type Profile = {
  id: string;
  nik: string;
  fullName: string;
  phone: string;
  address: string;
  joinDate: string | null;
  employmentStatus: string;
  departmentName: string | null;
  positionName: string | null;
  locationName: string | null;
};

const statusLabels: Record<string, string> = {
  active: "Aktif",
  inactive: "Nonaktif",
  resigned: "Resign",
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function ProfileView({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat profil.");
        return;
      }
      setProfile(body.data);
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

  const rows: { label: string; value: string }[] = profile
    ? [
        { label: "NIK", value: profile.nik },
        { label: "Telepon", value: profile.phone || "—" },
        { label: "Alamat", value: profile.address || "—" },
        { label: "Departemen", value: profile.departmentName ?? "—" },
        { label: "Jabatan", value: profile.positionName ?? "—" },
        { label: "Lokasi kerja", value: profile.locationName ?? "—" },
        { label: "Bergabung", value: formatDate(profile.joinDate) },
        {
          label: "Status",
          value: statusLabels[profile.employmentStatus] ?? profile.employmentStatus,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Profil
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Data akun dan kepegawaianmu
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <p className="text-lg font-semibold">{profile?.fullName ?? userName}</p>
        <p className="text-sm text-muted-foreground">{userEmail}</p>
      </section>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat profil…</p>
      ) : profile ? (
        <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl border bg-card">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-4 border-b px-5 py-3 text-sm last:border-b-0"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Akun ini belum terhubung ke data karyawan. Hubungi HR untuk
          melengkapi.
        </p>
      )}
    </div>
  );
}
