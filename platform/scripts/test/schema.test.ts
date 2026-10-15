// Smoke test of the print-prep and staff tables on PGlite (no Neon).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { setupTestDb, seedUser, type TestDb } from './pglite';

let t: TestDb;

before(async () => {
  t = await setupTestDb();
});

after(async () => {
  await t.close();
});

test('the staff role and per-area permissions round-trip', async () => {
  const { userId } = await seedUser(t.db, { email: 'printer@merchfrom.test', role: 'staff' });
  await t.db.insert(schema.staffPermissions).values([
    { userId, area: 'prepress', level: 'work' },
    { userId, area: 'production', level: 'view' },
  ]);
  const rows = await t.db.select().from(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
  assert.equal(rows.length, 2);
  const [user] = await t.db.select().from(schema.users).where(eq(schema.users.id, userId));
  assert.equal(user.role, 'staff');
  assert.equal(user.suspendedAt, null);
});

test('a design version, a print job and a pack link up', async () => {
  const { userId, storeId } = await seedUser(t.db, { email: 'artist@merchfrom.test', withStore: true });
  const [design] = await t.db.insert(schema.designs).values({ storeId: storeId!, source: 'upload' }).returning();
  const [version] = await t.db
    .insert(schema.designVersions)
    .values({ designId: design.id, version: 1, artUrl: 'https://example.test/a.png', sha256: 'x', widthPx: 1080, heightPx: 1296, source: 'upload', createdBy: userId })
    .returning();
  const [job] = await t.db
    .insert(schema.printJobs)
    .values({ kind: 'prepare', designVersionId: version.id, input: { designId: design.id }, inputHash: 'h1' })
    .returning();
  assert.equal(job.status, 'queued');
  assert.equal(job.attempts, 0);

  const [pack] = await t.db
    .insert(schema.productionPacks)
    .values({ designVersionId: version.id, placement: { position: 'front_chest', widthMm: 280 }, technique: 'screen', screenSetKey: 'darks', inputHash: 'h1', jobId: job.id })
    .returning();
  assert.equal(pack.buildStatus, 'building');
  assert.equal(pack.auditStatus, 'idle');

  const waiting = await t.db
    .select()
    .from(schema.productionPacks)
    .where(and(eq(schema.productionPacks.designVersionId, version.id), eq(schema.productionPacks.technique, 'screen')));
  assert.equal(waiting.length, 1);
});

test('services importing lib/db get the PGlite client, not Neon', async () => {
  const { db } = await import('@/lib/db');
  assert.equal(db as unknown, t.db as unknown);
});

test('print services carry the shop flag, defaulting to true', async () => {
  const [svc] = await t.db.insert(schema.printServices).values({ code: 'screen_test', name: 'Screen test', availableInShop: false }).returning();
  assert.equal(svc.availableInShop, false);
  const [dtg] = await t.db.insert(schema.printServices).values({ code: 'dtg_test', name: 'DTG test' }).returning();
  assert.equal(dtg.availableInShop, true);
});

test('one live print job per input: a second queued or running twin is refused, finished ones are not', async () => {
  const { storeId } = await seedUser(t.db, { email: 'queue@merchfrom.test', withStore: true });
  const [design] = await t.db.insert(schema.designs).values({ storeId: storeId!, source: 'upload' }).returning();
  const [version] = await t.db
    .insert(schema.designVersions)
    .values({ designId: design.id, version: 1, artUrl: 'https://example.test/q.png', sha256: 'q', widthPx: 10, heightPx: 10, source: 'upload' })
    .returning();
  const job = (kind: string, status: 'queued' | 'running' | 'done' | 'failed') =>
    t.db.insert(schema.printJobs).values({ kind, designVersionId: version.id, input: {}, inputHash: 'live-hash', status });

  await job('prepare', 'done');
  await job('prepare', 'failed');
  await job('prepare', 'queued');
  await assert.rejects(job('prepare', 'queued'));
  await assert.rejects(job('prepare', 'running'));
  await job('rerun', 'queued');
});
