/**
 * Discord DM smoke test — exercises the wave-4 flow (Platform-Plan §0, §7)
 * directly against the services (no agent loop, no real Discord app since
 * DISCORD_BOT_TOKEN/CLIENT_ID/CLIENT_SECRET are empty in this environment):
 *
 *   1. Simulate the OAuth callback with the mock gateway (link 'dev#0001').
 *   2. Drain the historical backlog (earlier waves' commerce/domain smoke
 *      runs queued 'discord' rows that nothing has ever drained — this is
 *      the first thing exercising drainPending, so the DB genuinely has
 *      pending debt; draining it here first keeps the assertions below
 *      about our own rows rather than global counts).
 *   3. Queue two notifications via notify() (the same function every
 *      service calls) and drain them; assert both were "sent" and recorded
 *      by the mock gateway with the expected DM content.
 *   4. Unlink, then prove drainPending() fails closed rather than retrying
 *      forever: a discord row queued for a since-unlinked user is marked
 *      'failed' with payload.discordFailReason = 'not_linked' (documented
 *      choice over leaving it 'pending' forever with nothing that will ever
 *      drain it — see the doc comment on drainPending in
 *      lib/services/discord.ts).
 *
 * Run with: `npx tsx scripts/discord-smoke.ts` (from `platform/`).
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (`lib/db.ts` calls `neon()` at module scope) — every value import
 * below is a dynamic `import()` inside `main()`, after `config()` has run.
 */

import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

async function main() {
  const { eq, and, desc } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { getOrCreateUserFromClerk } = await import('../lib/services/users');
  const { notify } = await import('../lib/services/notifications');
  const { completeLink, encodeState, linkStatus, unlink, drainPending, mockDiscordDeliveries, isDiscordMockMode } = await import(
    '../lib/services/discord'
  );

  if (!isDiscordMockMode()) {
    throw new Error('This smoke test assumes mock mode (DISCORD_BOT_TOKEN/CLIENT_ID/CLIENT_SECRET empty). Refusing to hit the real Discord API.');
  }

  let allOk = true;
  const check = (label: string, ok: boolean, detail?: unknown) => {
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
    if (!ok) allOk = false;
  };

  /** The most recently created pending 'discord' row for (userId, event) — used
   * to pull out the exact row a step just created, since the notifications
   * table also carries unrelated debt from other smoke runs/users. */
  async function latestRow(userId: string, event: string) {
    const [row] = await db
      .select()
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.channel, 'discord'), eq(schema.notifications.event, event)))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(1);
    return row;
  }

  const user = await getOrCreateUserFromClerk({
    clerkId: 'dev-bypass',
    email: process.env.AUTH_DEV_EMAIL ?? 'dev@blackoutmerch.test',
    displayName: 'Dev Artist',
    imageUrl: null,
    publicMetadataRole: null,
  });
  console.log(`Dev user: ${user.email} (${user.id})`);

  // -- 1. link ------------------------------------------------------------
  console.log('\n=== link (simulated OAuth callback) ===');
  const linkResult = await completeLink(encodeState(user.id), 'mock-code');
  check('completeLink ok', linkResult.ok === true, linkResult);
  if (linkResult.ok) check('username is dev#0001', linkResult.username === 'dev#0001', linkResult.username);

  const statusAfterLink = await linkStatus(user.id);
  check('linkStatus.linked', statusAfterLink.linked === true, statusAfterLink);
  check('linkStatus.discordDm defaults on', statusAfterLink.discordDm === true, statusAfterLink.discordDm);

  const [userRow] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  check('users.discordUserId stored', userRow?.discordUserId === 'mock-discord-dev', userRow?.discordUserId);

  // -- 2. clear historical backlog so later steps reason about their own rows --
  console.log('\n=== drain pre-existing backlog (earlier waves never had a drain) ===');
  for (let i = 0; i < 20; i += 1) {
    const result = await drainPending({ limit: 50 });
    console.log('cleanup drain:', result);
    if (result.processed === 0) break;
  }

  // -- 3. queue + drain -----------------------------------------------------
  console.log('\n=== queue two notifications, then drain ===');
  await notify({
    userId: user.id,
    event: 'sale.new',
    text: 'Cruiser 2.0 sold x2',
    payload: { productName: 'Cruiser 2.0', qty: 2, grossCents: 7000 },
    prompt: 'Show order ORD-1001',
  });
  const saleRow = await latestRow(user.id, 'sale.new');
  check('sale.new discord row queued as pending', saleRow?.status === 'pending', saleRow?.status);

  await notify({
    userId: user.id,
    event: 'proof.ready',
    text: 'Proof v1 for Cruiser 2.0 is ready',
    payload: { productName: 'Cruiser 2.0', version: 1 },
    prompt: 'Show proof for Cruiser 2.0',
  });
  const proofRow = await latestRow(user.id, 'proof.ready');
  check('proof.ready discord row queued as pending', proofRow?.status === 'pending', proofRow?.status);

  const drain1 = await drainPending({ limit: 10 });
  console.log('drainPending result:', drain1);
  check('drain1.sent === 2', drain1.sent === 2, drain1);
  check('drain1.failed === 0', drain1.failed === 0, drain1);
  check('drain1.rateLimited === false', drain1.rateLimited === false, drain1);

  const [saleAfter, proofAfter] = await Promise.all([latestRow(user.id, 'sale.new'), latestRow(user.id, 'proof.ready')]);
  check('sale.new row is now sent', saleAfter?.status === 'sent', saleAfter?.status);
  check('proof.ready row is now sent', proofAfter?.status === 'sent', proofAfter?.status);
  check(
    'sent rows carry a mock discordMessageId',
    typeof (saleAfter?.payload as Record<string, unknown> | null)?.discordMessageId === 'string' &&
      typeof (proofAfter?.payload as Record<string, unknown> | null)?.discordMessageId === 'string',
  );

  const deliveries = mockDiscordDeliveries();
  const saleDelivery = deliveries.find((d) => d.content.includes('Cruiser 2.0 sold x2'));
  check('mock gateway recorded the sale DM', !!saleDelivery, saleDelivery?.content);
  check('DM content includes the chat deep link', !!saleDelivery?.content.includes('/studio'));
  check('DM content includes the reply-with-prompt hint', !!saleDelivery?.content.includes('Reply in Blackout Merchandise: "Show order ORD-1001"'));

  // -- 4. unlink, then prove drainPending fails closed -----------------------
  console.log('\n=== unlink, then a since-unlinked pending row ===');
  await unlink(user.id);
  const statusAfterUnlink = await linkStatus(user.id);
  check('linkStatus.linked is false after unlink', statusAfterUnlink.linked === false, statusAfterUnlink);
  check('discordDm turned off on unlink', statusAfterUnlink.discordDm === false, statusAfterUnlink.discordDm);

  await notify({ userId: user.id, event: 'order.shipped', text: 'Order shipped', payload: {} });
  const shippedRow = await latestRow(user.id, 'order.shipped');
  check('notify() does not queue discord after opt-out', shippedRow === undefined, shippedRow);

  // Force the scenario drainPending must handle defensively: a row queued
  // while linked, drained after the artist unlinked (e.g. the cron ran late).
  const [orphanRow] = await db
    .insert(schema.notifications)
    .values({
      userId: user.id,
      channel: 'discord',
      event: 'payout.paid',
      payload: { message: 'Payout of EUR 42.00 sent', prompt: 'Show my payouts' },
      status: 'pending',
    })
    .returning();

  const drain2 = await drainPending({ limit: 10 });
  console.log('drainPending result (post-unlink):', drain2);

  const [orphanAfter] = await db.select().from(schema.notifications).where(eq(schema.notifications.id, orphanRow.id)).limit(1);
  check('orphaned row marked failed (documented choice, not left pending forever)', orphanAfter?.status === 'failed', orphanAfter?.status);
  check(
    "failure reason is 'not_linked'",
    (orphanAfter?.payload as Record<string, unknown> | null)?.discordFailReason === 'not_linked',
    (orphanAfter?.payload as Record<string, unknown> | null)?.discordFailReason,
  );

  if (!allOk) throw new Error('discord-smoke: one or more assertions failed (see FAIL lines above).');
  console.log('\nSmoke test passed.');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
