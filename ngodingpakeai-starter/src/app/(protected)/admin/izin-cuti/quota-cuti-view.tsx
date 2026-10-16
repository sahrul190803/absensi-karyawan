"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type LeaveType = { id: string; name: string; defaultQuota: number };

type BalanceRow = {
  leaveTypeId: string;
  openingBalance: number;
  used: number;
  configured: boolean;
};

type EmployeeRow = {
  id: string;
  fullName: string;
  nik: string;
  balances: BalanceRow[];
};

type Overview = {
  year: number;
  leaveTypes: LeaveType[];
  employees: EmployeeRow[];
};

const days = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export function QuotaCutiView() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [overview, setOverview] = useState<Overview | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: sessionData } = authClient.useSession();
  const roleList = (
    (sessionData?.user as { role?: string } | undefined)?.role ?? ""
  )
    .split(",")
    .map((role) => role.trim());
  const canManage = roleList.includes("hrd") || roleList.includes("admin");

  const load = useCallback(async (nextYear: number) => {
    setLoading(true);
    setError(null);
    setEditingId(null);
    try {
      const response = await fetch(
        `/api/admin/leave-balances?year=${nextYear}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat kuota cuti.");
        return;
      }
      setOverview(body.data);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(year), 0);
    return () => window.clearTimeout(timer);
  }, [load, year]);

  const filtered = useMemo(() => {
    if (!overview) return [];
    const query = search.trim().toLowerCase();
    if (!query) return overview.employees;
    return overview.employees.filter((employee) =>
      `${employee.fullName} ${employee.nik}`.toLowerCase().includes(query),
    );
  }, [overview, search]);

  const startEdit = (employee: EmployeeRow) => {
    setEditingId(employee.id);
    setNotice(null);
    setError(null);
    setForm(
      Object.fromEntries(
        employee.balances.map((balance) => [
          balance.leaveTypeId,
          days(balance.openingBalance),
        ]),
      ),
    );
  };

  const save = async (employee: EmployeeRow) => {
    if (!overview) return;
    const balances = overview.leaveTypes.map((type) => ({
      leaveTypeId: type.id,
      openingBalance: Number(form[type.id]),
    }));
    if (
      balances.some(
        (item) => !Number.isFinite(item.openingBalance) || item.openingBalance < 0,
      )
    ) {
      setError("Isi setiap kuota dengan angka 0 atau lebih.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/leave-balances", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, year, balances }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal menyimpan kuota.");
        return;
      }
      await load(year);
      setNotice(`Kuota ${employee.fullName} tahun ${year} disimpan.`);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="relative">
          <span className="sr-only">Cari karyawan</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau NIK…"
            className="h-9 w-56 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Tahun sebelumnya"
            onClick={() => setYear((value) => value - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="font-mono text-sm font-medium">{year}</span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Tahun berikutnya"
            onClick={() => setYear((value) => value + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void load(year)}
          >
            <RefreshCw aria-hidden="true" />
            Muat ulang
          </Button>
        </div>
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

      <section className="rounded-lg border bg-card">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Memuat kuota cuti…
          </p>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users
              className="mx-auto size-7 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              {overview?.employees.length
                ? "Tidak ada karyawan yang cocok dengan pencarian."
                : "Belum ada data karyawan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="px-5 py-3">
                    Karyawan
                  </th>
                  {overview?.leaveTypes.map((type) => (
                    <th key={type.id} scope="col" className="px-5 py-3">
                      {type.name}
                      <span className="block font-normal normal-case">
                        default {days(type.defaultQuota)} hari
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => {
                  const editing = editingId === employee.id;
                  return (
                    <tr
                      key={employee.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-3">
                        <span className="font-medium">{employee.fullName}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {employee.nik}
                        </span>
                      </td>
                      {employee.balances.map((balance) => (
                        <td key={balance.leaveTypeId} className="px-5 py-3">
                          {editing ? (
                            <input
                              type="number"
                              min={0}
                              max={366}
                              step={0.5}
                              value={form[balance.leaveTypeId] ?? ""}
                              onChange={(event) =>
                                setForm((values) => ({
                                  ...values,
                                  [balance.leaveTypeId]: event.target.value,
                                }))
                              }
                              aria-label={`Kuota ${employee.fullName}`}
                              className="h-8 w-20 rounded-md border border-border bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                            />
                          ) : (
                            <>
                              <span className="font-medium">
                                {days(balance.openingBalance)} hari
                              </span>
                              <span className="block font-mono text-xs text-muted-foreground">
                                terpakai {days(balance.used)} · sisa{" "}
                                {days(balance.openingBalance - balance.used)}
                                {!balance.configured && " · belum diatur"}
                              </span>
                            </>
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3">
                        {canManage ? (
                          editing ? (
                            <span className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={saving}
                                onClick={() => void save(employee)}
                              >
                                {saving ? "Menyimpan…" : "Simpan"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => setEditingId(null)}
                              >
                                Batal
                              </Button>
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(employee)}
                            >
                              Atur
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-muted-foreground">
        Kuota adalah jatah cuti tahunan per karyawan. Sisa dihitung dari kuota
        dikurangi pemakaian; pengajuan cuti yang disetujui otomatis mengurangi
        saldo. Kuota tidak boleh lebih kecil dari pemakaian yang sudah tercatat.
      </p>
    </div>
  );
}
