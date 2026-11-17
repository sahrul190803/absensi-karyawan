import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  FileText,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminRequestResponse, AdminRequestRow } from "@/lib/admin-types";
import { openAuthenticatedFile } from "@/lib/files";
import {
  formatDate,
  REQUEST_TYPE_LABELS,
  formatDateTime,
} from "@/lib/format";

const STATUS_TABS = [
  { value: "pending", label: "Menunggu" },
  { value: "", label: "Semua" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
] as const;

type Decision = {
  row: AdminRequestRow;
  status: "approved" | "rejected";
};

function dateRange(row: AdminRequestRow) {
  if (row.endDate && row.endDate !== row.startDate) {
    return `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`;
  }
  return formatDate(row.startDate);
}

export function AdminRequestsScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ["admin", "requests", status],
    queryFn: () =>
      apiFetch<AdminRequestResponse>(
        `/api/admin/requests?limit=50&offset=0${status ? `&status=${status}` : ""}`,
      ),
    retry: false,
  });

  const rows = requestsQuery.data?.data ?? [];

  function openDecision(row: AdminRequestRow, next: "approved" | "rejected") {
    setDecision({ row, status: next });
    setNote("");
    setNotice(null);
    setError(null);
  }

  async function submitDecision() {
    if (!decision) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/requests/${decision.row.id}`, {
        method: "PATCH",
        body: {
          status: decision.status,
          decisionNote: note.trim(),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "requests"] });
      setNotice(
        decision.status === "approved"
          ? `Pengajuan ${decision.row.employeeName} disetujui.`
          : `Pengajuan ${decision.row.employeeName} ditolak.`,
      );
      setDecision(null);
      setNote("");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Keputusan gagal disimpan.",
      );
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
      setError(
        caught instanceof Error ? caught.message : "Lampiran gagal dibuka.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Persetujuan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tinjau izin, sakit, cuti, dinas luar, lembur, dan tukar shift anggota
          tim.
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
            Tidak ada pengajuan pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.employeeEmail}
                  </p>
                </div>
                <StatusBadge status={row.status} kind="request" />
              </div>

              <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium">
                  {REQUEST_TYPE_LABELS[row.type] ?? row.type}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {dateRange(row)}
                  {row.startTime && row.endTime
                    ? ` · ${row.startTime.slice(0, 5)}–${row.endTime.slice(0, 5)}`
                    : ""}
                </p>
              </div>

              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">
                {row.reason}
              </p>

              {row.decisionNote && (
                <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  Catatan keputusan: {row.decisionNote}
                </p>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                Diajukan {formatDateTime(row.createdAt)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {row.attachmentUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void openAttachment(row.id)}
                  >
                    <FileText aria-hidden="true" />
                    Lampiran
                  </Button>
                )}
                {row.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => openDecision(row, "approved")}
                    >
                      <Check aria-hidden="true" />
                      Setujui
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDecision(row, "rejected")}
                    >
                      <X aria-hidden="true" />
                      Tolak
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {decision && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            decision.status === "approved"
              ? "Setujui pengajuan"
              : "Tolak pengajuan"
          }
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => {
            if (!busy) setDecision(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-card p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {decision.status === "approved"
                    ? "Setujui pengajuan"
                    : "Tolak pengajuan"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {decision.row.employeeName} ·{" "}
                  {REQUEST_TYPE_LABELS[decision.row.type] ?? decision.row.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDecision(null)}
                className="grid size-10 place-items-center rounded-md border text-muted-foreground"
                aria-label="Tutup"
                disabled={busy}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <label className="mt-4 grid gap-1.5 text-sm">
              <Label htmlFor="decision-note">
                Catatan {decision.status === "rejected" ? "(disarankan)" : "(opsional)"}
              </Label>
              <textarea
                id="decision-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-base"
                placeholder="Tambahkan catatan untuk karyawan"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-danger/40 px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={busy}
                onClick={() => setDecision(null)}
              >
                Batal
              </Button>
              <Button
                className="h-11 flex-1"
                variant={decision.status === "rejected" ? "destructive" : "default"}
                disabled={busy}
                onClick={() => void submitDecision()}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : decision.status === "approved" ? (
                  <Check aria-hidden="true" />
                ) : (
                  <X aria-hidden="true" />
                )}
                {busy
                  ? "Menyimpan…"
                  : decision.status === "approved"
                    ? "Setujui"
                    : "Tolak"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
