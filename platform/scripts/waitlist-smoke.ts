/**
 * Waitlist approval -> invite -> registration, and support tickets in chat
 * (Platform-Plan §7). Exercises lib/services/{waitlist,support}.ts directly
 * against the real dev DB and the dev email outbox (RESEND_API_KEY is empty
 * in .env.local) — no HTTP, no AGENT_MOCK involved.
 *
 * Run with: `npx tsx scripts/waitlist-smoke.ts` (from `platform/`).
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (lib/db.ts calls neon() at module scope) — see scripts/notify-smoke.ts
 * for the same dynamic-import-after-dotenv pattern.
 */

import { config } from 'dotenv';
import { and, eq, gte } from 'drizzle-orm';

config({ path: '.env.local', quiet: true });

let failures = 0;

function check(label: string, ok: boolean, detail?: unknown): void {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  if (!ok) failures += 1;
}

async function main() {
  const { readdir, stat } = await import('fs/promises');
  const path = await import('path');
  const { db, schema } = await import('../lib/db');
  const { getOrCreateUserFromClerk } = await import('../lib/services/users');
  const { listWaitlist, approveWaitlist, rejectWaitlist, findInvite, markRegistered, isEmailApproved } = await import(
    '../lib/services/waitlist'
  );
  const { openTicket, listTickets, getTicket, replyTicket, resolveTicket } = await import('../lib/services/support');

  const startedAt = new Date();
  const stamp = Date.now();
  const artistEmail = `smoke-artist-${stamp}@merchfrom.test`;

  // -- website-v3's own INSERT shape: email/product/colour/role/favourites
  // only, no approval columns. This is the compatibility contract §7 asked
  // for — a superset table their plain INSERT keeps working against.
  console.log('=== insert signup (as website-v3 would) ===');
  const [signup] = await db
    .insert(schema.waitlistSignups)
    .values({ email: artistEmail, product: 'Hoodie', colour: 'Black', role: 'artist', favourites: 'STSU177' })
    .returning();
  console.log(JSON.stringify(signup, null, 2));
  check('signup defaults to pending', signup.status === 'pending');

  console.log('\n=== list_waitlist(pending) ===');
  const pending = await listWaitlist({ status: 'pending' });
  check('pending list contains the new signup', pending.some((r) => r.id === signup.id));

  // Admin identity for approve/reply, resolved from ADMIN_EMAILS so nothing
  // personal is hardcoded into this file.
  // Fixed clerkId (unlike the artist below, which needs a fresh email per
  // run): getOrCreateUserFromClerk upserts a single stable admin row instead
  // of piling up one per run — support.ts's firstAdminUserId() has no
  // ordering, so more than one admin row makes "which admin got notified"
  // non-deterministic.
  const adminEmail = (process.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim() || 'admin@merchfrom.test';
  const admin = await getOrCreateUserFromClerk({
    clerkId: 'waitlist-smoke-admin',
    email: adminEmail,
    displayName: 'Smoke Admin',
    imageUrl: null,
    publicMetadataRole: null,
  });
  check('admin user role', admin.role === 'admin', admin.role);

  console.log('\n=== approve_waitlist ===');
  const approved = await approveWaitlist(signup.id, admin.id);
  check('approve ok', approved.ok);
  const inviteToken = approved.ok ? approved.signup.inviteToken : null;
  check('invite token issued', typeof inviteToken === 'string' && inviteToken.length > 0, inviteToken);
  check('status -> approved', approved.ok && approved.signup.status === 'approved');

  console.log('\n=== assert outbox: waitlist.approved ===');
  const outboxDir = path.join(process.cwd(), 'var', 'outbox');
  const outboxFiles = await readdir(outboxDir).catch(() => [] as string[]);
  const freshOutbox: string[] = [];
  for (const file of outboxFiles) {
    const info = await stat(path.join(outboxDir, file));
    if (info.mtime >= startedAt) freshOutbox.push(file);
  }
  check('invite email written to outbox', freshOutbox.some((f) => f.includes('waitlist.approved')), freshOutbox);

  console.log('\n=== findInvite ===');
  const invite = inviteToken ? await findInvite(inviteToken) : null;
  check('findInvite resolves the same signup', invite?.id === signup.id);
  check('findInvite status is approved', invite?.status === 'approved');

  // The artist's own account — created with the same email the waitlist row
  // used, which also exercises the best-effort linkWaitlistSignupToUser
  // attribution wired into getOrCreateUserFromClerk (lib/services/users.ts).
  // Fixed clerkId so re-runs upsert the same row (see the admin comment above).
  const artist = await getOrCreateUserFromClerk({
    clerkId: 'waitlist-smoke-artist',
    email: artistEmail,
    displayName: 'Smoke Artist',
    imageUrl: null,
    publicMetadataRole: null,
  });

  console.log('\n=== markRegistered ===');
  const registered = inviteToken ? await markRegistered(inviteToken, artist.id) : null;
  check('markRegistered flips status', registered?.status === 'registered');
  check('markRegistered sets registeredUserId', registered?.registeredUserId === artist.id);

  console.log('\n=== reject_waitlist (a second signup) ===');
  const [otherSignup] = await db
    .insert(schema.waitlistSignups)
    .values({ email: `smoke-rejected-${stamp}@merchfrom.test`, product: 'Tote' })
    .returning();
  const rejected = await rejectWaitlist(otherSignup.id, 'not a fit right now');
  check('reject ok', rejected.ok);
  check('status -> rejected', rejected.ok && rejected.signup.status === 'rejected');
  check('rejected email is not approved', !(await isEmailApproved(otherSignup.email)));
  check('registered email reads as approved', await isEmailApproved(artistEmail));

  // -- support tickets ------------------------------------------------------
  console.log('\n=== contact_support: open a ticket as the smoke artist ===');
  const opened = await openTicket({ userId: artist.id, subject: 'Shipping question', message: 'Hi, when will my hoodie ship?' });
  check('ticket created', Boolean(opened.ticket.id));
  check('ticket owned by artist', opened.ticket.userId === artist.id);
  check('first message recorded', opened.messages.length === 1 && opened.messages[0]?.senderType === 'user');
  check('ticket starts pending', opened.ticket.status === 'pending');

  const adminNotifiedForOpen = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, admin.id), eq(schema.notifications.event, 'admin.queue_item'), gte(schema.notifications.createdAt, startedAt)));
  check('admin notified of new ticket', adminNotifiedForOpen.length > 0);

  console.log('\n=== admin reply ===');
  const afterAdminReply = await replyTicket(opened.ticket.id, admin.id, 'Shipping in 3 business days.', 'admin');
  check('reply recorded', (afterAdminReply?.messages.length ?? 0) === 2);
  check('ticket -> in_progress', afterAdminReply?.ticket.status === 'in_progress');

  console.log('\n=== assert outbox: support.reply ===');
  const outboxFiles2 = await readdir(outboxDir).catch(() => [] as string[]);
  const freshOutbox2: string[] = [];
  for (const file of outboxFiles2) {
    const info = await stat(path.join(outboxDir, file));
    if (info.mtime >= startedAt) freshOutbox2.push(file);
  }
  check('support reply email written to outbox', freshOutbox2.some((f) => f.includes('support.reply')), freshOutbox2);

  console.log('\n=== artist sees the ticket (list_tickets / get_ticket) ===');
  const artistTickets = await listTickets({ userId: artist.id });
  check('artist ticket list contains it', artistTickets.some((t) => t.id === opened.ticket.id));
  const fetched = await getTicket(opened.ticket.id);
  check('get_ticket returns the thread', fetched?.messages.length === 2);

  console.log('\n=== resolve_ticket ===');
  const resolved = await resolveTicket(opened.ticket.id);
  check('ticket -> resolved', resolved?.status === 'resolved');
  check('resolvedAt set', resolved?.resolvedAt instanceof Date);

  console.log(`\n${failures === 0 ? 'Smoke test passed.' : `Smoke test FAILED (${failures} check(s)).`}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
