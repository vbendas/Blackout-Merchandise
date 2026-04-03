import { getAuth } from '@clerk/nextjs/server';
import { Redis } from '@upstash/redis';
import { type NextRequest, NextResponse } from 'next/server';

// Initialize Redis client
const redis = Redis.fromEnv();

// Rate limit configuration
interface RateLimitConfig {
  // Maximum number of requests allowed within the window
  limit: number;
  // Time window in seconds
  window: number;
}

// Default rate limits by tier
const RATE_LIMITS = {
  // Public endpoints - strict limits
  public: { limit: 10, window: 60 }, // 10 requests per minute
  // Authenticated users - more lenient
  authenticated: { limit: 100, window: 60 }, // 100 requests per minute
  // Strict limits for sensitive endpoints
  strict: { limit: 5, window: 60 }, // 5 requests per minute
} as const;

type RateLimitTier = keyof typeof RATE_LIMITS;

// Rate limit result
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Get client identifier from request
 * Uses IP address or user ID for authenticated requests
 */
function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `ratelimit:user:${userId}`;
  }

  // Get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip');

  if (!ip) {
    // Fallback to a hash of the user agent (not ideal but prevents complete bypass)
    const ua = request.headers.get('user-agent') || 'unknown';
    return `ratelimit:ua:${Buffer.from(ua).toString('base64').slice(0, 20)}`;
  }

  return `ratelimit:ip:${ip}`;
}

/**
 * Check rate limit for a client
 * Uses sliding window algorithm with Redis
 */
export async function checkRateLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.window * 1000;
  const key = `ratelimit:${identifier}`;

  try {
    // Use Redis sorted set for sliding window
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current entries in window
    const currentCount = await redis.zcard(key);

    if (currentCount >= config.limit) {
      // Get the oldest entry to calculate reset time
      const oldestEntries = await redis.zrange(key, 0, 0, { withScores: true });
      const oldestTimestamp = oldestEntries[1] ? parseInt(oldestEntries[1] as string) : now;
      const reset = Math.ceil((oldestTimestamp + config.window * 1000) / 1000);

      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset,
      };
    }

    // Add current request to the window
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // Set expiry on the key to auto-cleanup
    await redis.expire(key, config.window);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - currentCount - 1,
      reset: Math.ceil((now + config.window * 1000) / 1000),
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is unavailable
    return {
      success: true,
      limit: config.limit,
      remaining: 1,
      reset: Math.ceil((now + config.window * 1000) / 1000),
    };
  }
}

/**
 * Middleware-style rate limiter for API routes
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  tier: RateLimitTier = 'public',
  userId?: string
): Promise<{ allowed: boolean; response?: NextResponse; headers: Record<string, string> }> {
  const config = RATE_LIMITS[tier];
  const identifier = getClientIdentifier(request, userId);

  const result = await checkRateLimit(identifier, config);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  if (!result.success) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again after ${new Date(result.reset * 1000).toISOString()}`,
      },
      { status: 429 }
    );

    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return { allowed: false, response, headers };
  }

  return { allowed: true, headers };
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>,
  tier: RateLimitTier = 'public'
) {
  return async (request: NextRequest, context?: unknown): Promise<NextResponse> => {
    const { userId } = getAuth(request);
    const normalizedUserId = userId ?? undefined;

    const { allowed, response, headers } = await rateLimitMiddleware(
      request,
      normalizedUserId ? 'authenticated' : tier,
      normalizedUserId
    );

    if (!allowed) {
      return response!;
    }

    // Call the handler
    const result = await handler(request, context);

    // Add rate limit headers to successful response
    Object.entries(headers).forEach(([key, value]) => {
      result.headers.set(key, value);
    });

    return result;
  };
}

/**
 * Get waitlist count with caching
 */
export async function getCachedWaitlistCount(): Promise<number> {
  const cacheKey = 'waitlist:count';

  try {
    // Try to get from cache
    const cached = await redis.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - return 0 (actual count should be fetched by caller)
    return 0;
  } catch (error) {
    console.error('Cache read failed:', error);
    return 0;
  }
}

/**
 * Set waitlist count in cache
 */
export async function setCachedWaitlistCount(count: number): Promise<void> {
  const cacheKey = 'waitlist:count';
  const cacheTtl = 60; // 1 minute

  try {
    await redis.setex(cacheKey, cacheTtl, count);
  } catch (error) {
    console.error('Cache write failed:', error);
  }
}

/**
 * Cache product catalog
 */
export async function getCachedCatalog<T>(category?: string): Promise<T | null> {
  const cacheKey = category ? `catalog:${category}` : 'catalog:all';

  try {
    return await redis.get<T>(cacheKey);
  } catch (error) {
    console.error('Catalog cache read failed:', error);
    return null;
  }
}

/**
 * Set product catalog cache
 */
export async function setCachedCatalog<T>(data: T, category?: string): Promise<void> {
  const cacheKey = category ? `catalog:${category}` : 'catalog:all';
  const cacheTtl = 300; // 5 minutes

  try {
    await redis.setex(cacheKey, cacheTtl, data);
  } catch (error) {
    console.error('Catalog cache write failed:', error);
  }
}

/**
 * Invalidate catalog cache
 */
export async function invalidateCatalogCache(category?: string): Promise<void> {
  try {
    if (category) {
      await redis.del(`catalog:${category}`);
    } else {
      // Invalidate all catalog caches
      const keys = await redis.keys('catalog:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.error('Cache invalidation failed:', error);
  }
}

// Export Redis client for direct access if needed
export { redis };
