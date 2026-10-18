/**
 * Notifications smoke test — exercises notify() and notifyFan() against the
 * dev-bypass user (same identity the app uses under AUTH_DEV_BYPASS=1),
 * then asserts the notifications rows and outbox files it should have
 * produced (RESEND_API_KEY is empty in .env.local, so email goes to the
 * dev outbox at var/outbox/).
 *
 * Run with: `npx tsx scripts/notify-smoke.ts` (from `platform/`).
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (`lib/db.ts` calls `neon()` at module scope) — every value import
 * below is a dynamic `import()` inside `main()`, after `config()` has run.
 */

import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

async function main() {
  const { readdir, stat } = await import('fs/promises');
  const path = await import('path');
  const { eq, and, desc } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { getOrCreateUserFromClerk } = await import('../lib/services/users');
  const { notify, notifyFan } = await import('../lib/services/notifications');

  const startedAt = new Date();

  const user = await getOrCreateUserFromClerk({
    clerkId: 'dev-bypass',
    email: process.env.AUTH_DEV_EMAIL ?? 'dev@blackoutmerch.test',
    displayName: 'Dev Artist',
    imageUrl: null,
    publicMetadataRole: null,
  });
  console.log(`Dev user: ${user.email} (${user.id})`);

  console.log('\n=== notify sale.new ===');
  await notify({
    userId: user.id,
    event: 'sale.new',
    text: 'Cruiser 2.0 sold ×2',
    payload: { productName: 'Cruiser 2.0', qty: 2, grossCents: 7000, transferCents: 4200, currency: 'EUR', orderReference: 'ORD-1001' },
    prompt: 'Show order ORD-1001',
  });

  console.log('\n=== notify proof.ready ===');
  await notify({
    userId: user.id,
    event: 'proof.ready',
    text: 'Proof v1 for Cruiser 2.0 is ready',
    payload: { productName: 'Cruiser 2.0', version: 1 },
    prompt: 'Show proof for Cruiser 2.0',
  });

  console.log('\n=== notifyFan order.confirmed ===');
  await notifyFan({
    email: 'fan@blackoutmerch.test',
    event: 'order.confirmed',
    payload: { reference: 'ORD-1001', storeName: 'Iron Casket', totalCents: 7000, currency: 'EUR' },
  });

  // -- assert DB rows -------------------------------------------------------
  console.log('\n=== assertions: notification rows ===');
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, user.id)))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(20);

  const relevant = rows.filter((r) => r.createdAt >= startedAt || ['sale.new', 'proof.ready'].includes(r.event));
  const byEventChannel = new Map<string, string>();
  for (const row of relevant) byEventChannel.set(`${row.event}:${row.channel}`, row.status);

  const expected = ['sale.new:inapp', 'sale.new:discord', 'sale.new:email', 'proof.ready:inapp', 'proof.ready:discord', 'proof.ready:email'];
  let allOk = true;
  for (const key of expected) {
    const status = byEventChannel.get(key);
    const ok = Boolean(status);
    if (!ok) allOk = false;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${key} -> ${status ?? 'missing'}`);
  }
  if (!allOk) throw new Error('Expected notification rows are missing.');

  // -- assert outbox files ---------------------------------------------------
  console.log('\n=== assertions: outbox files ===');
  const outboxDir = path.join(process.cwd(), 'var', 'outbox');
  const files = await readdir(outboxDir).catch(() => [] as string[]);
  const written: string[] = [];
  for (const file of files) {
    const full = path.join(outboxDir, file);
    const info = await stat(full);
    if (info.mtime >= startedAt) written.push(full);
  }
  written.sort();

  const wantSlugs = ['sale.new', 'proof.ready', 'fan.order.confirmed'];
  for (const slug of wantSlugs) {
    const match = written.find((f) => f.includes(slug));
    console.log(`${match ? 'OK  ' : 'FAIL'} outbox file for ${slug}${match ? ` -> ${match}` : ''}`);
    if (!match) allOk = false;
  }
  if (!allOk) throw new Error('Expected outbox files are missing.');

  console.log('\nOutbox files written this run:');
  for (const file of written) console.log(`  ${file}`);

  console.log('\nSmoke test passed.');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
