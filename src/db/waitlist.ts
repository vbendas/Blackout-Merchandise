import { db } from './index';
import { waitlist } from './schema';
import { eq, desc, count, lt, sql } from 'drizzle-orm';

export async function addToWaitlist(email: string, name?: string) {
  // Check for duplicates
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

// Enhanced waitlist operations for interview flow (Phase 3.6)

export async function updateWaitlistEntry(email: string, data: {
  socialLink?: string;
  followerRange?: string;
  interviewResponses?: Record<string, string>;
  source?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'notified';
}) {
  return await db.update(waitlist).set(data).where(eq(waitlist.email, email)).returning();
}

export async function getWaitlistEntryByEmail(email: string) {
  const result = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1);
  return result[0] || null;
}

export async function getWaitlistPosition(email: string): Promise<number | null> {
  const [userEntry] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.email, email))
    .limit(1);

  if (!userEntry) {
    return null;
  }

  const [result] = await db
    .select({ count: count() })
    .from(waitlist)
    .where(lt(waitlist.timestamp, userEntry.timestamp));

  return (result?.count ?? 0) + 1;
}

export async function saveInterviewResponses(
  email: string,
  responses: Record<string, string>
) {
  return await db
    .update(waitlist)
    .set({ interviewResponses: responses, status: 'approved' })
    .where(eq(waitlist.email, email))
    .returning();
}

export async function getApprovedWaitlistEntries() {
  return await db.select().from(waitlist).where(eq(waitlist.status, 'approved'));
}

export async function getWaitlistStats() {
  const allEntries = await db.select().from(waitlist);
  return {
    total: allEntries.length,
    pending: allEntries.filter((e) => e.status === 'pending').length,
    approved: allEntries.filter((e) => e.status === 'approved').length,
    rejected: allEntries.filter((e) => e.status === 'rejected').length,
    notified: allEntries.filter((e) => e.notified).length,
  };
}
