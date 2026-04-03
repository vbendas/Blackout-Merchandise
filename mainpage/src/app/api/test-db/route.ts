import { NextResponse } from 'next/server';
import { getWaitlist } from '@/db/waitlist';

export async function GET() {
  try {
    const waitlist = await getWaitlist();
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        waitlistCount: waitlist.length,
        sample: waitlist.slice(0, 5),
      },
    });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
  }
}
