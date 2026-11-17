import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { cn } from "cn";
import { Brand } from "@/components/Brand";
import { NetworkBanner } from "@/components/NetworkBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import {
  EMPLOYEE_MOBILE_TABS,
  GROUP_LABELS,
  MANAGER_MOBILE_TABS,
  navForRoles,
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
                    <NavLink
                      to={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-quiet text-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r before:bg-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </>
  );
}

export function AppShell() {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const { user, roles, isManager, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => navForRoles(roles), [roles]);
  const tabHrefs = isManager ? MANAGER_MOBILE_TABS : EMPLOYEE_MOBILE_TABS;
  const tabItems = tabHrefs
    .map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const notificationsHref = isManager
    ? "/admin/notifications"
    : "/app/notifications";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void CapacitorApp.addListener("backButton", () => {
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      if (pathname !== "/app" && pathname !== "/admin") {
        navigate(-1);
        return;
      }
      void CapacitorApp.exitApp();
    }).then((listener) => {
      if (disposed) void listener.remove();
      else cleanup = () => void listener.remove();
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [menuOpen, navigate, pathname]);

  const initials =
    user?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const roleLabel = isManager
    ? roles
        .map(
          (role) =>
            ({
              admin: "Admin",
              hrd: "HRD",
              hod: "HOD",
              marketing: "Marketing",
              user: "Karyawan",
            })[role] ?? role,
        )
        .join(" · ")
    : "Karyawan";

  return (
    <div className="min-h-app bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-3 pt-safe">
          <div className="flex min-w-0 items-center gap-2 py-2.5">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-card text-foreground"
              aria-label="Buka menu navigasi"
              aria-expanded={menuOpen}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <Brand
              href={isManager ? "/admin" : "/app"}
              compact
              className="min-w-0"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              to={notificationsHref}
              className="relative grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Buka notifikasi"
            >
              <Bell className="size-4" aria-hidden="true" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className="fixed inset-0 z-50"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[86vw] flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <Brand href={isManager ? "/admin" : "/app"} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid size-10 place-items-center rounded-md border border-border text-muted-foreground"
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
            <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border-strong bg-muted text-xs font-semibold">
                  {initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {user?.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {roleLabel}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await signOut();
                    navigate("/sign-in", { replace: true });
                  }}
                  className="grid size-10 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Keluar dari akun"
                  title="Keluar"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main
        id="main-content"
        className={cn(
          "mx-auto w-full max-w-3xl px-4 pt-4",
          tabItems.length > 0 ? "pb-28" : "pb-12",
        )}
      >
        <NetworkBanner />
        <Outlet />
      </main>

      {tabItems.length > 0 && (
        <nav
          aria-label="Navigasi cepat"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-safe"
        >
          <ul
            className="mx-auto grid max-w-3xl"
            style={{
              gridTemplateColumns: `repeat(${tabItems.length}, minmax(0, 1fr))`,
            }}
          >
            {tabItems.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2 pb-2 text-[11px] font-medium",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b bg-primary"
                      />
                    )}
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="max-w-full truncate">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
