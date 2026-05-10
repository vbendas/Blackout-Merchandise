import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTicketById } from '@db-root/supportTickets';

const statusSchema = z.object({
  ticketId: z.string().uuid(),
  visitorToken: z.string().optional(),
});

/**
 * GET /api/support/tickets/status
 *
 * Poll endpoint for ticket status updates.
 * Used by anonymous visitors to check if a human has joined.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = statusSchema.safeParse({
    ticketId: searchParams.get('ticketId'),
    visitorToken: searchParams.get('visitorToken') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ticketId } = parsed.data;

  try {
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticketId: ticket.id,
      status: ticket.status,
      assignedStaffId: ticket.assignedStaffId,
      assignedStaffName: ticket.assignedStaffId ? undefined : undefined, // Will be populated by frontend
      estimatedWaitMinutes: ticket.estimatedWaitMinutes,
      updatedAt: ticket.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching ticket status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket status' },
      { status: 500 }
    );
  }
}