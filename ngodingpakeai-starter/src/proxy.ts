import { NextResponse, type NextRequest } from "next/server";
import {
  isMobileDevOrigin,
  isMobileOrigin,
} from "@/lib/mobile-origins";

// Cross-origin access is only needed by the Capacitor mobile app and the Vite
// dev server. Same-origin web requests do not use these headers.
function allowedCorsOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (isMobileOrigin(origin)) return origin;
  if (process.env.NODE_ENV !== "production" && isMobileDevOrigin(origin))
    return origin;
  return null;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Expose-Headers": "set-auth-token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigin = allowedCorsOrigin(origin);

  // Preflight. Returning here avoids running auth/database code for OPTIONS.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: allowedOrigin ? 204 : 403,
      headers: allowedOrigin ? corsHeaders(allowedOrigin) : undefined,
    });
  }

  const response = NextResponse.next();
  if (allowedOrigin) {
    for (const [key, value] of Object.entries(corsHeaders(allowedOrigin))) {
      response.headers.set(key, value);
    }
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
