import { db } from '@db-root/index';
import { waitlist } from '@db-root/schema';
import { count, desc, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

async function getStatsHandler(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  console.log(`[${requestId}] Waitlist stats request at ${timestamp}`);

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') ?? '7', 10), 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalResult = await db
      .select({ count: count() })
      .from(waitlist)
      .where(sql`${waitlist.timestamp} >= ${startDate}`);

    const total = totalResult[0]?.count ?? 0;

    const bySourceResult = await db
      .select({
        source: waitlist.source,
        count: count(),
      })
      .from(waitlist)
      .where(sql`${waitlist.timestamp} >= ${startDate}`)
      .groupBy(waitlist.source)
      .orderBy(desc(count()));

    const byStatusResult = await db
      .select({
        status: waitlist.status,
        count: count(),
      })
      .from(waitlist)
      .where(sql`${waitlist.timestamp} >= ${startDate}`)
      .groupBy(waitlist.status)
      .orderBy(desc(count()));

    const bySourceAndStatus = await db
      .select({
        source: waitlist.source,
        status: waitlist.status,
        count: count(),
      })
      .from(waitlist)
      .where(sql`${waitlist.timestamp} >= ${startDate}`)
      .groupBy(waitlist.source, waitlist.status);

    console.log(`[${requestId}] Stats generated: ${total} signups`);

    return NextResponse.json({
      success: true,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      totalSignups: total,
      bySource: bySourceResult.map((r) => ({
        source: r.source ?? 'direct',
        count: r.count,
      })),
      byStatus: byStatusResult.map((r) => ({
        status: r.status,
        count: r.count,
      })),
      bySourceAndStatus: bySourceAndStatus.map((r) => ({
        source: r.source ?? 'direct',
        status: r.status,
        count: r.count,
      })),
      metadata: {
        requestId,
        timestamp,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Stats request failed:`, error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRateLimit(getStatsHandler, 'public');
