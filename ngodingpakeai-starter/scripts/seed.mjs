import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");

if (!existsSync(envPath)) {
  console.error("Missing .env.local. Run npm run setup first.");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (match) env[match[1]] = match[2];
}

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from .env.local.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });

const upsertDepartment = async (code, name) => {
  const { rows } = await client.query(
    `insert into departments (code, name) values ($1, $2)
     on conflict (code) do update set name = excluded.name, updated_at = now()
     returning id`,
    [code, name],
  );
  return rows[0].id;
};

const ensurePosition = async (name, departmentId, level) => {
  const existing = await client.query(
    "select id from positions where name = $1 and department_id = $2 limit 1",
    [name, departmentId],
  );
  if (existing.rowCount > 0) return existing.rows[0].id;
  const { rows } = await client.query(
    "insert into positions (name, department_id, level) values ($1, $2, $3) returning id",
    [name, departmentId, level],
  );
  return rows[0].id;
};

const ensureWorkLocation = async (name, address, latitude, longitude, radiusM) => {
  const existing = await client.query(
    "select id from work_locations where name = $1 limit 1",
    [name],
  );
  if (existing.rowCount > 0) return existing.rows[0].id;
  const { rows } = await client.query(
    `insert into work_locations (name, address, latitude, longitude, radius_m)
     values ($1, $2, $3, $4, $5) returning id`,
    [name, address, latitude, longitude, radiusM],
  );
  return rows[0].id;
};

const ensureShift = async (name, startTime, endTime, crossesMidnight) => {
  const existing = await client.query("select id from shifts where name = $1 limit 1", [name]);
  if (existing.rowCount > 0) return existing.rows[0].id;
  const { rows } = await client.query(
    `insert into shifts (name, start_time, end_time, crosses_midnight)
     values ($1, $2, $3, $4) returning id`,
    [name, startTime, endTime, crossesMidnight],
  );
  return rows[0].id;
};

const ensureHoliday = async (date, name, type, allowWork) => {
  await client.query(
    `insert into holidays (date, name, type, allow_work)
     values ($1, $2, $3, $4)
     on conflict (date) do update set name = excluded.name, type = excluded.type, updated_at = now()`,
    [date, name, type, allowWork],
  );
};

try {
  await client.connect();

  const company = await client.query("select id from companies limit 1");
  if (company.rowCount === 0) {
    await client.query("insert into companies (name) values ($1)", ["PT Hadir Sejahtera"]);
    console.log("company: PT Hadir Sejahtera");
  }

  const ops = await upsertDepartment("OPS", "Operasional");
  const keu = await upsertDepartment("KEU", "Keuangan");
  const gdg = await upsertDepartment("GDG", "Gudang");
  console.log("departments: OPS, KEU, GDG");

  await ensurePosition("Staf Operasional", ops, 1);
  await ensurePosition("Supervisor", ops, 3);
  await ensurePosition("Staf Akuntansi", keu, 2);
  await ensurePosition("Staf Pajak", keu, 2);
  await ensurePosition("Operator", gdg, 1);
  console.log("positions: 5");

  await ensureWorkLocation("Kantor Pusat", "Jl. Jend. Sudirman Kav. 52, Jakarta", -6.2088, 106.8456, 100);
  await ensureWorkLocation("Gudang Cikarang", "Jl. Industri Selatan Blok GG, Cikarang", -6.2844, 107.154, 150);
  console.log("work locations: 2");

  await ensureShift("Shift Pagi", "06:00", "14:00", false);
  await ensureShift("Shift Siang", "14:00", "22:00", false);
  await ensureShift("Shift Malam", "22:00", "06:00", true);
  console.log("shifts: 3");

  await ensureHoliday("2026-08-17", "Hari Kemerdekaan", "nasional", true);
  await ensureHoliday("2026-12-25", "Hari Natal", "nasional", false);
  await ensureHoliday("2026-12-24", "Cuti bersama Natal", "cuti_bersama", false);
  await ensureHoliday("2026-01-01", "Tahun Baru", "nasional", false);
  console.log("holidays: 4");

  console.log("\nSeed complete. Existing rows are preserved.");
} catch (error) {
  console.error("Seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end();
}
