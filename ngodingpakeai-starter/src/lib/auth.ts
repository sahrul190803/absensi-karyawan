import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import { sendMailInBackground } from "@/lib/mail";
import { ac, ADMIN_ROLES, DEFAULT_ROLE, roles } from "@/lib/permissions";

export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: { cookiePrefix: `ngodingpakeai-${siteConfig.id}` },
  // Aktifkan selalu (default hanya di production) supaya perilaku dev dan
  // prod sama. Aturan khusus: sign-in/sign-up 3x per 10 dtk, reset password
  // 3x per menit; endpoint lain memakai window/max umum di bawah.
  rateLimit: { enabled: true, window: 10, max: 100 },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      sendMailInBackground({
        to: user.email,
        subject: "Atur ulang kata sandi Hadirku Lecarassa",
        text: `Halo ${user.name},\n\nKlik tautan berikut untuk mengatur ulang kata sandi Anda (berlaku 1 jam):\n${url}\n\nJika Anda tidak meminta pengaturan ulang ini, abaikan email ini.`,
      });
    },
    onPasswordReset: async ({ user }, request) => {
      await db.insert(schema.auditLogs).values({
        userId: user.id,
        action: "password-reset",
        entity: "user",
        entityId: user.id,
        newValue: { email: user.email },
        userAgent: request?.headers?.get("user-agent") ?? undefined,
      });
    },
  },
  plugins: [
    // Roles come from the access control in lib/permissions.ts. New accounts get
    // DEFAULT_ROLE; `role` is not accepted from signup input, so nobody can
    // grant themselves one. Use npm run role:set to promote an account.
    admin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: ADMIN_ROLES,
    }),
    // Keep nextCookies() last so it observes every other plugin's cookies.
    nextCookies(),
  ],
});
