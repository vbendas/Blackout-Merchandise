// Waitlist approval -> invite -> registration (Platform-Plan §7). This is
// the only writer for `waitlist_signups`; the retired website-v3 public form
// inserted into the same table directly (its own DATABASE_URL, no service
// layer) and never touched the approval columns owned here.
import { and, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { db, schema } from '@/lib/db';
import { getEmailGateway } from '@/lib/services/email';
import { waitlistApprovedEmail } from '@/lib/emails';

export type WaitlistSignup = typeof schema.waitlistSignups.$inferSelect;
export type WaitlistStatus = 'pending' | 'approved' | 'rejected' | 'registered';

// URL-safe (Clerk redirect / query-string safe), no ambiguous-looking chars.
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 32);

export interface ListWaitlistInput {
  status?: WaitlistStatus;
  limit?: number;
}

export async function listWaitlist(input: ListWaitlistInput = {}): Promise<WaitlistSignup[]> {
  const limit = Math.min(input.limit ?? 50, 100);
  const query = db.select().from(schema.waitlistSignups);
  const rows = input.status
    ? await query.where(eq(schema.waitlistSignups.status, input.status)).orderBy(desc(schema.waitlistSignups.createdAt)).limit(limit)
    : await query.orderBy(desc(schema.waitlistSignups.createdAt)).limit(limit);
  return rows;
}

export async function getWaitlistSignup(id: number): Promise<WaitlistSignup | null> {
  const [row] = await db.select().from(schema.waitlistSignups).where(eq(schema.waitlistSignups.id, id)).limit(1);
  return row ?? null;
}

async function sendInviteEmail(signup: WaitlistSignup): Promise<void> {
  const rendered = waitlistApprovedEmail({ inviteToken: signup.inviteToken ?? undefined, product: signup.product ?? undefined });
  const result = await getEmailGateway().send({
    to: signup.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    event: 'waitlist.approved',
  });
  if (!result.ok) console.error(`[waitlist] invite email failed for ${signup.email}: ${result.error}`);
}

export type ApproveWaitlistResult =
  | { ok: true; signup: WaitlistSignup }
  | { ok: false; error: 'not_found' | 'already_registered' };

/** Approves a signup, (re)issuing its invite token and emailing the invite
 * link. Idempotent on the token: re-approving a still-pending-registration
 * row reuses its existing token instead of invalidating links already sent. */
export async function approveWaitlist(id: number, adminUserId: string): Promise<ApproveWaitlistResult> {
  const existing = await getWaitlistSignup(id);
  if (!existing) return { ok: false, error: 'not_found' };
  if (existing.status === 'registered') return { ok: false, error: 'already_registered' };

  const now = new Date();
  const inviteToken = existing.inviteToken ?? nanoid();
  const note = `approved by ${adminUserId}`;

  const [updated] = await db
    .update(schema.waitlistSignups)
    .set({
      status: 'approved',
      inviteToken,
      invitedAt: now,
      approvedAt: now,
      notes: existing.notes ? `${existing.notes}\n${note}` : note,
    })
    .where(eq(schema.waitlistSignups.id, id))
    .returning();

  await sendInviteEmail(updated);
  return { ok: true, signup: updated };
}

export type RejectWaitlistResult =
  | { ok: true; signup: WaitlistSignup }
  | { ok: false; error: 'not_found' | 'already_registered' };

export async function rejectWaitlist(id: number, note?: string): Promise<RejectWaitlistResult> {
  const existing = await getWaitlistSignup(id);
  if (!existing) return { ok: false, error: 'not_found' };
  if (existing.status === 'registered') return { ok: false, error: 'already_registered' };

  const [updated] = await db
    .update(schema.waitlistSignups)
    .set({ status: 'rejected', notes: note ?? existing.notes })
    .where(eq(schema.waitlistSignups.id, id))
    .returning();

  return { ok: true, signup: updated };
}

/** Looks up a signup by its invite token — callers decide what a given
 * status means for their flow (e.g. registration only honours 'approved'). */
export async function findInvite(token: string): Promise<WaitlistSignup | null> {
  if (!token) return null;
  const [row] = await db.select().from(schema.waitlistSignups).where(eq(schema.waitlistSignups.inviteToken, token)).limit(1);
  return row ?? null;
}

/** Flips an approved invite to 'registered' once the artist finishes
 * onboarding (store created) — the canonical completion of §7's flow. */
export async function markRegistered(token: string, userId: string): Promise<WaitlistSignup | null> {
  if (!token) return null;
  const [updated] = await db
    .update(schema.waitlistSignups)
    .set({ status: 'registered', registeredUserId: userId })
    .where(eq(schema.waitlistSignups.inviteToken, token))
    .returning();
  return updated ?? null;
}

/** Registration path (b)'s counterpart to markRegistered: no invite token to
 * key off, so this flips by email match instead once the shop is created. */
export async function markRegisteredByEmail(email: string, userId: string): Promise<WaitlistSignup | null> {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return null;
  const [updated] = await db
    .update(schema.waitlistSignups)
    .set({ status: 'registered', registeredUserId: userId })
    .where(and(ilike(schema.waitlistSignups.email, normalised), inArray(schema.waitlistSignups.status, ['approved', 'registered'])))
    .returning();
  return updated ?? null;
}

/** Registration path (b): the artist's Clerk email matches an approved (or
 * already-registered) row, with no invite token in play. */
export async function isEmailApproved(email: string): Promise<boolean> {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return false;
  const rows = await db
    .select({ id: schema.waitlistSignups.id })
    .from(schema.waitlistSignups)
    .where(and(ilike(schema.waitlistSignups.email, normalised), inArray(schema.waitlistSignups.status, ['approved', 'registered'])))
    .limit(1);
  return rows.length > 0;
}

/** Best-effort attribution called from getOrCreateUserFromClerk the moment a
 * fresh Clerk account is created: tags the first unclaimed approved row for
 * this email with the new user id, without touching status — the status
 * flip to 'registered' stays owned by markRegistered (called once the
 * artist actually finishes registering, not merely signing in). Covers path
 * (b) registrations, which never carry an invite token to key off of. */
export async function linkWaitlistSignupToUser(email: string, userId: string): Promise<void> {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return;
  await db
    .update(schema.waitlistSignups)
    .set({ registeredUserId: userId })
    .where(
      and(
        ilike(schema.waitlistSignups.email, normalised),
        inArray(schema.waitlistSignups.status, ['approved', 'registered']),
        isNull(schema.waitlistSignups.registeredUserId),
      ),
    );
}
