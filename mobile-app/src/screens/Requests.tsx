import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Inbox,
  LoaderCircle,
  Paperclip,
  Plus,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch, ApiError } from "@/lib/api";
import { openAuthenticatedFile } from "@/lib/files";
import {
  REQUEST_TYPE_LABELS,
  formatDate,
  todayIso,
} from "@/lib/format";

type RequestRow = {
  id: string;
  type: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  attachmentUrl: string | null;
  status: string;
  decisionNote: string | null;
  createdAt: string;
};

type RequestsResponse = {
  data: RequestRow[];
  meta: { limit: number; offset: number; hasMore: boolean };
};

const EMPLOYEE_TYPES = ["permission", "sick", "leave", "shift_swap"] as const;

const STATUS_TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
] as const;

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Gagal membaca lampiran."));
    reader.readAsDataURL(file);
  });
}

function dateRange(row: RequestRow) {
  if (row.endDate && row.endDate !== row.startDate) {
    return `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`;
  }
  return formatDate(row.startDate);
}

export function RequestsScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<(typeof EMPLOYEE_TYPES)[number]>("permission");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ["requests", status],
    queryFn: () =>
      apiFetch<RequestsResponse>(
        `/api/requests?limit=50&offset=0${status ? `&status=${status}` : ""}`,
      ),
    retry: false,
  });

  const rows = requestsQuery.data?.data ?? [];

  async function pickAttachment(file: File | null) {
    setError(null);
    if (!file) {
      setAttachmentData(null);
      setAttachmentName("");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("Ukuran lampiran maksimal 3 MB.");
      return;
    }
    try {
      setAttachmentData(await readAsDataUrl(file));
      setAttachmentName(file.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membaca lampiran.");
    }
  }

  async function submit() {
    if (!startDate || reason.trim().length < 3) {
      setError("Lengkapi tanggal dan alasan pengajuan (minimal 3 karakter).");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/requests", {
        method: "POST",
        body: {
          type,
          startDate,
          ...(endDate ? { endDate } : {}),
          reason: reason.trim(),
          ...(attachmentData ? { attachment: attachmentData } : {}),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      setFormOpen(false);
      setReason("");
      setEndDate("");
      setAttachmentData(null);
      setAttachmentName("");
      setNotice("Pengajuan berhasil dikirim dan menunggu persetujuan.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Pengajuan gagal dikirim.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!window.confirm("Batalkan pengajuan ini?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${id}`, { method: "PATCH" });
      await queryClient.invalidateQueries({ queryKey: ["requests"] });
      setNotice("Pengajuan dibatalkan.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membatalkan.");
    } finally {
      setBusy(false);
    }
  }

  async function openAttachment(id: string) {
    setError(null);
    try {
      await openAuthenticatedFile(
        `/api/requests/${id}/attachment`,
        `lampiran-pengajuan-${id}`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lampiran gagal dibuka.");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Izin &amp; Cuti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajukan izin, sakit, cuti, atau tukar shift, lalu pantau statusnya.
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

      {!formOpen ? (
        <Button className="h-11 w-full" onClick={() => setFormOpen(true)}>
          <Plus aria-hidden="true" />
          Buat pengajuan baru
        </Button>
      ) : (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pengajuan baru</h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="grid size-10 place-items-center rounded-md border text-muted-foreground"
              aria-label="Tutup form"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="request-type">Jenis pengajuan</Label>
              <select
                id="request-type"
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as (typeof EMPLOYEE_TYPES)[number])
                }
              >
                {EMPLOYEE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {REQUEST_TYPE_LABELS[value] ?? value}
                  </option>
                ))}
              </select>
            </label>

            {type === "shift_swap" && (
              <p className="rounded-md border border-border bg-primary-quiet px-3 py-2 text-xs leading-5">
                Isi tanggal shift yang ingin ditukar, lalu jelaskan shift Anda,
                rekan pengganti, dan shift tujuannya di alasan.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="start-date">
                  {type === "shift_swap" ? "Tanggal shift saya" : "Tanggal mulai"}
                </Label>
                <input
                  id="start-date"
                  type="date"
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <Label htmlFor="end-date">
                  {type === "shift_swap"
                    ? "Tanggal shift pengganti"
                    : "Tanggal selesai"}
                </Label>
                <input
                  id="end-date"
                  type="date"
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-base"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="reason">
                {type === "shift_swap" ? "Detail tukar shift" : "Alasan"}
              </Label>
              <textarea
                id="reason"
                rows={4}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-base"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Jelaskan alasan pengajuan"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <Label htmlFor="attachment">
                Lampiran {type === "sick" ? "(surat dokter)" : "(opsional)"}
              </Label>
              <input
                id="attachment"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-sm"
                onChange={(event) =>
                  void pickAttachment(event.target.files?.[0] ?? null)
                }
              />
              {attachmentName && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="size-3.5" aria-hidden="true" />
                  {attachmentName}
                </span>
              )}
            </label>

            <Button
              className="h-11 w-full"
              disabled={busy || reason.trim().length < 3}
              onClick={() => void submit()}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {busy ? "Mengirim…" : "Kirim pengajuan"}
            </Button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => setStatus(tab.value)}
            className={`min-h-10 rounded-md border px-3 text-sm font-medium transition-colors ${
              status === tab.value
                ? "border-border-strong bg-primary-quiet text-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {requestsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat pengajuan…
        </p>
      ) : requestsQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {requestsQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <Inbox
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada pengajuan pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {REQUEST_TYPE_LABELS[row.type] ?? row.type}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {dateRange(row)}
                    {row.startTime && row.endTime
                      ? ` · ${row.startTime.slice(0, 5)}–${row.endTime.slice(0, 5)}`
                      : ""}
                  </p>
                </div>
                <StatusBadge status={row.status} kind="request" />
              </div>

              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                {row.reason}
              </p>

              {row.decisionNote && row.status !== "pending" && (
                <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  Catatan HOD/HRD: {row.decisionNote}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {row.attachmentUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void openAttachment(row.id)}
                  >
                    <FileText aria-hidden="true" />
                    Lihat lampiran
                  </Button>
                )}
                {row.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void cancel(row.id)}
                  >
                    Batalkan
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
