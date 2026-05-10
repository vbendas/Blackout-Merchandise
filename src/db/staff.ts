import { db } from './index';
import { staff } from './schema';
import { eq, and } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type Staff = InferSelectModel<typeof staff>;

export async function createStaff(data: {
  name: string;
  email: string;
  role: string;
  department?: string;
  avatarUrl?: string;
  userId?: string;
}): Promise<Staff> {
  const [result] = await db
    .insert(staff)
    .values({
      ...data,
      role: data.role as Staff['role'],
      isActive: true,
    })
    .returning();
  return result;
}

export async function getStaffById(id: string): Promise<Staff | null> {
  const [result] = await db
    .select()
    .from(staff)
    .where(eq(staff.id, id))
    .limit(1);
  return result || null;
}

export async function getStaffByEmail(email: string): Promise<Staff | null> {
  const [result] = await db
    .select()
    .from(staff)
    .where(eq(staff.email, email))
    .limit(1);
  return result || null;
}

export async function getStaffByUserId(userId: string): Promise<Staff | null> {
  const [result] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.userId, userId), eq(staff.isActive, true)))
    .limit(1);
  return result || null;
}

export async function getActiveStaffByRole(role: string): Promise<Staff[]> {
  return db
    .select()
    .from(staff)
    .where(and(eq(staff.role, role as Staff['role']), eq(staff.isActive, true)));
}

export async function getAllActiveStaff(): Promise<Staff[]> {
  return db
    .select()
    .from(staff)
    .where(eq(staff.isActive, true))
    .orderBy(staff.name);
}

export async function updateStaff(
  id: string,
  data: Partial<Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Staff | null> {
  const [result] = await db
    .update(staff)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(staff.id, id))
    .returning();
  return result || null;
}

export async function deactivateStaff(id: string): Promise<void> {
  await db
    .update(staff)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(staff.id, id));
}

export async function deleteStaff(id: string): Promise<void> {
  await db.delete(staff).where(eq(staff.id, id));
}