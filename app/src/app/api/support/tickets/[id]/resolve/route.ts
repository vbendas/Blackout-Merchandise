import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { resolveTicket } from '@db-root/supportTickets';

const resolveSchema = z.object({
  resolution: z.string().optional(),
});

/**
 * POST /api/support/tickets/[id]/resolve
 *
 * Resolve/close a ticket.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = resolveSchema.safeParse(body);

    const ticket = await resolveTicket(
      id,
      parsed.success ? parsed.data.resolution : undefined
    );

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error resolving ticket:', error);
    return NextResponse.json(
      { error: 'Failed to resolve ticket' },
      { status: 500 }
    );
  }
}