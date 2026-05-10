import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  getRecentTickets,
  getTicketsByStatus,
  getTicketWithDetails,
} from '@db-root/supportTickets';

const listSchema = z.object({
  status: z.string().optional(),
  agentId: z.string().optional(),
  staffId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/support/tickets
 *
 * List support tickets with optional filtering.
 * Requires admin or support role.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add role-based access control (check if user is admin/support)
    // For now, allow any authenticated user to list tickets

    const { searchParams } = new URL(request.url);
    const parsed = listSchema.safeParse({
      status: searchParams.get('status') || undefined,
      agentId: searchParams.get('agentId') || undefined,
      staffId: searchParams.get('staffId') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, limit, offset } = parsed.data;

    const tickets = status
      ? await getTicketsByStatus(status, limit, offset)
      : await getRecentTickets(limit, offset);

    return NextResponse.json({ tickets, count: tickets.length });
  } catch (error) {
    console.error('Error listing tickets:', error);
    return NextResponse.json(
      { error: 'Failed to list tickets' },
      { status: 500 }
    );
  }
}