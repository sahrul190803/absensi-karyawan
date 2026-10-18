"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type Employee = {
  id: string;
  nik: string;
  fullName: string;
  phone: string;
  address: string;
  employmentStatus: string;
};

const STATUS_LABEL: Record<string, string> = {
  incomplete: "Data belum lengkap",
  pending: "Menunggu verifikasi HRD/HOD",
  inactive: "Akun tidak aktif",
  resigned: "Akun sudah tidak aktif",
};

export function PendingView({
  employee,
  userName,
  userEmail,
  errorCode,
}: {
  employee: Employee | null;
  userName: string;
  userEmail: string;
  errorCode: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(employee?.fullName ?? userName);
  const [nik, setNik] = useState(employee?.nik ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [address, setAddress] = useState(employee?.address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    errorCode === "NIK_TAKEN"
      ? "NIK sudah terdaftar. Periksa kembali NIK Anda, lalu simpan ulang."
      : errorCode
        ? "Data pribadi belum tersimpan. Lengkapi dan simpan kembali."
        : "",
  );
  const [notice, setNotice] = useState<string | null>(null);

  const status = employee?.employmentStatus ?? "incomplete";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          nik: nik.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.message ?? "Data pribadi gagal disimpan. Coba lagi.",
        );
        return;
      }
      setNotice(
        status === "pending"
          ? "Data pribadi diperbarui. Tetap menunggu verifikasi HRD/HOD."
          : "Data pribadi tersimpan. HRD/HOD akan memverifikasi akun Anda.",
      );
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-full border border-border-strong bg-primary-quiet text-primary-text">
            {status === "pending" ? (
              <Clock3 className="size-5" aria-hidden="true" />
            ) : status === "incomplete" ? (
              <ShieldCheck className="size-5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {status === "incomplete"
                ? "Lengkapi data pribadi"
                : "Verifikasi akun"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "incomplete"
                ? "Isi data berikut agar akun Anda masuk ke daftar karyawan dan bisa diverifikasi HRD/HOD."
                : status === "pending"
                  ? "Data Anda sudah masuk ke daftar karyawan. HRD/HOD akan memverifikasi sebelum akun bisa dipakai."
                  : "Akun Anda tidak dapat dipakai. Hubungi HRD/HOD untuk mengaktifkan kembali."}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-2 rounded-md border bg-background p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Email akun</dt>
            <dd className="truncate font-medium">{userEmail}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">
              {STATUS_LABEL[status] ?? "Menunggu verifikasi HRD/HOD"}
            </dd>
          </div>
        </dl>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Nama lengkap</span>
            <input
              required
              maxLength={160}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">NIK</span>
            <input
              required
              maxLength={32}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={nik}
              onChange={(event) => setNik(event.target.value)}
              placeholder="Nomor induk karyawan"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">No. telepon</span>
              <input
                maxLength={32}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Alamat</span>
              <input
                maxLength={500}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Kota / alamat domisili"
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-lg border bg-card px-4 py-3 text-sm"
            >
              {notice}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan data pribadi"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void signOut()}
            >
              <LogOut aria-hidden="true" />
              Keluar
            </Button>
          </div>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Setelah disetujui, akun bisa dipakai untuk absen, melihat jadwal,
        mengajukan izin, dan klaim makan.
      </p>
    </div>
  );
}
