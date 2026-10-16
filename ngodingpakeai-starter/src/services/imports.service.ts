import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  auditLogs,
  departments,
  employees,
  holidays,
  user,
} from "@/db/schema";
import { normalizeHeader, parseCsv } from "@/lib/csv";

type RowError = { row: number; message: string };

const REQUIRED_HEADERS: Record<string, string> = {
  holiday: "date,name,type,allow_work,active",
  employee: "nik,full_name,email,department_code",
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseBoolean = (value: string, fallback: boolean) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") return fallback;
  if (["1", "true", "ya", "y", "yes"].includes(normalized)) return true;
  if (["0", "false", "tidak", "t", "no"].includes(normalized)) return false;
  return null;
};

function readRows(
  csv: string,
  kind: "holiday" | "employee",
): { headers: string[]; rows: string[][]; errors: RowError[] } {
  const parsed = parseCsv(csv.replace(/^\uFEFF/, ""));
  const errors: RowError[] = [];
  if (parsed.length === 0) {
    return {
      headers: [],
      rows: [],
      errors: [{ row: 1, message: "File kosong." }],
    };
  }
  const headers = parsed[0].map(normalizeHeader);
  const missing = REQUIRED_HEADERS[kind]
    .split(",")
    .filter((name) => !headers.includes(name));
  if (missing.length > 0) {
    return {
      headers,
      rows: [],
      errors: [
        {
          row: 1,
          message: `Kolom wajib tidak ditemukan: ${missing.join(", ")}.`,
        },
      ],
    };
  }
  return { headers, rows: parsed.slice(1), errors };
}

export async function importHolidaysCsv(actorId: string, csv: string) {
  const { headers, rows, errors } = readRows(csv, "holiday");
  if (errors.length > 0) return { imported: 0, errors };

  const existing = new Set(
    (
      await db.select({ date: holidays.date }).from(holidays)
    ).map((row) => row.date),
  );

  const valid: typeof holidays.$inferInsert[] = [];
  const seen = new Set<string>();
  rows.forEach((cells, index) => {
    const line = index + 2;
    const value = (name: string) =>
      cells[headers.indexOf(name)]?.trim() ?? "";

    const date = value("date");
    const name = value("name");
    const type = value("type");
    const description = value("description");
    const allowWork = parseBoolean(value("allow_work"), false);
    const active = parseBoolean(value("active"), true);

    if (!datePattern.test(date))
      return void errors.push({ row: line, message: "Tanggal harus YYYY-MM-DD." });
    if (name.length === 0 || name.length > 160)
      return void errors.push({
        row: line,
        message: "Nama wajib diisi (maks 160 karakter).",
      });
    if (!["nasional", "cuti_bersama", "perusahaan", "khusus"].includes(type))
      return void errors.push({
        row: line,
        message: "Jenis harus: nasional, cuti_bersama, perusahaan, atau khusus.",
      });
    if (allowWork === null)
      return void errors.push({ row: line, message: "allow_work tidak valid." });
    if (active === null)
      return void errors.push({ row: line, message: "active tidak valid." });
    if (existing.has(date) || seen.has(date))
      return void errors.push({
        row: line,
        message: `Tanggal ${date} sudah ada di kalender libur.`,
      });
    seen.add(date);
    valid.push({
      date,
      name,
      type,
      description: description.slice(0, 500),
      allowWork,
      active,
    });
  });

  if (errors.length > 0 || valid.length === 0)
    return { imported: 0, errors };

  await db.transaction(async (tx) => {
    await tx.insert(holidays).values(valid);
    await tx.insert(auditLogs).values({
      userId: actorId,
      action: "holiday-import",
      entity: "holidays",
      newValue: { count: valid.length },
    });
  });
  return { imported: valid.length, errors };
}

export async function importEmployeesCsv(actorId: string, csv: string) {
  const { headers, rows, errors } = readRows(csv, "employee");
  if (errors.length > 0) return { imported: 0, errors };

  const [existingNiks, existingEmails, departmentRows] = await Promise.all([
    db.select({ nik: employees.nik }).from(employees),
    db.select({ email: user.email }).from(user),
    db.select({ code: departments.code, id: departments.id }).from(departments),
  ]);
  const nikSet = new Set(existingNiks.map((row) => row.nik));
  const emailSet = new Set(existingEmails.map((row) => row.email));
  const departmentByCode = new Map(
    departmentRows.map((row) => [row.code, row.id]),
  );

  type EmployeeImportRow = {
    nik: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    joinDate: string | null;
    departmentId: string | null;
    employmentStatus: "active" | "inactive" | "resigned";
  };
  const valid: EmployeeImportRow[] = [];
  const seenNiks = new Set<string>();
  const seenEmails = new Set<string>();

  rows.forEach((cells, index) => {
    const line = index + 2;
    const value = (name: string) =>
      cells[headers.indexOf(name)]?.trim() ?? "";

    const nik = value("nik");
    const fullName = value("full_name");
    const email = value("email").toLowerCase();
    const phone = value("phone").slice(0, 32);
    const address = value("address");
    const joinDate = value("join_date");
    const departmentCode = value("department_code").toUpperCase();
    const employmentStatus = value("employment_status").toLowerCase() || "active";

    if (nik.length === 0 || nik.length > 32)
      return void errors.push({ row: line, message: "NIK wajib diisi (maks 32)." });
    if (fullName.length === 0 || fullName.length > 160)
      return void errors.push({
        row: line,
        message: "Nama lengkap wajib diisi (maks 160).",
      });
    if (!emailPattern.test(email))
      return void errors.push({ row: line, message: "Email tidak valid." });
    if (!["active", "inactive", "resigned"].includes(employmentStatus))
      return void errors.push({
        row: line,
        message: "Status harus: active, inactive, atau resigned.",
      });
    if (joinDate !== "" && !datePattern.test(joinDate))
      return void errors.push({
        row: line,
        message: "join_date harus YYYY-MM-DD.",
      });
    if (departmentCode !== "" && !departmentByCode.has(departmentCode))
      return void errors.push({
        row: line,
        message: `Kode departemen "${departmentCode}" tidak ditemukan.`,
      });
    if (nikSet.has(nik) || seenNiks.has(nik))
      return void errors.push({ row: line, message: `NIK ${nik} sudah terdaftar.` });
    if (emailSet.has(email) || seenEmails.has(email))
      return void errors.push({
        row: line,
        message: `Email ${email} sudah terdaftar.`,
      });
    seenNiks.add(nik);
    seenEmails.add(email);
    valid.push({
      nik,
      fullName,
      email,
      phone,
      address,
      joinDate: joinDate === "" ? null : joinDate,
      departmentId: departmentCode === "" ? null : departmentByCode.get(departmentCode) ?? null,
      employmentStatus: employmentStatus as EmployeeImportRow["employmentStatus"],
    });
  });

  if (errors.length > 0 || valid.length === 0)
    return { imported: 0, errors };

  await db.transaction(async (tx) => {
    for (const row of valid) {
      const userId = randomUUID();
      await tx.insert(user).values({
        id: userId,
        name: row.fullName,
        email: row.email,
        role: "user",
      });
      await tx.insert(employees).values({
        userId,
        nik: row.nik,
        fullName: row.fullName,
        phone: row.phone,
        address: row.address,
        departmentId: row.departmentId,
        joinDate: row.joinDate,
        employmentStatus: row.employmentStatus,
      });
    }
    await tx.insert(auditLogs).values({
      userId: actorId,
      action: "employee-import",
      entity: "employees",
      newValue: { count: valid.length },
    });
  });
  return { imported: valid.length, errors };
}
