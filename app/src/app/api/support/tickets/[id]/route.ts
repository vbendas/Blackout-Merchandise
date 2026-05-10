import { type NextRequest, NextResponse } from 'next/server';
import { getTicketWithDetails } from '@db-root/supportTickets';
import { requireStaffRole } from '@/lib/auth/require-staff-role';

/**
 * GET /api/support/tickets/[id]
 *
 * Get a single ticket with all details and messages.
 * Requires admin, head_of_operations, head_of_customer_success, or support_agent role.
 */
export async function GET(
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
    const ticket = await getTicketWithDetails(id);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}