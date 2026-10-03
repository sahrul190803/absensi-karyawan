"use client";

import { useCallback, useEffect, useState } from "react";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

const actionLabels: Record<string, string> = {
  "check-in": "Check-in",
  "check-out": "Check-out",
  "request-create": "Buat pengajuan",
  "request-approved": "Setujui pengajuan",
  "request-rejected": "Tolak pengajuan",
  "request-cancel": "Batalkan pengajuan",
};

const actionOptions = Object.keys(actionLabels);

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
};

export function AuditView() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextAction: string) => {
    setLoading(true);
    try {
      const query = nextAction ? `&action=${nextAction}` : "";
      const response = await fetch(`/api/admin/audit-logs?limit=100${query}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat audit log.");
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
    const timer = window.setTimeout(() => void load(""), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Audit log
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Jejak aktivitas tidak dapat dihapus. Waktu server WIB.
      </p>

      <label className="mt-4 grid max-w-xs gap-1.5 text-sm">
        <span className="font-medium">Filter aksi</span>
        <select
          className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            void load(event.target.value);
          }}
        >
          <option value="">Semua aksi</option>
          {actionOptions.map((option) => (
            <option key={option} value={option}>
              {actionLabels[option]}
            </option>
          ))}
        </select>
      </label>

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
            Belum ada aktivitas tercatat.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {actionLabels[item.action] ?? item.action}
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.userName ?? "Sistem"}
                {item.userEmail ? ` · ${item.userEmail}` : ""}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {item.entity}
                {item.entityId ? ` · ${item.entityId}` : ""}
              </p>
              {item.newValue ? (
                <p className="mt-2 break-all rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {JSON.stringify(item.newValue)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
