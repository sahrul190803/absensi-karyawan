"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  Clock,
  FileClock,
  FolderKanban,
  Gauge,
  GraduationCap,
  History,
  Home,
  Inbox,
  LogOut,
  MapPin,
  Menu,
  Settings,
  ShieldCheck,
  User,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { authClient } from "@/lib/auth-client";
import { Brand } from "@/components/brand";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  GROUP_LABELS,
  MOBILE_TAB_HREFS,
  type NavIcon,
  type NavItem,
} from "@/lib/nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  calendar: CalendarDays,
  history: History,
  inbox: Inbox,
  utensils: UtensilsCrossed,
  graduation: GraduationCap,
  bell: Bell,
  user: User,
  gauge: Gauge,
  grid: CalendarRange,
  "file-clock": FileClock,
  users: Users,
  wallet: Wallet,
  "bar-chart": BarChart3,
  settings: Settings,
  "map-pin": MapPin,
  shield: ShieldCheck,
  folder: FolderKanban,
  building: Building2,
  briefcase: Briefcase,
  clock: Clock,
};

const MANAGER_MOBILE_TABS = [
  "/admin",
  "/admin/jadwal",
  "/admin/makan",
  "/admin/laporan",
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const groups = ["utama", "operasional", "karyawan", "pengaturan"] as const;
  const visibleGroups = groups.filter((group) =>
    items.some((item) => item.group === group),
  );

  return (
    <>
      {visibleGroups.map((group) => (
        <div key={group}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {GROUP_LABELS[group]}
          </p>
          <ul className="space-y-0.5">
            {items
              .filter((item) => item.group === group)
              .map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-quiet text-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r before:bg-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 flex-none" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </>
  );
}

function UserCard({
  user,
  roleLabel,
}: {
  user: { name: string; email: string };
  roleLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      <span className="grid size-9 flex-none place-items-center rounded-full border border-border-strong bg-muted text-xs font-semibold">
        {initials || "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {user.name}
        </span>
        <span className="block text-xs text-muted-foreground">{roleLabel}</span>
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await authClient.signOut();
          router.replace("/sign-in");
          router.refresh();
        }}
        className="grid size-8 flex-none place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Keluar dari akun"
        title="Keluar"
      >
        <LogOut className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AppShell({
  user,
  roleLabel,
  items,
  managerMode = false,
  children,
}: {
  user: { name: string; email: string };
  roleLabel: string;
  items: NavItem[];
  managerMode?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Admin dan karyawan sama-sama punya pusat notifikasi.
  const showNotifications =
    managerMode || items.some((item) => item.href === "/app");
  const tabHrefs = managerMode ? MANAGER_MOBILE_TABS : MOBILE_TAB_HREFS;
  const tabItems = tabHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border p-4">
          <Brand />
        </div>
        <nav
          aria-label="Navigasi utama"
          className="flex-1 space-y-5 overflow-y-auto p-3"
        >
          <NavLinks items={items} pathname={pathname} />
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <ThemeToggle className="w-full" />
          <UserCard user={user} roleLabel={roleLabel} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid size-9 place-items-center rounded-md border border-border bg-card text-foreground"
          aria-label="Buka menu navigasi"
          aria-expanded={menuOpen}
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
        <Brand className="min-w-0 [&>span:last-child>span:last-child]:hidden" />
        <span className="flex items-center gap-2">
          <ThemeToggle />
          {showNotifications && (
            <NotificationBell
              href={managerMode ? "/admin/notifikasi" : "/app/notifikasi"}
            />
          )}
        </span>
      </header>

      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Brand />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground"
                aria-label="Tutup menu"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <nav
              aria-label="Navigasi utama"
              className="flex-1 space-y-5 overflow-y-auto p-3"
            >
              <NavLinks
                items={items}
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
              />
            </nav>
            <div className="border-t border-border p-3">
              <UserCard user={user} roleLabel={roleLabel} />
            </div>
          </div>
        </div>
      )}

      <main
        id="main-content"
        className={cn(
          "mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8",
          tabItems.length > 0 ? "pb-28 lg:pb-16" : "pb-12",
        )}
      >
        {children}
      </main>

      {tabItems.length > 0 && (
        <nav
          aria-label="Navigasi cepat"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul
            className="mx-auto grid max-w-xl"
            style={{
              gridTemplateColumns: `repeat(${tabItems.length}, minmax(0, 1fr))`,
            }}
          >
            {tabItems.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-[11px] font-medium",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute top-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-b bg-primary"
                      />
                    )}
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
