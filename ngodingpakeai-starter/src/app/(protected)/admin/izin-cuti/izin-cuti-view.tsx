"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Check,
  Inbox,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  formatDate,
  formatDateTime,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
} from "@/lib/format";

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
  approvedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  employeeName: string | null;
  employeeEmail: string | null;
};

const TYPE_TABS = [
  { value: "", label: "Semua" },
  { value: "leave", label: "Cuti" },
  { value: "sick", label: "Sakit" },
  { value: "permission", label: "Izin" },
  { value: "business_trip", label: "Dinas Luar" },
  { value: "overtime", label: "Lembur" },
  { value: "shift_swap", label: "Tukar Shift" },
];

const ALL_TYPES = TYPE_TABS.map((tab) => tab.value).filter(Boolean);

const STATUS_OPTIONS = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "", label: "Semua status" },
];

const durationDays = (row: RequestRow) => {
  const start = Date.parse(`${row.startDate}T00:00:00Z`);
  const end = Date.parse(`${row.endDate ?? row.startDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};

const periodLabel = (row: RequestRow) => {
  const start = formatDate(row.startDate, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (!row.endDate || row.endDate === row.startDate) return start;
  const end = formatDate(row.endDate, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${start} – ${end}`;
};

export function IzinCutiView({
  readOnly = false,
  allowedTypes = ALL_TYPES,
}: {
  readOnly?: boolean;
  allowedTypes?: string[];
}) {
  const typeTabs = useMemo(
    () => TYPE_TABS.filter((tab) => !tab.value || allowedTypes.includes(tab.value)),
    [allowedTypes],
  );
  const [items, setItems] = useState<RequestRow[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState(readOnly ? "" : "pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string, nextType: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (nextStatus) params.set("status", nextStatus);
      if (nextType) params.set("type", nextType);
      const response = await fetch(`/api/admin/requests?${params}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat pengajuan.");
        return;
      }
      setItems(body.data);
      setError(null);
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void load(readOnly ? "" : "pending", ""),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [load, readOnly]);

  const decide = useCallback(
    async (id: string, decision: "approved" | "rejected") => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: decision,
            decisionNote: decisionNote.trim(),
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "Keputusan gagal disimpan.");
          return;
        }
        setNotice(
          decision === "approved"
            ? "Pengajuan disetujui. Karyawan sudah diberi notifikasi."
            : "Pengajuan ditolak. Karyawan sudah diberi notifikasi.",
        );
        setSelected(null);
        setDecisionNote("");
        await load(status, type);
      } catch {
        setError("Tidak dapat menghubungi server.");
      } finally {
        setBusy(false);
      }
    },
    [decisionNote, load, status, type],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        (item.employeeName ?? "").toLowerCase().includes(query) ||
        (item.employeeEmail ?? "").toLowerCase().includes(query),
    );
  }, [items, search]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load(status, type)}
        >
          <RefreshCw aria-hidden="true" />
          Muat ulang
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Jenis pengajuan"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {typeTabs.map((tab) => {
          const active = type === tab.value;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setType(tab.value);
                void load(status, tab.value);
              }}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-border-strong bg-primary-quiet text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Cari nama karyawan</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama karyawan…"
            className="h-9 w-56 rounded-md border border-border bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Status
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              void load(event.target.value, type);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} pengajuan
        </span>
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
            Memuat pengajuan…
          </p>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Inbox
              className="mx-auto size-7 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Belum ada pengajuan pada filter ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="w-12 px-5 py-3">
                    No
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Nama Karyawan
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Tgl Pengajuan
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Jenis
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Periode
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Durasi
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border last:border-0 ${
                      item.status === "pending" ? "bg-primary-quiet/60" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium">
                        {item.employeeName ?? "Karyawan"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.employeeEmail}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {formatDate(item.createdAt.slice(0, 10), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      {REQUEST_TYPE_LABELS[item.type] ?? item.type}
                    </td>
                    <td className="px-5 py-3 text-xs">{periodLabel(item)}</td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {durationDays(item)} hari
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} kind="request" />
                    </td>
                    <td className="px-5 py-3">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setSelected(item);
                          setDecisionNote(item.decisionNote ?? "");
                        }}
                      >
                        Tinjau
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail pengajuan ${selected.employeeName ?? "karyawan"}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {REQUEST_TYPE_LABELS[selected.type] ?? selected.type}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selected.employeeName ?? "Karyawan"} ·{" "}
                  {selected.employeeEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="grid size-8 flex-none place-items-center rounded-md border border-border text-muted-foreground"
                aria-label="Tutup detail"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Periode</dt>
              <dd className="font-medium">{periodLabel(selected)}</dd>
              <dt className="text-muted-foreground">Durasi</dt>
              <dd className="font-mono text-xs">
                {durationDays(selected)} hari
                {selected.startTime && selected.endTime
                  ? ` · ${selected.startTime.slice(0, 5)}–${selected.endTime.slice(0, 5)}`
                  : ""}
              </dd>
              <dt className="text-muted-foreground">Diajukan</dt>
              <dd className="font-mono text-xs">
                {formatDateTime(selected.createdAt)}
              </dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={selected.status} kind="request" />
              </dd>
              {selected.decidedAt && (
                <>
                  <dt className="text-muted-foreground">Diputuskan</dt>
                  <dd className="font-mono text-xs">
                    {formatDateTime(selected.decidedAt)}
                  </dd>
                </>
              )}
            </dl>

            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Alasan
              </p>
              <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">
                {selected.reason}
              </p>
            </div>

            {selected.attachmentUrl && (
              <a
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text underline-offset-4 hover:underline"
                href={`/api/requests/${selected.id}/attachment`}
                target="_blank"
                rel="noreferrer"
              >
                <CalendarRange className="size-4" aria-hidden="true" />
                Lihat lampiran
              </a>
            )}

            {selected.decisionNote && selected.status !== "pending" && (
              <p className="mt-3 text-sm text-muted-foreground">
                Catatan keputusan: {selected.decisionNote}
              </p>
            )}

            {selected.status === "pending" && !readOnly && (
              <div className="mt-5 border-t border-border pt-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">
                    Catatan keputusan (opsional)
                  </span>
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                    placeholder="Contoh: disetujui, koordinasi dengan shift pengganti"
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void decide(selected.id, "approved")}
                  >
                    <Check aria-hidden="true" />
                    {busy ? "Menyimpan…" : "Setujui"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void decide(selected.id, "rejected")}
                  >
                    <X aria-hidden="true" />
                    Tolak
                  </Button>
                </div>
              </div>
            )}

            {selected.status !== "pending" && (
              <p className="mt-4 text-xs text-muted-foreground">
                Status:{" "}
                {REQUEST_STATUS_LABELS[selected.status] ?? selected.status}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
