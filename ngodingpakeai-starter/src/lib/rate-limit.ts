import "server-only";
import { ApiError } from "@/lib/api";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function prune(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

// Fixed-window limiter in memory. Cukup untuk satu instance (dev/VPS);
// di deployment multi-instance, pasangkan dengan penyimpanan bersama.
export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.`,
    );
  }
  current.count += 1;
  prune(now);
}
