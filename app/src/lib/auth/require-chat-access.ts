import { NextResponse } from 'next/server';
import { requireChatAuth } from './chat-auth';
import {
  getChatRateLimit,
  getVoiceRateLimit,
  checkRateLimit,
} from '../rate-limit/chat-rate-limit';

/**
 * Combined auth + rate limit check for chat routes.
 * Returns userId if allowed, or a NextResponse error if not.
 *
 * @param userIdentifier - Unique identifier (e.g., userId from Clerk)
 * @param type - 'chat' for general routes, 'voice' for voice routes
 */
export async function requireChatAccess(
  userIdentifier: string,
  type: 'chat' | 'voice' = 'chat'
): Promise<string | NextResponse> {
  const limiter = type === 'voice' ? getVoiceRateLimit() : getChatRateLimit();
  const result = await checkRateLimit(limiter, userIdentifier);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please slow down.',
        type,
        limit: result.headers['X-RateLimit-Limit'],
        reset: result.headers['X-RateLimit-Reset'],
      },
      {
        status: 429,
        headers: result.headers,
      }
    );
  }

  return userIdentifier;
}
