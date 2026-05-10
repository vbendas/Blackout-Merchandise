import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { addTicketMessage } from '@db-root/supportTickets';

const messageSchema = z.object({
  content: z.string().min(1),
  senderType: z.enum(['user', 'ai', 'human', 'system']),
  senderId: z.string().optional(),
  isInternal: z.boolean().optional(),
});

/**
 * POST /api/support/tickets/[id]/message
 *
 * Add a message to a ticket.
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
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const message = await addTicketMessage({
      ticketId: id,
      ...parsed.data,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error adding ticket message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}