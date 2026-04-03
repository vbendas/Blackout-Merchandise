import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addToWaitlist } from '@/db/waitlist';

const waitlistSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = waitlistSchema.parse(body);

    // Add to database
    await addToWaitlist(email, name);

    return NextResponse.json({ success: true, message: 'Added to waitlist' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('already on waitlist')) {
      return NextResponse.json({ error: 'Email already on waitlist' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to add to waitlist' }, { status: 500 });
  }
}
