"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";

type EmployeeRow = {
  id: string;
  nik: string;
  fullName: string;
  photoUrl: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  employmentStatus: string;
  salaryType: string;
  baseSalary: string;
  allowance: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
};

type Option = { id: string; name: string };

type Draft = {
  employeeId: string;
  salaryType: string;
  baseSalary: string;
  allowance: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const PAGE_SIZE = 10;

const emptyDraft = (): Draft => ({
  employeeId: "",
  salaryType: "monthly",
  baseSalary: "",
  allowance: "",
  bankName: "",
  bankAccount: "",
  bankAccountName: "",
});

export function SalarySettings() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [positions, setPositions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [lateRate, setLateRate] = useState("2000");
  const [alphaRate, setAlphaRate] = useState("100000");
  const [permissionPercent, setPermissionPercent] = useState("50");
  const [settingsBusy, setSettingsBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [employeeResponse, positionResponse, settingsResponse] =
        await Promise.all([
          fetch("/api/employees?limit=200", { cache: "no-store" }),
          fetch("/api/positions?limit=200", { cache: "no-store" }),
          fetch("/api/admin/settings", { cache: "no-store" }),
        ]);
      const employeeBody = await employeeResponse.json();
      const positionBody = await positionResponse.json();
      const settingsBody = await settingsResponse.json();
      if (employeeResponse.ok) setEmployees(employeeBody.data ?? []);
      if (positionResponse.ok) setPositions(positionBody.data ?? []);
      if (settingsResponse.ok) {
        setLateRate(
          String(Number(settingsBody.data?.payrollLateRatePerMinute ?? 2000)),
        );
        setAlphaRate(
          String(Number(settingsBody.data?.payrollAlphaRatePerDay ?? 100000)),
        );
        setPermissionPercent(
          String(settingsBody.data?.payrollPermissionPercent ?? 50),
        );
      }
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

  const positionNames = useMemo(
    () => new Map(positions.map((row) => [row.id, row.name])),
    [positions],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (positionFilter && employee.positionId !== positionFilter)
        return false;
      if (statusFilter === "active" && employee.employmentStatus !== "active")
        return false;
      if (statusFilter === "inactive" && employee.employmentStatus === "active")
        return false;
      if (!needle) return true;
      return `${employee.fullName} ${employee.nik}`
        .toLowerCase()
        .includes(needle);
    });
  }, [employees, positionFilter, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const startEdit = (employee: EmployeeRow) => {
    setIsNew(false);
    setDraft({
      employeeId: employee.id,
      salaryType: employee.salaryType,
      baseSalary: String(Number(employee.baseSalary)),
      allowance: String(Number(employee.allowance)),
      bankName: employee.bankName,
      bankAccount: employee.bankAccount,
      bankAccountName: employee.bankAccountName,
    });
    setNotice(null);
    setError(null);
  };

  const startNew = () => {
    setIsNew(true);
    setDraft({ ...emptyDraft(), employeeId: employees[0]?.id ?? "" });
    setNotice(null);
    setError(null);
  };

  const saveDraft = async () => {
    if (!draft || !draft.employeeId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/employees/${draft.employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryType: draft.salaryType,
          baseSalary: Number(draft.baseSalary || "0"),
          allowance: Number(draft.allowance || "0"),
          bankName: draft.bankName,
          bankAccount: draft.bankAccount,
          bankAccountName: draft.bankAccountName,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal menyimpan setting gaji.",
        );
        return;
      }
      setNotice(
        isNew
          ? "Setting gaji karyawan ditambahkan."
          : "Setting gaji diperbarui.",
      );
      setDraft(null);
      setIsNew(false);
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const clearSalary = async (employee: EmployeeRow) => {
    if (
      !window.confirm(
        `Hapus setting gaji ${employee.fullName}? Gaji pokok, tunjangan, dan data rekening akan dikosongkan.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaryType: "monthly",
          baseSalary: 0,
          allowance: 0,
          bankName: "",
          bankAccount: "",
          bankAccountName: "",
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal menghapus setting gaji.");
        return;
      }
      setNotice(`Setting gaji ${employee.fullName} dihapus.`);
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const saveDeductionSettings = async () => {
    setSettingsBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payrollLateRatePerMinute: Number(lateRate || "0"),
          payrollAlphaRatePerDay: Number(alphaRate || "0"),
          payrollPermissionPercent: Number(permissionPercent || "0"),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal menyimpan pengaturan potongan.",
        );
        return;
      }
      setNotice(
        "Pengaturan potongan disimpan. Hitung ulang draft untuk menerapkannya.",
      );
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const employeeName = (id: string) =>
    employees.find((row) => row.id === id)?.fullName ?? "Karyawan";

  return (
    <div className="space-y-5">
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

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Potongan otomatis</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Denda keterlambatan dihitung dari total menit telat, potongan alpha
          dari jumlah hari tidak hadir, dan izin dipotong setengah hari.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Denda telat / menit (Rp)</span>
            <input
              type="number"
              min={0}
              step="any"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={lateRate}
              onChange={(event) => setLateRate(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Potongan alpha / hari (Rp)</span>
            <input
              type="number"
              min={0}
              step="any"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={alphaRate}
              onChange={(event) => setAlphaRate(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Potongan izin (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={permissionPercent}
              onChange={(event) => setPermissionPercent(event.target.value)}
            />
          </label>
        </div>
        <Button
          className="mt-4"
          size="sm"
          disabled={settingsBusy}
          onClick={() => void saveDeductionSettings()}
        >
          {settingsBusy ? "Menyimpan…" : "Simpan pengaturan potongan"}
        </Button>
      </section>

      {draft && (
        <section className="rounded-lg border border-border-strong bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {isNew
                  ? "Tambah setting gaji"
                  : `Setting gaji: ${employeeName(draft.employeeId)}`}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Gaji pokok, tunjangan, dan rekening yang dipakai saat
                pembayaran.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Tutup
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {isNew && (
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Karyawan</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={draft.employeeId}
                  onChange={(event) =>
                    setDraft({ ...draft, employeeId: event.target.value })
                  }
                >
                  <option value="">Pilih karyawan</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} · {employee.nik}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tipe gaji</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={draft.salaryType}
                onChange={(event) =>
                  setDraft({ ...draft, salaryType: event.target.value })
                }
              >
                <option value="monthly">Bulanan</option>
                <option value="daily">Harian</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                {draft.salaryType === "daily"
                  ? "Gaji harian (Rp)"
                  : "Gaji pokok (Rp)"}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={draft.baseSalary}
                onChange={(event) =>
                  setDraft({ ...draft, baseSalary: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tunjangan (Rp)</span>
              <input
                type="number"
                min={0}
                step="any"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={draft.allowance}
                onChange={(event) =>
                  setDraft({ ...draft, allowance: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Nama bank</span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={draft.bankName}
                onChange={(event) =>
                  setDraft({ ...draft, bankName: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">No. rekening</span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={draft.bankAccount}
                onChange={(event) =>
                  setDraft({ ...draft, bankAccount: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Atas nama</span>
              <input
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={draft.bankAccountName}
                onChange={(event) =>
                  setDraft({ ...draft, bankAccountName: event.target.value })
                }
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={busy || !draft.employeeId}
              onClick={() => void saveDraft()}
            >
              {busy ? "Menyimpan…" : "Simpan setting gaji"}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Batal
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Data gaji karyawan</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {filtered.length} karyawan · {PAGE_SIZE} per halaman
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={startNew} disabled={busy}>
              <Plus aria-hidden="true" />
              Tambah setting
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/admin/payroll/employees/export?format=pdf">PDF</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/admin/payroll/employees/export?format=xls">Excel</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/admin/payroll/employees/export?format=csv">CSV</a>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama atau NIK…"
            aria-label="Cari karyawan"
            className="h-9 w-56 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
          <select
            aria-label="Filter jabatan"
            value={positionFilter}
            onChange={(event) => {
              setPositionFilter(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">Semua jabatan</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter status karyawan"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Non-aktif</option>
          </select>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Memuat data gaji…
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-3 font-medium">Foto</th>
                  <th className="py-2 pr-3 font-medium">Nama</th>
                  <th className="py-2 pr-3 font-medium">NIK</th>
                  <th className="py-2 pr-3 font-medium">Jabatan</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Gaji pokok
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Tunjangan
                  </th>
                  <th className="py-2 pr-3 font-medium">No. rekening</th>
                  <th className="py-2 pr-3 font-medium">Bank</th>
                  <th className="py-2 pr-3 font-medium">Atas nama</th>
                  <th className="py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-3">
                      {employee.photoUrl ? (
                        <Image
                          src={`/api/employees/${employee.id}/documents/photo`}
                          alt={employee.fullName}
                          width={36}
                          height={36}
                          unoptimized
                          className="size-9 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <span className="grid size-9 place-items-center rounded-full border border-border bg-muted text-[11px] font-semibold">
                          {initials(employee.fullName)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {employee.fullName}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {employee.nik}
                    </td>
                    <td className="py-2 pr-3">
                      {employee.positionName ??
                        positionNames.get(employee.positionId ?? "") ??
                        "—"}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {rupiah.format(Number(employee.baseSalary))}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">
                      {rupiah.format(Number(employee.allowance))}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {employee.bankAccount || "—"}
                    </td>
                    <td className="py-2 pr-3">{employee.bankName || "—"}</td>
                    <td className="py-2 pr-3">
                      {employee.bankAccountName || "—"}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={busy}
                          onClick={() => startEdit(employee)}
                        >
                          <Pencil aria-hidden="true" />
                          Ubah
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={busy}
                          onClick={() => void clearSalary(employee)}
                        >
                          <Trash2 aria-hidden="true" />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      <UserRound
                        className="mx-auto mb-2 size-6 text-muted-foreground"
                        aria-hidden="true"
                      />
                      Tidak ada karyawan yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
