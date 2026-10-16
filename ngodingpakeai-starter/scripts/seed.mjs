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

const ensureLeaveType = async (name, defaultQuota) => {
  await client.query(
    `insert into leave_types (name, default_quota) values ($1, $2)
     on conflict (name) do update set default_quota = excluded.default_quota, updated_at = now()`,
    [name, defaultQuota],
  );
};

const ensureTraining = async (title, date, startTime, endTime, place, departmentId) => {
  const existing = await client.query(
    "select id from trainings where title = $1 and date = $2 limit 1",
    [title, date],
  );
  if (existing.rowCount > 0) return;
  await client.query(
    `insert into trainings (title, date, start_time, end_time, place, department_id, notes)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [title, date, startTime, endTime, place, departmentId, ""],
  );
};

const ensureCalendarEvent = async (title, type, date, note) => {
  const existing = await client.query(
    "select id from calendar_events where title = $1 and date = $2 limit 1",
    [title, date],
  );
  if (existing.rowCount > 0) return;
  await client.query(
    "insert into calendar_events (title, type, date, note) values ($1, $2, $3, $4)",
    [title, type, date, note],
  );
};

const ensureFinanceEntry = async (date, type, category, amount, note) => {
  const existing = await client.query(
    "select id from finance_entries where date = $1 and type = $2 and category = $3 limit 1",
    [date, type, category],
  );
  if (existing.rowCount > 0) return;
  await client.query(
    "insert into finance_entries (date, type, category, amount, note) values ($1, $2, $3, $4, $5)",
    [date, type, category, amount, note ?? ""],
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

  await ensureLeaveType("Cuti Tahunan", 12);
  await ensureLeaveType("Cuti Melahirkan", 90);
  await ensureLeaveType("Cuti Menikah", 3);
  console.log("leave types: 3");

  await ensureTraining("Induksi K3 Dasar", "2026-10-20", "09:00", "12:00", "Ruang Meeting Kantor Pusat", null);
  await ensureTraining("Pelatihan SOP Gudang", "2026-10-22", "13:00", "16:00", "Gudang Cikarang", gdg);
  await ensureTraining("Refreshment Akuntansi", "2026-10-27", "09:00", "11:00", "Ruang Meeting Kantor Pusat", keu);
  console.log("trainings: 3");

  const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const pad = (value) => String(value).padStart(2, "0");
  const monthPrefix = year + "-" + pad(month);

  await ensureCalendarEvent(
    "Payday " + MONTHS[month - 1],
    "gajian",
    monthPrefix + "-25",
    "Transfer sebelum 15.00",
  );
  await ensureCalendarEvent(
    "Rapat evaluasi bulanan",
    "agenda",
    monthPrefix + "-28",
    "Evaluasi kinerja & jadwal bulan depan",
  );
  await ensureCalendarEvent(
    "Maintenance peralatan produksi",
    "agenda",
    monthPrefix + "-14",
    "Dapur tutup sementara 2 jam",
  );
  console.log("calendar events: 3");

  // Keuangan: agregat bulan-bulan sebelumnya + rincian harian bulan berjalan.
  for (let m = 1; m < month; m += 1) {
    const mPrefix = year + "-" + pad(m);
    await ensureFinanceEntry(mPrefix + "-01", "income", "Penjualan dine-in", 150000000, "Agregat bulanan");
    await ensureFinanceEntry(mPrefix + "-01", "income", "Pesanan online", 62000000, "Agregat bulanan");
    await ensureFinanceEntry(mPrefix + "-01", "income", "Katering & event", 28000000, "Agregat bulanan");
    await ensureFinanceEntry(mPrefix + "-05", "expense", "Gaji & tunjangan karyawan", 42400000, "Payday bulanan");
    await ensureFinanceEntry(mPrefix + "-05", "expense", "Bahan baku & persediaan", 81600000, "Agregat bulanan");
    await ensureFinanceEntry(mPrefix + "-05", "expense", "Operasional (sewa, listrik, air)", 54200000, "Agregat bulanan");
    await ensureFinanceEntry(mPrefix + "-20", "expense", "Training & pengembangan", 2100000, "Agregat bulanan");
    await ensureFinanceEntry(mPrefix + "-15", "expense", "Lain-lain", 5400000, "Agregat bulanan");
  }

  const daysElapsed = now.getDate();
  for (let day = 1; day <= daysElapsed; day += 1) {
    const date = monthPrefix + "-" + pad(day);
    const dine = 4200000 + ((day * 7919) % 1000) * 1200;
    const online = 1700000 + ((day * 6151) % 1000) * 600;
    await ensureFinanceEntry(date, "income", "Penjualan dine-in", dine, "");
    await ensureFinanceEntry(date, "income", "Pesanan online", online, "");
    if (day % 5 === 0) {
      await ensureFinanceEntry(
        date,
        "income",
        "Katering & event",
        6500000 + ((day * 3571) % 5) * 500000,
        "",
      );
    }
    await ensureFinanceEntry(
      date,
      "expense",
      "Bahan baku & persediaan",
      1900000 + ((day * 4021) % 700) * 1000,
      "",
    );
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday === 1) {
      await ensureFinanceEntry(date, "expense", "Operasional (sewa, listrik, air)", 3100000, "Mingguan");
    }
    if (day === 15) {
      await ensureFinanceEntry(date, "expense", "Lain-lain", 1500000, "");
    }
    if (day === 20) {
      await ensureFinanceEntry(date, "expense", "Training & pengembangan", 2100000, "");
    }
    if (day === 25) {
      await ensureFinanceEntry(date, "expense", "Gaji & tunjangan karyawan", 42400000, "Payday");
    }
  }
  console.log("finance entries: agregat + harian bulan ini");

  console.log("\nSeed complete. Existing rows are preserved.");
} catch (error) {
  console.error("Seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end();
}
