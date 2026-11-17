import "server-only";
import { env } from "@/lib/env";
import {
  MOBILE_DEV_ORIGINS,
  MOBILE_ORIGINS,
} from "@/lib/mobile-origins";

// Browser requests can arrive through Vercel aliases (production, branch, and
// deployment URLs) even though BETTER_AUTH_URL points at one canonical origin.
// Trust the configured origin plus the aliases Vercel injects automatically.
function webOrigins(): string[] {
  const candidates = [
    env.BETTER_AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
  ];

  const origins = candidates.flatMap((value) => {
    if (!value) return [];
    try {
      return [new URL(value).origin];
    } catch {
      return [];
    }
  });

  return [...new Set(origins)];
}

// Better Auth uses this list for trusted origins. The mobile app is a separate
// origin (https://localhost on Android, capacitor://localhost on iOS). The Vite
// dev server is only trusted outside production.
export function allowedOrigins(): string[] {
  const devOrigins =
    process.env.NODE_ENV !== "production" ? MOBILE_DEV_ORIGINS : [];
  return [
    ...new Set([...webOrigins(), ...MOBILE_ORIGINS, ...devOrigins]),
  ];
}

// Cookie-authenticated mutations stay limited to the web app's own origins.
// Mobile requests use bearer tokens and are checked in withApiSession instead.
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    return webOrigins().includes(new URL(origin).origin);
  } catch {
    return false;
  }
}
