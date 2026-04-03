import { NextResponse } from 'next/server';
import { getWaitlistCount } from '@/db/waitlist';

export async function GET() {
  try {
    const count = await getWaitlistCount();
    
    return NextResponse.json({
      position: count + 1,
      total: count,
    });
  } catch (error) {
    console.error('Error getting waitlist position:', error);
    return NextResponse.json(
      { error: 'Failed to get position' },
      { status: 500 }
    );
  }
}
