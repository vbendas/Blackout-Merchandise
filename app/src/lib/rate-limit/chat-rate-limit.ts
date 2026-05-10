import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Lazy Redis Initialization ──────────────────────────────────────────────

/**
 * Get Redis credentials lazily to avoid circular dependency issues
 * and support serverless environments where env vars may not be
 * available at module load time.
 */
function getRedisCredentials() {
  try {
    const { env } = require('@/lib/env');
    return {
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    };
  } catch {
    // Fallback to process.env if env.ts hasn't been imported yet
    return {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    };
  }
}

let _redis: Redis | null = null;
let _hasAttemptedInit = false;

function getRedis(): Redis | null {
  if (_hasAttemptedInit) return _redis;
  _hasAttemptedInit = true;

  const { url, token } = getRedisCredentials();
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// ─── Rate Limiters ───────────────────────────────────────────────────────────

/**
 * General chat requests: 20 per minute per user
 * Covers: /api/chat, /api/chat/unified, /api/chat/suggestions
 */
let _chatRateLimit: Ratelimit | null = null;
export function getChatRateLimit(): Ratelimit | null {
  if (_chatRateLimit) return _chatRateLimit;
  const redis = getRedis();
  if (!redis) return null;
  _chatRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1m'),
    analytics: true,
    prefix: 'ratelimit:chat',
  });
  return _chatRateLimit;
}

/**
 * Voice processing requests: 5 per minute per user
 * Covers: /api/chat/voice, /api/chat/voice/process
 * Lower limit because voice is expensive (transcription + TTS + LLM)
 */
let _voiceRateLimit: Ratelimit | null = null;
export function getVoiceRateLimit(): Ratelimit | null {
  if (_voiceRateLimit) return _voiceRateLimit;
  const redis = getRedis();
  if (!redis) return null;
  _voiceRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1m'),
    analytics: true,
    prefix: 'ratelimit:voice',
  });
  return _voiceRateLimit;
}

/**
 * Handoff requests: 3 per 10 minutes for anonymous, 10 per minute for authenticated
 * Covers: /api/support/handoff (mainpage anonymous)
 */
let _handoffRateLimit: Ratelimit | null = null;
export function getHandoffRateLimit(): Ratelimit | null {
  if (_handoffRateLimit) return _handoffRateLimit;
  const redis = getRedis();
  if (!redis) return null;
  _handoffRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '10m'),
    analytics: true,
    prefix: 'ratelimit:handoff',
  });
  return _handoffRateLimit;
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

// Backward-compatible exports (deprecated — use getter functions)
export const chatRateLimit = null;
export const voiceRateLimit = null;

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
