/**
 * Simplified in-memory rate limiting for mainpage anonymous endpoints.
 * Does not require Redis — uses a simple in-memory store.
 * Cleared on server restart (acceptable for short-lived serverless functions).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const _store = new Map<string, RateLimitEntry>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of _store.entries()) {
    if (entry.resetAt <= now) {
      _store.delete(key);
    }
  }
}

function checkInMemoryLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; limit: number; remaining: number; reset: number } {
  cleanupExpired();

  const now = Date.now();
  const entry = _store.get(identifier);

  if (!entry || entry.resetAt <= now) {
    // New window
    const resetAt = now + windowMs;
    _store.set(identifier, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, reset: resetAt };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.resetAt,
  };
}

// ─── Rate Limiters ───────────────────────────────────────────────────────────

/**
 * Handoff requests: 3 per 10 minutes for anonymous visitors
 * Covers: /api/support/handoff (mainpage), /api/support/tickets/status
 */
export function getHandoffRateLimit(): NonNullable<unknown> {
  // Return a truthy object so checkRateLimit works
  return {};
}

/**
 * Get a stable identifier for rate limiting from a request.
 * For authenticated users, use their user ID.
 * For anonymous users, use the forwarded IP or fallback.
 */
export function getRateLimitIdentifier(
  req: Request,
  userId?: string
): string {
  if (userId) {
    return `auth:${userId}`;
  }
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'anonymous';
  return `ip:${ip}`;
}

/**
 * Helper to check rate limit and return appropriate response
 */
export async function checkRateLimit(
  _limiter: unknown,
  identifier: string
): Promise<{ allowed: true } | { allowed: false; headers: Record<string, string> }> {
  const result = checkInMemoryLimit(identifier, 3, 10 * 60 * 1000); // 3 per 10 min

  if (!result.allowed) {
    return {
      allowed: false,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    };
  }

  return { allowed: true };
}
