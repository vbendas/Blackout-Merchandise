import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Configuration ───────────────────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Check if Redis credentials are available (skip rate limiting if not)
const hasRedisCredentials = redisUrl && redisToken;

const redis = hasRedisCredentials
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

// ─── Rate Limiters ───────────────────────────────────────────────────────────

/**
 * General chat requests: 20 per minute per user
 * Covers: /api/chat, /api/chat/unified, /api/chat/suggestions
 */
export const chatRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1m'),
      analytics: true,
      prefix: 'ratelimit:chat',
    })
  : null;

/**
 * Voice processing requests: 5 per minute per user
 * Covers: /api/chat/voice, /api/chat/voice/process
 * Lower limit because voice is expensive (transcription + TTS + LLM)
 */
export const voiceRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1m'),
      analytics: true,
      prefix: 'ratelimit:voice',
    })
  : null;

/**
 * Helper to check rate limit and return appropriate response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: true } | { allowed: false; headers: Record<string, string> }> {
  if (!limiter) {
    // Rate limiting disabled (missing Redis credentials)
    return { allowed: true };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return {
      allowed: false,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    };
  }

  return { allowed: true };
}
