import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  LoaderCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import type { EmployeeResponse, EmployeeRow } from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";

const STATUS_FILTERS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "resigned", label: "Resign" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu verifikasi",
  active: "Aktif",
  inactive: "Nonaktif",
  resigned: "Resign",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "border border-border-strong text-foreground",
  active: "bg-positive text-white",
  inactive: "bg-muted text-muted-foreground border border-border-strong",
  resigned: "bg-danger text-white",
};

function money(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

export function AdminEmployeesScreen() {
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<EmployeeRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canViewSalary = roles.some((role) => ["hrd", "admin"].includes(role));

  const employeesQuery = useQuery({
    queryKey: ["admin", "employees"],
    queryFn: () =>
      apiFetch<EmployeeResponse>("/api/employees?limit=200&offset=0"),
    retry: false,
  });

  const rows = useMemo(
    () => employeesQuery.data?.data ?? [],
    [employeesQuery.data],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status && row.employmentStatus !== status) return false;
      if (!term) return true;
      return [row.fullName, row.nik, row.departmentName, row.positionName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [rows, search, status]);

  async function verify(row: EmployeeRow) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch<{ data: EmployeeRow }>(
        `/api/employees/${row.id}`,
        {
          method: "PATCH",
          body: { employmentStatus: "active" },
        },
      );
      setSelected(response.data);
      setNotice(`${row.fullName} sudah diverifikasi dan diaktifkan.`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "employees"] });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Verifikasi gagal.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Data Karyawan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cari karyawan, periksa data kepegawaian, dan verifikasi akun baru.
        </p>
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

      <label className="flex items-center gap-2 rounded-lg border bg-card px-3">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Cari karyawan</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama, NIK, departemen, jabatan"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            role="tab"
            aria-selected={status === filter.value}
            onClick={() => setStatus(filter.value)}
            className={`min-h-10 rounded-md border px-3 text-sm font-medium ${
              status === filter.value
                ? "border-border-strong bg-primary-quiet text-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {employeesQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat data karyawan…
        </p>
      ) : employeesQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {employeesQuery.error.message}
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <Users
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Tidak ada karyawan yang cocok dengan filter ini.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} dari {rows.length} karyawan ditampilkan.
          </p>
          <ul className="space-y-3">
            {filtered.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row);
                    setNotice(null);
                    setError(null);
                  }}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:border-border-strong"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{row.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.nik}
                        {row.departmentName ? ` · ${row.departmentName}` : ""}
                        {row.positionName ? ` · ${row.positionName}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_CLASSES[row.employmentStatus] ?? ""
                      }`}
                    >
                      {STATUS_LABELS[row.employmentStatus] ??
                        row.employmentStatus}
                    </span>
                  </div>
                  {row.phone && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.phone}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Data ${selected.fullName}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.fullName}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.nik} ·{" "}
                  {STATUS_LABELS[selected.employmentStatus] ??
                    selected.employmentStatus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="grid size-10 place-items-center rounded-md border text-muted-foreground"
                aria-label="Tutup data karyawan"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Departemen</dt>
                <dd className="text-right">
                  {selected.departmentName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Jabatan</dt>
                <dd className="text-right">{selected.positionName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tanggal masuk</dt>
                <dd className="text-right">
                  {selected.joinDate ? formatDate(selected.joinDate) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Telepon</dt>
                <dd className="text-right">{selected.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Alamat</dt>
                <dd className="max-w-[60%] text-right">
                  {selected.address || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Rekening</dt>
                <dd className="text-right">
                  {selected.bankName
                    ? `${selected.bankName} ${selected.bankAccount}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">No. KTP</dt>
                <dd className="text-right">{selected.ktpNumber || "—"}</dd>
              </div>
              {canViewSalary && (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tipe gaji</dt>
                    <dd className="text-right">
                      {selected.salaryType === "daily" ? "Harian" : "Bulanan"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Gaji pokok</dt>
                    <dd className="text-right">
                      {money(selected.baseSalary)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tunjangan</dt>
                    <dd className="text-right">{money(selected.allowance)}</dd>
                  </div>
                </>
              )}
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {selected.photoUrl && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Foto profil
                  </p>
                  <AuthenticatedImage
                    path={`/api/employees/${selected.id}/documents/photo`}
                    alt={`Foto ${selected.fullName}`}
                    className="w-full rounded-md border object-cover"
                  />
                </div>
              )}
              {selected.ktpPhotoUrl && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Foto KTP
                  </p>
                  <AuthenticatedImage
                    path={`/api/employees/${selected.id}/documents/ktp`}
                    alt={`KTP ${selected.fullName}`}
                    className="w-full rounded-md border object-cover"
                  />
                </div>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-danger/40 px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            )}

            {selected.employmentStatus === "pending" && (
              <Button
                className="mt-4 h-11 w-full"
                disabled={busy}
                onClick={() => void verify(selected)}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <BadgeCheck aria-hidden="true" />
                )}
                {busy ? "Memverifikasi…" : "Verifikasi & aktifkan akun"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
