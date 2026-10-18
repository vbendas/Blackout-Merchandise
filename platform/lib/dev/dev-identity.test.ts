// The dev identity switch in lib/auth.ts, run for real: with AUTH_DEV_BYPASS the mf_dev_as cookie picks which
// of the demo's users a request signs in as, and anything else (no cookie, an unknown key, a key whose user
// the demo never made, a cookie that names a real account some other way) is the fixed dev user, as before.
// A request's cookies are put where Next keeps them (AsyncLocalStorage), the way a real request has them.
import { AsyncLocalStorage } from 'node:async_hooks';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { setupTestDb, type TestDb } from '../../scripts/test/pglite';
import { DEV_IDENTITIES } from './identities';
import { PRESETS } from '../auth/permissions';

// Next's own request storage reads this global, which its server puts there first.
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage = AsyncLocalStorage;
process.env.AUTH_DEV_BYPASS = '1';
delete process.env.AUTH_DEV_ROLE;
delete process.env.AUTH_DEV_EMAIL;
delete process.env.ADMIN_EMAILS;

let t: TestDb;
let auth: typeof import('../auth');
let workAsyncStorage: typeof import('next/dist/server/app-render/work-async-storage.external').workAsyncStorage;
let workUnitAsyncStorage: typeof import('next/dist/server/app-render/work-unit-async-storage.external').workUnitAsyncStorage;
let sealCookies: (header: string) => unknown;

before(async () => {
  ({ workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external'));
  ({ workUnitAsyncStorage } = await import('next/dist/server/app-render/work-unit-async-storage.external'));
  const { RequestCookies } = await import('next/dist/server/web/spec-extension/cookies');
  const { RequestCookiesAdapter } = await import('next/dist/server/web/spec-extension/adapters/request-cookies');
  sealCookies = (header) => RequestCookiesAdapter.seal(new RequestCookies(new Headers(header ? { cookie: header } : {})));

  t = await setupTestDb();
  // The users `npm run demo:local` makes: the owner is the fixed dev user's own row.
  for (const identity of DEV_IDENTITIES) {
    const [row] = await t.db
      .insert(schema.users)
      .values({ clerkId: identity.clerkId, email: identity.email, displayName: identity.displayName, role: identity.role, staffTitle: identity.title ?? null })
      .returning({ id: schema.users.id });
    if (identity.preset) {
      const rows = Object.entries(PRESETS[identity.preset].permissions).map(([area, level]) => ({ userId: row.id, area, level: level as string }));
      await t.db.insert(schema.staffPermissions).values(rows);
    }
    if (identity.role === 'artist') await t.db.insert(schema.artistStores).values({ artistId: row.id, slug: 'underwriter', name: 'Underwriter' });
  }
  auth = await import('../auth');
});

after(async () => {
  await t.close();
});

/** Runs `fn` as a request carrying this Cookie header. */
function request<T>(cookie: string, fn: () => Promise<T>): Promise<T> {
  const workStore = { route: '/dev', incrementalCache: {}, pendingRevalidatedTags: [] } as never;
  const requestStore = { type: 'request', phase: 'render', cookies: sealCookies(cookie) } as never;
  return workAsyncStorage.run(workStore, () => workUnitAsyncStorage.run(requestStore, fn));
}

async function signedInAs(cookie: string) {
  const session = await request(cookie, () => auth.requireUser());
  return { email: session.user.email, role: session.role, store: session.store?.slug ?? null, areas: session.actor.permissions ?? null };
}

test('each identity key signs in as that demo user, with their own role, shop and access', async () => {
  assert.deepEqual(await signedInAs('mf_dev_as=owner'), { email: 'dev@blackoutmerch.test', role: 'admin', store: null, areas: null });
  assert.deepEqual(await signedInAs('mf_dev_as=artist'), { email: 'nova@blackoutmerch.test', role: 'artist', store: 'underwriter', areas: null });

  const prepress = await signedInAs('mf_dev_as=prepress');
  assert.equal(prepress.email, 'ines@blackoutmerch.test');
  assert.equal(prepress.role, 'staff');
  assert.deepEqual(prepress.areas, { prepress: 'work', production: 'view', runs: 'view' });

  const production = await signedInAs('mf_dev_as=production');
  assert.equal(production.email, 'marc@blackoutmerch.test');
  assert.deepEqual(production.areas, { production: 'work', prepress: 'view', shop_orders: 'view', runs: 'view' });

  const support = await signedInAs('mf_dev_as=support');
  assert.equal(support.email, 'laia@blackoutmerch.test');
  assert.equal(support.areas?.support, 'work');
});

test('no cookie, an unknown key or an empty one is the fixed dev user (AUTH_DEV_EMAIL, default dev@blackoutmerch.test)', async () => {
  for (const cookie of ['', 'other=1', 'mf_dev_as=', 'mf_dev_as=nobody', 'mf_dev_as=ARTIST', 'mf_dev_as=nova@blackoutmerch.test', 'mf_dev_as=dev-bypass:artist']) {
    assert.equal((await signedInAs(cookie)).email, 'dev@blackoutmerch.test', cookie || '(no cookie)');
  }
});

test('outside a request (no cookies to read) it is the fixed dev user too, as in the other tests', async () => {
  const session = await auth.requireUser();
  assert.equal(session.user.email, 'dev@blackoutmerch.test');
});

test('a key whose user the demo never made falls back to the fixed dev user, and nothing is created', async () => {
  await t.db.delete(schema.users).where(eq(schema.users.clerkId, 'dev-bypass:support'));
  const before = (await t.db.select().from(schema.users)).length;
  assert.equal((await signedInAs('mf_dev_as=support')).email, 'dev@blackoutmerch.test');
  assert.equal((await t.db.select().from(schema.users)).length, before, 'a cookie never creates a user');
});

test('a changed role in the database counts from the next request (the cookie names who, not what they may do)', async () => {
  await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.clerkId, 'dev-bypass:prepress'));
  const session = await signedInAs('mf_dev_as=prepress');
  assert.equal(session.role, 'artist');
  assert.equal(session.areas, null);
});
