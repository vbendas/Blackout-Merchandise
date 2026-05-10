import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  createStaff,
  getAllActiveStaff,
} from '@db-root/staff';

const staffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum([
    'head_of_operations',
    'head_of_design',
    'head_of_customer_success',
    'support_agent',
    'admin',
    'viewer',
  ]),
  department: z.string().optional(),
  avatarUrl: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * GET /api/support/staff
 *
 * List all active staff members.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await getAllActiveStaff();
    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Error listing staff:', error);
    return NextResponse.json(
      { error: 'Failed to list staff' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/staff
 *
 * Create a new staff member.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check

    const body = await request.json();
    const parsed = staffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const staff = await createStaff(parsed.data);
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Failed to create staff' },
      { status: 500 }
    );
  }
}