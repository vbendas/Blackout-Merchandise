import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const userSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

export async function createUser(clerkId: string, email: string, name?: string) {
  return await db.insert(users).values({
    clerkId,
    email,
    displayName: name,
  }).returning();
}

export async function getUserByClerkId(clerkId: string) {
  return await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
}

export async function updateUser(clerkId: string, data: Partial<typeof users.$inferSelect>) {
  return await db.update(users).set(data).where(eq(users.clerkId, clerkId)).returning();
}

export async function deleteUser(clerkId: string) {
  return await db.delete(users).where(eq(users.clerkId, clerkId)).returning();
}
