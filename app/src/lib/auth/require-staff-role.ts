import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getStaffByUserId } from '@db-root/staff';
import type { Staff } from '@db-root/staff';

export type StaffRole = Staff['role'];

/**
 * Require a specific staff role for support management endpoints.
 * Returns the staff record if authorized, or a NextResponse error if not.
 *
 * Usage:
 *   const staffCheck = await requireStaffRole(['admin', 'head_of_operations']);
 *   if (staffCheck instanceof NextResponse) return staffCheck;
 *   // staffCheck is Staff record, safe to proceed
 */
export async function requireStaffRole(
  allowedRoles: StaffRole[]
): Promise<Staff | NextResponse> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in.' },
      { status: 401 }
    );
  }

  const staff = await getStaffByUserId(clerkId);

  if (!staff) {
    return NextResponse.json(
      { error: 'Forbidden. Staff access required.' },
      { status: 403 }
    );
  }

  if (!staff.isActive) {
    return NextResponse.json(
      { error: 'Forbidden. Staff account is deactivated.' },
      { status: 403 }
    );
  }

  if (!allowedRoles.includes(staff.role)) {
    return NextResponse.json(
      {
        error: 'Forbidden. Insufficient permissions.',
        required: allowedRoles,
        current: staff.role,
      },
      { status: 403 }
    );
  }

  return staff;
}
