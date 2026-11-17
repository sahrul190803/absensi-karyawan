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
  | "folder"
  | "building"
  | "briefcase"
  | "clock";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  roles: string[];
  group: "utama" | "operasional" | "karyawan" | "pengaturan";
  exact?: boolean;
};

const EMPLOYEE_ROLES = ["user", "marketing", "hod"];
const MANAGER_ROLES = ["hod", "hrd", "admin"];
const ADMIN_ROLES = ["hrd", "admin"];

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/app",
    label: "Beranda",
    icon: "home",
    roles: EMPLOYEE_ROLES,
    group: "utama",
    exact: true,
  },
  {
    href: "/app/history",
    label: "Riwayat",
    icon: "history",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/requests",
    label: "Izin & Cuti",
    icon: "inbox",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/schedule",
    label: "Jadwal Saya",
    icon: "calendar",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/meals",
    label: "Jadwal Makan",
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
    href: "/app/notifications",
    label: "Notifikasi",
    icon: "bell",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },
  {
    href: "/app/profile",
    label: "Profil",
    icon: "user",
    roles: EMPLOYEE_ROLES,
    group: "utama",
  },

  {
    href: "/admin",
    label: "Dashboard",
    icon: "gauge",
    roles: MANAGER_ROLES,
    group: "operasional",
    exact: true,
  },
  {
    href: "/admin/schedule",
    label: "Attendant",
    icon: "grid",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/meals",
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
    href: "/admin/requests",
    label: "Persetujuan",
    icon: "file-clock",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/notifications",
    label: "Notifikasi",
    icon: "bell",
    roles: MANAGER_ROLES,
    group: "operasional",
  },
  {
    href: "/admin/employees",
    label: "Data Karyawan",
    icon: "users",
    roles: MANAGER_ROLES,
    group: "karyawan",
  },
  {
    href: "/admin/reports",
    label: "Laporan",
    icon: "bar-chart",
    roles: MANAGER_ROLES,
    group: "karyawan",
  },
  {
    href: "/admin/payroll",
    label: "Penggajian",
    icon: "wallet",
    roles: ADMIN_ROLES,
    group: "karyawan",
  },
  {
    href: "/admin/departments",
    label: "Departemen",
    icon: "folder",
    roles: ADMIN_ROLES,
    group: "pengaturan",
  },
  {
    href: "/admin/positions",
    label: "Jabatan",
    icon: "briefcase",
    roles: ADMIN_ROLES,
    group: "pengaturan",
  },
  {
    href: "/admin/locations",
    label: "Lokasi & Radius",
    icon: "map-pin",
    roles: ADMIN_ROLES,
    group: "pengaturan",
  },
  {
    href: "/admin/settings",
    label: "Pengaturan",
    icon: "settings",
    roles: ADMIN_ROLES,
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

export const EMPLOYEE_MOBILE_TABS = [
  "/app",
  "/app/history",
  "/app/requests",
  "/app/profile",
];

export const MANAGER_MOBILE_TABS = [
  "/admin",
  "/admin/schedule",
  "/admin/meals",
  "/admin/reports",
];
