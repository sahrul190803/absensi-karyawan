// Mengisi data demo yang kaya untuk presentasi klien: puluhan karyawan
// fiktif lengkap dengan jadwal, absensi, pengajuan, cuti, klaim makan,
// peserta training, payroll, notifikasi, dan audit log.
//
// Usage:
//   npm run demo:data
//   DATABASE_URL="postgresql://..." node scripts/seed-demo-data.mjs
//
// Script bersifat idempotent: aman dijalankan berulang kali. Data master
// yang sudah ada tidak dihapus; baris demo diperbarui atau dilewati.

import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const root = resolve(import.meta.dirname, "..");
const env = {};
const envPath = resolve(root, ".env.local");
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

const hash = (value) =>
  crypto.createHash("sha1").update(`hadirku-demo:${value}`).digest("hex");

const uuid = (key) => {
  const h = hash(key);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(12, 15)}-a${h.slice(15, 18)}-${h.slice(18, 30)}`;
};

const rand = (seed) => parseInt(hash(seed).slice(0, 8), 16) / 0xffffffff;
const randInt = (seed, min, max) =>
  Math.floor(rand(seed) * (max - min + 1)) + min;

const pad = (value) => String(value).padStart(2, "0");

const todayInJakarta = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const dayOfWeek = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();
const isWeekend = (date) => {
  const day = dayOfWeek(date);
  return day === 0 || day === 6;
};

const nextWeekday = (date) => {
  let value = date;
  while (isWeekend(value)) value = addDays(value, 1);
  return value;
};

const minutes = (clock) => {
  const [hour, minute] = clock.split(":").map(Number);
  return hour * 60 + minute;
};

// Waktu lokal Asia/Jakarta (UTC+7) menjadi ISO UTC.
const jakartaTimestamp = (date, clock, dayOffset = 0) => {
  const [hour, minute] = clock.split(":").map(Number);
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      hour - 7,
      minute,
    ),
  ).toISOString();
};

const nowInJakartaMinutes = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
};

const escapeXml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );

const jakartaClockLabel = (value) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));

const jakartaDateLabel = (date) =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));

// Foto demo sintetis agar kartu absensi punya pratinjau yang bisa dibuka.
const demoAttendancePhoto = ({ key, name, label, time, place, date }) => {
  const palettes = [
    ["#0f766e", "#0d9488", "#134e4a"],
    ["#1e3a8a", "#2563eb", "#172554"],
    ["#7c2d12", "#ea580c", "#431407"],
    ["#4c1d95", "#7c3aed", "#2e1065"],
    ["#831843", "#db2777", "#500724"],
    ["#164e63", "#0891b2", "#083344"],
  ];
  const [from, via, to] =
    palettes[Math.floor(rand(`${key}:palette`) * palettes.length)];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const nameSize = name.length > 24 ? 24 : name.length > 18 ? 27 : 30;
  const safeName = escapeXml(name);
  const safePlace = escapeXml(place);
  const safeLabel = escapeXml(label.toUpperCase());
  const timeLabel = jakartaClockLabel(time);
  const dateLabel = jakartaDateLabel(date);

  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640" role="img" aria-label="${safeLabel} ${safeName}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset=".55" stop-color="${via}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".62"/>
    </linearGradient>
  </defs>
  <rect width="480" height="640" fill="url(#bg)"/>
  <circle cx="52" cy="128" r="180" fill="#ffffff" opacity=".07"/>
  <circle cx="438" cy="248" r="150" fill="#ffffff" opacity=".06"/>
  <circle cx="352" cy="78" r="58" fill="#ffffff" opacity=".09"/>
  <circle cx="240" cy="252" r="96" fill="#ffffff" opacity=".18"/>
  <circle cx="240" cy="252" r="96" fill="none" stroke="#ffffff" stroke-opacity=".4" stroke-width="2"/>
  <ellipse cx="240" cy="598" rx="196" ry="176" fill="#ffffff" opacity=".14"/>
  <text x="240" y="284" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="84" font-weight="700" fill="#ffffff" fill-opacity=".92">${escapeXml(initials)}</text>
  <g font-family="Segoe UI, Arial, sans-serif">
    <rect x="32" y="32" width="248" height="38" rx="19" fill="#000000" opacity=".28"/>
    <text x="52" y="57" font-size="15" font-weight="700" letter-spacing="1.5" fill="#ffffff">${safeLabel}</text>
    <rect x="356" y="32" width="92" height="38" rx="19" fill="#000000" opacity=".28"/>
    <text x="402" y="58" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff">${timeLabel}</text>
  </g>
  <rect x="0" y="424" width="480" height="216" fill="url(#shade)"/>
  <g font-family="Segoe UI, Arial, sans-serif">
    <text x="32" y="512" font-size="${nameSize}" font-weight="700" fill="#ffffff">${safeName}</text>
    <text x="32" y="552" font-size="18" fill="#ffffff" fill-opacity=".84">${safePlace}</text>
    <text x="32" y="584" font-size="16" fill="#ffffff" fill-opacity=".7">${dateLabel}</text>
    <text x="448" y="584" text-anchor="end" font-size="13" font-weight="700" letter-spacing="2" fill="#ffffff" fill-opacity=".55">DEMO</text>
  </g>
</svg>`,
    "utf8",
  );
};

const today = todayInJakarta();
const [year, month] = today.split("-").map(Number);
const nowMinutes = nowInJakartaMinutes();
const firstOfPrevMonth = `${month === 1 ? year - 1 : year}-${pad(month === 1 ? 12 : month - 1)}-01`;
const scheduleTo = addDays(today, 28);

const departmentDefs = [
  ["HRD", "HRD"],
  ["BAR", "Bar"],
  ["KIT", "Kitchen"],
  ["SRV", "Service"],
  ["ACC", "Accounting"],
  ["MKT", "Marketing"],
];

// [nama posisi, kode departemen, level]
const positionDefs = [
  ["PA (Public Area)", "HRD", 1],
  ["Security", "HRD", 1],
  ["HR Admin", "HRD", 1],
  ["Recruiter", "HRD", 1],
  ["Payroll Staff", "HRD", 1],
  ["Helper", "KIT", 1],
  ["Steward", "KIT", 1],
  ["Cuci piring", "KIT", 1],
  ["Cook", "KIT", 2],
  ["CDP", "KIT", 2],
  ["Head Kitchen", "KIT", 3],
  ["Barista", "BAR", 1],
  ["Captain Bar", "BAR", 2],
  ["Head Bar", "BAR", 3],
  ["Greeter", "SRV", 1],
  ["Waitress", "SRV", 1],
  ["Runner", "SRV", 1],
  ["Head Service", "SRV", 3],
  ["Cost Control", "ACC", 2],
  ["Purchasing", "ACC", 2],
  ["Finance Manager", "ACC", 3],
  ["Digital Marketing", "MKT", 1],
  ["Marketing Manager", "MKT", 3],
];

const locationDefs = [
  {
    key: "pusat",
    name: "Kantor Pusat",
    address: "Jl. Jend. Sudirman Kav. 52, Jakarta",
    latitude: -6.2088,
    longitude: 106.8456,
    radiusM: 100,
  },
  {
    key: "gudang",
    name: "Gudang Cikarang",
    address: "Jl. Industri Selatan Blok GG, Cikarang",
    latitude: -6.2844,
    longitude: 107.154,
    radiusM: 150,
  },
  {
    key: "kemang",
    name: "Outlet Kemang",
    address: "Jl. Kemang Raya No. 18, Jakarta Selatan",
    latitude: -6.2606,
    longitude: 106.8132,
    radiusM: 120,
  },
  {
    key: "demo",
    name: "Lokasi Demo (radius besar)",
    address:
      "Pusat Jakarta - radius besar agar uji coba absen bisa dari mana saja",
    latitude: -6.2088,
    longitude: 106.8456,
    radiusM: 20000000,
  },
];

const banks = ["BCA", "Mandiri", "BRI", "BNI", "CIMB Niaga"];

// key, nama, dept, posisi, lokasi, tipe gaji, gaji, tanggal masuk
const fictionalStaff = [
  [
    "siti",
    "Siti Nurhaliza",
    "HRD",
    "HR Admin",
    "pusat",
    "monthly",
    6500000,
    "2023-02-01",
  ],
  [
    "budi",
    "Budi Santoso",
    "HRD",
    "Recruiter",
    "pusat",
    "monthly",
    6000000,
    "2022-08-15",
  ],
  [
    "dewi",
    "Dewi Lestari",
    "HRD",
    "Payroll Staff",
    "pusat",
    "monthly",
    5800000,
    "2024-01-08",
  ],
  [
    "agus",
    "Agus Salim",
    "HRD",
    "Security",
    "pusat",
    "monthly",
    4600000,
    "2021-11-01",
  ],
  [
    "joko",
    "Joko Susilo",
    "HRD",
    "Security",
    "pusat",
    "monthly",
    4600000,
    "2023-05-02",
  ],

  [
    "rudi",
    "Rudi Hartono",
    "KIT",
    "Head Kitchen",
    "gudang",
    "monthly",
    10000000,
    "2021-03-01",
  ],
  [
    "wahyu",
    "Wahyu Setiawan",
    "KIT",
    "CDP",
    "gudang",
    "monthly",
    6800000,
    "2022-06-13",
  ],
  [
    "slamet",
    "Slamet Riyadi",
    "KIT",
    "CDP",
    "gudang",
    "monthly",
    6500000,
    "2022-09-05",
  ],
  [
    "fitri",
    "Fitri Handayani",
    "KIT",
    "Cook",
    "gudang",
    "monthly",
    5200000,
    "2023-04-10",
  ],
  [
    "aisyah",
    "Nur Aisyah",
    "KIT",
    "Cook",
    "gudang",
    "monthly",
    5000000,
    "2023-07-17",
  ],
  [
    "eko",
    "Eko Prasetyo",
    "KIT",
    "Cook",
    "gudang",
    "monthly",
    5000000,
    "2024-02-12",
  ],
  [
    "rina",
    "Rina Wulandari",
    "KIT",
    "Cook",
    "gudang",
    "monthly",
    5000000,
    "2024-05-06",
  ],
  [
    "bambang",
    "Bambang Supriyanto",
    "KIT",
    "Helper",
    "gudang",
    "monthly",
    4300000,
    "2022-01-10",
  ],
  [
    "dedi",
    "Dedi Kurniawan",
    "KIT",
    "Helper",
    "gudang",
    "monthly",
    4300000,
    "2023-10-02",
  ],
  [
    "tati",
    "Tati Suryani",
    "KIT",
    "Steward",
    "gudang",
    "monthly",
    4200000,
    "2023-08-21",
  ],
  [
    "imron",
    "Imron Rosyadi",
    "KIT",
    "Steward",
    "gudang",
    "monthly",
    4200000,
    "2024-03-04",
  ],
  [
    "yuni",
    "Yuni Astuti",
    "KIT",
    "Cuci piring",
    "gudang",
    "daily",
    190000,
    "2024-06-10",
  ],
  [
    "anton",
    "Anton Nugroho",
    "KIT",
    "Helper",
    "gudang",
    "daily",
    185000,
    "2025-01-06",
  ],

  [
    "galih",
    "Galih Pratama",
    "BAR",
    "Head Bar",
    "kemang",
    "monthly",
    8500000,
    "2021-09-01",
  ],
  [
    "reza",
    "Reza Fauzi",
    "BAR",
    "Captain Bar",
    "kemang",
    "monthly",
    6200000,
    "2022-07-18",
  ],
  [
    "dimas",
    "Dimas Saputra",
    "BAR",
    "Captain Bar",
    "kemang",
    "monthly",
    6000000,
    "2023-02-20",
  ],
  [
    "aulia",
    "Aulia Rahma",
    "BAR",
    "Barista",
    "kemang",
    "monthly",
    4800000,
    "2023-06-12",
  ],
  [
    "fajar",
    "Fajar Ramadhan",
    "BAR",
    "Barista",
    "kemang",
    "monthly",
    4800000,
    "2023-09-25",
  ],
  [
    "nabila",
    "Nabila Putri",
    "BAR",
    "Barista",
    "kemang",
    "monthly",
    4700000,
    "2024-01-15",
  ],
  [
    "yoga",
    "Yoga Pratama",
    "BAR",
    "Barista",
    "kemang",
    "monthly",
    4700000,
    "2024-04-01",
  ],
  [
    "intan",
    "Intan Permata",
    "BAR",
    "Barista",
    "kemang",
    "monthly",
    4600000,
    "2024-07-08",
  ],
  [
    "bayu",
    "Bayu Firmansyah",
    "BAR",
    "Barista",
    "kemang",
    "daily",
    190000,
    "2024-09-02",
  ],
  [
    "sari",
    "Sari Oktaviani",
    "BAR",
    "Barista",
    "kemang",
    "daily",
    190000,
    "2025-02-03",
  ],

  [
    "aditya",
    "Aditya Wijaya",
    "SRV",
    "Head Service",
    "kemang",
    "monthly",
    8000000,
    "2021-10-11",
  ],
  [
    "putri",
    "Putri Maharani",
    "SRV",
    "Greeter",
    "kemang",
    "monthly",
    4900000,
    "2022-11-07",
  ],
  [
    "rizky",
    "Rizky Ananda",
    "SRV",
    "Greeter",
    "kemang",
    "monthly",
    4800000,
    "2023-03-13",
  ],
  [
    "melati",
    "Melati Kusuma",
    "SRV",
    "Waitress",
    "kemang",
    "monthly",
    4600000,
    "2023-05-22",
  ],
  [
    "anisa",
    "Anisa Fitriani",
    "SRV",
    "Waitress",
    "kemang",
    "monthly",
    4600000,
    "2023-08-14",
  ],
  [
    "dwi",
    "Dwi Lestari",
    "SRV",
    "Waitress",
    "kemang",
    "monthly",
    4500000,
    "2023-11-06",
  ],
  [
    "raka",
    "Raka Pratama",
    "SRV",
    "Waitress",
    "kemang",
    "monthly",
    4500000,
    "2024-02-19",
  ],
  [
    "indah",
    "Indah Permatasari",
    "SRV",
    "Runner",
    "kemang",
    "monthly",
    4400000,
    "2024-04-22",
  ],
  [
    "fikri",
    "Fikri Haikal",
    "SRV",
    "Runner",
    "kemang",
    "monthly",
    4400000,
    "2024-06-03",
  ],
  [
    "rani",
    "Rani Anggraini",
    "SRV",
    "Waitress",
    "kemang",
    "monthly",
    4500000,
    "2024-08-12",
  ],
  [
    "arif",
    "Arif Budiman",
    "SRV",
    "Runner",
    "kemang",
    "daily",
    180000,
    "2024-10-07",
  ],
  [
    "sinta",
    "Sinta Dewi",
    "SRV",
    "Greeter",
    "kemang",
    "daily",
    180000,
    "2025-01-13",
  ],
  [
    "teguh",
    "Teguh Santoso",
    "SRV",
    "Runner",
    "kemang",
    "daily",
    180000,
    "2025-03-03",
  ],

  [
    "dinda",
    "Dinda Ayu Lestari",
    "MKT",
    "Marketing Manager",
    "pusat",
    "monthly",
    9500000,
    "2022-04-04",
  ],
  [
    "bagus",
    "Bagus Hermawan",
    "MKT",
    "Digital Marketing",
    "pusat",
    "monthly",
    6200000,
    "2023-01-16",
  ],
  [
    "citra",
    "Citra Kirana",
    "MKT",
    "Digital Marketing",
    "pusat",
    "monthly",
    6000000,
    "2023-06-19",
  ],
  [
    "rangga",
    "Rangga Aditya",
    "MKT",
    "Digital Marketing",
    "pusat",
    "monthly",
    5800000,
    "2024-02-05",
  ],

  [
    "kartika",
    "Kartika Sari",
    "ACC",
    "Finance Manager",
    "pusat",
    "monthly",
    11000000,
    "2021-07-19",
  ],
  [
    "hendro",
    "Hendro Wibowo",
    "ACC",
    "Cost Control",
    "pusat",
    "monthly",
    7000000,
    "2022-10-10",
  ],
  [
    "lia",
    "Lia Amelia",
    "ACC",
    "Purchasing",
    "pusat",
    "monthly",
    6500000,
    "2023-04-17",
  ],
  [
    "fahmi",
    "Fahmi Idris",
    "ACC",
    "Purchasing",
    "pusat",
    "monthly",
    6300000,
    "2024-01-22",
  ],
];

const demoStaff = [
  [
    "hrd",
    "Rina Kartika",
    "hrd@hadirku.demo",
    "HRD",
    null,
    null,
    "monthly",
    12000000,
  ],
  [
    "hod",
    "Hendra Wijaya",
    "hod@hadirku.demo",
    "KIT",
    "Head Kitchen",
    "gudang",
    "monthly",
    9500000,
  ],
  [
    "marketing",
    "Maya Sari",
    "marketing@hadirku.demo",
    "MKT",
    "Digital Marketing",
    "pusat",
    "monthly",
    7500000,
  ],
  [
    "karyawan",
    "Andi Pratama",
    "karyawan@hadirku.demo",
    "KIT",
    "Cook",
    "demo",
    "monthly",
    5200000,
  ],
];

const client = new pg.Client({ connectionString });

const insertRows = async (
  table,
  columns,
  rows,
  conflictClause = "",
  batchSize = 150,
) => {
  for (let start = 0; start < rows.length; start += batchSize) {
    const chunk = rows.slice(start, start + batchSize);
    const values = [];
    const params = [];
    for (const row of chunk) {
      const placeholders = row.map(
        (_, index) => `$${params.length + index + 1}`,
      );
      values.push(`(${placeholders.join(", ")})`);
      params.push(...row);
    }
    await client.query(
      `insert into ${table} (${columns.join(", ")}) values ${values.join(", ")} ${conflictClause}`,
      params,
    );
  }
};

const loadUserIds = async (emails) => {
  const result = await client.query(
    'select id, email, role from "user" where lower(email) = any($1::text[])',
    [emails.map((email) => email.toLowerCase())],
  );
  return new Map(result.rows.map((row) => [row.email.toLowerCase(), row]));
};

const run = async () => {
  console.log(`Menghubungkan ke database...`);
  await client.connect();
  await client.query("begin");

  try {
    const company = await client.query("select id from companies limit 1");
    if (company.rowCount === 0) {
      await client.query("insert into companies (name) values ($1)", [
        "PT Hadir Sejahtera",
      ]);
    }
    await client.query("update companies set gps_accuracy_limit_m = 500");

    const departmentIds = new Map();
    for (const [code, name] of departmentDefs) {
      const result = await client.query(
        `insert into departments (code, name) values ($1, $2)
         on conflict (code) do update set name = excluded.name, updated_at = now()
         returning id`,
        [code, name],
      );
      departmentIds.set(code, result.rows[0].id);
    }

    // Rapikan posisi lama yang belum punya departemen.
    for (const [name, code] of [
      ["Barista", "BAR"],
      ["Captain Bar", "BAR"],
      ["Head Bar", "BAR"],
      ["Greeter", "SRV"],
      ["Waitress", "SRV"],
      ["Runner", "SRV"],
      ["Cost Control", "ACC"],
      ["Purchasing", "ACC"],
    ]) {
      await client.query(
        `update positions set department_id = $1, updated_at = now()
         where name = $2 and department_id is null`,
        [departmentIds.get(code), name],
      );
    }

    const positionIds = new Map();
    for (const [name, code, level] of positionDefs) {
      const departmentId = departmentIds.get(code);
      const existing = await client.query(
        `select id from positions where name = $1 and department_id = $2 limit 1`,
        [name, departmentId],
      );
      if (existing.rowCount > 0) {
        positionIds.set(`${code}:${name}`, existing.rows[0].id);
        continue;
      }
      const inserted = await client.query(
        `insert into positions (name, department_id, level) values ($1, $2, $3) returning id`,
        [name, departmentId, level],
      );
      positionIds.set(`${code}:${name}`, inserted.rows[0].id);
    }

    const locationIds = new Map();
    const locationNamesById = new Map();
    for (const location of locationDefs) {
      const existing = await client.query(
        `select id from work_locations where name = $1 limit 1`,
        [location.name],
      );
      if (existing.rowCount > 0) {
        locationIds.set(location.key, existing.rows[0].id);
        locationNamesById.set(existing.rows[0].id, location.name);
        continue;
      }
      const inserted = await client.query(
        `insert into work_locations (name, address, latitude, longitude, radius_m, description)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [
          location.name,
          location.address,
          location.latitude,
          location.longitude,
          location.radiusM,
          "Lokasi demo untuk presentasi klien.",
        ],
      );
      locationIds.set(location.key, inserted.rows[0].id);
      locationNamesById.set(inserted.rows[0].id, location.name);
    }

    const shiftRows = await client.query(
      `select id, name, start_time::text as start_time, end_time::text as end_time,
              tolerance_minutes, crosses_midnight
       from shifts where active = true order by start_time`,
    );
    if (shiftRows.rowCount === 0) {
      throw new Error(
        "Data shift belum ada. Jalankan npm run seed terlebih dahulu.",
      );
    }
    const shiftByName = new Map(shiftRows.rows.map((row) => [row.name, row]));
    const shiftPagi = shiftByName.get("Shift Pagi") ?? shiftRows.rows[0];
    const shiftSiang = shiftByName.get("Shift Siang") ?? shiftRows.rows[0];
    const shiftMalam = shiftByName.get("Shift Malam") ?? shiftRows.rows[0];
    const shiftCycle = [shiftPagi, shiftSiang, shiftMalam];

    const demoUsers = await loadUserIds(demoStaff.map((row) => row[2]));
    for (const [, , email] of demoStaff) {
      if (!demoUsers.has(email.toLowerCase())) {
        throw new Error(
          `Akun demo ${email} belum ada. Jalankan npm run demo:accounts terlebih dahulu.`,
        );
      }
    }

    const staffByKey = new Map();

    for (const [
      key,
      name,
      email,
      dept,
      position,
      location,
      salaryType,
      baseSalary,
    ] of demoStaff) {
      const userRow = demoUsers.get(email.toLowerCase());
      const departmentId = departmentIds.get(dept);
      const positionId = position
        ? (positionIds.get(`${dept}:${position}`) ?? null)
        : null;
      const locationId = location ? (locationIds.get(location) ?? null) : null;

      const employee = await client.query(
        `update employees set full_name = $1, department_id = $2, position_id = $3,
           work_location_id = $4, salary_type = $5, base_salary = $6,
           employment_status = 'active', updated_at = now()
         where user_id = $7 returning id`,
        [
          name,
          departmentId,
          positionId,
          locationId,
          salaryType,
          baseSalary,
          userRow.id,
        ],
      );

      staffByKey.set(key, {
        key,
        name,
        email,
        userId: userRow.id,
        employeeId: employee.rows[0].id,
        department: dept,
        location,
        locationId,
        salaryType,
        baseSalary,
        demo: true,
      });
    }

    const generatedUsers = fictionalStaff.map((row, index) => {
      const slug = row[0];
      return {
        key: slug,
        token: `demo-staff-${pad(index + 1)}`,
        name: row[1],
        email: `${slug}@staff.hadirku.demo`,
        department: row[2],
        position: row[3],
        location: row[4],
        salaryType: row[5],
        baseSalary: row[6],
        joinDate: row[7],
        index,
      };
    });

    const userIds = [];
    for (const person of generatedUsers) {
      const userId = `demo-staff-${pad(person.index + 1)}`;
      await client.query(
        `insert into "user" (id, name, email, email_verified, role)
         values ($1, $2, $3, false, 'user')
         on conflict (id) do update set name = excluded.name, email = excluded.email, updated_at = now()`,
        [userId, person.name, person.email],
      );
      userIds.push(userId);
    }

    for (const [index, person] of generatedUsers.entries()) {
      const userId = userIds[index];
      const departmentId = departmentIds.get(person.department);
      const positionId = positionIds.get(
        `${person.department}:${person.position}`,
      );
      const locationId = locationIds.get(person.location);
      const phone = `0812${String(34000000 + index * 137).padStart(8, "0")}`;
      const bank = banks[index % banks.length];
      const bankAccount = `${bank === "BCA" ? "5271" : "1370"}${String(1000000 + index * 37).padStart(8, "0")}`;
      const ktpNumber = `31740${String(100000000000 + index * 7919).slice(-11)}`;

      const employee = await client.query(
        `insert into employees
           (user_id, nik, full_name, phone, address, department_id, position_id,
            work_location_id, join_date, employment_status, salary_type, base_salary,
            bank_name, bank_account, ktp_number)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12, $13, $14)
         on conflict (user_id) do update set
           nik = excluded.nik,
           full_name = excluded.full_name,
           phone = excluded.phone,
           address = excluded.address,
           department_id = excluded.department_id,
           position_id = excluded.position_id,
           work_location_id = excluded.work_location_id,
           join_date = excluded.join_date,
           employment_status = 'active',
           salary_type = excluded.salary_type,
           base_salary = excluded.base_salary,
           bank_name = excluded.bank_name,
           bank_account = excluded.bank_account,
           ktp_number = excluded.ktp_number,
           updated_at = now()
         returning id`,
        [
          userId,
          `DEMO-${String(index + 1).padStart(4, "0")}`,
          person.name,
          phone,
          ["Jakarta Selatan", "Jakarta Pusat", "Bekasi", "Depok", "Cikarang"][
            index % 5
          ],
          departmentId,
          positionId,
          locationId,
          person.joinDate,
          person.salaryType,
          person.baseSalary,
          bank,
          bankAccount,
          ktpNumber,
        ],
      );

      staffByKey.set(person.key, {
        key: person.key,
        name: person.name,
        email: person.email,
        userId,
        employeeId: employee.rows[0].id,
        department: person.department,
        location: person.location,
        locationId,
        salaryType: person.salaryType,
        baseSalary: person.baseSalary,
        demo: false,
      });
    }

    // Hubungkan kepala departemen.
    const managerByDept = {
      HRD: staffByKey.get("hrd"),
      KIT: staffByKey.get("hod"),
      MKT: staffByKey.get("dinda"),
      BAR: staffByKey.get("galih"),
      SRV: staffByKey.get("aditya"),
      ACC: staffByKey.get("kartika"),
    };
    for (const [code, manager] of Object.entries(managerByDept)) {
      if (manager) {
        await client.query(
          `update departments set manager_user_id = $1, updated_at = now() where code = $2`,
          [manager.userId, code],
        );
      }
    }

    const allStaff = [...staffByKey.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const officeDepartments = new Set(["HRD", "ACC", "MKT"]);

    // Jadwal: kantor pada hari kerja, operasional setiap hari dengan rotasi shift.
    const scheduleRows = [];
    for (const [index, person] of allStaff.entries()) {
      if (person.key === "hrd") continue; // HRD tidak memakai jadwal shift.
      const operational =
        person.key === "karyawan" ||
        (!officeDepartments.has(person.department) && person.key !== "hod");

      let date = firstOfPrevMonth;
      while (date <= scheduleTo) {
        if (!operational && isWeekend(date)) {
          date = addDays(date, 1);
          continue;
        }
        const shift = operational
          ? shiftCycle[(index + Number(date.slice(8, 10))) % 3]
          : shiftPagi;
        const scheduleId = uuid(`schedule:${person.employeeId}:${date}`);
        scheduleRows.push([
          scheduleId,
          person.employeeId,
          date,
          shift.id,
          person.locationId,
          null,
          "",
        ]);
        date = addDays(date, 1);
      }
    }

    await insertRows(
      "work_schedules",
      [
        "id",
        "employee_id",
        "date",
        "shift_id",
        "work_location_id",
        "allowed_location_ids",
        "note",
      ],
      scheduleRows,
      "on conflict (employee_id, date) do nothing",
      200,
    );

    const scheduleQuery = await client.query(
      `select ws.id, ws.employee_id, ws.date::text as date, ws.work_location_id,
              l.latitude, l.longitude, s.name as shift_name,
              s.start_time::text as start_time, s.end_time::text as end_time,
              s.tolerance_minutes, s.crosses_midnight
       from work_schedules ws
       inner join shifts s on s.id = ws.shift_id
       inner join work_locations l on l.id = ws.work_location_id
       where ws.date >= $1 and ws.date <= $2
       order by ws.date, ws.employee_id`,
      [firstOfPrevMonth, today],
    );

    const staffByEmployeeId = new Map(
      allStaff.map((person) => [person.employeeId, person]),
    );

    const hrd = staffByKey.get("hrd");
    const hod = staffByKey.get("hod");
    const marketing = staffByKey.get("marketing");
    const andi = staffByKey.get("karyawan");

    const requestRows = [];
    const excusedDates = new Set();
    const leaveDaysByEmployee = new Map();
    const requestId = (key) => uuid(`request:${key}`);

    const addRequest = (spec) => {
      const staff = staffByKey.get(spec.staff);
      if (!staff) return;
      const id = requestId(spec.key);
      const startDate = spec.startDate;
      const endDate = spec.endDate ?? null;
      const startTime = spec.startTime ?? null;
      const endTime = spec.endTime ?? null;
      const status = spec.status ?? "pending";
      const decidedBy =
        status === "approved" || status === "rejected"
          ? spec.decidedBy === "hod"
            ? hod.userId
            : hrd.userId
          : null;
      const created =
        spec.createdAt ?? jakartaTimestamp(startDate, "09:00", -2);
      const decided =
        decidedBy != null
          ? (spec.decidedAt ?? jakartaTimestamp(startDate, "15:00", -1))
          : null;

      requestRows.push([
        id,
        staff.userId,
        spec.type,
        startDate,
        endDate,
        startTime,
        endTime,
        spec.reason,
        status,
        decidedBy,
        decided,
        spec.decisionNote ??
          (status === "approved"
            ? "Disetujui untuk demo."
            : status === "rejected"
              ? "Ditolak karena kebutuhan operasional."
              : null),
        created,
        created,
      ]);

      if (
        status === "approved" &&
        ["permission", "sick", "leave", "business_trip"].includes(spec.type)
      ) {
        let date = startDate;
        const last = endDate ?? startDate;
        while (date <= last) {
          excusedDates.add(`${staff.employeeId}|${date}`);
          date = addDays(date, 1);
        }
      }
      if (status === "approved" && spec.type === "leave") {
        const last = endDate ?? startDate;
        const days =
          Math.round(
            (Date.parse(`${last}T00:00:00Z`) -
              Date.parse(`${startDate}T00:00:00Z`)) /
              86400000,
          ) + 1;
        leaveDaysByEmployee.set(
          staff.employeeId,
          (leaveDaysByEmployee.get(staff.employeeId) ?? 0) + days,
        );
      }
    };

    // Contoh pengajuan milik akun demo agar setiap role punya cerita.
    addRequest({
      key: "andi-permission",
      staff: "karyawan",
      type: "permission",
      startDate: "2026-10-09",
      reason: "Mengurus dokumen keluarga di kelurahan.",
      status: "approved",
      decidedBy: "hod",
    });
    addRequest({
      key: "andi-leave",
      staff: "karyawan",
      type: "leave",
      startDate: "2026-10-12",
      endDate: "2026-10-13",
      reason: "Cuti keluarga di Bandung.",
      status: "approved",
      decidedBy: "hrd",
    });
    addRequest({
      key: "andi-overtime",
      staff: "karyawan",
      type: "overtime",
      startDate: "2026-10-15",
      startTime: "14:00",
      endTime: "16:00",
      reason: "Persiapan event khusus akhir pekan.",
      status: "approved",
      decidedBy: "hod",
    });
    addRequest({
      key: "andi-pending-leave",
      staff: "karyawan",
      type: "leave",
      startDate: "2026-10-26",
      endDate: "2026-10-27",
      reason: "Acara keluarga di luar kota.",
      status: "pending",
    });
    addRequest({
      key: "andi-swap",
      staff: "karyawan",
      type: "shift_swap",
      startDate: "2026-10-24",
      reason: "Tukar shift dengan rekan satu tim.",
      status: "pending",
    });

    addRequest({
      key: "hod-leave",
      staff: "hod",
      type: "leave",
      startDate: "2026-09-21",
      endDate: "2026-09-22",
      reason: "Cuti tahunan keluarga.",
      status: "approved",
      decidedBy: "hrd",
    });
    addRequest({
      key: "hod-overtime",
      staff: "hod",
      type: "overtime",
      startDate: "2026-10-10",
      startTime: "14:00",
      endTime: "17:00",
      reason: "Audit stok dapur akhir pekan.",
      status: "approved",
      decidedBy: "hrd",
    });
    addRequest({
      key: "hod-pending",
      staff: "hod",
      type: "permission",
      startDate: "2026-10-30",
      reason: "Menghadiri acara sekolah anak.",
      status: "pending",
    });

    addRequest({
      key: "mkt-trip",
      staff: "marketing",
      type: "business_trip",
      startDate: "2026-10-06",
      endDate: "2026-10-07",
      reason: "Kunjungan klien dan shooting konten di Bandung.",
      status: "approved",
      decidedBy: "hrd",
    });
    addRequest({
      key: "mkt-pending",
      staff: "marketing",
      type: "permission",
      startDate: "2026-10-23",
      reason: "Kontrol kesehatan rutin.",
      status: "pending",
    });

    const reasons = {
      leave: [
        "Cuti tahunan keluarga.",
        "Acara pernikahan saudara.",
        "Liburan bersama keluarga.",
      ],
      sick: [
        "Sakit demam, disertai surat dokter.",
        "Kontrol kesehatan di klinik.",
        "Sakit flu dan perlu istirahat.",
      ],
      permission: [
        "Keperluan keluarga mendesak.",
        "Mengurus dokumen kependudukan.",
        "Mendampingi orang tua berobat.",
      ],
      business_trip: [
        "Dinas ke cabang Bandung.",
        "Kunjungan supplier di Cikarang.",
        "Meeting klien di Surabaya.",
      ],
      overtime: [
        "Persiapan event akhir pekan.",
        "Stock opname gudang.",
        "Menutup laporan bulanan.",
      ],
      shift_swap: [
        "Tukar shift dengan rekan satu tim.",
        "Kebutuhan keluarga pada tanggal tersebut.",
      ],
    };

    const pickReason = (type, seed) => {
      const list = reasons[type];
      return list[Math.floor(rand(seed) * list.length) % list.length];
    };

    for (const [index, person] of allStaff.entries()) {
      if (person.demo) continue;
      if (person.department === "HRD" && index % 2 === 0) continue;

      const mode = index % 7;
      if (mode === 0) {
        const start = nextWeekday(addDays("2026-09-07", index % 5));
        addRequest({
          key: `leave-${person.key}`,
          staff: person.key,
          type: "leave",
          startDate: start,
          endDate: addDays(start, 1),
          reason: pickReason("leave", `leave-${person.key}`),
          status: "approved",
          decidedBy: person.department === "KIT" ? "hod" : "hrd",
        });
      } else if (mode === 1) {
        addRequest({
          key: `sick-${person.key}`,
          staff: person.key,
          type: "sick",
          startDate: nextWeekday(addDays("2026-10-05", index % 10)),
          reason: pickReason("sick", `sick-${person.key}`),
          status: "approved",
          decidedBy: person.department === "KIT" ? "hod" : "hrd",
        });
      } else if (mode === 2) {
        addRequest({
          key: `permission-${person.key}`,
          staff: person.key,
          type: "permission",
          startDate: nextWeekday(addDays("2026-09-14", index % 10)),
          reason: pickReason("permission", `permission-${person.key}`),
          status: "approved",
          decidedBy: person.department === "KIT" ? "hod" : "hrd",
        });
      } else if (mode === 3) {
        addRequest({
          key: `trip-${person.key}`,
          staff: person.key,
          type: "business_trip",
          startDate: nextWeekday(addDays("2026-10-05", index % 10)),
          endDate: nextWeekday(addDays("2026-10-06", index % 10)),
          reason: pickReason("business_trip", `trip-${person.key}`),
          status: "approved",
          decidedBy: "hrd",
        });
      } else if (mode === 4) {
        addRequest({
          key: `overtime-${person.key}`,
          staff: person.key,
          type: "overtime",
          startDate: nextWeekday(addDays("2026-10-12", index % 4)),
          startTime: index % 2 === 0 ? "16:00" : "18:00",
          endTime: index % 2 === 0 ? "18:00" : "20:00",
          reason: pickReason("overtime", `overtime-${person.key}`),
          status: "approved",
          decidedBy: person.department === "KIT" ? "hod" : "hrd",
        });
      } else if (mode === 5) {
        addRequest({
          key: `pending-${person.key}`,
          staff: person.key,
          type: index % 2 === 0 ? "leave" : "permission",
          startDate: nextWeekday(addDays("2026-10-26", index % 3)),
          endDate:
            index % 2 === 0
              ? nextWeekday(addDays("2026-10-27", index % 3))
              : null,
          reason: pickReason(
            index % 2 === 0 ? "leave" : "permission",
            `pending-${person.key}`,
          ),
          status: "pending",
        });
      } else {
        const rejected = index % 2 === 0;
        addRequest({
          key: `${rejected ? "rejected" : "cancelled"}-${person.key}`,
          staff: person.key,
          type: rejected ? "sick" : "permission",
          startDate: nextWeekday(addDays("2026-09-21", index % 8)),
          reason: pickReason(
            rejected ? "sick" : "permission",
            `decision-${person.key}`,
          ),
          status: rejected ? "rejected" : "cancelled",
          decidedBy: person.department === "KIT" ? "hod" : "hrd",
          decisionNote: rejected
            ? "Ditolak karena kebutuhan operasional."
            : "Dibatalkan oleh karyawan.",
        });
      }
    }

    await insertRows(
      "requests",
      [
        "id",
        "user_id",
        "type",
        "start_date",
        "end_date",
        "start_time",
        "end_time",
        "reason",
        "status",
        "approved_by",
        "decided_at",
        "decision_note",
        "created_at",
        "updated_at",
      ],
      requestRows,
      "on conflict (id) do nothing",
      120,
    );

    // Absensi: 2 bulan terakhir sampai hari ini.
    const attendanceRows = [];
    for (const row of scheduleQuery.rows) {
      const person = staffByEmployeeId.get(row.employee_id);
      if (!person) continue;
      if (excusedDates.has(`${row.employee_id}|${row.date}`)) continue;

      const isToday = row.date === today;
      const start = minutes(row.start_time);
      const end = minutes(row.end_time);
      const crosses = row.crosses_midnight;
      const tolerance = row.tolerance_minutes;

      // Jadwal hari ini yang belum dimulai belum punya catatan absensi.
      if (isToday && start > nowMinutes) continue;

      const seed = `attendance:${row.employee_id}:${row.date}`;
      const statusRoll = rand(`${seed}:status`);
      let status =
        statusRoll < 0.84
          ? "present"
          : statusRoll < 0.92
            ? "late"
            : statusRoll < 0.965
              ? "alpha"
              : "early_leave";

      // Hari ini: alpha/pulang cepat hanya berlaku bila shift sudah selesai.
      if (isToday && (status === "alpha" || status === "early_leave")) {
        const shiftFinished = end <= nowMinutes;
        status = shiftFinished
          ? status
          : statusRoll < 0.94
            ? "present"
            : "late";
      }

      let checkInClock = null;
      let checkOutClock = null;
      let checkoutOffset = 0;

      if (status === "alpha") {
        checkInClock = null;
        checkOutClock = null;
      } else {
        const baseIn =
          status === "late"
            ? start + tolerance + randInt(`${seed}:late`, 2, 28)
            : start - randInt(`${seed}:early`, 2, 14);
        const normalizedBase = ((baseIn % 1440) + 1440) % 1440;
        checkInClock = `${pad(Math.floor(normalizedBase / 60))}:${pad(normalizedBase % 60)}`;

        if (status === "early_leave") {
          const leaveMinutes = randInt(`${seed}:leave`, 40, 95);
          checkOutClock = `${pad(Math.floor((end - leaveMinutes) / 60))}:${pad((end - leaveMinutes) % 60)}`;
        } else if (rand(`${seed}:no-checkout`) < 0.03) {
          checkOutClock = null;
        } else {
          const outMinutes = crosses
            ? end + randInt(`${seed}:out`, 2, 22)
            : end + randInt(`${seed}:out`, 0, 12);
          checkoutOffset = outMinutes >= 1440 ? 1 : 0;
          const normalizedOut = outMinutes % 1440;
          checkOutClock = `${pad(Math.floor(normalizedOut / 60))}:${pad(normalizedOut % 60)}`;
        }
      }

      // Untuk shift malam, jam masuk berada di malam hari tanggal jadwal.
      let checkInTime = null;
      let checkOutTime = null;
      if (checkInClock) {
        checkInTime = jakartaTimestamp(row.date, checkInClock);
      }
      if (checkOutClock) {
        checkOutTime = jakartaTimestamp(
          row.date,
          checkOutClock,
          crosses ? 1 + checkoutOffset : checkoutOffset,
        );
      }

      // Jangan tampilkan jam yang belum terjadi pada data demo hari ini.
      if (isToday) {
        const now = Date.now();
        if (checkInTime && Date.parse(checkInTime) > now) continue;
        if (checkOutTime && Date.parse(checkOutTime) > now) checkOutTime = null;
      }

      const jitter = (salt) => (rand(`${seed}:${salt}`) - 0.5) * 0.0008;
      const checkInLat = checkInTime ? row.latitude + jitter("lat-in") : null;
      const checkInLng = checkInTime ? row.longitude + jitter("lng-in") : null;
      const checkOutLat = checkOutTime
        ? row.latitude + jitter("lat-out")
        : null;
      const checkOutLng = checkOutTime
        ? row.longitude + jitter("lng-out")
        : null;
      const accuracyIn = checkInTime ? 8 + rand(`${seed}:acc-in`) * 24 : null;
      const accuracyOut = checkOutTime
        ? 8 + rand(`${seed}:acc-out`) * 24
        : null;

      attendanceRows.push([
        uuid(`attendance:${row.employee_id}:${row.date}`),
        row.employee_id,
        row.id,
        row.work_location_id,
        row.date,
        checkInTime,
        checkOutTime,
        checkInLat,
        checkInLng,
        accuracyIn,
        checkInTime ? 4 + rand(`${seed}:dist-in`) * 70 : null,
        checkOutLat,
        checkOutLng,
        accuracyOut,
        checkOutTime ? 4 + rand(`${seed}:dist-out`) * 70 : null,
        status,
        status === "alpha" ? "Tidak hadir tanpa keterangan." : "",
        checkInTime ?? jakartaTimestamp(row.date, "12:00"),
        checkInTime ?? jakartaTimestamp(row.date, "12:00"),
      ]);
    }

    await insertRows(
      "attendance_records",
      [
        "id",
        "employee_id",
        "work_schedule_id",
        "work_location_id",
        "date",
        "check_in_time",
        "check_out_time",
        "check_in_latitude",
        "check_in_longitude",
        "check_in_accuracy",
        "check_in_distance",
        "check_out_latitude",
        "check_out_longitude",
        "check_out_accuracy",
        "check_out_distance",
        "status",
        "notes",
        "created_at",
        "updated_at",
      ],
      attendanceRows,
      "on conflict (employee_id, date) do nothing",
      120,
    );

    // Foto bukti demo: satu foto masuk dan satu foto pulang untuk setiap
    // catatan yang punya jam absen, agar pratinjau di detail bisa dibuka.
    const demoPhotoRows = [];
    const demoPhotoFiles = [];
    for (const row of attendanceRows) {
      const [
        attendanceId,
        employeeId,
        ,
        workLocationId,
        rowDate,
        checkInTime,
        checkOutTime,
      ] = row;
      const person = staffByEmployeeId.get(employeeId);
      if (!person) continue;
      const place = locationNamesById.get(workLocationId) ?? "Lokasi kerja";

      for (const slot of [
        { type: "check_in", label: "Absen masuk", time: checkInTime },
        { type: "check_out", label: "Absen pulang", time: checkOutTime },
      ]) {
        if (!slot.time) continue;
        const photoKey = `attendance-photo:${attendanceId}:${slot.type}`;
        const fileName = `${attendanceId}-${slot.type}.svg`;
        const data = demoAttendancePhoto({
          key: photoKey,
          name: person.name,
          label: slot.label,
          time: slot.time,
          place,
          date: rowDate,
        });

        demoPhotoRows.push([
          uuid(photoKey),
          attendanceId,
          slot.type,
          fileName,
          "image/svg+xml",
          data.byteLength,
          slot.time,
        ]);
        demoPhotoFiles.push([
          uuid(`stored-file:${photoKey}`),
          "attendance-photos",
          fileName,
          "image/svg+xml",
          data.byteLength,
          data,
        ]);
      }
    }

    await insertRows(
      "stored_files",
      ["id", "category", "storage_key", "mime_type", "file_size", "data"],
      demoPhotoFiles,
      `on conflict (category, storage_key) do update set
         mime_type = excluded.mime_type,
         file_size = excluded.file_size,
         data = excluded.data,
         updated_at = now()`,
    );

    await insertRows(
      "attendance_photos",
      [
        "id",
        "attendance_id",
        "type",
        "storage_key",
        "mime_type",
        "file_size",
        "captured_at",
      ],
      demoPhotoRows,
      "on conflict (id) do nothing",
    );

    await client.query(
      `update attendance_records ar
       set check_in_photo_id = photos.id
       from attendance_photos photos
       where photos.attendance_id = ar.id
         and photos.type = 'check_in'
         and ar.check_in_photo_id is null`,
    );
    await client.query(
      `update attendance_records ar
       set check_out_photo_id = photos.id
       from attendance_photos photos
       where photos.attendance_id = ar.id
         and photos.type = 'check_out'
         and ar.check_out_photo_id is null`,
    );

    // Klaim makan mengikuti absensi yang valid.
    const mealRows = [];
    for (const row of attendanceRows) {
      const [, employeeId, , , date, checkInTime, , , , , , , , , , status] =
        row;
      if (!checkInTime || status === "alpha") continue;
      if (rand(`meal:${employeeId}:${date}`) > 0.65) continue;
      const schedule = scheduleQuery.rows.find(
        (item) => item.employee_id === employeeId && item.date === date,
      );
      const session = schedule?.shift_name?.includes("Malam")
        ? "malam"
        : schedule?.shift_name?.includes("Siang")
          ? "siang"
          : "pagi";
      const claimedAt = new Date(
        Date.parse(checkInTime) +
          (session === "malam" ? 3 : 2) * 60 * 60 * 1000,
      ).toISOString();
      mealRows.push([
        uuid(`meal:${employeeId}:${date}`),
        employeeId,
        date,
        session,
        "",
        claimedAt,
      ]);
    }

    await insertRows(
      "meal_claims",
      ["id", "employee_id", "date", "session", "note", "claimed_at"],
      mealRows,
      "on conflict (employee_id, date) do nothing",
      180,
    );

    // Saldo cuti tahun 2026.
    const leaveTypes = await client.query(
      `select id, name, default_quota from leave_types order by name`,
    );
    const leaveRows = [];
    for (const person of allStaff) {
      const extraUsed = Math.min(
        2,
        Math.floor(rand(`leave-used:${person.employeeId}`) * 3),
      );
      const approvedLeave = leaveDaysByEmployee.get(person.employeeId) ?? 0;
      for (const type of leaveTypes.rows) {
        let used = 0;
        if (type.name === "Cuti Tahunan") {
          used = Math.min(11, extraUsed + approvedLeave);
        }
        leaveRows.push([
          person.employeeId,
          type.id,
          year,
          type.default_quota,
          used,
        ]);
      }
    }

    await insertRows(
      "leave_balances",
      ["employee_id", "leave_type_id", "year", "opening_balance", "used"],
      leaveRows,
      `on conflict (employee_id, leave_type_id, year) do update set
         opening_balance = excluded.opening_balance,
         used = excluded.used,
         updated_at = now()`,
      180,
    );

    // Peserta training: pastikan lima agenda demo tersedia.
    const trainingRows = await client.query(
      `select id, title from trainings order by date`,
    );
    const trainingByTitle = new Map(
      trainingRows.rows.map((row) => [row.title, row.id]),
    );
    const trainingDefs = [
      [
        "induksi-k3",
        "Induksi K3 Dasar",
        "2026-10-20",
        "09:00",
        "12:00",
        "Ruang Meeting Kantor Pusat",
        "",
      ],
      [
        "sop-gudang",
        "Pelatihan SOP Gudang",
        "2026-10-22",
        "13:00",
        "16:00",
        "Gudang Cikarang",
        "",
      ],
      [
        "refreshment-akuntansi",
        "Refreshment Akuntansi",
        "2026-10-27",
        "09:00",
        "11:00",
        "Ruang Meeting Kantor Pusat",
        "",
      ],
      [
        "service-excellence",
        "Service Excellence Batch 2",
        "2026-11-05",
        "09:00",
        "12:00",
        "Kantor Pusat - Ruang Training",
        "Simulasi handling complaint dan standar greeting.",
      ],
      [
        "food-safety",
        "Food Safety & Hygiene",
        "2026-11-12",
        "13:00",
        "16:00",
        "Gudang Cikarang - Area Produksi",
        "Refresher HACCP dan kebersihan area produksi.",
      ],
    ];
    for (const [
      key,
      title,
      date,
      startTime,
      endTime,
      place,
      notes,
    ] of trainingDefs) {
      const existing = await client.query(
        `select id from trainings where title = $1 limit 1`,
        [title],
      );
      if (existing.rowCount > 0) {
        trainingByTitle.set(title, existing.rows[0].id);
        continue;
      }
      const id = uuid(`training:${key}`);
      await client.query(
        `insert into trainings (id, title, date, start_time, end_time, place, notes, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (id) do nothing`,
        [id, title, date, startTime, endTime, place, notes, hrd.userId],
      );
      trainingByTitle.set(title, id);
    }

    const participantRows = [];
    const addParticipants = (title, keys) => {
      const trainingId = trainingByTitle.get(title);
      if (!trainingId) return;
      for (const key of keys) {
        const person = staffByKey.get(key);
        if (!person) continue;
        participantRows.push([
          uuid(`participant:${title}:${key}`),
          trainingId,
          person.employeeId,
        ]);
      }
    };
    addParticipants("Induksi K3 Dasar", [
      "eko",
      "bambang",
      "dedi",
      "tati",
      "imron",
      "yuni",
      "anton",
      "fajar",
      "raka",
      "arif",
    ]);
    addParticipants("Pelatihan SOP Gudang", [
      "rudi",
      "wahyu",
      "slamet",
      "fitri",
      "aisyah",
      "rina",
      "bambang",
      "dedi",
    ]);
    addParticipants("Refreshment Akuntansi", [
      "kartika",
      "hendro",
      "lia",
      "fahmi",
      "dewi",
    ]);
    addParticipants("Service Excellence Batch 2", [
      "galih",
      "reza",
      "dimas",
      "aditya",
      "putri",
      "melati",
      "anisa",
      "indah",
      "marketing",
    ]);
    addParticipants("Food Safety & Hygiene", [
      "rudi",
      "wahyu",
      "fitri",
      "aisyah",
      "eko",
      "rina",
      "karyawan",
      "hod",
    ]);

    await insertRows(
      "training_participants",
      ["id", "training_id", "employee_id"],
      participantRows,
      "on conflict (training_id, employee_id) do nothing",
      150,
    );

    // Notifikasi in-app dengan cerita yang relevan untuk tiap role.
    const now = Date.now();
    const hoursAgo = (hours) => new Date(now - hours * 3600_000).toISOString();
    const notificationRows = [
      [
        uuid("notification:hrd-1"),
        hrd.userId,
        "request",
        "3 pengajuan menunggu persetujuan",
        "Ada pengajuan izin, cuti, dan tukar shift yang perlu diputuskan.",
        null,
        hoursAgo(2),
      ],
      [
        uuid("notification:hrd-2"),
        hrd.userId,
        "payroll",
        "Payroll September siap difinalkan",
        "Seluruh data absensi September sudah lengkap. Periksa dan finalkan periode.",
        null,
        hoursAgo(7),
      ],
      [
        uuid("notification:hrd-3"),
        hrd.userId,
        "training",
        "2 training baru dijadwalkan",
        "Service Excellence Batch 2 dan Food Safety & Hygiene sudah masuk kalender.",
        null,
        hoursAgo(26),
      ],
      [
        uuid("notification:hrd-4"),
        hrd.userId,
        "system",
        "Backup data demo selesai",
        "Data demo berhasil disiapkan untuk presentasi klien.",
        hoursAgo(30),
        hoursAgo(40),
      ],
      [
        uuid("notification:hod-1"),
        hod.userId,
        "request",
        "1 pengajuan menunggu persetujuan",
        "Andi Pratama mengajukan cuti untuk 26-27 Oktober.",
        null,
        hoursAgo(3),
      ],
      [
        uuid("notification:hod-2"),
        hod.userId,
        "schedule",
        "Jadwal tim dapur sudah diperbarui",
        "Jadwal shift periode berikutnya sudah tersedia di menu Jadwal.",
        null,
        hoursAgo(20),
      ],
      [
        uuid("notification:andi-1"),
        andi.userId,
        "schedule",
        "Jadwal shift Anda diperbarui",
        "Shift Pagi di Lokasi Demo. Silakan cek menu Jadwal.",
        null,
        hoursAgo(5),
      ],
      [
        uuid("notification:andi-2"),
        andi.userId,
        "request",
        "Pengajuan cuti disetujui",
        "Cuti tanggal 12-13 Oktober telah disetujui HRD.",
        null,
        hoursAgo(9),
      ],
      [
        uuid("notification:andi-3"),
        andi.userId,
        "appreciation",
        "Apresiasi dari HRD",
        "Terima kasih sudah disiplin hadir bulan ini. Pertahankan!",
        null,
        hoursAgo(14),
      ],
      [
        uuid("notification:marketing-1"),
        marketing.userId,
        "training",
        "Training Service Excellence Batch 2",
        "Anda terdaftar pada training 5 November 2026 pukul 09.00.",
        null,
        hoursAgo(11),
      ],
      [
        uuid("notification:marketing-2"),
        marketing.userId,
        "request",
        "Perjalanan dinas disetujui",
        "Perjalanan dinas ke Bandung tanggal 6-7 Oktober telah disetujui.",
        hoursAgo(18),
        hoursAgo(24),
      ],
    ];

    await insertRows(
      "notifications",
      ["id", "user_id", "type", "title", "body", "read_at", "created_at"],
      notificationRows,
      "on conflict (id) do nothing",
      80,
    );

    // Perangkat terdaftar untuk halaman admin perangkat.
    const deviceRows = [
      [
        uuid("device:andi"),
        "demo-device-android-001",
        andi.userId,
        "Android 14",
        "Samsung Galaxy A54",
        "Chrome 130",
        true,
        hoursAgo(5),
      ],
      [
        uuid("device:marketing"),
        "demo-device-iphone-001",
        marketing.userId,
        "iOS 18",
        "iPhone 15",
        "Safari 18",
        true,
        hoursAgo(26),
      ],
      [
        uuid("device:hod"),
        "demo-device-xiaomi-001",
        hod.userId,
        "Android 13",
        "Xiaomi Redmi Note 12",
        "Chrome 129",
        false,
        hoursAgo(50),
      ],
      [
        uuid("device:hrd"),
        "demo-device-windows-001",
        hrd.userId,
        "Windows 11",
        "Lenovo ThinkPad",
        "Edge 130",
        true,
        hoursAgo(1),
      ],
    ];
    for (const row of deviceRows) {
      await client.query(
        `insert into devices
           (id, device_key, user_id, os, model, browser, trusted, last_login_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (device_key) do update set
           user_id = excluded.user_id,
           os = excluded.os,
           model = excluded.model,
           browser = excluded.browser,
           trusted = excluded.trusted,
           last_login_at = excluded.last_login_at,
           updated_at = now()`,
        row,
      );
    }

    // Audit log agar halaman audit tidak kosong.
    const auditRows = [
      [
        uuid("audit:1"),
        hrd.userId,
        "employee-create",
        "employees",
        staffByKey.get("siti").employeeId,
        null,
        { fullName: "Siti Nurhaliza", department: "HRD" },
        hoursAgo(70),
      ],
      [
        uuid("audit:2"),
        hrd.userId,
        "employee-create",
        "employees",
        staffByKey.get("galih").employeeId,
        null,
        { fullName: "Galih Pratama", department: "BAR" },
        hoursAgo(70),
      ],
      [
        uuid("audit:3"),
        hrd.userId,
        "schedule-bulk",
        "work_schedules",
        null,
        null,
        {
          from: firstOfPrevMonth,
          to: scheduleTo,
          employees: allStaff.length - 1,
        },
        hoursAgo(48),
      ],
      [
        uuid("audit:4"),
        hod.userId,
        "request-approve",
        "requests",
        requestId("andi-leave"),
        { status: "pending" },
        { status: "approved" },
        hoursAgo(36),
      ],
      [
        uuid("audit:5"),
        hrd.userId,
        "payroll-generate",
        "payroll_periods",
        null,
        null,
        {
          year,
          month: month === 1 ? 12 : month - 1,
          employees: allStaff.length,
        },
        hoursAgo(30),
      ],
      [
        uuid("audit:6"),
        hrd.userId,
        "settings-update",
        "companies",
        null,
        { gpsAccuracyLimitM: 50 },
        { gpsAccuracyLimitM: 500 },
        hoursAgo(28),
      ],
      [
        uuid("audit:7"),
        hrd.userId,
        "training-create",
        "trainings",
        trainingByTitle.get("Service Excellence Batch 2"),
        null,
        { title: "Service Excellence Batch 2", date: "2026-11-05" },
        hoursAgo(26),
      ],
      [
        uuid("audit:8"),
        hrd.userId,
        "meal-delete",
        "meal_claims",
        null,
        { reason: "Duplikat klaim" },
        null,
        hoursAgo(22),
      ],
      [
        uuid("audit:9"),
        hod.userId,
        "request-reject",
        "requests",
        requestId("rejected-rudi"),
        { status: "pending" },
        { status: "rejected" },
        hoursAgo(18),
      ],
      [
        uuid("audit:10"),
        hrd.userId,
        "appreciation-praise",
        "employees",
        andi.employeeId,
        null,
        { message: "Terima kasih sudah disiplin hadir bulan ini." },
        hoursAgo(14),
      ],
    ];
    for (const [
      id,
      userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      createdAt,
    ] of auditRows) {
      await client.query(
        `insert into audit_logs
           (id, user_id, action, entity, entity_id, old_value, new_value, created_at)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
         on conflict (id) do nothing`,
        [
          id,
          userId,
          action,
          entity,
          entityId,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          createdAt,
        ],
      );
    }

    await client.query("commit");

    const counts = await client.query(
      `select
         (select count(*) from employees) as employees,
         (select count(*) from work_schedules) as schedules,
         (select count(*) from attendance_records) as attendance,
         (select count(*) from requests) as requests,
         (select count(*) from meal_claims) as meals,
         (select count(*) from leave_balances) as leave_balances,
         (select count(*) from training_participants) as participants,
         (select count(*) from notifications) as notifications,
         (select count(*) from audit_logs) as audit_logs`,
    );

    console.log("\nSeed demo selesai.");
    console.log(`Karyawan aktif : ${counts.rows[0].employees}`);
    console.log(`Jadwal         : ${counts.rows[0].schedules}`);
    console.log(`Absensi        : ${counts.rows[0].attendance}`);
    console.log(`Pengajuan      : ${counts.rows[0].requests}`);
    console.log(`Klaim makan    : ${counts.rows[0].meals}`);
    console.log(`Saldo cuti     : ${counts.rows[0].leave_balances}`);
    console.log(`Peserta training: ${counts.rows[0].participants}`);
    console.log(`Notifikasi     : ${counts.rows[0].notifications}`);
    console.log(`Audit log      : ${counts.rows[0].audit_logs}`);
    console.log("\nAkun demo:");
    console.log("  hrd        hrd@hadirku.demo        / DemoHadirku2026!");
    console.log("  hod        hod@hadirku.demo        / DemoHadirku2026!");
    console.log("  marketing  marketing@hadirku.demo  / DemoHadirku2026!");
    console.log("  karyawan   karyawan@hadirku.demo   / DemoHadirku2026!");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
};

run()
  .catch((error) => {
    console.error(
      "\nSeed demo gagal:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
