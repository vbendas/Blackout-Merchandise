import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getRecentTickets,
  getTicketsByStatus,
} from '@db-root/supportTickets';
import { requireStaffRole } from '@/lib/auth/require-staff-role';

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
 * Requires admin, head_of_operations, head_of_customer_success, or support_agent role.
 */
export async function GET(request: NextRequest) {
  try {
    const staffCheck = await requireStaffRole([
      'admin',
      'head_of_operations',
      'head_of_customer_success',
      'support_agent',
    ]);
    if (staffCheck instanceof NextResponse) return staffCheck;

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