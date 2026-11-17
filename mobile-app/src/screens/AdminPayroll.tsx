import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  LoaderCircle,
  Plus,
  RefreshCw,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  PayrollDailyResponse,
  PayrollDetailResponse,
  PayrollEntry,
  PayrollPaymentResponse,
  PayrollPeriod,
  PayrollPeriodResponse,
} from "@/lib/admin-types";
import { openAuthenticatedFile } from "@/lib/files";
import { formatDate, formatDateTime, todayIso } from "@/lib/format";

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  finalized: "Final",
  paid: "Dibayar",
  present: "Hadir",
  late: "Terlambat",
  alpha: "Alpha",
  permission: "Izin",
  early_leave: "Pulang cepat",
  holiday_work: "Hari libur",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "border border-border-strong text-foreground",
  finalized: "bg-primary-quiet text-primary-text border border-border-strong",
  paid: "bg-positive text-white",
  present: "bg-positive text-white",
  late: "bg-warning text-white",
  alpha: "bg-danger text-white",
  permission: "bg-muted text-muted-foreground border border-border-strong",
};

const rupiah = (value: string | number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const periodLabel = (year: number, month: number) =>
  `${MONTHS[month - 1] ?? month} ${year}`;

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
        STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function messageOf(caught: unknown, fallback: string) {
  return caught instanceof ApiError
    ? caught.message
    : caught instanceof Error
      ? caught.message
      : fallback;
}

export function AdminPayrollScreen() {
  const [tab, setTab] = useState<"periods" | "daily" | "history">("periods");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <PayrollDetail
        periodId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Penggajian</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hitung periode gaji, sesuaikan komponen, catat pembayaran, dan unduh
          rekap.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-lg border bg-card p-1.5">
        {[
          { value: "periods", label: "Periode" },
          { value: "daily", label: "Harian" },
          { value: "history", label: "Riwayat" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value as typeof tab)}
            className={`min-h-10 rounded-md px-2 text-sm font-medium ${
              tab === item.value
                ? "bg-primary-quiet text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "periods" ? (
        <PayrollPeriods onOpen={setSelectedId} />
      ) : tab === "daily" ? (
        <PayrollDaily />
      ) : (
        <PayrollHistory />
      )}
    </div>
  );
}

function PayrollPeriods({ onOpen }: { onOpen: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [genYear, setGenYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [genMonth, setGenMonth] = useState(() =>
    String(new Date().getMonth() + 1),
  );
  const [genNote, setGenNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const periodsQuery = useQuery({
    queryKey: ["admin", "payroll", "periods"],
    queryFn: () =>
      apiFetch<PayrollPeriodResponse>(
        "/api/admin/payroll/periods?limit=24&offset=0",
      ),
    retry: false,
  });

  const rows = periodsQuery.data?.data ?? [];

  async function generate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiFetch<PayrollDetailResponse>(
        "/api/admin/payroll/periods",
        {
          method: "POST",
          body: {
            year: Number(genYear),
            month: Number(genMonth),
            note: genNote.trim(),
          },
        },
      );
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "periods"],
      });
      setNotice(
        `Periode ${periodLabel(Number(genYear), Number(genMonth))} berhasil dihitung.`,
      );
      setGenNote("");
      onOpen(result.data.period.id);
    } catch (caught) {
      setError(messageOf(caught, "Periode gagal dihitung."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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

      <section className="rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="size-4" aria-hidden="true" />
          Hitung periode baru
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Perhitungan memakai jadwal, absensi, pengajuan, dan klaim makan pada
          bulan tersebut.
        </p>
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="payroll-year">Tahun</Label>
              <input
                id="payroll-year"
                type="number"
                min={2000}
                max={2100}
                value={genYear}
                onChange={(event) => setGenYear(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="payroll-month">Bulan</Label>
              <select
                id="payroll-month"
                value={genMonth}
                onChange={(event) => setGenMonth(event.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={String(index + 1)}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm">
            <Label htmlFor="payroll-note">Catatan (opsional)</Label>
            <input
              id="payroll-note"
              value={genNote}
              maxLength={500}
              onChange={(event) => setGenNote(event.target.value)}
              placeholder="Contoh: perhitungan awal"
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
            />
          </label>
          <Button className="h-11 w-full" disabled={busy} onClick={() => void generate()}>
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {busy ? "Menghitung…" : "Hitung periode"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Periode tersimpan
        </h2>
        {periodsQuery.isLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Memuat periode…
          </p>
        ) : periodsQuery.error ? (
          <p role="alert" className="mt-3 rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
            {periodsQuery.error.message}
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
            <Wallet className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              Belum ada periode penggajian.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row: PayrollPeriod) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onOpen(row.id)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {periodLabel(row.year, row.month)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.employeeCount} karyawan · {rupiah(row.total)}
                      </p>
                    </div>
                    <StatusPill status={row.status} />
                  </div>
                  {row.note && (
                    <p className="mt-2 text-xs text-muted-foreground">{row.note}</p>
                  )}
                  <p className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Dibuat {formatDateTime(row.createdAt)}</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function PayrollDetail({
  periodId,
  onBack,
}: {
  periodId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayrollEntry | null>(null);
  const [adjustment, setAdjustment] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "payroll", "period", periodId],
    queryFn: () =>
      apiFetch<PayrollDetailResponse>(
        `/api/admin/payroll/periods/${periodId}`,
      ),
    retry: false,
  });

  const detail = detailQuery.data?.data;
  const entries = useMemo(() => detail?.entries ?? [], [detail]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) =>
      [entry.employeeName, entry.employeeNik, entry.departmentName, entry.positionName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [entries, search]);
  const unpaid = entries.filter((entry) => !entry.paidAt && !entry.isHidden);

  async function updateStatus(status: "draft" | "finalized") {
    const text =
      status === "finalized"
        ? "Finalkan periode ini? Setelah final, komponen gaji tidak bisa diubah sampai dibuka kembali."
        : "Buka kembali periode ini menjadi draft?";
    if (!window.confirm(text)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/payroll/periods/${periodId}`, {
        method: "PATCH",
        body: { status },
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "period"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "periods"],
      });
      setNotice(
        status === "finalized" ? "Periode difinalkan." : "Periode dibuka kembali.",
      );
    } catch (caught) {
      setError(messageOf(caught, "Status periode gagal diubah."));
    } finally {
      setBusy(false);
    }
  }

  async function payAll() {
    if (!detail || unpaid.length === 0) return;
    const total = unpaid.reduce((sum, entry) => sum + Number(entry.total), 0);
    if (
      !window.confirm(
        `Catat pembayaran untuk ${unpaid.length} karyawan dengan total ${rupiah(total)}? Tindakan ini membuat slip dan notifikasi gaji.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/payroll/periods/${periodId}/pay`, {
        method: "POST",
        body: { entryIds: unpaid.map((entry) => entry.id) },
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "period"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "periods"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "payments"],
      });
      setNotice("Pembayaran gaji tercatat.");
    } catch (caught) {
      setError(messageOf(caught, "Pembayaran gagal dicatat."));
    } finally {
      setBusy(false);
    }
  }

  async function exportPeriod(format: "csv" | "xls" | "pdf") {
    if (!detail) return;
    setExporting(format);
    setError(null);
    try {
      await openAuthenticatedFile(
        `/api/admin/payroll/periods/${periodId}/export?format=${format}`,
        `penggajian-${detail.period.year}-${String(detail.period.month).padStart(2, "0")}.${format}`,
      );
    } catch (caught) {
      setError(messageOf(caught, "Export gagal dibuat."));
    } finally {
      setExporting(null);
    }
  }

  function openAdjust(entry: PayrollEntry) {
    setEditing(entry);
    setAdjustment(String(Number(entry.otherAdjustment)));
    setAdjustmentNote(entry.adjustmentNote ?? "");
    setHidden(entry.isHidden);
    setNotice(null);
    setError(null);
  }

  async function saveAdjustment() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/payroll/entries/${editing.id}`, {
        method: "PATCH",
        body:
          detail?.period.status === "draft"
            ? {
                otherAdjustment: Number(adjustment || "0"),
                adjustmentNote: adjustmentNote.trim(),
                isHidden: hidden,
              }
            : { isHidden: hidden },
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "period"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "periods"],
      });
      setEditing(null);
      setNotice("Penyesuaian gaji disimpan.");
    } catch (caught) {
      setError(messageOf(caught, "Penyesuaian gagal disimpan."));
    } finally {
      setBusy(false);
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-5">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Kembali
        </Button>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat detail periode…
        </p>
      </div>
    );
  }

  if (detailQuery.error || !detail) {
    return (
      <div className="space-y-5">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Kembali
        </Button>
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {detailQuery.error?.message ?? "Periode tidak ditemukan."}
        </p>
      </div>
    );
  }

  const period = detail.period;
  const totals = detail.meta.totals;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Kembali
        </Button>
        <StatusPill status={period.status} />
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {periodLabel(period.year, period.month)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entries.length} karyawan · total {rupiah(totals.total)}
        </p>
        {period.note && (
          <p className="mt-1 text-xs text-muted-foreground">{period.note}</p>
        )}
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

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total gaji", value: rupiah(totals.total) },
          { label: "Hadir", value: `${totals.presentDays} hari` },
          { label: "Terlambat", value: `${totals.lateDays} hari` },
          { label: "Alpha", value: `${totals.alphaDays} hari` },
          { label: "Lembur", value: `${totals.overtimeMinutes} menit` },
          { label: "Klaim makan", value: String(totals.mealClaimCount) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={exporting !== null}
          onClick={() => void exportPeriod("csv")}
        >
          {exporting === "csv" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting !== null}
          onClick={() => void exportPeriod("xls")}
        >
          {exporting === "xls" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <FileSpreadsheet aria-hidden="true" />
          )}
          Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting !== null}
          onClick={() => void exportPeriod("pdf")}
        >
          {exporting === "pdf" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <FileText aria-hidden="true" />
          )}
          PDF
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {period.status === "draft" && (
          <Button
            className="h-11 flex-1"
            disabled={busy}
            onClick={() => void updateStatus("finalized")}
          >
            <CheckCircle2 aria-hidden="true" />
            Finalkan periode
          </Button>
        )}
        {period.status === "finalized" && (
          <>
            <Button
              className="h-11 flex-1"
              disabled={busy || unpaid.length === 0}
              onClick={() => void payAll()}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Banknote aria-hidden="true" />
              )}
              {busy ? "Memproses…" : `Bayar ${unpaid.length} karyawan`}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={busy}
              onClick={() => void updateStatus("draft")}
            >
              Buka kembali
            </Button>
          </>
        )}
        {period.status === "paid" && (
          <p className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-positive">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Periode sudah dibayar
            {period.paidAt ? ` pada ${formatDateTime(period.paidAt)}` : ""}.
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 rounded-lg border bg-card px-3">
        <Users className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Cari karyawan</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama atau NIK"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </label>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Rincian karyawan
        </h2>
        {filtered.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Tidak ada karyawan yang cocok.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {filtered.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => openAdjust(entry)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.employeeName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.employeeNik}
                        {entry.departmentName ? ` · ${entry.departmentName}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">{rupiah(entry.total)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Hadir {entry.presentDays}</span>
                    <span>Telat {entry.lateDays}</span>
                    <span>Alpha {entry.alphaDays}</span>
                    <span>Lembur {entry.overtimeMinutes}m</span>
                    {entry.paidAt ? (
                      <span className="font-semibold text-positive">Sudah dibayar</span>
                    ) : (
                      <span>Belum dibayar</span>
                    )}
                    {entry.isHidden && (
                      <span className="font-semibold text-warning">Disembunyikan</span>
                    )}
                  </div>
                  {entry.adjustmentNote && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Catatan: {entry.adjustmentNote}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Penyesuaian gaji ${editing.employeeName}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => {
            if (!busy) setEditing(null);
          }}
        >
          <div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{editing.employeeName}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {editing.employeeNik} · {rupiah(editing.total)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid size-10 place-items-center rounded-md border text-muted-foreground"
                aria-label="Tutup penyesuaian"
                disabled={busy}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="mt-4 grid gap-1.5 text-sm">
              {[
                ["Gaji pokok", editing.baseSalary],
                ["Tunjangan", editing.allowance],
                ["Gaji kotor", editing.grossAmount],
                ["Potongan telat", editing.lateDeduction],
                ["Potongan alpha", editing.alphaDeduction],
                ["Potongan izin", editing.permissionDeduction],
                ["Upah lembur", editing.overtimeAmount],
                ["Penyesuaian", editing.otherAdjustment],
                ["Total", editing.total],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right">{rupiah(value as string)}</dd>
                </div>
              ))}
            </dl>

            {period.status === "draft" ? (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1.5 text-sm">
                  <Label htmlFor="payroll-adjustment">
                    Penyesuaian tambahan (boleh minus)
                  </Label>
                  <input
                    id="payroll-adjustment"
                    inputMode="decimal"
                    value={adjustment}
                    onChange={(event) => setAdjustment(event.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <Label htmlFor="payroll-adjustment-note">Catatan</Label>
                  <input
                    id="payroll-adjustment-note"
                    value={adjustmentNote}
                    maxLength={500}
                    onChange={(event) => setAdjustmentNote(event.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                  />
                </label>
              </div>
            ) : (
              <p className="mt-3 rounded-md border bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
                Periode sudah final. Hanya status sembunyikan yang bisa diubah.
              </p>
            )}

            <label className="mt-3 flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(event) => setHidden(event.target.checked)}
                className="size-4"
              />
              Sembunyikan dari rekap/slip
            </label>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Batal
              </Button>
              <Button
                className="h-11 flex-1"
                disabled={busy}
                onClick={() => void saveAdjustment()}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 aria-hidden="true" />
                )}
                {busy ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayrollDaily() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => todayIso());
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<"transfer" | "cash">("transfer");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dailyQuery = useQuery({
    queryKey: ["admin", "payroll", "daily", date],
    queryFn: () =>
      apiFetch<PayrollDailyResponse>(
        `/api/admin/payroll/daily?date=${date}`,
      ),
    retry: false,
  });

  const data = dailyQuery.data?.data;
  const rows = data?.rows ?? [];
  const unpaid = rows.filter((row) => !row.isPaid);
  const selectedRows = rows.filter((row) =>
    selected.includes(row.employeeId),
  );
  const selectedTotal = selectedRows.reduce(
    (sum, row) => sum + Number(row.netAmount),
    0,
  );

  function toggle(employeeId: string) {
    setSelected((current) =>
      current.includes(employeeId)
        ? current.filter((value) => value !== employeeId)
        : [...current, employeeId],
    );
  }

  async function paySelected() {
    if (selected.length === 0) return;
    if (
      !window.confirm(
        `Catat pembayaran harian untuk ${selected.length} karyawan dengan total ${rupiah(selectedTotal)}?`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiFetch<{ data: { paid: number } }>(
        "/api/admin/payroll/daily/pay",
        {
          method: "POST",
          body: { date, employeeIds: selected, method },
        },
      );
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "daily"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "payroll", "payments"],
      });
      setSelected([]);
      setNotice(`${result.data.paid} pembayaran harian dicatat.`);
    } catch (caught) {
      setError(messageOf(caught, "Pembayaran harian gagal dicatat."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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

      <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium">Tanggal</span>
        <input
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setSelected([]);
          }}
          className="ml-auto h-10 rounded-md border border-border bg-transparent px-3 text-base"
        />
      </label>

      {dailyQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat gaji harian…
        </p>
      ) : dailyQuery.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {dailyQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <Banknote className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            Tidak ada karyawan terjadwal pada tanggal ini.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-3 text-xs leading-5 text-muted-foreground">
            Potongan telat {rupiah(data?.rates.lateRate ?? 0)}/menit · alpha{" "}
            {rupiah(data?.rates.alphaRate ?? 0)}/hari · izin{" "}
            {Math.round((data?.rates.permissionPercent ?? 0) * 100)}% dari upah
            harian.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(unpaid.map((row) => row.employeeId))}
            >
              Pilih semua belum bayar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
            >
              Kosongkan
            </Button>
          </div>

          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.employeeId} className="rounded-lg border bg-card p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.employeeId)}
                    disabled={row.isPaid}
                    onChange={() => toggle(row.employeeId)}
                    className="mt-1 size-4"
                    aria-label={`Pilih ${row.employeeName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{row.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.employeeNik}
                          {row.departmentName ? ` · ${row.departmentName}` : ""}
                        </p>
                      </div>
                      <StatusPill status={row.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Kotor {rupiah(row.baseAmount)} · potongan{" "}
                        {rupiah(row.totalDeduction)}
                      </p>
                      <p className="font-semibold">{rupiah(row.netAmount)}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.isPaid ? "Sudah dibayar harian" : "Belum dibayar"}
                      {row.lateMinutes > 0
                        ? ` · telat ${row.lateMinutes} menit`
                        : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <section className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                {selected.length} dipilih · {rupiah(selectedTotal)}
              </p>
              <select
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as "transfer" | "cash")
                }
                className="h-10 rounded-md border border-border bg-card px-2 text-sm"
              >
                <option value="transfer">Transfer</option>
                <option value="cash">Tunai</option>
              </select>
            </div>
            <Button
              className="mt-3 h-11 w-full"
              disabled={busy || selected.length === 0}
              onClick={() => void paySelected()}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Banknote aria-hidden="true" />
              )}
              {busy ? "Memproses…" : "Catat pembayaran harian"}
            </Button>
          </section>
        </>
      )}
    </>
  );
}

function PayrollHistory() {
  const [month, setMonth] = useState(() =>
    String(new Date().getMonth() + 1),
  );
  const [year, setYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams({ limit: "50", offset: "0" });
  if (month) params.set("month", month);
  if (year) params.set("year", year);

  const paymentsQuery = useQuery({
    queryKey: ["admin", "payroll", "payments", month, year],
    queryFn: () =>
      apiFetch<PayrollPaymentResponse>(
        `/api/admin/payroll/payments?${params.toString()}`,
      ),
    retry: false,
  });

  const rows = paymentsQuery.data?.data ?? [];

  async function exportPayments(format: "csv" | "xls" | "pdf") {
    setExporting(format);
    setError(null);
    try {
      const query = new URLSearchParams(params);
      query.set("format", format);
      await openAuthenticatedFile(
        `/api/admin/payroll/payments/export?${query.toString()}`,
        `riwayat-pembayaran.${format}`,
      );
    } catch (caught) {
      setError(messageOf(caught, "Export gagal dibuat."));
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <div className="grid gap-2">
        <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <History className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">Bulan</span>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="ml-auto h-10 rounded-md border border-border bg-transparent px-2 text-base"
          >
            <option value="">Semua bulan</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={String(index + 1)}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">Tahun</span>
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="ml-auto h-10 w-28 rounded-md border border-border bg-transparent px-2 text-base"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={exporting !== null}
          onClick={() => void exportPayments("csv")}
        >
          {exporting === "csv" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting !== null}
          onClick={() => void exportPayments("xls")}
        >
          {exporting === "xls" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <FileSpreadsheet aria-hidden="true" />
          )}
          Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={exporting !== null}
          onClick={() => void exportPayments("pdf")}
        >
          {exporting === "pdf" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <FileText aria-hidden="true" />
          )}
          PDF
        </Button>
      </div>

      {paymentsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat riwayat pembayaran…
        </p>
      ) : paymentsQuery.error ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger">
          {paymentsQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <History className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada pembayaran pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.employeeName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.employeeNik}
                    {row.departmentName ? ` · ${row.departmentName}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">{rupiah(row.netAmount)}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.periodLabel} · {formatDate(row.paymentDate.slice(0, 10))} ·{" "}
                {row.method === "cash" ? "Tunai" : "Transfer"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
