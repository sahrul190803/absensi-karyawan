// Origins used by the Capacitor mobile app.
//
// Android serves bundled assets from https://localhost by default.
// iOS uses the capacitor:// scheme (capacitor://localhost).
//
// This file intentionally has no server-only imports so the Next.js proxy
// (edge/runtime agnostic) can use the same list for CORS headers.
export const MOBILE_ORIGINS = [
  "https://localhost",
  "capacitor://localhost",
] as const;

// The Vite dev server used while developing the mobile UI in a desktop browser.
export const MOBILE_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
] as const;

export function isMobileOrigin(origin: string | null): boolean {
  return (
    origin !== null &&
    (MOBILE_ORIGINS as readonly string[]).includes(origin)
  );
}

export function isMobileDevOrigin(origin: string | null): boolean {
  return (
    origin !== null &&
    (MOBILE_DEV_ORIGINS as readonly string[]).includes(origin)
  );
}
