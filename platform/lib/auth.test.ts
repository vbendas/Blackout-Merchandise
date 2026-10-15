// The session gates in lib/auth.ts, run for real: AUTH_DEV_BYPASS makes
// requireUser() load the fixed dev user from the (PGlite) database, and each
// test sets that user's role, access, pause and shop first. Redirects are
// read from the NEXT_REDIRECT error Next throws.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { setupTestDb, type TestDb } from '../scripts/test/pglite';
import { PermissionError } from '@/lib/auth/permissions';

process.env.AUTH_DEV_BYPASS = '1';
delete process.env.AUTH_DEV_ROLE;
delete process.env.AUTH_DEV_EMAIL;
delete process.env.ADMIN_EMAILS;

let t: TestDb;
let auth: typeof import('./auth');
let users: typeof import('./services/users');
let devId: string;

before(async () => {
  t = await setupTestDb();
  auth = await import('./auth');
  users = await import('./services/users');
  const session = await auth.requireUser();
  devId = session.user.id;
});

after(async () => {
  await t.close();
});

async function setDev(opts: { role: 'artist' | 'staff' | 'admin'; permissions?: Record<string, string>; suspended?: boolean; shop?: boolean }) {
  await t.db.update(schema.users).set({ role: opts.role, suspendedAt: opts.suspended ? new Date() : null }).where(eq(schema.users.id, devId));
  await t.db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, devId));
  const rows = Object.entries(opts.permissions ?? {}).map(([area, level]) => ({ userId: devId, area, level }));
  if (rows.length > 0) await t.db.insert(schema.staffPermissions).values(rows);
  await t.db.delete(schema.artistStores).where(eq(schema.artistStores.artistId, devId));
  if (opts.shop) await t.db.insert(schema.artistStores).values({ artistId: devId, slug: `dev-${Date.now()}`, name: 'Dev shop' });
}

/** The path a call redirects to, or null when it returns normally. */
async function redirectOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (err) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return digest.split(';')[2] ?? '';
    throw err;
  }
}

beforeEach(async () => {
  await setDev({ role: 'artist' });
});

test('requireUser loads the actor with the session', async () => {
  await setDev({ role: 'staff', permissions: { prepress: 'work', team: 'manage' } });
  const session = await auth.requireUser();
  assert.equal(session.role, 'staff');
  assert.equal(session.actor.userId, devId);
  assert.deepEqual(session.actor.permissions, { prepress: 'work' });
  assert.equal(session.actor.suspended, false);
});

test('a suspended employee is blocked everywhere, but getSession still reads them', async () => {
  await setDev({ role: 'staff', permissions: { prepress: 'manage' }, suspended: true });
  assert.equal(await redirectOf(() => auth.requireUser()), auth.STAFF_PAUSED_PATH);
  assert.equal(await redirectOf(() => auth.requireRegistered()), auth.STAFF_PAUSED_PATH);
  assert.equal(await redirectOf(() => auth.requireStaffPage('prepress', 'view')), auth.STAFF_PAUSED_PATH);
  assert.equal(await redirectOf(() => auth.requireStaffAction('prepress', 'view')), auth.STAFF_PAUSED_PATH);
  const session = await auth.getSession();
  assert.ok(session && auth.isSuspended(session));
});

test('staff and the owner skip artist registration; an artist without a shop registers', async () => {
  await setDev({ role: 'artist' });
  assert.equal(await redirectOf(() => auth.requireRegistered()), '/register');
  await setDev({ role: 'artist', shop: true });
  assert.equal(await redirectOf(() => auth.requireRegistered()), null);
  await setDev({ role: 'staff', permissions: { support: 'work' } });
  assert.equal(await redirectOf(() => auth.requireRegistered()), null);
  await setDev({ role: 'staff' });
  assert.equal(await redirectOf(() => auth.requireRegistered()), null);
  await setDev({ role: 'admin' });
  assert.equal(await redirectOf(() => auth.requireRegistered()), null);
});

test('requireStaffPage lets through exactly who can(), and sends the rest somewhere they may go', async () => {
  await setDev({ role: 'admin' });
  assert.equal(await redirectOf(() => auth.requireStaffPage('team', 'manage')), null);
  assert.equal(await redirectOf(() => auth.requireStaffPage('money', 'manage')), null);

  await setDev({ role: 'staff', permissions: { production: 'view' } });
  assert.equal(await redirectOf(() => auth.requireStaffPage('production', 'view')), null);
  assert.equal(await redirectOf(() => auth.requireStaffPage('production', 'work')), '/admin');
  assert.equal(await redirectOf(() => auth.requireStaffPage('team', 'manage')), '/admin');
  assert.equal(await redirectOf(() => auth.requireStaffPage('money', 'view')), '/admin');

  // No admin area at all: back to the Studio, not round to /admin.
  await setDev({ role: 'staff' });
  assert.equal(await redirectOf(() => auth.requireStaffPage('production', 'view')), '/studio');
  await setDev({ role: 'artist', shop: true });
  assert.equal(await redirectOf(() => auth.requireStaffPage('production', 'view')), '/studio');
});

test('an employee’s page view is recorded; the owner’s is not', async () => {
  await t.db.delete(schema.staffActivity).where(eq(schema.staffActivity.actorId, devId));
  await setDev({ role: 'staff', permissions: { production: 'view' } });
  await auth.requireStaffPage('production', 'view', { page: '/admin/production' });
  await setDev({ role: 'admin' });
  await auth.requireStaffPage('production', 'view', { page: '/admin/production' });
  const rows = await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.actorId, devId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, 'page.view');
  assert.equal(rows[0].area, 'production');
  assert.equal(rows[0].itemId, '/admin/production');
});

test('requireStaffAction throws a PermissionError instead of redirecting', async () => {
  await setDev({ role: 'staff', permissions: { production: 'view' } });
  await assert.rejects(() => auth.requireStaffAction('production', 'work'), PermissionError);
  const session = await auth.requireStaffAction('production', 'view');
  assert.equal(session.user.id, devId);
  await setDev({ role: 'artist', shop: true });
  await assert.rejects(() => auth.requireStaffAction('production', 'view'), PermissionError);
});

test('a change of access counts from the next request, and removal ends access', async () => {
  await setDev({ role: 'staff', permissions: { production: 'view' } });
  await assert.rejects(() => auth.requireStaffAction('production', 'work'), PermissionError);
  await t.db.update(schema.staffPermissions).set({ level: 'work' }).where(eq(schema.staffPermissions.userId, devId));
  await auth.requireStaffAction('production', 'work');

  await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.id, devId));
  await assert.rejects(() => auth.requireStaffAction('production', 'view'), PermissionError);
  assert.equal(await redirectOf(() => auth.requireStaffPage('production', 'view')), '/studio');
});

test('ADMIN_EMAILS only bootstraps the first owner', async () => {
  const saved = await t.db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, 'admin'));
  await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.role, 'admin'));
  process.env.ADMIN_EMAILS = 'boss@merchfrom.test, second@merchfrom.test';
  try {
    const boss = await users.getOrCreateUserFromClerk({ clerkId: 'test-boot-1', email: 'Boss@merchfrom.test', displayName: null, imageUrl: null });
    assert.equal(boss.role, 'admin', 'no owner yet: the listed address becomes the owner');

    const second = await users.getOrCreateUserFromClerk({ clerkId: 'test-boot-2', email: 'second@merchfrom.test', displayName: null, imageUrl: null });
    assert.equal(second.role, 'artist', 'an owner exists: the list promotes no one else');

    const viaMetadata = await users.getOrCreateUserFromClerk({ clerkId: 'test-boot-3', email: 'meta@merchfrom.test', displayName: null, imageUrl: null, publicMetadataRole: 'admin' });
    assert.equal(viaMetadata.role, 'artist');

    // A sync never changes a team role: a demoted owner stays demoted.
    await t.db.update(schema.users).set({ role: 'staff' }).where(eq(schema.users.id, boss.id));
    const synced = await users.getOrCreateUserFromClerk({ clerkId: 'test-boot-1', email: 'boss@merchfrom.test', displayName: null, imageUrl: null });
    assert.equal(synced.role, 'staff');

    // The dev bypass's own role setting is applied as it is.
    const dev = await users.getOrCreateUserFromClerk({ clerkId: 'test-boot-4', email: 'devrole@merchfrom.test', displayName: null, imageUrl: null, devRole: 'staff' });
    assert.equal(dev.role, 'staff');
  } finally {
    delete process.env.ADMIN_EMAILS;
    await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.role, 'admin'));
    for (const row of saved) await t.db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, row.id));
  }
});
