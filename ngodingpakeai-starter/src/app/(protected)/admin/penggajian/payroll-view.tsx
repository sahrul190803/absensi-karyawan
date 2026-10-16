"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Period = {
  id: string;
  year: number;
  month: number;
  status: string;
  note: string;
  finalizedAt: string | null;
  employeeCount: number;
  total: number;
};

type Entry = {
  id: string;
  employeeName: string;
  employeeNik: string;
  departmentName: string | null;
  salaryType: string;
  baseSalary: string;
  scheduledDays: number;
  presentDays: number;
  lateDays: number;
  alphaDays: number;
  excusedDays: number;
  overtimeMinutes: number;
  mealClaimCount: number;
  baseAmount: string;
  lateDeduction: string;
  alphaDeduction: string;
  overtimeAmount: string;
  otherAdjustment: string;
  adjustmentNote: string;
  total: string;
};

type Detail = {
  period: {
    id: string;
    year: number;
    month: number;
    status: string;
    note: string;
    finalizedAt: string | null;
  };
  entries: Entry[];
  meta: {
    totals: {
      presentDays: number;
      lateDays: number;
      alphaDays: number;
      overtimeMinutes: number;
      mealClaimCount: number;
      total: number;
    };
  };
};

type FinanceSummary = {
  income: { label: string; amount: number }[];
  expense: { label: string; amount: number }[];
  incomeTotal: number;
  expenseTotal: number;
  net: number;
  margin: number;
  from: string;
  to: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const monthLabel = (year: number, month: number) =>
  `${MONTHS[month - 1] ?? month} ${year}`;

export function PayrollView() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [entrySearch, setEntrySearch] = useState("");
  const [entryDepartment, setEntryDepartment] = useState("");

  const loadPeriods = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/payroll/periods?limit=24", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat periode penggajian.");
        return;
      }
      setPeriods(body.data);
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);

  const loadFinance = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/finance/summary?period=month", {
        cache: "no-store",
      });
      const body = await response.json();
      if (response.ok) setFinance(body.data);
    } catch {
      // kartu keuangan opsional: gagal memuat cukup dibiarkan kosong
    } finally {
      setFinanceLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFinance(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFinance]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/payroll/periods/${id}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat detail periode.");
        return;
      }
      setDetail(body.data);
      setEntrySearch("");
      setEntryDepartment("");
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPeriods(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPeriods]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => void loadDetail(selectedId), 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedId]);

  // Filter daftar karyawan pada detail periode: cari nama/NIK atau divisi.
  const departments = useMemo(() => {
    const names = new Set<string>();
    for (const entry of detail?.entries ?? []) {
      if (entry.departmentName) names.add(entry.departmentName);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [detail]);

  const filteredEntries = useMemo(() => {
    const entries = detail?.entries ?? [];
    const query = entrySearch.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entryDepartment && entry.departmentName !== entryDepartment)
        return false;
      if (!query) return true;
      return `${entry.employeeName} ${entry.employeeNik}`
        .toLowerCase()
        .includes(query);
    });
  }, [detail, entryDepartment, entrySearch]);

  const generate = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, note }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal menghitung penggajian.",
        );
        return;
      }
      setNotice(
        `Periode ${monthLabel(Number(year), Number(month))} dihitung: ${body.data.entries.length} karyawan.`,
      );
      setNote("");
      await loadPeriods();
      setSelectedId(body.data.period.id);
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: "draft" | "finalized") => {
    if (!detail) return;
    const label =
      status === "finalized"
        ? "Finalkan periode ini? Nilai akan terkunci."
        : "Buka kembali periode ini agar bisa diubah?";
    if (!window.confirm(label)) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/payroll/periods/${detail.period.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal mengubah status periode.");
        return;
      }
      setNotice(
        status === "finalized"
          ? "Periode difinalkan."
          : "Periode dibuka kembali sebagai draft.",
      );
      await Promise.all([loadPeriods(), loadDetail(detail.period.id)]);
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const openAdjustment = (entry: Entry) => {
    setEditingId(entry.id);
    setAdjustment(String(Number(entry.otherAdjustment)));
    setAdjustmentNote(entry.adjustmentNote);
    setNotice(null);
  };

  const saveAdjustment = async () => {
    if (!editingId || !detail) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/payroll/entries/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otherAdjustment: Number(adjustment || "0"),
          adjustmentNote,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal menyimpan penyesuaian.",
        );
        return;
      }
      setNotice("Penyesuaian disimpan.");
      setEditingId(null);
      await Promise.all([loadPeriods(), loadDetail(detail.period.id)]);
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const isDraft = detail?.period.status === "draft";

  const financeSalary = finance?.expense.find((entry) =>
    entry.label.toLowerCase().startsWith("gaji"),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Penggajian
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hitung draft gaji dari absensi, lembur, dan klaim makan. HRD dapat
          menyesuaikan sebelum difinalkan.
        </p>
      </div>

      <section
        aria-label="Rincian keuangan periode"
        className="mt-6 grid gap-4 sm:grid-cols-3"
      >
        <div className="rounded-lg border bg-card p-4 shadow-[inset_4px_0_0_0_#137A4A]">
          <p className="text-sm font-semibold text-muted-foreground">
            Pemasukan bulan ini
          </p>
          <p className="mt-2 font-mono text-xl font-medium">
            {financeLoading
              ? "…"
              : finance
                ? rupiah.format(finance.incomeTotal)
                : "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {finance
              ? `${finance.income.length} sumber · ${finance.from} s/d ${finance.to}`
              : "Belum ada catatan keuangan"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-[inset_4px_0_0_0_#A65D00]">
          <p className="text-sm font-semibold text-muted-foreground">
            Pengeluaran bulan ini
          </p>
          <p className="mt-2 font-mono text-xl font-medium">
            {financeLoading
              ? "…"
              : finance
                ? rupiah.format(finance.expenseTotal)
                : "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {financeSalary
              ? `termasuk ${financeSalary.label.toLowerCase()} ${rupiah.format(financeSalary.amount)}`
              : "belum termasuk gaji periode ini"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-[inset_4px_0_0_0_#E4F222]">
          <p className="text-sm font-semibold text-muted-foreground">
            Laba bersih bulan ini
          </p>
          <p className="mt-2 font-mono text-xl font-medium">
            {financeLoading
              ? "…"
              : finance
                ? rupiah.format(finance.net)
                : "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {finance
              ? `margin ${finance.margin}% · rincian penuh di halaman Laporan`
              : "Rincian penuh di halaman Laporan"}
          </p>
        </div>
      </section>

      {notice && (
        <p role="status" className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <section className="mt-6 rounded-lg border bg-card p-5">
        <h2 className="text-lg font-semibold">Hitung periode</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Tahun</span>
            <input
              type="number"
              min={2000}
              max={2100}
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Bulan</span>
            <select
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Catatan (opsional)</span>
            <input
              type="text"
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
        <Button className="mt-4" disabled={busy} onClick={() => void generate()}>
          {busy ? "Menghitung…" : "Hitung draft"}
        </Button>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Potongan terlambat 10% upah harian per hari, alpha 100% upah harian,
          lembur menit/60 x upah per jam. Hitung ulang draft akan mengatur
          ulang penyesuaian manual.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Riwayat periode</h2>
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Memuat…</p>
        ) : periods.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada periode penggajian.
            </p>
          </div>
        ) : (
          <ul className="mt-2 grid gap-2">
            {periods.map((period) => (
              <li
                key={period.id}
                className={`rounded-lg border bg-card p-4 ${
                  selectedId === period.id ? "border-primary" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {monthLabel(period.year, period.month)}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {period.employeeCount} karyawan · {rupiah.format(period.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                      {period.status === "finalized"
                        ? "Final"
                        : "Draft"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedId(selectedId === period.id ? null : period.id)
                      }
                    >
                      {selectedId === period.id ? "Tutup" : "Buka"}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail && (
        <section className="mt-6 rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Detail {monthLabel(detail.period.year, detail.period.month)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Total {rupiah.format(detail.meta.totals.total)} · hadir{" "}
                {detail.meta.totals.presentDays} hari · terlambat{" "}
                {detail.meta.totals.lateDays} · alpha{" "}
                {detail.meta.totals.alphaDays} · lembur{" "}
                {detail.meta.totals.overtimeMinutes} menit
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isDraft ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void changeStatus("finalized")}
                >
                  Finalkan
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void changeStatus("draft")}
                >
                  Buka kembali
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/admin/payroll/periods/${detail.period.id}/export?format=csv`}
                >
                  CSV
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/admin/payroll/periods/${detail.period.id}/export?format=xls`}
                >
                  Excel
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/admin/payroll/periods/${detail.period.id}/export?format=pdf`}
                >
                  PDF
                </a>
              </Button>
            </div>
          </div>

          {editingId && (
            <div className="mt-4 grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">
                  Penyesuaian lain (Rp, boleh negatif)
                </span>
                <input
                  type="number"
                  step="any"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={adjustment}
                  onChange={(event) => setAdjustment(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Catatan penyesuaian</span>
                <input
                  type="text"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={adjustmentNote}
                  onChange={(event) => setAdjustmentNote(event.target.value)}
                />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void saveAdjustment()}
                >
                  {busy ? "Menyimpan…" : "Simpan"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setEditingId(null)}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Cari karyawan</span>
              <input
                type="search"
                value={entrySearch}
                onChange={(event) => setEntrySearch(event.target.value)}
                placeholder="Cari nama atau NIK…"
                className="h-9 w-56 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </label>
            <select
              aria-label="Filter divisi"
              value={entryDepartment}
              onChange={(event) => setEntryDepartment(event.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            >
              <option value="">Semua divisi</option>
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {filteredEntries.length} dari {detail.entries.length} karyawan
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada karyawan yang cocok dengan filter.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {filteredEntries.map((entry) => (
              <li key={entry.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {entry.employeeName}
                      <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                        {entry.employeeNik}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.departmentName ?? "—"} ·{" "}
                      {entry.salaryType === "daily" ? "Harian" : "Bulanan"}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-medium">
                    {rupiah.format(Number(entry.total))}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                  <div className="flex justify-between gap-2">
                    <dt>Hadir</dt>
                    <dd className="font-mono">{entry.presentDays}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Terlambat</dt>
                    <dd className="font-mono">{entry.lateDays}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Alpha</dt>
                    <dd className="font-mono">{entry.alphaDays}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Izin/cuti</dt>
                    <dd className="font-mono">{entry.excusedDays}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Lembur</dt>
                    <dd className="font-mono">{entry.overtimeMinutes} mnt</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Klaim makan</dt>
                    <dd className="font-mono">{entry.mealClaimCount}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Gaji pokok</dt>
                    <dd className="font-mono">
                      {Number(entry.baseAmount).toLocaleString("id-ID")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Potongan</dt>
                    <dd className="font-mono">
                      {(
                        Number(entry.lateDeduction) +
                        Number(entry.alphaDeduction)
                      ).toLocaleString("id-ID")}
                    </dd>
                  </div>
                  {Number(entry.otherAdjustment) !== 0 && (
                    <div className="flex justify-between gap-2 sm:col-span-2">
                      <dt>
                        Penyesuaian
                        {entry.adjustmentNote
                          ? ` (${entry.adjustmentNote})`
                          : ""}
                      </dt>
                      <dd className="font-mono">
                        {Number(entry.otherAdjustment).toLocaleString("id-ID")}
                      </dd>
                    </div>
                  )}
                </dl>
                {isDraft && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={busy}
                    onClick={() => openAdjustment(entry)}
                  >
                    Sesuaikan
                  </Button>
                )}
              </li>
            ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
