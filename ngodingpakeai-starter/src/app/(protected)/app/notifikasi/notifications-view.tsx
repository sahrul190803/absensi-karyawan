"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
};

export function NotificationsView() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=50", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal memuat notifikasi.");
        return;
      }
      setItems(body.data);
      setUnread(body.meta?.unread ?? 0);
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

  const markAll = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Notifikasi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || unread === 0}
          onClick={() => void markAll()}
        >
          Tandai semua dibaca
        </Button>
      </div>

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
            Belum ada notifikasi. Keputusan pengajuan HR akan muncul di sini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.title}</p>
                {!item.readAt && (
                  <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    Baru
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {formatDateTime(item.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
