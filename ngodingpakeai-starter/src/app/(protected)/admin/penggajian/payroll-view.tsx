"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clock, formatDate, formatDateTime, statusLabel } from "@/lib/format";
import { DailyPayroll } from "./daily-payroll";
import { PaymentHistory } from "./payment-history";
import { SalarySettings } from "./salary-settings";

type Period = {
  id: string;
  year: number;
  month: number;
  status: string;
  note: string;
  finalizedAt: string | null;
  paidAt: string | null;
  employeeCount: number;
  total: number;
};

type Entry = {
  id: string;
  employeeName: string;
  employeeNik: string;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  salaryType: string;
  baseSalary: string;
  allowance: string;
  scheduledDays: number;
  presentDays: number;
  lateDays: number;
  lateMinutes: number;
  alphaDays: number;
  excusedDays: number;
  permissionDays: number;
  overtimeMinutes: number;
  mealClaimCount: number;
  baseAmount: string;
  grossAmount: string;
  lateDeduction: string;
  alphaDeduction: string;
  permissionDeduction: string;
  overtimeAmount: string;
  otherAdjustment: string;
  adjustmentNote: string;
  isHidden: boolean;
  paymentMethod: string;
  total: string;
  paidAt: string | null;
  paidBy: string | null;
};

type AttendanceRecord = {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  notes: string;
  shiftName: string | null;
  startTime: string | null;
  endTime: string | null;
};

type AttendanceRecap = {
  entry: {
    id: string;
    employeeName: string;
    employeeNik: string;
    scheduledDays: number;
    presentDays: number;
    lateDays: number;
    lateMinutes: number;
    alphaDays: number;
    excusedDays: number;
    permissionDays: number;
    overtimeMinutes: number;
    year: number;
    month: number;
    status: string;
  };
  records: AttendanceRecord[];
  meta: { from: string; to: string };
};

type Detail = {
  period: {
    id: string;
    year: number;
    month: number;
    status: string;
    note: string;
    finalizedAt: string | null;
    paidAt: string | null;
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

type DepartmentRow = { id: string; name: string };
type PositionRow = { id: string; name: string };

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  finalized: "Final",
  paid: "Dibayar",
};

export type PayrollTab = "setting" | "pay" | "history";

export function PayrollView({
  initialTab = "setting",
}: {
  initialTab?: PayrollTab;
}) {
  const [tab, setTab] = useState<PayrollTab>(initialTab);
  const [payMode, setPayMode] = useState<"monthly" | "daily">("monthly");
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
  const [entryPosition, setEntryPosition] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [recapOpenId, setRecapOpenId] = useState<string | null>(null);
  const [recapLoadingId, setRecapLoadingId] = useState<string | null>(null);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [recaps, setRecaps] = useState<Record<string, AttendanceRecap>>({});

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);

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

  const loadOptions = useCallback(async () => {
    try {
      const [departmentResponse, positionResponse] = await Promise.all([
        fetch("/api/departments?limit=200", { cache: "no-store" }),
        fetch("/api/positions?limit=200", { cache: "no-store" }),
      ]);
      const departmentBody = await departmentResponse.json();
      const positionBody = await positionResponse.json();
      if (departmentResponse.ok) setDepartments(departmentBody.data ?? []);
      if (positionResponse.ok) setPositions(positionBody.data ?? []);
    } catch {
      // Filter departemen/jabatan opsional; kegagalan diabaikan.
    }
  }, []);

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
    const timer = window.setTimeout(() => void loadOptions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOptions]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => void loadDetail(selectedId), 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedId]);

  const openPeriod = (id: string | null) => {
    setEntrySearch("");
    setEntryDepartment("");
    setEntryPosition("");
    setSelectedEntries([]);
    setRecapOpenId(null);
    setRecapError(null);
    setRecaps({});
    setSelectedId(id);
  };

  const filteredEntries = useMemo(() => {
    const entries = detail?.entries ?? [];
    const query = entrySearch.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entryDepartment && entry.departmentId !== entryDepartment)
        return false;
      if (entryPosition && entry.positionId !== entryPosition) return false;
      if (!query) return true;
      return `${entry.employeeName} ${entry.employeeNik}`
        .toLowerCase()
        .includes(query);
    });
  }, [detail, entryDepartment, entryPosition, entrySearch]);

  const unpaidEntries = useMemo(
    () => (detail?.entries ?? []).filter((entry) => !entry.paidAt),
    [detail],
  );

  const unpaidFiltered = useMemo(
    () => filteredEntries.filter((entry) => !entry.paidAt),
    [filteredEntries],
  );

  const selectedVisible = useMemo(
    () => unpaidFiltered.filter((entry) => selectedEntries.includes(entry.id)),
    [selectedEntries, unpaidFiltered],
  );

  const allFilteredSelected =
    unpaidFiltered.length > 0 &&
    selectedVisible.length === unpaidFiltered.length;

  const paidCount = (detail?.entries.length ?? 0) - unpaidEntries.length;

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
      openPeriod(body.data.period.id);
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: "draft" | "finalized" | "paid") => {
    if (!detail) return;
    const label =
      status === "paid"
        ? `Bayar gaji periode ${monthLabel(detail.period.year, detail.period.month)}? Semua karyawan akan menerima notifikasi gaji dibayar.`
        : status === "finalized"
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
        status === "paid"
          ? "Gaji dibayarkan. Notifikasi terkirim ke karyawan."
          : status === "finalized"
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
  const toggleEntrySelection = (id: string) => {
    setSelectedEntries((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const toggleFilteredSelection = () => {
    if (allFilteredSelected) {
      const visible = new Set(unpaidFiltered.map((entry) => entry.id));
      setSelectedEntries((current) => current.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedEntries((current) => [
      ...new Set([...current, ...unpaidFiltered.map((entry) => entry.id)]),
    ]);
  };

  const payEntries = async (entryIds: string[], confirmLabel: string) => {
    if (!detail || entryIds.length === 0) return;
    if (!window.confirm(confirmLabel)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/payroll/periods/${detail.period.id}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryIds }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal membayar gaji.",
        );
        return;
      }
      setNotice(
        `${entryIds.length} gaji karyawan dibayarkan. Notifikasi sudah dikirim.`,
      );
      setSelectedEntries([]);
      await Promise.all([loadPeriods(), loadDetail(detail.period.id)]);
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRecap = async (entryId: string) => {
    if (recapOpenId === entryId) {
      setRecapOpenId(null);
      return;
    }
    setRecapOpenId(entryId);
    setRecapError(null);
    if (recaps[entryId]) return;
    setRecapLoadingId(entryId);
    try {
      const response = await fetch(
        `/api/admin/payroll/entries/${entryId}/attendance`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) {
        setRecapError(body?.error?.message ?? "Gagal memuat rincian absen.");
        return;
      }
      setRecaps((current) => ({ ...current, [entryId]: body.data }));
    } catch {
      setRecapError("Tidak dapat menghubungi server.");
    } finally {
      setRecapLoadingId(null);
    }
  };

  const toggleHidden = async (entry: Entry) => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/payroll/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !entry.isHidden }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Gagal mengubah visibilitas potongan.",
        );
        return;
      }
      setNotice(
        entry.isHidden
          ? "Detail potongan ditampilkan untuk karyawan."
          : "Detail potongan disembunyikan dari karyawan.",
      );
      await Promise.all([loadPeriods(), loadDetail(detail.period.id)]);
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const isDraft = detail?.period.status === "draft";
  const isFinalized = detail?.period.status === "finalized";
  const isPaid = detail?.period.status === "paid";

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Penggajian
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur gaji pokok karyawan, hitung periode dari absensi, lalu bayarkan
          satu per satu atau sekaligus per departemen/jabatan. Karyawan otomatis
          menerima notifikasi setelah gajinya dibayar.
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm"
        >
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

      <div
        role="tablist"
        aria-label="Bagian penggajian"
        className="mt-5 flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {(
          [
            { value: "setting", label: "Setting Gaji" },
            { value: "pay", label: "Bayar Gaji" },
            { value: "history", label: "Riwayat Pembayaran" },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === item.value
                ? "border-border-strong bg-primary-quiet text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "setting" && <SalarySettings />}
      {tab === "history" && <PaymentHistory />}

      {tab === "pay" && (
        <div className="space-y-5">
          <div
            role="tablist"
            aria-label="Mode pembayaran"
            className="flex w-fit rounded-md border border-border bg-card p-0.5"
          >
            {(["monthly", "daily"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={payMode === mode}
                onClick={() => setPayMode(mode)}
                className={`rounded-[5px] px-3 py-1.5 text-sm font-medium ${
                  payMode === mode
                    ? "bg-primary-quiet text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "monthly" ? "Per Bulan" : "Per Hari"}
              </button>
            ))}
          </div>
          {payMode === "daily" ? (
            <DailyPayroll />
          ) : (
            <>
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
                <Button
                  className="mt-4"
                  disabled={busy}
                  onClick={() => void generate()}
                >
                  {busy ? "Menghitung…" : "Hitung draft"}
                </Button>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Denda telat dihitung per menit, potongan alpha per hari, dan
                  potongan izin mengikuti pengaturan di tab Setting Gaji. Hitung
                  ulang draft akan mengatur ulang penyesuaian manual.
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
                              {period.employeeCount} karyawan ·{" "}
                              {rupiah.format(period.total)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                              {STATUS_LABELS[period.status] ?? period.status}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openPeriod(
                                  selectedId === period.id ? null : period.id,
                                )
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
                        Detail{" "}
                        {monthLabel(detail.period.year, detail.period.month)}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Total {rupiah.format(detail.meta.totals.total)} · hadir{" "}
                        {detail.meta.totals.presentDays} hari · terlambat{" "}
                        {detail.meta.totals.lateDays} · alpha{" "}
                        {detail.meta.totals.alphaDays} · lembur{" "}
                        {detail.meta.totals.overtimeMinutes} menit · dibayar{" "}
                        {paidCount}/{detail.entries.length}
                      </p>
                      {isPaid && detail.period.paidAt && (
                        <p className="mt-1 text-sm font-medium text-positive">
                          Gaji sudah dibayar pada{" "}
                          {new Date(detail.period.paidAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isDraft && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void changeStatus("finalized")}
                        >
                          Finalkan
                        </Button>
                      )}
                      {isFinalized && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy || unpaidEntries.length === 0}
                            onClick={() =>
                              void payEntries(
                                unpaidEntries.map((entry) => entry.id),
                                `Bayar semua gaji yang belum dibayar (${unpaidEntries.length} karyawan)?`,
                              )
                            }
                          >
                            Bayar semua ({unpaidEntries.length})
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void changeStatus("draft")}
                          >
                            Buka kembali
                          </Button>
                        </>
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

                  {isFinalized && (
                    <p className="mt-3 rounded-md border border-border-strong bg-primary-quiet px-3 py-2 text-sm text-foreground">
                      Periode sudah final. Bayar per karyawan, pilih beberapa
                      karyawan, atau gunakan filter departemen/jabatan lalu
                      bayar sekaligus.
                    </p>
                  )}

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
                          onChange={(event) =>
                            setAdjustment(event.target.value)
                          }
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm">
                        <span className="font-medium">Catatan penyesuaian</span>
                        <input
                          type="text"
                          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                          value={adjustmentNote}
                          onChange={(event) =>
                            setAdjustmentNote(event.target.value)
                          }
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
                      aria-label="Filter departemen"
                      value={entryDepartment}
                      onChange={(event) =>
                        setEntryDepartment(event.target.value)
                      }
                      className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
                    >
                      <option value="">Semua departemen</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter jabatan"
                      value={entryPosition}
                      onChange={(event) => setEntryPosition(event.target.value)}
                      className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
                    >
                      <option value="">Semua jabatan</option>
                      {positions.map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                    {isFinalized && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy || unpaidFiltered.length === 0}
                          onClick={toggleFilteredSelection}
                        >
                          {allFilteredSelected
                            ? "Kosongkan hasil filter"
                            : "Pilih semua hasil filter"}
                        </Button>
                        {selectedVisible.length > 0 && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void payEntries(
                                selectedVisible.map((entry) => entry.id),
                                `Bayar gaji ${selectedVisible.length} karyawan terpilih?`,
                              )
                            }
                          >
                            Bayar terpilih ({selectedVisible.length})
                          </Button>
                        )}
                      </>
                    )}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {filteredEntries.length} dari {detail.entries.length}{" "}
                      karyawan · {paidCount} dibayar
                    </span>
                  </div>

                  {filteredEntries.length === 0 ? (
                    <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada karyawan yang cocok dengan filter.
                    </p>
                  ) : (
                    <ul className="mt-4 grid gap-3">
                      {filteredEntries.map((entry) => {
                        const recap = recaps[entry.id];
                        return (
                          <li key={entry.id} className="rounded-lg border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                {isFinalized && !entry.paidAt && (
                                  <input
                                    type="checkbox"
                                    className="mt-1 size-4"
                                    aria-label={`Pilih ${entry.employeeName}`}
                                    checked={selectedEntries.includes(entry.id)}
                                    onChange={() =>
                                      toggleEntrySelection(entry.id)
                                    }
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium">
                                    {entry.employeeName}
                                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                      {entry.employeeNik}
                                    </span>
                                    {entry.paidAt && (
                                      <span className="ml-2 rounded-full bg-positive px-2 py-0.5 text-[10px] font-semibold text-white">
                                        Dibayar
                                      </span>
                                    )}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {entry.departmentName ?? "—"} ·{" "}
                                    {entry.positionName ?? "—"} ·{" "}
                                    {entry.salaryType === "daily"
                                      ? "Harian"
                                      : "Bulanan"}
                                  </p>
                                  {entry.paidAt && (
                                    <p className="mt-0.5 text-xs text-positive">
                                      Dibayar {formatDateTime(entry.paidAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <p className="font-mono text-sm font-medium">
                                  {rupiah.format(Number(entry.total))}
                                </p>
                                {isFinalized && !entry.paidAt && (
                                  <Button
                                    size="xs"
                                    disabled={busy}
                                    className="bg-positive text-white hover:bg-positive/90"
                                    onClick={() =>
                                      void payEntries(
                                        [entry.id],
                                        `Bayar gaji ${entry.employeeName}?`,
                                      )
                                    }
                                  >
                                    <Wallet aria-hidden="true" />
                                    Bayar
                                  </Button>
                                )}
                              </div>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                              <div className="flex justify-between gap-2">
                                <dt>Hadir</dt>
                                <dd className="font-mono">
                                  {entry.presentDays}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Terlambat</dt>
                                <dd className="font-mono">
                                  {entry.lateDays} hari · {entry.lateMinutes}{" "}
                                  mnt
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Alpha</dt>
                                <dd className="font-mono">{entry.alphaDays}</dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Izin (potong)</dt>
                                <dd className="font-mono">
                                  {entry.permissionDays}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Izin/cuti</dt>
                                <dd className="font-mono">
                                  {entry.excusedDays}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Lembur</dt>
                                <dd className="font-mono">
                                  {entry.overtimeMinutes} mnt
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Klaim makan</dt>
                                <dd className="font-mono">
                                  {entry.mealClaimCount}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Gaji pokok</dt>
                                <dd className="font-mono">
                                  {rupiah.format(Number(entry.baseAmount))}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Tunjangan</dt>
                                <dd className="font-mono">
                                  {rupiah.format(Number(entry.allowance))}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Gaji kotor</dt>
                                <dd className="font-mono">
                                  {rupiah.format(Number(entry.grossAmount))}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Potongan</dt>
                                <dd className="font-mono">
                                  {rupiah.format(
                                    Number(entry.lateDeduction) +
                                      Number(entry.alphaDeduction) +
                                      Number(entry.permissionDeduction),
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Denda telat</dt>
                                <dd className="font-mono">
                                  {rupiah.format(Number(entry.lateDeduction))}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Potongan alpha</dt>
                                <dd className="font-mono">
                                  {rupiah.format(Number(entry.alphaDeduction))}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>Potongan izin</dt>
                                <dd className="font-mono">
                                  {rupiah.format(
                                    Number(entry.permissionDeduction),
                                  )}
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
                                    {rupiah.format(
                                      Number(entry.otherAdjustment),
                                    )}
                                  </dd>
                                </div>
                              )}
                              <div className="flex justify-between gap-2 sm:col-span-2">
                                <dt>Gaji bersih</dt>
                                <dd className="font-mono font-semibold text-foreground">
                                  {rupiah.format(Number(entry.total))}
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void toggleRecap(entry.id)}
                              >
                                {recapOpenId === entry.id
                                  ? "Tutup rincian absen"
                                  : "Rincian absen"}
                              </Button>
                              <Button
                                variant={entry.isHidden ? "outline" : "ghost"}
                                size="sm"
                                disabled={busy}
                                onClick={() => void toggleHidden(entry)}
                              >
                                {entry.isHidden
                                  ? "Tampilkan potongan ke karyawan"
                                  : "Sembunyikan potongan dari karyawan"}
                              </Button>
                              {isDraft && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => openAdjustment(entry)}
                                >
                                  Sesuaikan
                                </Button>
                              )}
                            </div>
                            {recapOpenId === entry.id && (
                              <div className="mt-3 rounded-md border bg-muted/30 p-3">
                                {recapLoadingId === entry.id ? (
                                  <p className="text-sm text-muted-foreground">
                                    Memuat rincian absen…
                                  </p>
                                ) : recapError ? (
                                  <p
                                    role="alert"
                                    className="text-sm text-danger"
                                  >
                                    {recapError}
                                  </p>
                                ) : recap ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-6">
                                      <div className="flex justify-between gap-2">
                                        <span>Terjadwal</span>
                                        <span className="font-mono text-foreground">
                                          {recap.entry.scheduledDays}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span>Hadir</span>
                                        <span className="font-mono text-foreground">
                                          {recap.entry.presentDays}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span>Terlambat</span>
                                        <span className="font-mono text-foreground">
                                          {recap.entry.lateDays}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span>Alpha</span>
                                        <span className="font-mono text-foreground">
                                          {recap.entry.alphaDays}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span>Izin/cuti</span>
                                        <span className="font-mono text-foreground">
                                          {recap.entry.excusedDays}
                                        </span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span>Lembur</span>
                                        <span className="font-mono text-foreground">
                                          {recap.entry.overtimeMinutes} mnt
                                        </span>
                                      </div>
                                    </div>
                                    {recap.records.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">
                                        Belum ada catatan absensi pada periode
                                        ini.
                                      </p>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                          <thead>
                                            <tr className="text-muted-foreground">
                                              <th className="py-1 pr-3 font-medium">
                                                Tanggal
                                              </th>
                                              <th className="py-1 pr-3 font-medium">
                                                Shift
                                              </th>
                                              <th className="py-1 pr-3 font-medium">
                                                Masuk
                                              </th>
                                              <th className="py-1 pr-3 font-medium">
                                                Keluar
                                              </th>
                                              <th className="py-1 pr-3 font-medium">
                                                Status
                                              </th>
                                              <th className="py-1 font-medium">
                                                Catatan
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {recap.records.map((record) => (
                                              <tr
                                                key={record.id}
                                                className="border-t border-border"
                                              >
                                                <td className="py-1 pr-3 font-mono">
                                                  {formatDate(record.date, {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                  })}
                                                </td>
                                                <td className="py-1 pr-3">
                                                  {record.shiftName ?? "—"}
                                                  {record.startTime &&
                                                  record.endTime
                                                    ? ` (${record.startTime.slice(0, 5)}–${record.endTime.slice(0, 5)})`
                                                    : ""}
                                                </td>
                                                <td className="py-1 pr-3 font-mono">
                                                  {clock(record.checkInTime)}
                                                </td>
                                                <td className="py-1 pr-3 font-mono">
                                                  {clock(record.checkOutTime)}
                                                </td>
                                                <td className="py-1 pr-3">
                                                  {statusLabel(record.status)}
                                                </td>
                                                <td className="py-1">
                                                  {record.notes || "—"}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
