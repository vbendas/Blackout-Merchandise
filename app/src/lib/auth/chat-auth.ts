import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Require authentication for chat API routes.
 * Returns the userId string if authenticated, or a NextResponse error if not.
 *
 * Usage:
 *   const userId = await requireChatAuth();
 *   if (userId instanceof Response) return userId;
 */
export async function requireChatAuth(): Promise<string | NextResponse> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in to use the chat.' },
      { status: 401 }
    );
  }

  return userId;
}
