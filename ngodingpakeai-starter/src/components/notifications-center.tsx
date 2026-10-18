"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  request: "Pengajuan",
  "request-approved": "Pengajuan",
  "request-rejected": "Pengajuan",
  schedule: "Jadwal",
  attendance: "Absensi",
  payroll: "Penggajian",
  training: "Training",
  employee: "Karyawan",
  system: "Sistem",
  appreciation: "Apresiasi",
  "appreciation-praise": "Apresiasi",
  "appreciation-warning": "Peringatan",
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

export function NotificationsCenter({ title = "Notifikasi" }: { title?: string }) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=100", {
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

  const types = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.type, TYPE_LABELS[item.type] ?? item.type);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (readFilter === "unread" && item.readAt) return false;
        if (readFilter === "read" && !item.readAt) return false;
        if (typeFilter && item.type !== typeFilter) return false;
        return true;
      }),
    [items, readFilter, typeFilter],
  );

  const markAll = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotice("Semua notifikasi ditandai sudah dibaca.");
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  const removeOne = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(`/api/notifications/${id}`, {
          method: "DELETE",
        });
        if (!response.ok && response.status !== 204) {
          const body = await response.json().catch(() => null);
          setError(body?.error?.message ?? "Notifikasi gagal dihapus.");
          return;
        }
        setNotice("Notifikasi dihapus.");
        await load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const clearAll = useCallback(async () => {
    if (!window.confirm("Hapus seluruh riwayat notifikasi?")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Riwayat gagal dihapus.");
        return;
      }
      setNotice("Seluruh riwayat notifikasi dihapus.");
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || unread === 0}
            onClick={() => void markAll()}
          >
            Tandai semua dibaca
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || items.length === 0}
            onClick={() => void clearAll()}
          >
            <Trash2 aria-hidden="true" />
            Hapus semua
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Status
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={readFilter}
            onChange={(event) =>
              setReadFilter(event.target.value as "all" | "unread" | "read")
            }
          >
            <option value="all">Semua</option>
            <option value="unread">Belum dibaca</option>
            <option value="read">Sudah dibaca</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Jenis
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Semua jenis</option>
            {types.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} notifikasi
        </span>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg border bg-card px-4 py-3 text-sm"
        >
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
        <p className="mt-6 text-sm text-muted-foreground">Memuat...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed bg-card px-6 py-10 text-center">
          <Bell
            className="mx-auto size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Tidak ada notifikasi pada filter ini.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {filtered.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {item.title}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    {!item.readAt && (
                      <span className="rounded-full bg-primary-quiet px-2 py-0.5 text-[11px] font-semibold text-primary-text">
                        Baru
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy}
                  aria-label="Hapus notifikasi"
                  onClick={() => void removeOne(item.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
