import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, initials } from "@/lib/format";

type Profile = {
  id: string;
  nik: string;
  fullName: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccount: string;
  ktpNumber: string;
  photoUrl: string | null;
  ktpPhotoUrl: string | null;
  joinDate: string | null;
  employmentStatus: string;
  departmentName: string | null;
  positionName: string | null;
  locationName: string | null;
};

type LeaveBalance = {
  id: string;
  leaveTypeName: string;
  year: number;
  openingBalance: number;
  used: number;
  remaining: number;
};

type LeaveResponse = {
  year: number;
  data: LeaveBalance[];
};

const statusLabels: Record<string, string> = {
  active: "Aktif",
  pending: "Menunggu verifikasi",
  inactive: "Nonaktif",
  resigned: "Resign",
};

const roleLabels: Record<string, string> = {
  user: "Karyawan",
  marketing: "Marketing",
  hod: "HOD",
  hrd: "HRD",
  admin: "Admin",
};

export function ProfileScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, roles, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    phone: "",
    address: "",
    bankName: "",
    bankAccount: "",
    ktpNumber: "",
  });

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<{ data: Profile | null }>("/api/profile"),
    retry: false,
  });

  const leaveQuery = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () => apiFetch<LeaveResponse>("/api/leave-balances"),
    retry: false,
  });

  const profile = profileQuery.data?.data ?? null;
  const balances = leaveQuery.data?.data ?? [];

  function startEditing() {
    if (!profile) return;
    setForm({
      phone: profile.phone,
      address: profile.address,
      bankName: profile.bankName,
      bankAccount: profile.bankAccount,
      ktpNumber: profile.ktpNumber,
    });
    setEditing(true);
    setNotice(null);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/profile", { method: "PATCH", body: form });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      setNotice("Data profil berhasil disimpan.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Gagal menyimpan profil.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data pribadi, kepegawaian, dan jatah cuti.
          </p>
        </div>
        {profile && !editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil aria-hidden="true" />
            Ubah
          </Button>
        )}
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-lg border bg-card px-4 py-3 text-sm text-positive"
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

      <section className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-full border border-border-strong bg-primary-quiet text-lg font-semibold text-primary-text">
            {initials(user?.name ?? "?")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {profile?.fullName ?? user?.name}
            </p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              {user?.email}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {roles.map((role) => roleLabels[role] ?? role).join(" · ") ||
                "Karyawan"}
            </p>
          </div>
        </div>

        {profileQuery.isLoading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Memuat profil…
          </p>
        ) : !profile ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Data karyawan belum terhubung. Hubungi HRD untuk menautkan akun
            dengan NIK Anda.
          </p>
        ) : (
          <dl className="mt-4 grid gap-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">NIK</dt>
              <dd className="font-mono text-xs font-medium">{profile.nik}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {statusLabels[profile.employmentStatus] ??
                  profile.employmentStatus}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="size-4" aria-hidden="true" />
                Departemen
              </dt>
              <dd className="text-right font-medium">
                {profile.departmentName ?? "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="size-4" aria-hidden="true" />
                Jabatan
              </dt>
              <dd className="text-right font-medium">
                {profile.positionName ?? "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" />
                Lokasi kerja
              </dt>
              <dd className="text-right font-medium">
                {profile.locationName ?? "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden="true" />
                Bergabung
              </dt>
              <dd className="text-right font-medium">
                {profile.joinDate ? formatDate(profile.joinDate) : "—"}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {profile && !editing && (
        <>
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Kontak &amp; rekening</h2>
            <dl className="mt-3 grid gap-2.5 text-sm">
              <div className="flex items-start gap-2">
                <Phone
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs text-muted-foreground">Telepon</dt>
                  <dd>{profile.phone || "—"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs text-muted-foreground">Alamat</dt>
                  <dd className="whitespace-pre-wrap">
                    {profile.address || "—"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-xs text-muted-foreground">Rekening</dt>
                  <dd>
                    {profile.bankName || "—"}
                    {profile.bankAccount ? ` · ${profile.bankAccount}` : ""}
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">
              Jatah cuti {leaveQuery.data?.year ?? ""}
            </h2>
            {leaveQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>
            ) : balances.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Belum ada jatah cuti yang ditetapkan.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {balances.map((balance) => (
                  <li
                    key={balance.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <span>{balance.leaveTypeName}</span>
                    <span className="font-mono text-xs">
                      {balance.remaining} /{" "}
                      {balance.openingBalance + balance.used} hari
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {editing && profile && (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ubah data pribadi</h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="grid size-10 place-items-center rounded-md border text-muted-foreground"
              aria-label="Tutup form"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((value) => ({ ...value, phone: event.target.value }))
                }
                className="h-11"
                maxLength={32}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="address">Alamat</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(event) =>
                  setForm((value) => ({ ...value, address: event.target.value }))
                }
                className="h-11"
                maxLength={500}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="bankName">Nama bank</Label>
                <Input
                  id="bankName"
                  value={form.bankName}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      bankName: event.target.value,
                    }))
                  }
                  className="h-11"
                  maxLength={80}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="bankAccount">Nomor rekening</Label>
                <Input
                  id="bankAccount"
                  value={form.bankAccount}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      bankAccount: event.target.value,
                    }))
                  }
                  className="h-11"
                  maxLength={40}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="ktpNumber">Nomor KTP</Label>
              <Input
                id="ktpNumber"
                value={form.ktpNumber}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    ktpNumber: event.target.value,
                  }))
                }
                className="h-11"
                maxLength={32}
              />
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Batal
              </Button>
              <Button
                className="h-11 flex-1"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : null}
                {busy ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="size-4" aria-hidden="true" />
          Akun: {user?.email}
        </div>
        <Button
          variant="outline"
          className="mt-3 h-11 w-full"
          onClick={() => {
            void signOut().then(() => navigate("/sign-in", { replace: true }));
          }}
        >
          <LogOut aria-hidden="true" />
          Keluar dari akun
        </Button>
      </section>
    </div>
  );
}
