import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateStaff, deactivateStaff } from '@db-root/staff';
import { requireStaffRole } from '@/lib/auth/require-staff-role';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum([
    'head_of_operations',
    'head_of_design',
    'head_of_customer_success',
    'support_agent',
    'admin',
    'viewer',
  ]).optional(),
  department: z.string().optional(),
  avatarUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT /api/support/staff/[id]
 *
 * Update a staff member.
 * Requires admin or head_of_operations role.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffCheck = await requireStaffRole(['admin', 'head_of_operations']);
    if (staffCheck instanceof NextResponse) return staffCheck;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const staff = await updateStaff(id, parsed.data);

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { error: 'Failed to update staff' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/support/staff/[id]
 *
 * Deactivate a staff member (soft delete).
 * Requires admin role only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staffCheck = await requireStaffRole(['admin']);
    if (staffCheck instanceof NextResponse) return staffCheck;

    const { id } = await params;
    await deactivateStaff(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating staff:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate staff' },
      { status: 500 }
    );
  }
}