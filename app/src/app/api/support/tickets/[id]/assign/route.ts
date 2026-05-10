import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assignTicket } from '@db-root/supportTickets';
import { requireStaffRole } from '@/lib/auth/require-staff-role';

const assignSchema = z.object({
  staffId: z.string().uuid(),
});

/**
 * POST /api/support/tickets/[id]/assign
 *
 * Assign a ticket to a staff member.
 * Requires admin, head_of_operations, or head_of_customer_success role.
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
    ]);
    if (staffCheck instanceof NextResponse) return staffCheck;

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