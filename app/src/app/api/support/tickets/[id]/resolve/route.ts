import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTicket } from '@db-root/supportTickets';
import { requireStaffRole } from '@/lib/auth/require-staff-role';

const resolveSchema = z.object({
  resolution: z.string().optional(),
});

/**
 * POST /api/support/tickets/[id]/resolve
 *
 * Resolve/close a ticket.
 * Requires admin, head_of_operations, head_of_customer_success, or support_agent role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffCheck = await requireStaffRole([
      'admin',
      'head_of_operations',
      'head_of_customer_success',
      'support_agent',
    ]);
    if (staffCheck instanceof NextResponse) return staffCheck;

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