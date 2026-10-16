import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments, employees, user } from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { ListQueryInput } from "@/validators/common";
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "@/validators/departments";

const fields = {
  id: departments.id,
  code: departments.code,
  name: departments.name,
  managerUserId: departments.managerUserId,
  active: departments.active,
  createdAt: departments.createdAt,
  updatedAt: departments.updatedAt,
};

// Kepala divisi (manager) disimpan sebagai user id dan otomatis memegang role
// HOD, jadi satu penunjukan HRD langsung memberi/mencabut aksesnya.
const HOD_ROLE = "hod";

const splitRoles = (role: string | null) =>
  (role ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

const joinRoles = (names: string[]) => (names.length ? names.join(",") : null);

const withRole = (role: string | null, name: string, enabled: boolean) => {
  const names = splitRoles(role);
  if (enabled === names.includes(name)) return role;
  return joinRoles(
    enabled ? [...names, name] : names.filter((existing) => existing !== name),
  );
};

// Drizzle memberi tipe berbeda untuk `db` dan `tx`, jadi helper sinkronisasi
// role menerima keduanya lewat tipe hasil inferensi transaksi.
type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0];

const setHodRole = async (
  executor: Executor,
  managerUserId: string,
  enabled: boolean,
) => {
  const [account] = await executor
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, managerUserId))
    .limit(1);
  if (!account) return;
  const next = withRole(account.role, HOD_ROLE, enabled);
  if (next === account.role) return;
  await executor
    .update(user)
    .set({ role: next })
    .where(eq(user.id, managerUserId));
};

// Cabut role HOD dari manager lama hanya bila ia tidak memimpin departemen lain.
const releaseHodRole = async (executor: Executor, managerUserId: string) => {
  const [other] = await executor
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.managerUserId, managerUserId))
    .limit(1);
  if (!other) await setHodRole(executor, managerUserId, false);
};

// Kepala divisi harus akun karyawan terdaftar, supaya penunjukan lewat API
// tidak bisa memberi role HOD ke user id sembarangan.
const requireEmployeeAccount = async (managerUserId: string) => {
  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, managerUserId))
    .limit(1);
  if (!row)
    throw new ApiError(
      422,
      "MANAGER_NOT_EMPLOYEE",
      "Kepala divisi harus akun karyawan yang sudah terdaftar.",
    );
};

// Cross-account reads and writes. Only call behind a permission check.
export async function listAnyDepartments({ limit, offset }: ListQueryInput) {
  const rows = await db
    .select(fields)
    .from(departments)
    .orderBy(asc(departments.name))
    .limit(limit + 1)
    .offset(offset);
  return {
    data: rows.slice(0, limit),
    meta: { limit, offset, hasMore: rows.length > limit },
  };
}

// Kode dibuat otomatis dari nama saat form tidak mengisinya (mis. pembuatan
// cepat departemen langsung dari form tambah karyawan).
const slugifyCode = (name: string) => {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "DEPT").slice(0, 14);
};

const uniqueDepartmentCode = async (name: string) => {
  const base = slugifyCode(name);
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const [existing] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.code, candidate))
      .limit(1);
    if (!existing) return candidate;
    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, 20 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
};

export async function createAnyDepartment(input: CreateDepartmentInput) {
  const code = input.code?.trim()
    ? input.code
    : await uniqueDepartmentCode(input.name);
  const managerUserId = input.managerUserId?.trim() || null;
  if (managerUserId) await requireEmployeeAccount(managerUserId);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(departments)
      .values({ ...input, code, managerUserId })
      .returning(fields);
    if (managerUserId) await setHodRole(tx, managerUserId, true);
    return row;
  });
}

export async function updateAnyDepartment(
  id: string,
  input: UpdateDepartmentInput,
) {
  const managerChanged = Object.hasOwn(input, "managerUserId");
  const managerUserId = managerChanged
    ? input.managerUserId?.trim() || null
    : undefined;
  if (managerUserId) await requireEmployeeAccount(managerUserId);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ managerUserId: departments.managerUserId })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    if (!existing) return undefined;

    const [row] = await tx
      .update(departments)
      .set({ ...input, managerUserId })
      .where(eq(departments.id, id))
      .returning(fields);
    if (!row) return undefined;

    if (managerChanged && existing.managerUserId !== row.managerUserId) {
      if (existing.managerUserId)
        await releaseHodRole(tx, existing.managerUserId);
      if (row.managerUserId) await setHodRole(tx, row.managerUserId, true);
    }
    return row;
  });
}

export async function deleteAnyDepartment(id: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .delete(departments)
      .where(eq(departments.id, id))
      .returning({
        id: departments.id,
        managerUserId: departments.managerUserId,
      });
    if (!row) return false;
    if (row.managerUserId) await releaseHodRole(tx, row.managerUserId);
    return true;
  });
}
