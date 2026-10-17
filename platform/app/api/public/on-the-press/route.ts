import type { NextRequest } from 'next/server';
import { onThePressFeed } from '@/lib/services/production-progress';
import { BOARD_MAX_AGE_SECONDS, handleBoard, handleBoardPreflight, memoFeed } from './handler';

// The website's "On the press" board (handler.ts says what it serves, to whom, and for how long).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const feed = memoFeed(onThePressFeed, BOARD_MAX_AGE_SECONDS * 1000);

export function GET(req: NextRequest) {
  return handleBoard(req, { feed });
}

export function OPTIONS() {
  return handleBoardPreflight();
}
