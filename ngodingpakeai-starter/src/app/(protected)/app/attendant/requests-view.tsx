"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, REQUEST_TYPE_LABELS } from "@/lib/format";

type RequestRow = {
  id: string;
  type: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  status: string;
  decisionNote: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

type LeaveBalance = {
  id: string;
  leaveTypeName: string;
  year: number;
  remaining: number;
};

const STATUS_TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

const TYPE_OPTIONS = [
  { value: "permission", label: "Izin" },
  { value: "sick", label: "Sakit" },
  { value: "leave", label: "Cuti" },
  { value: "business_trip", label: "Dinas Luar" },
  { value: "overtime", label: "Lembur" },
  { value: "shift_swap", label: "Tukar Shift" },
];

const ALL_TYPES = TYPE_OPTIONS.map((option) => option.value);

const dateRange = (row: RequestRow) => {
  const start = formatDate(row.startDate, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (!row.endDate || row.endDate === row.startDate) return start;
  return `${start} – ${formatDate(row.endDate, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
};

export function RequestsView({
  allowedTypes = ALL_TYPES,
  readOnly = false,
  embedded = false,
}: {
  allowedTypes?: string[];
  readOnly?: boolean;
  embedded?: boolean;
}) {
  const typeOptions = useMemo(
    () => TYPE_OPTIONS.filter((option) => allowedTypes.includes(option.value)),
    [allowedTypes],
  );
  const [items, setItems] = useState<RequestRow[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState(typeOptions[0]?.value ?? "permission");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [requestResponse, balanceResponse] = await Promise.all([
        fetch("/api/requests?limit=50", { cache: "no-store" }),
        fetch("/api/leave-balances", { cache: "no-store" }),
      ]);
      const body = await requestResponse.json();
      if (!requestResponse.ok) {
        setError(body?.error?.message ?? "Gagal memuat pengajuan.");
        return;
      }
      setItems(body.data);
      if (balanceResponse.ok) {
        const balanceBody = await balanceResponse.json();
        setBalances(balanceBody.data ?? []);
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

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          startDate,
          endDate: endDate || undefined,
          startTime: type === "overtime" ? startTime || undefined : undefined,
          endTime: type === "overtime" ? endTime || undefined : undefined,
          reason,
          attachment: attachment || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.details?.[0]?.message ??
            body?.error?.message ??
            "Pengajuan gagal dikirim.",
        );
        return;
      }
      setNotice("Pengajuan terkirim dan menunggu persetujuan.");
      setReason("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setAttachment(null);
      setAttachmentName("");
      setFormOpen(false);
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [attachment, endDate, endTime, load, reason, startDate, startTime, type]);

  const pickAttachment = useCallback((file: File | null) => {
    setError(null);
    if (!file) {
      setAttachment(null);
      setAttachmentName("");
      return;
    }
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      setError("Lampiran harus JPG, PNG, WEBP, atau PDF.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Ukuran lampiran maksimal 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(typeof reader.result === "string" ? reader.result : null);
      setAttachmentName(file.name);
    };
    reader.onerror = () => setError("Gagal membaca berkas lampiran.");
    reader.readAsDataURL(file);
  }, []);

  const cancel = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/requests/${id}`, {
          method: "PATCH",
        });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "Gagal membatalkan pengajuan.");
          return;
        }
        setNotice("Pengajuan dibatalkan.");
        await load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const filtered = useMemo(
    () => (status ? items.filter((item) => item.status === status) : items),
    [items, status],
  );

  return (
    <div className={embedded ? "space-y-5" : "mx-auto max-w-2xl space-y-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {embedded ? (
          <p className="text-sm text-muted-foreground">
            Jenis pengajuan:{" "}
            {typeOptions.map((option) => option.label).join(", ") || "—"}
          </p>
        ) : (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Request
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {typeOptions.map((option) => option.label).join(", ") ||
                "Pengajuan karyawan"}
            </p>
          </div>
        )}
        {!readOnly && (
          <Button
            variant={formOpen ? "outline" : "default"}
            size="sm"
            onClick={() => setFormOpen((open) => !open)}
          >
            {formOpen ? (
              <>
                <X aria-hidden="true" />
                Tutup
              </>
            ) : (
              <>
                <Plus aria-hidden="true" />
                Tambah pengajuan
              </>
            )}
          </Button>
        )}
      </div>

      {balances.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {balances.map((balance) => (
            <li
              key={balance.id}
              className="rounded-md border border-border bg-card px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground">
                {balance.leaveTypeName} {balance.year}
              </span>
              <span className="ml-2 font-mono font-semibold">
                sisa {balance.remaining}
              </span>
            </li>
          ))}
        </ul>
      )}

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

      {formOpen && !readOnly && (
        <section className="rounded-lg border border-border-strong bg-card p-5">
          <h2 className="font-semibold">Buat pengajuan</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Jenis</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {type === "shift_swap" && (
              <p className="rounded-md border border-border bg-primary-quiet px-3 py-2 text-xs leading-5">
                Isi tanggal shift yang ingin ditukar, lalu jelaskan di alasan:
                shift Anda, rekan pengganti, dan shift tujuannya. HOD akan
                mengonfirmasi lalu memperbarui jadwal.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">
                  {type === "shift_swap"
                    ? "Tanggal shift saya"
                    : "Tanggal mulai"}
                </span>
                <input
                  type="date"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">
                  {type === "shift_swap"
                    ? "Tanggal shift pengganti"
                    : "Tanggal selesai"}
                </span>
                <input
                  type="date"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>

            {type === "overtime" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Jam mulai</span>
                  <input
                    type="time"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Jam selesai</span>
                  <input
                    type="time"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                  />
                </label>
              </div>
            )}

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                {type === "shift_swap" ? "Detail tukar shift" : "Alasan"}
              </span>
              <textarea
                rows={3}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  type === "shift_swap"
                    ? "Contoh: Saya tukar shift Kamis 07:00 dengan Sari pada Jumat 13:00 karena urusan keluarga."
                    : "Jelaskan alasan pengajuan"
                }
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">
                Lampiran {type === "sick" ? "(surat dokter)" : "(opsional)"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm"
                onChange={(event) =>
                  pickAttachment(event.target.files?.[0] ?? null)
                }
              />
              {attachmentName && (
                <span className="text-xs text-muted-foreground">
                  Terlampir: {attachmentName}
                </span>
              )}
            </label>

            <Button
              disabled={
                busy ||
                !startDate ||
                reason.trim().length < 3 ||
                (type === "overtime" && (!startTime || !endTime))
              }
              onClick={() => void submit()}
            >
              {busy ? "Mengirim…" : "Kirim pengajuan"}
            </Button>
          </div>
        </section>
      )}

      <div
        role="tablist"
        aria-label="Status pengajuan"
        className="flex flex-wrap gap-2"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              status === tab.value
                ? "border-border-strong bg-primary-quiet text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <FileText
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada pengajuan pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {REQUEST_TYPE_LABELS[item.type] ?? item.type}
                </p>
                <StatusBadge status={item.status} kind="request" />
              </div>
              <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                {dateRange(item)}
                {item.startTime && item.endTime
                  ? ` · ${item.startTime.slice(0, 5)}–${item.endTime.slice(0, 5)}`
                  : ""}
              </p>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                {item.reason}
              </p>
              {item.attachmentUrl && (
                <a
                  className="mt-2 inline-block text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
                  href={`/api/requests/${item.id}/attachment`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lihat lampiran
                </a>
              )}
              {item.decisionNote && item.status !== "pending" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Catatan HOD/HRD: {item.decisionNote}
                </p>
              )}
              {item.status === "pending" && !readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={busy}
                  onClick={() => void cancel(item.id)}
                >
                  Batalkan
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
