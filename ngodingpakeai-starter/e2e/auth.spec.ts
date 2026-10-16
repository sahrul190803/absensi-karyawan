import { expect, test } from "@playwright/test";

test("anonymous visitors cannot access the protected app", async ({
  page,
  request,
}) => {
  await page.goto("/app").catch(() => undefined);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Masuk ke Hadirku Lecarassa" }),
  ).toBeVisible();
  const session = await request.get("/api/auth/get-session");
  expect(await session.json()).toBeNull();
});

test("signup, persisted session, signout, rejected password, and signin work", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `builder-${Date.now()}@example.com`;
  const password = "A-long-test-password-123!";
  await page.goto("/sign-up");
  await page.getByLabel("Nama lengkap", { exact: true }).fill("Ada Builder");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Buat akun", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Halo, Ada Builder" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Halo, Ada Builder" }),
  ).toBeVisible();
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (cookie) => cookie.name.includes("session_token") && cookie.httpOnly,
    ),
  ).toBe(true);
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Keluar dari akun" }).first().click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Email atau kata sandi salah" }),
  ).toContainText("Periksa kembali");
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(errors).toEqual([]);
});

test("auth rejects cross-origin requests and invalid signup data", async ({
  request,
}) => {
  const crossOrigin = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "https://untrusted.example" },
    data: {
      name: "Test",
      email: "cross-origin@example.com",
      password: "Test-password-123",
    },
  });
  expect(crossOrigin.status()).toBe(403);
  const invalid = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "http://localhost:3101" },
    data: { name: "Test", email: "not-an-email", password: "short" },
  });
  expect(invalid.status()).toBeGreaterThanOrEqual(400);
  expect(invalid.status()).toBeLessThan(500);
});

test("landing and auth pages fit a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Absensi kehadiran yang jujur, rapi, dan mudah dipakai.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Daftar akun karyawan" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
