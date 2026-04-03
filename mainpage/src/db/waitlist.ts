import { db, eq, sql } from '@db-root/index';
import { waitlist } from '@db-root/schema';
import type { InterviewResponse } from '@/lib/waitlist/interview-questions';

export async function addToWaitlist(email: string, name?: string) {
  const existing = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error('Email already on waitlist');
  }
  return await db.insert(waitlist).values({ email, name }).returning();
}

export async function getWaitlist() {
  return await db.select().from(waitlist);
}

export async function markAsNotified(email: string) {
  return await db.update(waitlist).set({ notified: true }).where(eq(waitlist.email, email)).returning();
}

export async function saveInterviewResponses(
  email: string,
  responses: InterviewResponse[]
): Promise<void> {
  await db
    .update(waitlist)
    .set({
      interviewResponses: responses,
      status: 'interview_complete',
    })
    .where(eq(waitlist.email, email));
}

export async function calculateWaitlistPosition(): Promise<number> {
  const result = await db
    .select({ count: sql`count(*)` })
    .from(waitlist);
  
  return (Number(result[0]?.count) || 0) + 1;
}

export async function getWaitlistCount(): Promise<number> {
  const result = await db
    .select({ count: sql`count(*)` })
    .from(waitlist);
  
  return Number(result[0]?.count) || 0;
}
