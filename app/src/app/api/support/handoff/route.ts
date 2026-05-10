import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  createTicket,
  getTicketById,
  getPendingTicketCount,
} from '@db-root/supportTickets';
import { getPrimaryStaffForAgent } from '@db-root/agentAssignments';
import { linkSessionToTicket, updateSessionHandoffStatus } from '@db-root/chat';
import type { AgentId } from '@/types/chat';

const handoffSchema = z.object({
  sessionId: z.string().optional(),
  agentId: z.enum(['leopoldo', 'francisca', 'antonia']),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      agent: z.enum(['leopoldo', 'francisca', 'antonia']).optional(),
    })
  ),
  contactEmail: z.string().email(),
  visitorName: z.string().optional(),
  subject: z.string().optional(),
  visitorToken: z.string().optional(),
});

/**
 * POST /api/support/handoff
 *
 * Creates a support ticket from chat context for human handoff.
 * Works for both authenticated users and anonymous visitors.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Try to get auth user, but don't require it
    let userId: string | undefined;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId || undefined;
    } catch {
      // Anonymous user — OK
    }

    const body = await request.json();
    const parsed = handoffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      sessionId,
      agentId,
      messages,
      contactEmail,
      visitorName,
      subject,
      visitorToken,
    } = parsed.data;

    // Check if this session already has a handoff ticket
    if (sessionId) {
      // TODO: Check existing ticket and return it if pending/assigned/in_progress
      // For now, we create a new ticket each time (idempotency can be added later)
    }

    // Look up primary staff for this agent
    const assignment = await getPrimaryStaffForAgent(
      agentId.charAt(0).toUpperCase() + agentId.slice(1) as 'Leopoldo' | 'Francisca' | 'Antônia'
    );

    const staffName = assignment?.staff?.name || 'a team member';
    const staffRole = assignment?.staff?.role
      ? assignment.staff.role.replace(/_/g, ' ')
      : 'support';

    // Calculate estimated wait time based on queue depth
    const pendingCount = await getPendingTicketCount();
    const estimatedWaitMinutes = Math.max(5, pendingCount * 15);

    // Create ticket
    const ticketSubject =
      subject ||
      `Handoff from ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} — ${contactEmail}`;

    const ticket = await createTicket({
      sessionId,
      userId,
      visitorToken,
      agentId: agentId.charAt(0).toUpperCase() + agentId.slice(1) as 'Leopoldo' | 'Francisca' | 'Antônia',
      subject: ticketSubject,
      description: `Chat context:\n${messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')}`,
      contactEmail,
      visitorName,
      estimatedWaitMinutes,
      metadata: {
        chatSnapshot: messages,
        requestId,
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Link session to ticket if sessionId provided
    if (sessionId) {
      await linkSessionToTicket(sessionId, ticket.id);
      await updateSessionHandoffStatus(sessionId, 'pending');
    }

    console.log(`[${requestId}] Handoff ticket created: ${ticket.id} for agent ${agentId}`);

    return NextResponse.json({
      ticketId: ticket.id,
      status: ticket.status,
      assignedStaffName: assignment?.staff?.name,
      assignedStaffRole: staffRole,
      estimatedWaitMinutes,
      message: `You've been added to the queue. ${staffName} (${staffRole}) will join as soon as possible. You can keep chatting with me while you wait.`,
    });
  } catch (error) {
    console.error(`[${requestId}] Handoff error:`, error);
    return NextResponse.json(
      { error: 'Failed to create handoff ticket' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/support/handoff/status
 *
 * Check status of a handoff ticket by ticket ID.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('ticketId');

  if (!ticketId) {
    return NextResponse.json(
      { error: 'Missing ticketId parameter' },
      { status: 400 }
    );
  }

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
      estimatedWaitMinutes: ticket.estimatedWaitMinutes,
      updatedAt: ticket.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching handoff status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket status' },
      { status: 500 }
    );
  }
}