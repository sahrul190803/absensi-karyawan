import "server-only";
import { env } from "@/lib/env";

// Browser requests can arrive through Vercel aliases (production, branch, and
// deployment URLs) even though BETTER_AUTH_URL points at one canonical origin.
// Trust the configured origin plus the aliases Vercel injects automatically.
export function allowedOrigins(): string[] {
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

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    return allowedOrigins().includes(new URL(origin).origin);
  } catch {
    return false;
  }
}
