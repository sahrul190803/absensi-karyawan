// Menyiapkan akun & data demo pada aplikasi yang sudah berjalan (lokal atau
// hosting). Membuat akun lewat API sign-up aplikasi, lalu melengkapi peran,
// data karyawan, lokasi demo, dan jadwal 14 hari lewat koneksi database.
//
// Usage:
//   npm run demo:accounts -- https://aplikasi-anda.vercel.app
//
// Database tujuan mengikuti DATABASE_URL dari environment; bila kosong,
// memakai .env.local (database lokal).

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const PASSWORD = "DemoHadirku2026!";
const GPS_ACCURACY_LIMIT_M = 500;

const demoLocation = {
  name: "Lokasi Demo (radius besar)",
  address:
    "Pusat Jakarta — radius besar agar uji coba absen bisa dari mana saja",
  latitude: -6.2088,
  longitude: 106.8456,
  radiusM: 20_000_000,
};

const accounts = [
  {
    email: "hrd@hadirku.demo",
    name: "Rina Kartika",
    role: "hrd",
    nik: "DEMO-HRD",
    departmentCode: "HRD",
    positionName: null,
    locationName: null,
  },
  {
    email: "hod@hadirku.demo",
    name: "Hendra Wijaya",
    role: "hod",
    nik: "DEMO-HOD",
    departmentCode: "KIT",
    positionName: "Head Kitchen",
    locationName: "Gudang Cikarang",
  },
  {
    email: "marketing@hadirku.demo",
    name: "Maya Sari",
    role: "marketing",
    nik: "DEMO-MKT",
    departmentCode: "MKT",
    positionName: "Digital Marketing",
    locationName: "Kantor Pusat",
  },
  {
    email: "karyawan@hadirku.demo",
    name: "Andi Pratama",
    role: "user",
    nik: "DEMO-KRY",
    departmentCode: "KIT",
    positionName: "Cook",
    locationName: demoLocation.name,
  },
];

const baseUrlArg = process.argv
  .slice(2)
  .find((value) => /^https?:\/\//i.test(value));
const baseUrl = (baseUrlArg || process.env.APP_URL || "").replace(/\/+$/, "");
if (!baseUrl) {
  console.error(
    "Usage: npm run demo:accounts -- https://aplikasi-anda.example\n" +
      "Atau set APP_URL di environment.",
  );
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");
const env = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) env[match[1]] = match[2];
  }
}
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Missing DATABASE_URL. Set it in the environment or run npm run setup first.",
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((accept) => setTimeout(accept, ms));

const signUp = async (account) => {
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({
      email: account.email,
      password: PASSWORD,
      name: account.name,
    }),
  });
  if (response.ok) return "created";
  const body = await response.json().catch(() => ({}));
  const message = body?.message ?? "";
  if (response.status === 422 && /exist/i.test(message)) return "exists";
  if (response.status === 429) {
    await sleep(6000);
    return signUp(account);
  }
  throw new Error(
    `Sign-up ${account.email} gagal (${response.status}): ${message || "unknown"}`,
  );
};

const todayInJakarta = (offsetDays = 0) => {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const client = new pg.Client({ connectionString });

try {
  console.log(`Menyiapkan akun demo di ${baseUrl} ...`);
  for (const [index, account] of accounts.entries()) {
    const status = await signUp(account);
    console.log(`- ${account.email}: ${status}`);
    if (index < accounts.length - 1) await sleep(4000);
  }

  await client.connect();

  const company = await client.query("select id from companies limit 1");
  if (company.rowCount === 0) {
    await client.query("insert into companies (name) values ($1)", [
      "PT Hadir Sejahtera",
    ]);
  }
  await client.query("update companies set gps_accuracy_limit_m = $1", [
    GPS_ACCURACY_LIMIT_M,
  ]);

  const locationId = await (async () => {
    const existing = await client.query(
      "select id from work_locations where name = $1 limit 1",
      [demoLocation.name],
    );
    if (existing.rowCount > 0) return existing.rows[0].id;
    const { rows } = await client.query(
      `insert into work_locations (name, address, latitude, longitude, radius_m, description)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        demoLocation.name,
        demoLocation.address,
        demoLocation.latitude,
        demoLocation.longitude,
        demoLocation.radiusM,
        "Dibuat otomatis untuk uji coba demo.",
      ],
    );
    return rows[0].id;
  })();

  const shift = await client.query(
    "select id, name from shifts order by start_time asc limit 1",
  );
  if (shift.rowCount === 0) {
    console.error("Data master belum ada. Jalankan dulu: npm run seed");
    process.exit(1);
  }

  const findLocation = async (name) => {
    if (!name) return null;
    const { rows } = await client.query(
      "select id from work_locations where name = $1 limit 1",
      [name],
    );
    return rows[0]?.id ?? null;
  };

  for (const account of accounts) {
    const accountRow = await client.query(
      'select id from "user" where lower(email) = lower($1) limit 1',
      [account.email],
    );
    if (accountRow.rowCount === 0) {
      console.error(`Akun ${account.email} tidak ditemukan di database.`);
      process.exit(1);
    }
    const userId = accountRow.rows[0].id;

    await client.query(
      'update "user" set role = $1, updated_at = now() where id = $2',
      [account.role, userId],
    );

    const departmentId = account.departmentCode
      ? ((
          await client.query(
            "select id from departments where code = $1 limit 1",
            [account.departmentCode],
          )
        ).rows[0]?.id ?? null)
      : null;
    const positionId =
      account.positionName && departmentId
        ? ((
            await client.query(
              "select id from positions where name = $1 and department_id = $2 limit 1",
              [account.positionName, departmentId],
            )
          ).rows[0]?.id ?? null)
        : null;
    const locationName =
      account.locationName === demoLocation.name
        ? demoLocation.name
        : account.locationName;
    const employeeLocationId =
      locationName === demoLocation.name
        ? locationId
        : await findLocation(locationName);

    const existingEmployee = await client.query(
      "select id from employees where user_id = $1 limit 1",
      [userId],
    );
    let employeeId;
    if (existingEmployee.rowCount > 0) {
      employeeId = existingEmployee.rows[0].id;
      await client.query(
        `update employees set nik = $1, full_name = $2, department_id = $3,
           position_id = $4, work_location_id = $5, employment_status = 'active',
           updated_at = now()
         where id = $6`,
        [
          account.nik,
          account.name,
          departmentId,
          positionId,
          employeeLocationId,
          employeeId,
        ],
      );
    } else {
      const { rows } = await client.query(
        `insert into employees (user_id, nik, full_name, department_id, position_id, work_location_id)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [
          userId,
          account.nik,
          account.name,
          departmentId,
          positionId,
          employeeLocationId,
        ],
      );
      employeeId = rows[0].id;
    }

    if (employeeLocationId && account.role !== "hrd") {
      for (let offset = 0; offset < 14; offset += 1) {
        await client.query(
          `insert into work_schedules (employee_id, date, shift_id, work_location_id)
           values ($1, $2, $3, $4)
           on conflict (employee_id, date) do nothing`,
          [
            employeeId,
            todayInJakarta(offset),
            shift.rows[0].id,
            employeeLocationId,
          ],
        );
      }
    }
    console.log(
      `- ${account.email}: role ${account.role}, karyawan ${account.nik}, jadwal 14 hari`,
    );
  }

  console.log("\nSelesai. Daftar akun demo:");
  for (const account of accounts) {
    console.log(`  ${account.role.padEnd(9)} ${account.email}  /  ${PASSWORD}`);
  }
  console.log(
    "\nCatatan: radius lokasi demo dibuat sangat besar dan batas akurasi GPS 500 m\n" +
      "agar klien bisa menguji absensi dari mana saja. Ubah di menu Pengaturan / Lokasi\n" +
      "sebelum aplikasi dipakai sungguhan.",
  );
} catch (error) {
  console.error(
    "\nDemo setup gagal:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
