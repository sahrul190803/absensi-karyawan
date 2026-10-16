import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3101";
const headers = { Origin: origin };
const photo =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const location = { latitude: -6.2088, longitude: 106.8456, radiusM: 500 };
const testPassword = "Attendance-test-password-123!";

// Better Auth membatasi signup per IP. Setiap signup memakai IP unik supaya
// spesifikasi ini tidak menghabiskan jatah rate limit untuk spec lain.
const uniqueIp = () =>
  `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
const signUpHeaders = () => ({ ...headers, "x-forwarded-for": uniqueIp() });

test.describe.configure({ mode: "serial" });

async function signUp(client: APIRequestContext, name: string) {
  const data = {
    name,
    email: `attendance-${randomUUID()}@example.com`,
    password: testPassword,
  };
  let response = await client.post("/api/auth/sign-up/email", {
    headers: signUpHeaders(),
    data,
  });
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || 10);
    await delay((seconds + 0.1) * 1000);
    response = await client.post("/api/auth/sign-up/email", {
      headers: signUpHeaders(),
      data,
    });
  }
  expect(response.status()).toBe(200);
  return data.email;
}

function pool() {
  return new Pool({
    connectionString: process.env.STARTER_TEST_DATABASE_URL,
    max: 2,
  });
}

async function withPool<T>(fn: (client: Pool) => Promise<T>) {
  const client = pool();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function userId(email: string) {
  return withPool(async (client) => {
    const { rows } = await client.query(
      'select id from "user" where email = $1',
      [email],
    );
    expect(rows).toHaveLength(1);
    return rows[0].id as string;
  });
}

async function setRole(email: string, role: string | null) {
  await withPool(async (client) => {
    const { rowCount } = await client.query(
      'update "user" set role = $1 where email = $2',
      [role, email],
    );
    expect(rowCount).toBe(1);
  });
}

async function ensureCompany() {
  return withPool(async (client) => {
    const existing = await client.query("select id from companies limit 1");
    if ((existing.rowCount ?? 0) > 0) {
      await client.query(
        "update companies set timezone = 'Asia/Jakarta', allow_holiday_work = true, gps_accuracy_limit_m = 100",
      );
      return existing.rows[0].id as string;
    }
    const { rows } = await client.query(
      "insert into companies (name, timezone, allow_holiday_work, gps_accuracy_limit_m) values ('Test Co', 'Asia/Jakarta', true, 100) returning id",
    );
    return rows[0].id as string;
  });
}

async function createLocation() {
  return withPool(async (client) => {
    const { rows } = await client.query(
      "insert into work_locations (name, latitude, longitude, radius_m) values ('Test HQ', $1, $2, $3) returning id",
      [location.latitude, location.longitude, location.radiusM],
    );
    return rows[0].id as string;
  });
}

async function createShift(
  startTime: string,
  endTime: string,
  toleranceMinutes: number,
) {
  return withPool(async (client) => {
    const { rows } = await client.query(
      "insert into shifts (name, start_time, end_time, tolerance_minutes) values ($1, $2, $3, $4) returning id",
      [`Test ${randomUUID().slice(0, 8)}`, startTime, endTime, toleranceMinutes],
    );
    return rows[0].id as string;
  });
}

async function createEmployee(email: string, name: string) {
  const id = await userId(email);
  return withPool(async (client) => {
    const { rows } = await client.query(
      "insert into employees (user_id, nik, full_name, employment_status) values ($1, $2, $3, 'active') returning id",
      [id, `NIK-${randomUUID().slice(0, 8)}`, name],
    );
    return rows[0].id as string;
  });
}

async function createSchedule(
  employeeId: string,
  date: string,
  shiftId: string,
  locationId: string,
) {
  await withPool(async (client) => {
    await client.query(
      "insert into work_schedules (employee_id, date, shift_id, work_location_id) values ($1, $2, $3, $4)",
      [employeeId, date, shiftId, locationId],
    );
  });
}

const todayInJakarta = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

test.beforeAll(async () => {
  await ensureCompany();
});

test("check-in/out menyimpan bukti, idempotent, dan menolak duplikat", async ({
  request,
}) => {
  const email = await signUp(request, "Absen Karyawan");
  const name = "Absen Karyawan";
  const employeeId = await createEmployee(email, name);
  const locationId = await createLocation();
  // Shift panjang: tidak pernah terlambat, pulang selalu terhitung cepat.
  const shiftId = await createShift("00:00", "23:59", 1439);
  const date = todayInJakarta();
  await createSchedule(employeeId, date, shiftId, locationId);

  const checkInKey = randomUUID();
  const checkInPayload = {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: 10,
    photo,
    deviceKey: `device-${randomUUID()}`,
    idempotencyKey: checkInKey,
  };
  const checkIn = await request.post("/api/attendance/check-in", {
    headers,
    data: checkInPayload,
  });
  expect(checkIn.status()).toBe(201);
  const checkInBody = await checkIn.json();
  expect(checkInBody.data.status).toBe("present");
  expect(checkInBody.data.checkInPhotoId).toBeTruthy();
  const attendanceId = checkInBody.data.id;

  // Replay idempotent dengan key yang sama mengembalikan catatan yang sama.
  const replay = await request.post("/api/attendance/check-in", {
    headers,
    data: checkInPayload,
  });
  expect(replay.status()).toBe(201);
  expect((await replay.json()).data.id).toBe(attendanceId);

  // Permintaan baru (key berbeda) ditolak sebagai duplikat.
  const duplicate = await request.post("/api/attendance/check-in", {
    headers,
    data: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 10,
      photo,
      idempotencyKey: randomUUID(),
    },
  });
  expect(duplicate.status()).toBe(409);
  expect((await duplicate.json()).error.code).toBe("DUPLICATE_CHECKIN");

  const checkOutKey = randomUUID();
  const checkOutPayload = {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: 10,
    photo,
    idempotencyKey: checkOutKey,
  };
  const checkOut = await request.post("/api/attendance/check-out", {
    headers,
    data: checkOutPayload,
  });
  expect(checkOut.status()).toBe(200);
  const checkOutBody = await checkOut.json();
  expect(checkOutBody.data.status).toBe("early_leave");
  expect(checkOutBody.data.checkOutPhotoId).toBeTruthy();

  const checkOutReplay = await request.post("/api/attendance/check-out", {
    headers,
    data: checkOutPayload,
  });
  expect(checkOutReplay.status()).toBe(200);
  expect((await checkOutReplay.json()).data.id).toBe(attendanceId);

  const checkOutAgain = await request.post("/api/attendance/check-out", {
    headers,
    data: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 10,
      photo,
    },
  });
  expect(checkOutAgain.status()).toBe(409);
  expect((await checkOutAgain.json()).error.code).toBe("DUPLICATE_CHECKOUT");

  // Bukti dapat dibuka pemiliknya, beserta foto privat.
  const detail = await request.get(`/api/attendance/${attendanceId}`, {
    headers,
  });
  expect(detail.status()).toBe(200);
  const detailBody = await detail.json();
  expect(detailBody.data.photos).toHaveLength(2);
  const photoId = detailBody.data.photos[0].id;
  const photoResponse = await request.get(`/api/attendance/photos/${photoId}`, {
    headers,
  });
  expect(photoResponse.status()).toBe(200);
  expect(photoResponse.headers()["content-type"]).toContain("image/");

  // Pengguna lain tidak dapat melihat bukti orang lain.
  const otherEmail = await signUp(request, "Bukan Pemilik");
  expect(otherEmail).toBeTruthy();
  const forbidden = await request.get(`/api/attendance/${attendanceId}`, {
    headers,
  });
  expect(forbidden.status()).toBe(404);
});

test("HRD melihat foto selfie dari rekap admin, karyawan lain tidak", async ({
  browser,
}) => {
  const employeeContext = await browser.newContext();
  const hrdContext = await browser.newContext();
  const otherContext = await browser.newContext();
  const employee = employeeContext.request;
  const hrd = hrdContext.request;
  const other = otherContext.request;
  try {
    const email = await signUp(employee, "Absen Foto HRD");
    const employeeId = await createEmployee(email, "Absen Foto HRD");
    const locationId = await createLocation();
    const shiftId = await createShift("00:00", "23:59", 1439);
    await createSchedule(employeeId, todayInJakarta(), shiftId, locationId);

    const checkIn = await employee.post("/api/attendance/check-in", {
      headers,
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: 10,
        photo,
        idempotencyKey: randomUUID(),
      },
    });
    expect(checkIn.status()).toBe(201);
    const photoId = (await checkIn.json()).data.checkInPhotoId as string;
    expect(photoId).toBeTruthy();

    // HRD: rekap admin memuat ID foto dan fotonya bisa dibuka.
    const hrdEmail = await signUp(hrd, "HRD Foto");
    await setRole(hrdEmail, "hrd");
    const recap = await hrd.get("/api/admin/attendance?limit=100", {
      headers,
    });
    expect(recap.status()).toBe(200);
    const recapBody = await recap.json();
    expect(recapBody.meta.date).toBe(todayInJakarta());
    const row = recapBody.data.find(
      (item: { employeeName: string }) => item.employeeName === "Absen Foto HRD",
    );
    expect(row?.checkInPhotoId).toBe(photoId);
    const hrdPhoto = await hrd.get(`/api/attendance/photos/${photoId}`, {
      headers,
    });
    expect(hrdPhoto.status()).toBe(200);
    expect(hrdPhoto.headers()["content-type"]).toContain("image/");

    // Karyawan biasa tetap tidak bisa membuka foto orang lain.
    await signUp(other, "Bukan Foto");
    const forbidden = await other.get(`/api/attendance/photos/${photoId}`, {
      headers,
    });
    expect(forbidden.status()).toBe(404);
  } finally {
    await employeeContext.close();
    await hrdContext.close();
    await otherContext.close();
  }
});

test("GPS di luar radius ditolak", async ({ request }) => {
  const email = await signUp(request, "Di Luar Area");
  const employeeId = await createEmployee(email, "Di Luar Area");
  const locationId = await createLocation();
  const shiftId = await createShift("00:00", "23:59", 1439);
  await createSchedule(employeeId, todayInJakarta(), shiftId, locationId);

  const response = await request.post("/api/attendance/check-in", {
    headers,
    data: {
      latitude: location.latitude + 1,
      longitude: location.longitude + 1,
      accuracy: 10,
      photo,
    },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error.code).toBe("OUTSIDE_GEOFENCE");
});

test("cuti disetujui mengurangi saldo dan membatalkan alpha", async ({
  browser,
}) => {
  const employeeContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const employee = employeeContext.request;
  const admin = adminContext.request;
  try {
    const email = await signUp(employee, "Cuti Karyawan");
    const employeeId = await createEmployee(email, "Cuti Karyawan");
    const adminEmail = await signUp(admin, "Admin Cuti");
    await setRole(adminEmail, "admin");

    const locationId = await createLocation();
    const date = todayInJakarta();
    // Cuti approved: saldo terpakai dan alpha pada tanggal itu dibatalkan.
    await withPool(async (client) => {
      await client.query(
        "insert into attendance_records (employee_id, work_location_id, date, status) values ($1, $2, $3, 'alpha') on conflict (employee_id, date) do nothing",
        [employeeId, locationId, date],
      );
      await client.query(
        "insert into leave_types (name, default_quota) values ('Cuti Tahunan', 12) on conflict (name) do nothing",
      );
    });

    const leave = await employee.post("/api/requests", {
      headers,
      data: {
        type: "leave",
        startDate: date,
        reason: "Acara keluarga",
      },
    });
    expect(leave.status()).toBe(201);
    const leaveId = (await leave.json()).data.id;

    const approveLeave = await admin.patch(`/api/admin/requests/${leaveId}`, {
      headers,
      data: { status: "approved", decisionNote: "Disetujui" },
    });
    expect(approveLeave.status()).toBe(200);

    const balances = await employee.get("/api/leave-balances", { headers });
    expect(balances.status()).toBe(200);
    const balanceBody = await balances.json();
    const annual = balanceBody.data.find(
      (row: { leaveTypeName: string }) => row.leaveTypeName === "Cuti Tahunan",
    );
    expect(annual.used).toBe(1);
    expect(annual.remaining).toBe(11);

    const alphaList = await admin.get(
      `/api/admin/attendance?date=${date}&status=alpha&limit=100`,
      { headers },
    );
    expect(alphaList.status()).toBe(200);
    const alphaBody = await alphaList.json();
    expect(
      alphaBody.data.some(
        (row: { employeeId: string }) => row.employeeId === employeeId,
      ),
    ).toBe(false);
  } finally {
    await employeeContext.close();
    await adminContext.close();
  }
});

test("job alpha menetapkan alpha hanya untuk yang wajib absen", async ({
  browser,
}) => {
  const employeeContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const employee = employeeContext.request;
  const admin = adminContext.request;
  try {
    const email = await signUp(employee, "Alpha Karyawan");
    const employeeId = await createEmployee(email, "Alpha Karyawan");
    const adminEmail = await signUp(admin, "Admin Alpha");
    await setRole(adminEmail, "admin");

    const locationId = await createLocation();
    // Shift sudah berakhir jauh sebelum pengujian berjalan.
    const shiftId = await createShift("00:00", "00:01", 0);
    const date = todayInJakarta();
    await createSchedule(employeeId, date, shiftId, locationId);

    const job = await admin.post("/api/admin/jobs/alpha", {
      headers,
      data: {},
    });
    expect(job.status()).toBe(200);
    const jobBody = await job.json();
    expect(jobBody.data.assigned).toBeGreaterThanOrEqual(1);

    const recorded = await withPool(async (client) => {
      const { rows } = await client.query(
        "select status from attendance_records where employee_id = $1 and date = $2",
        [employeeId, date],
      );
      return rows;
    });
    expect(recorded).toHaveLength(1);
    expect(recorded[0].status).toBe("alpha");

    // Karyawan tanpa peran tidak boleh menjalankan job.
    const forbidden = await employee.post("/api/admin/jobs/alpha", {
      headers,
      data: {},
    });
    expect(forbidden.status()).toBe(403);
  } finally {
    await employeeContext.close();
    await adminContext.close();
  }
});

test("hari libur allow_work mengategorikan kerja hari libur dan menolak saat dilarang", async ({
  request,
}) => {
  const date = todayInJakarta();
  const locationId = await createLocation();
  const shiftId = await createShift("00:00", "23:59", 1439);

  const workingEmail = await signUp(request, "Kerja Libur");
  const workingEmployee = await createEmployee(workingEmail, "Kerja Libur");
  await createSchedule(workingEmployee, date, shiftId, locationId);
  await withPool(async (client) => {
    await client.query(
      "insert into holidays (date, name, type, allow_work) values ($1, 'Libur Uji', 'khusus', true) on conflict (date) do update set allow_work = true, active = true",
      [date],
    );
    await client.query(
      "update companies set allow_holiday_work = true",
    );
  });

  const allowed = await request.post("/api/attendance/check-in", {
    headers,
    data: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 10,
      photo,
    },
  });
  expect(allowed.status()).toBe(201);
  expect((await allowed.json()).data.status).toBe("holiday_work");

  const blockedEmail = await signUp(request, "Libur Dilarang");
  const blockedEmployee = await createEmployee(blockedEmail, "Libur Dilarang");
  await createSchedule(blockedEmployee, date, shiftId, locationId);
  await withPool(async (client) => {
    await client.query(
      "update holidays set allow_work = false where date = $1",
      [date],
    );
  });

  const blocked = await request.post("/api/attendance/check-in", {
    headers,
    data: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 10,
      photo,
    },
  });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).error.code).toBe("HOLIDAY");

  await withPool(async (client) => {
    await client.query("delete from holidays where date = $1", [date]);
  });
});
