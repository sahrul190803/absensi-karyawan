import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");

const [email, nikArg] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run employee:link -- you@example.com [NIK]");
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.error("Missing .env.local. Run npm run setup first.");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (match) env[match[1]] = match[2];
}

const client = new pg.Client({ connectionString: env.DATABASE_URL });

try {
  await client.connect();
  const account = await client.query(
    "select id, name, email from \"user\" where email = $1 limit 1",
    [email],
  );
  if (account.rowCount === 0) {
    console.error(`No account found for ${email}. Sign up in the app first.`);
    process.exit(1);
  }
  const user = account.rows[0];

  const existing = await client.query(
    "select id from employees where user_id = $1 limit 1",
    [user.id],
  );
  if (existing.rowCount > 0) {
    console.log(`Employee already linked for ${email} (id ${existing.rows[0].id}).`);
    process.exit(0);
  }

  const nik = nikArg || `EMP-${Date.now().toString().slice(-5)}`;
  const location = await client.query(
    "select id from work_locations order by created_at asc limit 1",
  );
  const { rows } = await client.query(
    `insert into employees (user_id, nik, full_name, work_location_id)
     values ($1, $2, $3, $4) returning id`,
    [user.id, nik, user.name || email, location.rows[0]?.id ?? null],
  );
  console.log(`Employee linked: ${email} → NIK ${nik} (id ${rows[0].id}).`);

  const shift = await client.query(
    "select id from shifts order by start_time asc limit 1",
  );
  if (shift.rows[0] && location.rows[0]) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    await client.query(
      `insert into work_schedules (employee_id, date, shift_id, work_location_id)
       values ($1, $2, $3, $4)
       on conflict (employee_id, date) do nothing`,
      [rows[0].id, today, shift.rows[0].id, location.rows[0].id],
    );
    console.log(`Schedule for ${today} created (first shift + first location).`);
  }
} catch (error) {
  console.error("Link failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await client.end();
}
