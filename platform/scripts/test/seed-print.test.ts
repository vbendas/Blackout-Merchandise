// The ink system seed (scripts/seed-print.ts) on PGlite, never Neon. It
// inserts the default profile only when no active row exists, and writes
// nothing otherwise, so an admin's edits survive every re-run.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { setupTestDb, type TestDb } from './pglite';

type SeedModule = typeof import('../seed-print');
type Profile = typeof import('../../lib/print/defaults').DEFAULT_INK_SYSTEM;

let t: TestDb;
let seedInkSystem: SeedModule['seedInkSystem'];
let DEFAULT_INK_SYSTEM: Profile;

before(async () => {
  t = await setupTestDb();
  ({ seedInkSystem } = await import('../seed-print'));
  ({ DEFAULT_INK_SYSTEM } = await import('../../lib/print/defaults'));
});

after(async () => {
  await t.close();
});

const rows = async () => (await t.db.select().from(schema.inkSystems)).sort((a, b) => a.id.localeCompare(b.id));
const activeRows = async () => (await rows()).filter((r) => r.isActive);

test('first run inserts the default profile as the one active row', async () => {
  assert.equal((await rows()).length, 0);
  const result = await seedInkSystem(t.db);
  assert.equal(result.action, 'inserted');
  const all = await rows();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, result.id);
  assert.equal(all[0].isActive, true);
  assert.equal(all[0].name, 'MagnaPrint HB');
  assert.deepEqual(all[0].profile, DEFAULT_INK_SYSTEM);
});

test('the seeded profile carries the MagnaPrint HB settings, halftone mesh at 230', async () => {
  const [row] = await rows();
  const p = row.profile as Profile;
  assert.equal(p.bases.light, 'HB Neutral');
  assert.equal(p.bases.dark, 'HB Opaque');
  assert.equal(p.underbase.ink, 'Aquaflex V2 White');
  assert.deepEqual(p.underbase.flash, { seconds: 4, celsius: 230 });
  assert.equal(p.highlightWhite.ink, 'Aquaflex V2 White');
  assert.equal(p.mesh.min, 158);
  assert.equal(p.mesh.max, 305);
  assert.equal(p.mesh.halftone, 230);
  assert.deepEqual(p.cure, { minutesMin: 2, minutesMax: 2.5, celsius: 165 });
  assert.equal(p.pigmentMaxPct, 9);
  assert.equal(p.measured, false);
});

test('a re-run on an untouched row writes nothing', async () => {
  const [prior] = await rows();
  const result = await seedInkSystem(t.db);
  assert.equal(result.action, 'kept');
  assert.equal(result.id, prior.id);
  const all = await rows();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0].profile, prior.profile);
  assert.equal(all[0].updatedAt.getTime(), prior.updatedAt.getTime());
});

test('an admin edit survives a re-run untouched', async () => {
  const [row] = await rows();
  const edited = { ...DEFAULT_INK_SYSTEM, pigmentMaxPct: 7, mesh: { ...DEFAULT_INK_SYSTEM.mesh, halftone: 280 } };
  const adminEditAt = new Date(Date.now() + 60_000);
  await t.db.update(schema.inkSystems).set({ profile: edited, updatedAt: adminEditAt }).where(eq(schema.inkSystems.id, row.id));
  const [prior] = await rows();
  const result = await seedInkSystem(t.db);
  assert.equal(result.action, 'kept');
  assert.equal(result.id, row.id);
  const all = await rows();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0].profile, edited);
  assert.equal(all[0].updatedAt.getTime(), adminEditAt.getTime());
  assert.deepEqual(all[0], prior);
});

test('with only inactive rows, the seed inserts a new default and leaves the old row alone', async () => {
  await t.db.update(schema.inkSystems).set({ isActive: false }).where(eq(schema.inkSystems.isActive, true));
  const prior = await rows();
  assert.equal(prior.length, 1);
  assert.equal(prior[0].isActive, false);
  const result = await seedInkSystem(t.db);
  assert.equal(result.action, 'inserted');
  const all = await rows();
  assert.equal(all.length, 2);
  assert.deepEqual(
    all.find((r) => r.id !== result.id),
    prior[0],
  );
  const fresh = all.find((r) => r.id === result.id);
  assert.ok(fresh);
  assert.equal(fresh.isActive, true);
  assert.deepEqual(fresh.profile, DEFAULT_INK_SYSTEM);
});

test('stray active rows are left alone: with an active row present, the seed writes nothing', async () => {
  await t.db.insert(schema.inkSystems).values({ name: 'Old test ink', profile: { name: 'Old test ink' }, isActive: true });
  const prior = await rows();
  assert.equal((await activeRows()).length, 2);
  const result = await seedInkSystem(t.db);
  assert.equal(result.action, 'kept');
  assert.deepEqual(await rows(), prior);
  assert.equal((await activeRows()).length, 2);
});
