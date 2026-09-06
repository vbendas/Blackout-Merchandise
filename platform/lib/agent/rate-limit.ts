// Simple in-memory per-user token bucket. Good enough for a single Next.js
// server process; swap for Upstash once the runtime is horizontally scaled
// (see Platform-Plan.md §5 guardrails — this is the "for now" placeholder).

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const CAPACITY = 12;
const REFILL_PER_MS = CAPACITY / (60_000 * 2); // full refill over 2 minutes

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: CAPACITY, updatedAt: now };

  const elapsed = now - bucket.updatedAt;
  const refreshed = Math.min(CAPACITY, bucket.tokens + elapsed * REFILL_PER_MS);

  if (refreshed < 1) {
    buckets.set(key, { tokens: refreshed, updatedAt: now });
    return { allowed: false, retryAfterMs: Math.ceil((1 - refreshed) / REFILL_PER_MS) };
  }

  buckets.set(key, { tokens: refreshed - 1, updatedAt: now });
  return { allowed: true, retryAfterMs: 0 };
}
