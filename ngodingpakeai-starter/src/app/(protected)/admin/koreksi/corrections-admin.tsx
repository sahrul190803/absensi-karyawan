"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type CorrectionRow = {
  id: string;
  attendanceId: string;
  attendanceDate: string;
  attendanceStatus: string;
  reason: string;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  status: string;
  decisionNote: string | null;
  employeeName: string;
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
};

const filters = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
  { value: "", label: "Semua" },
];

const fieldLabels: Record<string, string> = {
  checkInTime: "Jam masuk",
  checkOutTime: "Jam pulang",
  notes: "Catatan",
};

const formatValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "checkInTime" || key === "checkOutTime") {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  }
  return String(value);
};

export function CorrectionsAdmin() {
  const [items, setItems] = useState<CorrectionRow[]>([]);
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string) => {
    setLoading(true);
    try {
      const query = nextStatus ? `&status=${nextStatus}` : "";
      const response = await fetch(`/api/admin/corrections?limit=100${query}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat koreksi.");
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
        const response = await fetch(`/api/admin/corrections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: decision,
            decisionNote: notes[id]?.trim() ?? "",
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "Keputusan gagal disimpan.");
          return;
        }
        setNotice(
          decision === "approved"
            ? "Koreksi disetujui dan perubahan diterapkan."
            : "Koreksi ditolak.",
        );
        await load(status);
      } finally {
        setBusy(false);
      }
    },
    [load, notes, status],
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Koreksi absensi
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tinjau pengajuan koreksi karyawan. Perubahan disimpan dengan jejak
        audit.
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

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Tidak ada koreksi pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {item.employeeName}
                  <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                    {item.attendanceDate}
                  </span>
                </p>
                <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {item.status === "pending"
                    ? "Menunggu"
                    : item.status === "approved"
                      ? "Disetujui"
                      : "Ditolak"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
              <dl className="mt-3 grid gap-1 rounded-lg border bg-background p-3 text-xs">
                {Object.keys(item.newValue).map((key) => (
                  <div key={key} className="flex flex-wrap gap-2">
                    <dt className="w-20 font-medium">
                      {fieldLabels[key] ?? key}
                    </dt>
                    <dd className="font-mono text-muted-foreground line-through">
                      {formatValue(key, item.oldValue[key])}
                    </dd>
                    <dd className="font-mono">
                      {formatValue(key, item.newValue[key])}
                    </dd>
                  </div>
                ))}
              </dl>
              {item.decisionNote && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Catatan: {item.decisionNote}
                </p>
              )}
              {item.status === "pending" && (
                <div className="mt-3 grid gap-2">
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                    placeholder="Catatan keputusan (opsional)"
                    value={notes[item.id] ?? ""}
                    onChange={(event) =>
                      setNotes((previous) => ({
                        ...previous,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="flex gap-2">
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
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
