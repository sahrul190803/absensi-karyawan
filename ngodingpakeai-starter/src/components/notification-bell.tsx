"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

// Ikon lonceng dengan badge jumlah notifikasi belum dibaca. Data diambil
// ulang setiap pindah halaman; badge hanya pelengkap, kegagalan diabaikan.
export function NotificationBell({
  href = "/app/notifikasi",
}: {
  href?: string;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/notifications?limit=1", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = await response.json();
        if (!cancelled) setUnread(body?.meta?.unread ?? 0);
      } catch {
        // Abaikan; badge bukan fungsi utama.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Link
      href={href}
      className="relative grid size-9 place-items-center rounded-md border border-border bg-card text-muted-foreground"
      aria-label={
        unread > 0 ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"
      }
    >
      <Bell className="size-4" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
