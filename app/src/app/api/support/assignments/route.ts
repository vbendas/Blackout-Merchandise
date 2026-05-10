import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  setPrimaryAssignment,
  getAllAssignments,
} from '@db-root/agentAssignments';

const assignmentSchema = z.object({
  agentId: z.enum(['Leopoldo', 'Francisca', 'Antônia']),
  staffId: z.string().uuid(),
});

/**
 * GET /api/support/assignments
 *
 * List all active agent-staff assignments.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignments = await getAllAssignments();
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error listing assignments:', error);
    return NextResponse.json(
      { error: 'Failed to list assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/assignments
 *
 * Set/update primary agent-staff assignment.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check

    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const assignment = await setPrimaryAssignment(
      parsed.data.agentId,
      parsed.data.staffId
    );

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error setting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to set assignment' },
      { status: 500 }
    );
  }
}