"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const dateRange = (row: RequestRow) =>
  row.endDate && row.endDate !== row.startDate
    ? `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`
    : formatDate(row.startDate);

export function RequestsView() {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState("permission");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/requests?limit=50", {
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
          reason,
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
      await load();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }, [endDate, load, reason, startDate, type]);

  const cancel = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/requests/${id}`, { method: "PATCH" });
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

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Pengajuan
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Izin, sakit, cuti, dinas luar, dan lembur
      </p>

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

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Buat pengajuan</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Jenis</span>
            <select
              className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="leave">Cuti</option>
              <option value="business_trip">Dinas luar</option>
              <option value="overtime">Lembur</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tanggal mulai</span>
              <input
                type="date"
                className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Tanggal selesai</span>
              <input
                type="date"
                className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Alasan</span>
            <textarea
              rows={3}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Jelaskan alasan pengajuan"
            />
          </label>
          <Button
            disabled={busy || !startDate || reason.trim().length < 3}
            onClick={() => void submit()}
          >
            {busy ? "Mengirim…" : "Ajukan"}
          </Button>
        </div>
      </section>

      <h2 className="mt-8 text-lg font-semibold">Riwayat pengajuan</h2>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>
      ) : items.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
          <FileText
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada pengajuan.
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{typeLabels[item.type] ?? item.type}</p>
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {statusLabels[item.status] ?? item.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {dateRange(item)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
              {item.decisionNote && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Catatan HR: {item.decisionNote}
                </p>
              )}
              {item.status === "pending" && (
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
