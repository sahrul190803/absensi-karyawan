import type { AppRole } from "@/lib/permissions";

export type NavIcon =
  | "home"
  | "calendar"
  | "history"
  | "inbox"
  | "utensils"
  | "graduation"
  | "bell"
  | "user"
  | "gauge"
  | "grid"
  | "file-clock"
  | "users"
  | "wallet"
  | "bar-chart"
  | "settings"
  | "map-pin"
  | "shield"
  | "smartphone"
  | "folder"
  | "building"
  | "briefcase"
  | "clock"
  | "calendar-off";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  roles: AppRole[];
  group: "utama" | "operasional" | "karyawan" | "pengaturan";
  exact?: boolean;
};

const EMPLOYEE_ROLES: AppRole[] = ["user", "marketing", "hod", "hrd", "admin"];
const MANAGER_ROLES: AppRole[] = ["hod", "hrd", "admin"];
const ADMIN_ROLES_NAV: AppRole[] = ["hrd", "admin"];

export const NAV_ITEMS: NavItem[] = [
  // Area karyawan (semua role yang punya data karyawan)
  {
    href: "/app",
    label: "Beranda",
    icon: "home",
    roles: EMPLOYEE_ROLES,
    group: "utama",
    exact: true,
  },
  {
    href: "/app/jadwal",
    label: "Jadwal Saya",
    icon: "calendar",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/riwayat",
    label: "Riwayat Absensi",
    icon: "history",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/pengajuan",
    label: "Pengajuan",
    icon: "inbox",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/makan",
    label: "Jatah Makan",
    icon: "utensils",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/training",
    label: "Training",
    icon: "graduation",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/notifikasi",
    label: "Notifikasi",
    icon: "bell",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/profil",
    label: "Profil",
    icon: "user",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },

  // Area manajemen
  {
    href: "/admin",
    label: "Dashboard",
    icon: "gauge",
    roles: MANAGER_ROLES,
    group: "operasional",
    exact: true,
  },
  {
    href: "/admin/jadwal",
    label: "Jadwal Kerja",
    icon: "grid",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/kalender",
    label: "Kalender",
    icon: "calendar",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/izin-cuti",
    label: "Izin & Cuti",
    icon: "inbox",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/koreksi",
    label: "Koreksi Absensi",
    icon: "file-clock",
    roles: ADMIN_ROLES_NAV,
    group: "operasional",
  },
  {
    href: "/admin/makan",
    label: "Klaim Makan",
    icon: "utensils",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/training",
    label: "Training",
    icon: "graduation",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/karyawan",
    label: "Data Karyawan",
    icon: "users",
    roles: ADMIN_ROLES_NAV,
    group: "karyawan",
  },
  {
    href: "/admin/laporan",
    label: "Laporan",
    icon: "bar-chart",
    roles: MANAGER_ROLES,
    group: "karyawan",
  },
  {
    href: "/admin/penggajian",
    label: "Penggajian",
    icon: "wallet",
    roles: ADMIN_ROLES_NAV,
    group: "karyawan",
  },
  {
    href: "/admin/departemen",
    label: "Departemen",
    icon: "folder",
    roles: ADMIN_ROLES_NAV,
    group: "pengaturan",
  },
  {
    href: "/admin/jabatan",
    label: "Jabatan",
    icon: "briefcase",
    roles: ADMIN_ROLES_NAV,
    group: "pengaturan",
  },
  {
    href: "/admin/lokasi",
    label: "Lokasi & Radius",
    icon: "map-pin",
    roles: ADMIN_ROLES_NAV,
    group: "pengaturan",
  },
  {
    href: "/admin/hari-libur",
    label: "Hari Libur",
    icon: "calendar-off",
    roles: ADMIN_ROLES_NAV,
    group: "pengaturan",
  },
  {
    href: "/admin/perangkat",
    label: "Perangkat",
    icon: "smartphone",
    roles: ADMIN_ROLES_NAV,
    group: "pengaturan",
  },
  {
    href: "/admin/audit",
    label: "Audit Log",
    icon: "shield",
    roles: ADMIN_ROLES_NAV,
    group: "pengaturan",
  },
  {
    href: "/admin/pengaturan",
    label: "Pengaturan",
    icon: "settings",
    roles: ADMIN_ROLES_NAV,
    group: "pengaturan",
  },
];

export const GROUP_LABELS: Record<NavItem["group"], string> = {
  utama: "Menu",
  operasional: "Operasional",
  karyawan: "Karyawan",
  pengaturan: "Pengaturan",
};

export function navForRoles(roleList: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    item.roles.some((role) => roleList.includes(role)),
  );
}

// Item bottom-nav mobile untuk area karyawan.
export const MOBILE_TAB_HREFS = [
  "/app",
  "/app/jadwal",
  "/app/riwayat",
  "/app/pengajuan",
  "/app/profil",
];
