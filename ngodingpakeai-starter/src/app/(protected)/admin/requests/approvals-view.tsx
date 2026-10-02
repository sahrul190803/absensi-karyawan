"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type RequestRow = {
  id: string;
  type: string;
  startDate: string;
  endDate: string | null;
  reason: string;
  status: string;
  decisionNote: string | null;
  employeeName: string | null;
  employeeEmail: string | null;
};

const typeLabels: Record<string, string> = {
  permission: "Izin",
  sick: "Sakit",
  leave: "Cuti",
  business_trip: "Dinas luar",
  overtime: "Lembur",
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const filters = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
  { value: "", label: "Semua" },
];

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function ApprovalsView() {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string) => {
    setLoading(true);
    try {
      const query = nextStatus ? `&status=${nextStatus}` : "";
      const response = await fetch(`/api/admin/requests?limit=100${query}`, {
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
    const timer = window.setTimeout(() => void load("pending"), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const decide = useCallback(
    async (id: string, decision: "approved" | "rejected") => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: decision }),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "Keputusan gagal disimpan.");
          return;
        }
        setNotice(
          decision === "approved"
            ? "Pengajuan disetujui."
            : "Pengajuan ditolak.",
        );
        await load(status);
      } finally {
        setBusy(false);
      }
    },
    [load, status],
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Persetujuan pengajuan
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tinjau izin, sakit, cuti, dinas luar, dan lembur karyawan.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value || "all"}
            variant={status === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatus(filter.value);
              void load(filter.value);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-xl border bg-card px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Tidak ada pengajuan pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {item.employeeName ?? "Karyawan"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {item.employeeEmail}
                  </span>
                </p>
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {statusLabels[item.status] ?? item.status}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {typeLabels[item.type] ?? item.type} ·{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDate(item.startDate)}
                  {item.endDate && item.endDate !== item.startDate
                    ? ` – ${formatDate(item.endDate)}`
                    : ""}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
              {item.decisionNote && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Catatan: {item.decisionNote}
                </p>
              )}
              {item.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void decide(item.id, "approved")}
                  >
                    Setujui
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void decide(item.id, "rejected")}
                  >
                    Tolak
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
