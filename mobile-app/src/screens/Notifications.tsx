import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  data: NotificationRow[];
  meta: { limit: number; offset: number; hasMore: boolean; unread: number };
};

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiFetch<NotificationsResponse>("/api/notifications?limit=50&offset=0"),
    retry: false,
  });

  const rows = notificationsQuery.data?.data ?? [];
  const unread = notificationsQuery.data?.meta.unread ?? 0;

  async function markAllRead() {
    setBusy(true);
    try {
      await apiFetch("/api/notifications", { method: "PATCH" });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!window.confirm("Hapus semua notifikasi? Tindakan ini tidak bisa dibatalkan."))
      return;
    setBusy(true);
    try {
      await apiFetch("/api/notifications", { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } finally {
      setBusy(false);
    }
  }

  async function removeOne(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifikasi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} notifikasi belum dibaca.`
              : "Semua notifikasi sudah dibaca."}
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy || unread === 0}
              onClick={() => void markAllRead()}
            >
              <CheckCheck aria-hidden="true" />
              Tandai dibaca
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void clearAll()}
            >
              <Trash2 aria-hidden="true" />
              Hapus
            </Button>
          </div>
        )}
      </header>

      {notificationsQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat notifikasi…
        </p>
      ) : notificationsQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {notificationsQuery.error.message}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <Bell
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada notifikasi.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {!row.readAt && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Belum dibaca"
                      />
                    )}
                    {row.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                    {row.body}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeOne(row.id)}
                  className="grid size-10 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Hapus notifikasi"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
