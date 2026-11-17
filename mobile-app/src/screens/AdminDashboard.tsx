import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  FolderKanban,
  GraduationCap,
  LoaderCircle,
  MapPin,
  Settings,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import type {
  AdminAttendanceResponse,
  AdminRequestResponse,
} from "@/lib/admin-types";
import { useAuth } from "@/lib/auth";
import { clock, formatDate, REQUEST_TYPE_LABELS, todayIso } from "@/lib/format";
import type { NavIcon } from "@/lib/nav";
import { navForRoles } from "@/lib/nav";

const ICONS: Partial<Record<NavIcon, LucideIcon>> = {
  grid: CalendarRange,
  utensils: UtensilsCrossed,
  graduation: GraduationCap,
  "file-clock": FileClock,
  bell: FileClock,
  users: Users,
  "bar-chart": BarChart3,
  wallet: Wallet,
  folder: FolderKanban,
  briefcase: Briefcase,
  "map-pin": MapPin,
  settings: Settings,
};

const ATTENDANCE_CARDS = [
  { status: "present", label: "Hadir", tone: "text-positive" },
  { status: "late", label: "Terlambat", tone: "text-warning" },
  { status: "early_leave", label: "Pulang cepat", tone: "text-warning" },
  { status: "alpha", label: "Alpha", tone: "text-danger" },
] as const;

function dateRange(startDate: string, endDate: string | null) {
  if (endDate && endDate !== startDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  }
  return formatDate(startDate);
}

export function AdminDashboardScreen() {
  const { user, roles } = useAuth();
  const [today] = useState(() => todayIso());

  const attendanceQuery = useQuery({
    queryKey: ["admin", "attendance", today],
    queryFn: () =>
      apiFetch<AdminAttendanceResponse>(
        `/api/admin/attendance?date=${today}&limit=100&offset=0`,
      ),
    retry: false,
  });

  const requestsQuery = useQuery({
    queryKey: ["admin", "requests", "pending"],
    queryFn: () =>
      apiFetch<AdminRequestResponse>(
        "/api/admin/requests?status=pending&limit=5&offset=0",
      ),
    retry: false,
  });

  const rows = attendanceQuery.data?.data ?? [];
  const pending = requestsQuery.data?.data ?? [];
  const counts = ATTENDANCE_CARDS.map((card) => ({
    ...card,
    count: rows.filter((row) => row.status === card.status).length,
  }));
  const items = navForRoles(roles).filter(
    (item) => item.href !== "/admin" && item.href.startsWith("/admin"),
  );
  const isAdmin = roles.some((role) => ["hrd", "admin"].includes(role));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Dashboard {isAdmin ? "Admin" : "HOD"}
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Selamat datang, {user?.name}. Ringkasan kehadiran dan pekerjaan yang
          menunggu.
        </p>
      </header>

      {attendanceQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Memuat ringkasan kehadiran…
        </p>
      ) : attendanceQuery.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-card px-4 py-3 text-sm text-danger"
        >
          {attendanceQuery.error.message}
        </p>
      ) : (
        <section aria-label="Ringkasan kehadiran hari ini">
          <div className="grid grid-cols-2 gap-3">
            {counts.map((card) => (
              <div
                key={card.status}
                className="rounded-lg border bg-card p-4"
              >
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {card.label}
                </p>
                <p className={`mt-1 text-3xl font-semibold ${card.tone}`}>
                  {card.count}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {rows.length} karyawan sudah memiliki catatan absensi hari ini.
          </p>
        </section>
      )}

      <section className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardCheck className="size-4" aria-hidden="true" />
              Menunggu persetujuan
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {pending.length > 0
                ? `${pending.length} pengajuan terbaru perlu ditinjau.`
                : "Tidak ada pengajuan yang menunggu."}
            </p>
          </div>
          <Link
            to="/admin/requests"
            className="inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium"
          >
            Buka
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {requestsQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>
        ) : pending.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {pending.map((row) => (
              <li
                key={row.id}
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                <p className="text-sm font-medium">{row.employeeName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {REQUEST_TYPE_LABELS[row.type] ?? row.type} ·{" "}
                  {dateRange(row.startDate, row.endDate)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {rows.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Absensi terbaru
            </h2>
            <Link
              to="/admin/reports"
              className="text-sm font-medium text-primary-text underline-offset-4 hover:underline"
            >
              Lihat laporan
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {rows.slice(0, 5).map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.employeeName}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    Masuk {clock(row.checkInTime)} · Pulang{" "}
                    {clock(row.checkOutTime)}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Modul admin">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Modul operasional
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon] ?? BarChart3;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className="flex min-h-24 flex-col items-start justify-between gap-3 rounded-lg border bg-card p-3.5 text-sm font-medium transition-colors hover:border-border-strong"
                >
                  <span className="grid size-9 place-items-center rounded-md border border-border bg-background text-primary-text">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="flex items-center gap-2 rounded-lg border border-border bg-primary-quiet/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
        Data dihitung langsung dari server. Tarik ke bawah atau buka ulang layar
        untuk memperbarui.
      </p>
    </div>
  );
}
