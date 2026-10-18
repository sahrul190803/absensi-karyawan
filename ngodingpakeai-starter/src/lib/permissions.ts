import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Every resource an action can target. `defaultStatements` covers Better Auth's
// own user and session management; add a key per resource your app owns.
export const statement = {
  ...defaultStatements,
  employees: ["read-any", "create", "update", "delete"],
  departments: ["read-any", "create", "update", "delete"],
  positions: ["read-any", "create", "update", "delete"],
  workLocations: ["read-any", "create", "update", "delete"],
  shifts: ["read-any", "create", "update", "delete"],
  schedules: ["read-any", "create", "update", "delete"],
  holidays: ["read-any", "create", "update", "delete"],
  attendance: ["read-any"],
  requests: ["read-any", "approve"],
  reports: ["read-any"],
  audit: ["read-any"],
  settings: ["read-any", "update"],
  devices: ["read-any", "delete-any"],
  payroll: ["read-any", "create", "update"],
  trainings: ["read-any", "create", "update", "delete"],
  meals: ["read-any", "delete-any"],
  calendar: ["read-any", "manage"],
  appreciations: ["send"],
} as const;

export const ac = createAccessControl(statement);

// A role is a subset of the statement. Keep `user` deliberately empty: the
// signed-in default should be able to do nothing beyond its own records.
//
// App roles:
// - user (Karyawan): absen, jadwal, pengajuan, klaim makan, profil.
// - marketing: sama seperti karyawan, absen foto tanpa kewajiban lokasi.
// - hod (Kepala Divisi): jadwal shift, persetujuan izin/sakit/tukar shift,
//   training. Absen tanpa kewajiban lokasi (sering dinas di luar).
// - hrd/admin: mengelola dashboard admin (master data, persetujuan, laporan,
//   penggajian). Bukan subjek absensi dan tidak memakai area karyawan.
export const roles = {
  user: ac.newRole({
    employees: [],
    departments: [],
    positions: [],
    workLocations: [],
    shifts: [],
    schedules: [],
    holidays: [],
    attendance: [],
    requests: [],
    reports: [],
    audit: [],
    settings: [],
    devices: [],
    payroll: [],
    trainings: [],
    meals: [],
    calendar: [],
    appreciations: [],
  }),
  marketing: ac.newRole({
    employees: [],
    departments: [],
    positions: [],
    workLocations: [],
    shifts: [],
    schedules: [],
    holidays: [],
    attendance: [],
    requests: [],
    reports: [],
    audit: [],
    settings: [],
    devices: [],
    payroll: [],
    trainings: [],
    meals: [],
    calendar: [],
    appreciations: [],
  }),
  hod: ac.newRole({
    employees: ["read-any", "update"],
    departments: ["read-any"],
    positions: ["read-any"],
    workLocations: ["read-any"],
    shifts: ["read-any"],
    schedules: ["read-any", "create", "update", "delete"],
    holidays: ["read-any"],
    attendance: ["read-any"],
    requests: ["read-any", "approve"],
    reports: ["read-any"],
    trainings: ["read-any", "create", "update", "delete"],
    meals: ["read-any"],
    calendar: ["read-any"],
    appreciations: [],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
      employees: ["read-any", "create", "update", "delete"],
    departments: ["read-any", "create", "update", "delete"],
    positions: ["read-any", "create", "update", "delete"],
    workLocations: ["read-any", "create", "update", "delete"],
    shifts: ["read-any", "create", "update", "delete"],
    schedules: ["read-any", "create", "update", "delete"],
    holidays: ["read-any", "create", "update", "delete"],
    attendance: ["read-any"],
    requests: ["read-any", "approve"],
    reports: ["read-any"],
    audit: ["read-any"],
    settings: ["read-any", "update"],
    devices: ["read-any", "delete-any"],
    payroll: ["read-any", "create", "update"],
    trainings: ["read-any", "create", "update", "delete"],
    meals: ["read-any", "delete-any"],
    calendar: ["read-any", "manage"],
    appreciations: ["send"],
  }),
  hrd: ac.newRole({
    ...adminAc.statements,
      employees: ["read-any", "create", "update", "delete"],
    departments: ["read-any", "create", "update", "delete"],
    positions: ["read-any", "create", "update", "delete"],
    workLocations: ["read-any", "create", "update", "delete"],
    shifts: ["read-any", "create", "update", "delete"],
    schedules: ["read-any", "create", "update", "delete"],
    holidays: ["read-any", "create", "update", "delete"],
    attendance: ["read-any"],
    requests: ["read-any", "approve"],
    reports: ["read-any"],
    audit: ["read-any"],
    settings: ["read-any", "update"],
    devices: ["read-any", "delete-any"],
    payroll: ["read-any", "create", "update"],
    trainings: ["read-any", "create", "update", "delete"],
    meals: ["read-any", "delete-any"],
    calendar: ["read-any", "manage"],
    appreciations: ["send"],
  }),
} as const;

export type AppRole = keyof typeof roles;

// Roles live in the `user.role` column as a string. Better Auth reads a
// comma-separated list, so "admin,support" grants the union of both.
export const DEFAULT_ROLE = "user" satisfies AppRole;
export const ADMIN_ROLES = ["admin", "hrd"] satisfies AppRole[];

// Roles yang tetap bisa absen foto tanpa kewajiban berada di radius lokasi.
export const LOCATION_FREE_ROLES = ["marketing", "hod"] satisfies AppRole[];

// Label tampilan untuk setiap role.
export const ROLE_LABELS: Record<string, string> = {
  user: "Karyawan",
  marketing: "Marketing",
  hod: "HOD",
  hrd: "HRD",
  admin: "Admin",
};

// The shape accepted by permission checks, e.g. { trainings: ["read-any"] }.
export type Permissions = Partial<{
  [Resource in keyof typeof statement]: (typeof statement)[Resource][number][];
}>;
