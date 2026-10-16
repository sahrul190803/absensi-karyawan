import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3101";
const headers = { Origin: origin };

async function signUp(client: APIRequestContext, name: string) {
  const data = {
    name,
    email: `roles-${randomUUID()}@example.com`,
    password: "Roles-test-password-123!",
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers,
    data,
  });
  if (response.status() === 429) {
    // The real auth server limits rapid signups. Honor its retry window once.
    const seconds = Number(response.headers()["retry-after"] || 10);
    expect(Number.isFinite(seconds) && seconds >= 0 && seconds <= 10).toBe(
      true,
    );
    await delay((seconds + 0.1) * 1000);
    response = await client.post("/api/auth/sign-up/email", { headers, data });
  }
  expect(response.status()).toBe(200);
  return data.email;
}

// Roles are granted out of band, the way npm run role:set does it.
async function setRole(email: string, role: string | null) {
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 1,
  });
  try {
    const { rowCount } = await pool.query(
      'UPDATE "user" SET role = $1 WHERE email = $2',
      [role, email],
    );
    expect(rowCount).toBe(1);
  } finally {
    await pool.end();
  }
}

test("admin endpoints answer 401 without a session, not 403", async ({
  request,
}) => {
  for (const [method, url] of [
    ["GET", "/api/admin/trainings"],
    ["DELETE", `/api/admin/trainings/${randomUUID()}`],
  ]) {
    const response = await request.fetch(url, { method, headers });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Sign in to continue." },
    });
  }
});

test("the default role cannot reach admin resources", async ({ request }) => {
  await signUp(request, "Default Role");

  for (const [method, url] of [
    ["GET", "/api/admin/trainings"],
    ["DELETE", `/api/admin/trainings/${randomUUID()}`],
  ]) {
    const response = await request.fetch(url, { method, headers });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  }
});

test("a granted role unlocks admin resources, and losing it revokes access", async ({
  request,
}) => {
  const adminEmail = await signUp(request, "Role Holder");
  expect((await request.get("/api/admin/trainings", { headers })).status()).toBe(
    403,
  );

  await setRole(adminEmail, "admin");

  // The check reads the stored role, so the existing session is enough.
  const listed = await request.get("/api/admin/trainings", { headers });
  expect(listed.status()).toBe(200);
  expect((await listed.json()).data).toBeInstanceOf(Array);

  // Mutations behind a permission guard require the configured Origin.
  const created = await request.post("/api/admin/trainings", {
    headers,
    data: {
      title: `Roles test ${randomUUID().slice(0, 8)}`,
      date: "2026-11-03",
      startTime: "09:00",
      endTime: "11:00",
      place: "Ruang test",
      notes: "",
    },
  });
  expect(created.status()).toBe(201);
  const trainingId = (await created.json()).data.id as string;

  const wrongOrigin = await request.delete(
    `/api/admin/trainings/${trainingId}`,
    { headers: { Origin: "https://untrusted.example" } },
  );
  expect(wrongOrigin.status()).toBe(403);
  expect((await wrongOrigin.json()).error.code).toBe("FORBIDDEN_ORIGIN");

  const removed = await request.delete(`/api/admin/trainings/${trainingId}`, {
    headers,
  });
  expect(removed.status()).toBe(204);
  expect(
    (
      await request.delete(`/api/admin/trainings/${trainingId}`, { headers })
    ).status(),
  ).toBe(404);

  await setRole(adminEmail, "user");
  expect((await request.get("/api/admin/trainings", { headers })).status()).toBe(
    403,
  );
});

test("the admin page and its link appear only for a permitted role", async ({
  page,
}) => {
  const email = `roles-${randomUUID()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Nama lengkap").fill("Page Viewer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill("Roles-test-password-123!");
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(
    page.getByRole("heading", { name: "Halo, Page Viewer" }),
  ).toBeVisible();

  // Tanpa izin, halaman admin tidak dirender (404) dan bukan sekadar disembunyikan.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(
    0,
  );

  await setRole(email, "admin");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Dashboard" }),
  ).toBeVisible();

  // Admin/HRD tidak memakai area karyawan: /app dialihkan ke dashboard.
  await page.goto("/app");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    page.locator('nav[aria-label="Navigasi utama"] a[href="/app"]'),
  ).toHaveCount(0);

  // Absen ditolak di server, bukan hanya disembunyikan dari menu.
  const attendance = await page.request.post("/api/attendance/check-in", {
    headers,
    data: { photo: "data:image/png;base64,AAAA" },
  });
  expect(attendance.status()).toBe(403);
  expect((await attendance.json()).error.code).toBe("ADMIN_NO_ATTENDANCE");
});

test("HRD menunjuk kepala divisi dan role HOD mengikuti otomatis", async ({
  browser,
}) => {
  const hrdContext = await browser.newContext();
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 2,
  });
  try {
    const firstEmail = await signUp(hrdContext.request, "Kepala Pertama");
    const secondEmail = await signUp(hrdContext.request, "Kepala Kedua");
    const hrdEmail = await signUp(hrdContext.request, "HRD Departemen");
    await setRole(hrdEmail, "hrd");
    const hrd = hrdContext.request;

    const userIdByEmail = async (email: string) =>
      (
        await pool.query<{ id: string }>(
          'select id from "user" where email = $1',
          [email],
        )
      ).rows[0].id;
    const firstUserId = await userIdByEmail(firstEmail);
    const secondUserId = await userIdByEmail(secondEmail);
    for (const [userId, name] of [
      [firstUserId, "Kepala Pertama"],
      [secondUserId, "Kepala Kedua"],
    ] as const) {
      await pool.query(
        "insert into employees (user_id, nik, full_name, employment_status) values ($1, $2, $3, 'active')",
        [userId, `NIK-${randomUUID().slice(0, 8)}`, name],
      );
    }
    const roleOf = async (userId: string) =>
      (
        await pool.query<{ role: string | null }>(
          'select role from "user" where id = $1',
          [userId],
        )
      ).rows[0].role ?? "";
    const hasHod = (role: string) => role.split(",").includes("hod");

    const suffix = randomUUID().slice(0, 8);
    const createDept = (name: string, managerUserId: string | null) =>
      hrd.post("/api/departments", {
        headers,
        data: { name, managerUserId, active: true },
      });

    const firstDept = await createDept(`Divisi A ${suffix}`, firstUserId);
    expect(firstDept.status()).toBe(201);
    const firstDeptId = (await firstDept.json()).data.id as string;
    expect(hasHod(await roleOf(firstUserId))).toBe(true);

    const secondDept = await createDept(`Divisi B ${suffix}`, firstUserId);
    expect(secondDept.status()).toBe(201);
    const secondDeptId = (await secondDept.json()).data.id as string;

    // Pindah kepengurusan: pemimpin lama tetap HOD karena masih memimpin divisi lain.
    const moved = await hrd.patch(`/api/departments/${firstDeptId}`, {
      headers,
      data: { managerUserId: secondUserId },
    });
    expect(moved.status()).toBe(200);
    expect(hasHod(await roleOf(firstUserId))).toBe(true);
    expect(hasHod(await roleOf(secondUserId))).toBe(true);

    // Menghapus satu-satunya divisi miliknya mencabut HOD.
    const removed = await hrd.delete(`/api/departments/${secondDeptId}`, {
      headers,
    });
    expect(removed.status()).toBe(204);
    expect(hasHod(await roleOf(firstUserId))).toBe(false);
    expect(hasHod(await roleOf(secondUserId))).toBe(true);

    // Melepas kepala divisi juga mencabut akses.
    const cleared = await hrd.patch(`/api/departments/${firstDeptId}`, {
      headers,
      data: { managerUserId: null },
    });
    expect(cleared.status()).toBe(200);
    expect(hasHod(await roleOf(secondUserId))).toBe(false);

    // Kepala divisi harus akun karyawan yang terdaftar.
    const invalid = await createDept(`Divisi X ${suffix}`, randomUUID());
    expect(invalid.status()).toBe(422);
    expect((await invalid.json()).error.code).toBe("MANAGER_NOT_EMPLOYEE");
  } finally {
    await pool.end();
    await hrdContext.close();
  }
});

test("HRD mengatur kuota cuti, karyawan melihat saldo, HOD tidak boleh", async ({
  browser,
}) => {
  const hrdContext = await browser.newContext();
  const employeeContext = await browser.newContext();
  const hodContext = await browser.newContext();
  const hrd = hrdContext.request;
  const employee = employeeContext.request;
  const hod = hodContext.request;
  const pool = new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 2,
  });
  try {
    const leaveType = await pool.query(
      "insert into leave_types (name, default_quota) values ($1, $2) returning id",
      [`Cuti Uji ${randomUUID().slice(0, 8)}`, 12],
    );
    const leaveTypeId = leaveType.rows[0].id as string;

    const employeeEmail = await signUp(employee, "Kuota Karyawan");
    const employeeUserId = (
      await pool.query('select id from "user" where email = $1', [
        employeeEmail,
      ])
    ).rows[0].id as string;
    const employeeRow = await pool.query(
      "insert into employees (user_id, nik, full_name, employment_status) values ($1, $2, $3, 'active') returning id",
      [employeeUserId, `NIK-${randomUUID().slice(0, 8)}`, "Kuota Karyawan"],
    );
    const employeeId = employeeRow.rows[0].id as string;

    const hrdEmail = await signUp(hrd, "HRD Kuota");
    await setRole(hrdEmail, "hrd");
    const hodEmail = await signUp(hod, "HOD Kuota");
    await setRole(hodEmail, "hod");

    const quotaBody = {
      employeeId,
      year: 2026,
      balances: [{ leaveTypeId, openingBalance: 18 }],
    };

    // Karyawan biasa tidak boleh mengubah kuota.
    const forbidden = await employee.patch("/api/admin/leave-balances", {
      headers,
      data: quotaBody,
    });
    expect(forbidden.status()).toBe(403);

    // HRD menetapkan kuota; ringkasan admin memuat nilai baru.
    const updated = await hrd.patch("/api/admin/leave-balances", {
      headers,
      data: quotaBody,
    });
    expect(updated.status()).toBe(200);
    const overview = await hrd.get("/api/admin/leave-balances?year=2026", {
      headers,
    });
    expect(overview.status()).toBe(200);
    const overviewBody = await overview.json();
    const row = overviewBody.data.employees.find(
      (item: { id: string }) => item.id === employeeId,
    );
    const balance = row.balances.find(
      (item: { leaveTypeId: string }) => item.leaveTypeId === leaveTypeId,
    );
    expect(balance.openingBalance).toBe(18);

    // Karyawan melihat saldonya sendiri.
    const own = await employee.get("/api/leave-balances?year=2026", {
      headers,
    });
    expect(own.status()).toBe(200);
    const ownBody = await own.json();
    const ownBalance = ownBody.data.find(
      (item: { leaveTypeId: string }) => item.leaveTypeId === leaveTypeId,
    );
    expect(ownBalance.openingBalance).toBe(18);
    expect(ownBalance.remaining).toBe(18);

    // HOD bukan pengelola kuota.
    const hodForbidden = await hod.patch("/api/admin/leave-balances", {
      headers,
      data: { ...quotaBody, balances: [{ leaveTypeId, openingBalance: 20 }] },
    });
    expect(hodForbidden.status()).toBe(403);

    // Kuota tidak boleh lebih kecil dari pemakaian yang sudah tercatat.
    await pool.query(
      "update leave_balances set used = 5 where employee_id = $1 and leave_type_id = $2 and year = 2026",
      [employeeId, leaveTypeId],
    );
    const belowUsed = await hrd.patch("/api/admin/leave-balances", {
      headers,
      data: { ...quotaBody, balances: [{ leaveTypeId, openingBalance: 3 }] },
    });
    expect(belowUsed.status()).toBe(422);
    expect((await belowUsed.json()).error.code).toBe("QUOTA_BELOW_USED");
  } finally {
    await pool.end();
    await hrdContext.close();
    await employeeContext.close();
    await hodContext.close();
  }
});
