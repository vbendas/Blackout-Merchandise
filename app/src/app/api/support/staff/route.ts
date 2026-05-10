import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createStaff,
  getAllActiveStaff,
} from '@db-root/staff';
import { requireStaffRole } from '@/lib/auth/require-staff-role';

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
 * Requires admin or head_of_operations role.
 */
export async function POST(request: NextRequest) {
  try {
    const staffCheck = await requireStaffRole(['admin', 'head_of_operations']);
    if (staffCheck instanceof NextResponse) return staffCheck;

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