import { NextResponse } from 'next/server';
import { drainPending } from '@/lib/services/discord';

// Cron-style drain, same shared-secret pattern as app/api/domains/verify:
// a host cron hits this on a schedule so queued Discord DMs go out even
// when no artist has chat open. drainPending() is also exported directly
// (see lib/services/discord.ts) for wave 5's in-process scheduler to call
// without an HTTP round trip.
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await drainPending({ limit: 50 });
  return NextResponse.json(result);
}
