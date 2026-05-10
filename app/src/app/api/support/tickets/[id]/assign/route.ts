import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { assignTicket } from '@db-root/supportTickets';

const assignSchema = z.object({
  staffId: z.string().uuid(),
});

/**
 * POST /api/support/tickets/[id]/assign
 *
 * Assign a ticket to a staff member.
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
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ticket = await assignTicket(id, parsed.data.staffId);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error assigning ticket:', error);
    return NextResponse.json(
      { error: 'Failed to assign ticket' },
      { status: 500 }
    );
  }
}