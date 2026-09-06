/**
 * Custom-domain smoke test — exercises the wave-2 flow (Platform-Plan §7)
 * directly against the services (no agent loop): add -> pending + records,
 * mock-verify -> active (+ artistStores.customDomain set), then curls the
 * dev server with the custom domain's Host header to prove the proxy
 * rewrite works, then removes the domain.
 *
 * Uses the same dev-bypass user/store (clerkId 'dev-bypass') that
 * AUTH_DEV_BYPASS=1 serves in the browser, so it needs no ANTHROPIC_API_KEY
 * and reuses whatever the dev session already created.
 *
 * Run with: `npx tsx scripts/domains-smoke.ts` (from `platform/`). Start the
 * dev server first (`npm run dev`, port 3006) for the curl step to pass —
 * otherwise that step reports the connection failure and the rest is skipped.
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (`lib/db.ts` calls `neon()` at module scope) — every value import
 * below is a dynamic `import()` inside `main()`, after `config()` has run.
 */

import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';

config({ path: '.env.local', quiet: true });

const HOSTNAME = 'merch.hellslain.test';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3006').replace(/\/$/, '');

function curlStatus(hostname: string): string | null {
  try {
    return execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-H', `Host: ${hostname}`, `${APP_URL}/`], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function curlBody(hostname: string): string {
  try {
    return execFileSync('curl', ['-s', '-H', `Host: ${hostname}`, `${APP_URL}/`], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

async function main() {
  const { eq } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { getOrCreateUserFromClerk } = await import('../lib/services/users');
  const { addCustomDomain, checkDomain, listDomains, removeCustomDomain } = await import('../lib/services/domains');
  const { completeMockVerification } = await import('../lib/services/vercel');

  async function ensureDevStore(userId: string) {
    const existing = await db.select().from(schema.artistStores).where(eq(schema.artistStores.artistId, userId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.artistStores)
      .values({ artistId: userId, slug: 'dev-shop', name: 'Dev Shop', country: 'ES', currency: 'EUR', locale: 'en' })
      .returning();
    return created;
  }

  // Same upsert lib/auth.ts's devUser() uses, so this is the exact user/store
  // AUTH_DEV_BYPASS=1 serves in the browser.
  const user = await getOrCreateUserFromClerk({
    clerkId: 'dev-bypass',
    email: process.env.AUTH_DEV_EMAIL ?? 'dev@merchfrom.test',
    displayName: 'Dev Artist',
    imageUrl: null,
    publicMetadataRole: process.env.AUTH_DEV_ROLE ?? null,
  });
  const store = await ensureDevStore(user.id);
  console.log(`Dev store: ${store.name} (${store.id}), slug=${store.slug}`);

  // -- add ------------------------------------------------------------------
  console.log('\n=== add_custom_domain ===');
  const added = await addCustomDomain(store.id, HOSTNAME);
  if (!added.ok) throw new Error(`addCustomDomain failed: ${added.message}`);
  console.log(`hostname=${added.hostname}`);
  console.log(`records=${JSON.stringify(added.records)}`);

  let rows = await db.select().from(schema.customDomains).where(eq(schema.customDomains.hostname, HOSTNAME));
  console.log(`db status after add: ${rows[0]?.status}`);
  if (rows[0]?.status !== 'pending') {
    console.error('FAILED: expected status=pending right after add.');
    process.exitCode = 1;
  }

  // -- check before DNS "propagates" -----------------------------------------
  console.log('\n=== check_domain (before mock verification) ===');
  const preCheck = await checkDomain(HOSTNAME, { storeId: store.id });
  console.log(JSON.stringify(preCheck));
  if (!preCheck.ok || preCheck.status === 'active') {
    console.error('FAILED: expected a non-active status before mock verification completes.');
    process.exitCode = 1;
  }

  // -- simulate DNS propagation + Vercel verification ------------------------
  completeMockVerification(HOSTNAME);

  console.log('\n=== check_domain (after mock verification) ===');
  const postCheck = await checkDomain(HOSTNAME, { storeId: store.id });
  console.log(JSON.stringify(postCheck));
  if (!postCheck.ok || postCheck.status !== 'active') {
    console.error('FAILED: expected status=active after completeMockVerification.');
    process.exitCode = 1;
  }

  rows = await db.select().from(schema.customDomains).where(eq(schema.customDomains.hostname, HOSTNAME));
  console.log(`db status after check: ${rows[0]?.status}`);

  const storeRow = (await db.select().from(schema.artistStores).where(eq(schema.artistStores.id, store.id)))[0];
  console.log(`artistStores.customDomain: ${storeRow?.customDomain}`);
  if (storeRow?.customDomain !== HOSTNAME) {
    console.error('FAILED: expected artistStores.customDomain to be set once active.');
    process.exitCode = 1;
  }

  // -- proxy rewrite against the dev server ----------------------------------
  console.log(`\n=== curl -H 'Host: ${HOSTNAME}' ${APP_URL}/ ===`);
  const status = curlStatus(HOSTNAME);
  if (status === null) {
    console.error(`FAILED: could not reach ${APP_URL} — is \`npm run dev\` running on :3006?`);
    process.exitCode = 1;
  } else if (status === '200') {
    console.log('status=200 — storefront route served.');
  } else if (status === '404') {
    const body = curlBody(HOSTNAME);
    console.log(`status=404 — storefront route not published yet (the /[slug] route or the dev-shop's publish state), body starts: ${body.slice(0, 200)}`);
  } else {
    const body = curlBody(HOSTNAME);
    console.log(`status=${status} (unexpected) — body starts: ${body.slice(0, 300)}`);
  }

  // -- list -------------------------------------------------------------------
  console.log('\n=== list_domains ===');
  const listed = await listDomains(store.id);
  console.log(`count=${listed.length}`);

  // -- remove -------------------------------------------------------------------
  console.log('\n=== remove_domain ===');
  const removed = await removeCustomDomain(HOSTNAME, { storeId: store.id });
  console.log(`removed ok=${removed.ok}`);
  if (!removed.ok) {
    console.error('FAILED: expected remove to succeed.');
    process.exitCode = 1;
  }

  rows = await db.select().from(schema.customDomains).where(eq(schema.customDomains.hostname, HOSTNAME));
  console.log(`rows remaining after remove: ${rows.length}`);
  if (rows.length !== 0) {
    console.error('FAILED: expected the custom_domains row to be gone after remove.');
    process.exitCode = 1;
  }

  console.log(process.exitCode ? '\nSmoke test FAILED.' : '\nSmoke test passed.');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
