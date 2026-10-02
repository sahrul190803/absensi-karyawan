import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Every resource an action can target. `defaultStatements` covers Better Auth's
// own user and session management; add a key per resource your app owns.
export const statement = {
  ...defaultStatements,
  notes: ["read-any", "delete-any"],
  employees: ["read-any", "create", "update", "delete"],
  departments: ["read-any", "create", "update", "delete"],
  positions: ["read-any", "create", "update", "delete"],
  workLocations: ["read-any", "create", "update", "delete"],
  shifts: ["read-any", "create", "update", "delete"],
  schedules: ["read-any", "create", "update", "delete"],
  holidays: ["read-any", "create", "update", "delete"],
  attendance: ["read-any", "update"],
  requests: ["read-any", "approve"],
  reports: ["read-any"],
  audit: ["read-any"],
  settings: ["read-any", "update"],
  devices: ["read-any", "delete-any"],
} as const;

export const ac = createAccessControl(statement);

// A role is a subset of the statement. Keep `user` deliberately empty: the
// signed-in default should be able to do nothing beyond its own records.
export const roles = {
  user: ac.newRole({
    notes: [],
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
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    notes: ["read-any", "delete-any"],
    employees: ["read-any", "create", "update", "delete"],
    departments: ["read-any", "create", "update", "delete"],
    positions: ["read-any", "create", "update", "delete"],
    workLocations: ["read-any", "create", "update", "delete"],
    shifts: ["read-any", "create", "update", "delete"],
    schedules: ["read-any", "create", "update", "delete"],
    holidays: ["read-any", "create", "update", "delete"],
    attendance: ["read-any", "update"],
    requests: ["read-any", "approve"],
    reports: ["read-any"],
    audit: ["read-any"],
    settings: ["read-any", "update"],
    devices: ["read-any", "delete-any"],
  }),
} as const;

export type AppRole = keyof typeof roles;

// Roles live in the `user.role` column as a string. Better Auth reads a
// comma-separated list, so "admin,support" grants the union of both.
export const DEFAULT_ROLE = "user" satisfies AppRole;
export const ADMIN_ROLES = ["admin"] satisfies AppRole[];

// The shape accepted by permission checks, e.g. { notes: ["read-any"] }.
export type Permissions = Partial<{
  [Resource in keyof typeof statement]: (typeof statement)[Resource][number][];
}>;
