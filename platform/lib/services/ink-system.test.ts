// The ink system profile: the code default, who may change it, what is refused and in
// which words, how a change keeps the old row, and that print jobs pin the row they ran
// with. PGlite, with the fake engine, pack writers, storage and queue.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import type { InkSystemProfile } from '@/lib/print/types';
import { bootstrapPrint, type Harness } from '@/lib/print/test-support';

let h: Harness;

before(async () => {
  h = await bootstrapPrint();
});

after(async () => {
  await h.close();
});

const profileWith = (change: Partial<InkSystemProfile>): InkSystemProfile => ({ ...DEFAULT_INK_SYSTEM, ...change });
const allRows = () => h.db.select().from(schema.inkSystems).orderBy(desc(schema.inkSystems.updatedAt), desc(schema.inkSystems.id));
const clear = () => h.db.delete(schema.inkSystems);

test('with nothing saved, the code default is the active profile', async () => {
  await clear();
  const active = await h.inkSystem.getActiveInkSystem();
  assert.equal(active.id, null);
  assert.equal(active.updatedAt, null);
  assert.deepEqual(active.profile, DEFAULT_INK_SYSTEM);
  assert.equal(await h.inkSystem.getInkSystemById(randomUUID()), null, 'a row that is not there is not a profile');
  assert.equal(h.inkSystem.inkProfileProblem(DEFAULT_INK_SYSTEM), null, 'the default itself is a valid profile');
});

test('only people with Manage access to Pre-press can change it, and a refusal writes nothing', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' }, { name: 'Mo Manager' });
  const denial = "You don't have Manage access to Pre-press.";
  const changed = profileWith({ pressHeads: 10 });

  for (const [who, actor] of [
    ['a viewer', await h.staff({ prepress: 'view' })],
    ['a worker', await h.staff({ prepress: 'work' })],
    ['staff in another area', await h.staff({ team: 'manage' })],
    ['a suspended manager', { ...(await h.staff({ prepress: 'manage' })), suspended: true }],
    ['an artist', { userId: h.artist.userId, role: 'artist' as const }],
  ] as const) {
    assert.deepEqual(await h.inkSystem.updateInkSystem(actor, changed), { ok: false, error: denial }, who);
  }
  assert.equal((await allRows()).length, 0);
  assert.equal(h.fakes.activity.filter((a) => a.entry.action === 'ink_system.update').length, 0);

  // Access is checked before the profile is looked at.
  assert.deepEqual(await h.inkSystem.updateInkSystem(await h.staff({ prepress: 'work' }), profileWith({ pressHeads: 0 })), { ok: false, error: denial });

  const saved = await h.inkSystem.updateInkSystem(manager, changed);
  assert.ok(saved.ok);
  assert.ok(saved.ok && (await h.inkSystem.updateInkSystem(h.owner, profileWith({ pressHeads: 12 }))).ok, 'the owner can too');
});

test('a profile with something wrong in it is refused in words, and nothing is saved', async () => {
  await clear();
  const profile = DEFAULT_INK_SYSTEM;
  const refusal = async (change: Partial<InkSystemProfile> | Record<string, unknown>) => {
    const r = await h.inkSystem.updateInkSystem(h.owner, { ...profile, ...change } as InkSystemProfile);
    return r.ok ? 'ok' : r.error;
  };

  assert.match(await refusal({ pressHeads: 0 }), /^pressHeads: /);
  assert.match(await refusal({ pressHeads: 16 }), /^pressHeads: /);
  assert.match(await refusal({ pressHeads: 2.5 }), /^pressHeads: /);
  assert.match(await refusal({ name: '   ' }), /^name: /);
  assert.match(await refusal({ pigmentMaxPct: 101 }), /^pigmentMaxPct: /);
  assert.match(await refusal({ mesh: { ...profile.mesh, solid: 10 } }), /^mesh > solid: /);
  assert.match(await refusal({ cure: { ...profile.cure, celsius: 900 } }), /^cure > celsius: /);
  assert.match(await refusal({ opacity: { ...profile.opacity, 'HB Opaque': 1.5 } }), /^opacity > HB Opaque: /);
  assert.match(await refusal({ measured: 'yes' }), /^measured: /);
  assert.match(await refusal({ colour: 'red' }), /colour/, 'a field the profile does not have');

  assert.equal(await refusal({ mesh: { ...profile.mesh, min: 300, max: 100 } }), 'Mesh: the finest count must not be lower than the coarsest.');
  assert.equal(await refusal({ cure: { ...profile.cure, minutesMin: 5, minutesMax: 2 } }), 'Cure: the shortest time must not exceed the longest.');
  assert.equal(await refusal({ offContactMm: [5, 2] }), 'Off-contact: the first value must not exceed the second.');
  // The engine looks every base and white ink up by name when it draws proofs, so each needs an opacity.
  assert.equal(await refusal({ bases: { light: 'HB Neutral', dark: 'Mystery base' } }), 'Opacity: add a value for Mystery base.');
  assert.equal(await refusal({ underbase: { ...profile.underbase, ink: 'Unknown white' } }), 'Opacity: add a value for Unknown white.');
  assert.equal(await refusal({ highlightWhite: { ink: 'Another white' } }), 'Opacity: add a value for Another white.');

  assert.match(h.inkSystem.inkProfileProblem(null) ?? '', /object/i, 'not even a profile');
  assert.equal((await allRows()).length, 0, 'none of them was saved');
});

test('a change adds a new active row and retires the old one, and the old one can still be read', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' }, { name: 'Mo Manager' });
  const first = await h.inkSystem.updateInkSystem(manager, profileWith({ name: 'MagnaPrint, measured', pressHeads: 10, measured: true }));
  assert.ok(first.ok);
  const one = first.ok ? first.value : null!;
  assert.ok(one.id);
  assert.equal(one.profile.name, 'MagnaPrint, measured');
  assert.equal((await h.inkSystem.getActiveInkSystem()).id, one.id);

  const second = await h.inkSystem.updateInkSystem(manager, profileWith({ name: 'MagnaPrint, remeasured', pressHeads: 12, measured: true }));
  assert.ok(second.ok);
  const two = second.ok ? second.value : null!;
  assert.notEqual(two.id, one.id);

  const rows = await allRows();
  assert.equal(rows.length, 2, 'the old row was kept, not changed');
  assert.deepEqual(rows.filter((r) => r.isActive).map((r) => r.id), [two.id], 'exactly one is active');
  const old = rows.find((r) => r.id === one.id)!;
  assert.equal(old.isActive, false);
  assert.equal((old.profile as InkSystemProfile).pressHeads, 10, 'what the old row says never changes');
  assert.equal(old.name, 'MagnaPrint, measured');
  assert.equal(old.updatedBy, manager.userId);

  const active = await h.inkSystem.getActiveInkSystem();
  assert.equal(active.id, two.id);
  assert.equal(active.profile.pressHeads, 12);
  assert.ok(active.updatedAt);
  // A job that ran with the old row reads the old profile.
  assert.equal((await h.inkSystem.getInkSystemById(one.id as string))?.pressHeads, 10);
  assert.equal((await h.inkSystem.getInkSystemById(two.id as string))?.pressHeads, 12);

  // The change is in the team log, with the new name.
  const logged = h.fakes.activity.filter((a) => a.actorId === manager.userId && a.entry.action === 'ink_system.update').map((a) => [a.actorId, a.entry.area, a.entry.itemType, a.entry.itemId, a.entry.detail]);
  assert.deepEqual(logged, [
    [manager.userId, 'prepress', 'ink_system', one.id, { name: 'MagnaPrint, measured' }],
    [manager.userId, 'prepress', 'ink_system', two.id, { name: 'MagnaPrint, remeasured' }],
  ]);
});

test('a row saved by an older version of the profile still loads, and the newest active row wins', async () => {
  await clear();
  // A row written before a field existed: the missing parts come from the default, nested ones merged.
  const [old] = await h.db
    .insert(schema.inkSystems)
    .values({ name: 'Old', isActive: true, profile: { name: 'Old', pressHeads: 4, mesh: { min: 120 }, underbase: { ink: 'Aquaflex V2 White' } }, updatedAt: new Date('2026-09-01T10:00:00Z') })
    .returning();
  const loaded = (await h.inkSystem.getActiveInkSystem()).profile;
  assert.equal(loaded.pressHeads, 4);
  assert.equal(loaded.mesh.min, 120);
  assert.equal(loaded.mesh.max, DEFAULT_INK_SYSTEM.mesh.max, 'a missing mesh value is the default');
  assert.deepEqual(loaded.underbase.flash, DEFAULT_INK_SYSTEM.underbase.flash);
  assert.deepEqual(loaded.cure, DEFAULT_INK_SYSTEM.cure);
  assert.deepEqual(loaded.offContactMm, DEFAULT_INK_SYSTEM.offContactMm);
  assert.deepEqual(loaded.opacity, DEFAULT_INK_SYSTEM.opacity);
  assert.equal(h.inkSystem.inkProfileProblem(loaded), null, 'and what loads is a whole profile');
  assert.equal((await h.inkSystem.getInkSystemById(old.id))?.pressHeads, 4);

  // If a retirement was missed and two rows are active, the newest one is the profile.
  const [newer] = await h.db
    .insert(schema.inkSystems)
    .values({ name: 'Newer', isActive: true, profile: { ...DEFAULT_INK_SYSTEM, name: 'Newer', pressHeads: 6 }, updatedAt: new Date('2026-10-01T10:00:00Z') })
    .returning();
  const active = await h.inkSystem.getActiveInkSystem();
  assert.equal(active.id, newer.id);
  assert.equal(active.profile.pressHeads, 6);
  // An inactive row is never the profile, however new.
  await h.db.insert(schema.inkSystems).values({ name: 'Retired', isActive: false, profile: { ...DEFAULT_INK_SYSTEM, pressHeads: 15 }, updatedAt: new Date('2026-12-01T10:00:00Z') });
  assert.equal((await h.inkSystem.getActiveInkSystem()).id, newer.id);
});

test('a print job pins the ink system row it ran with, so a later change does not alter its packs', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });

  // Prepared with the default: no row yet, so the job pins nothing and the code default is what it ran with.
  const before = await h.newDesign();
  const earlier = await h.prepare(before.designId);
  const [earlierPack] = await h.packs(earlier.designVersionId);
  assert.equal(h.pipeline.packInfo(earlierPack)?.jobInput.inkSystemId ?? null, null);

  const saved = await h.inkSystem.updateInkSystem(manager, profileWith({ name: 'MagnaPrint, measured', pressHeads: 10 }));
  assert.ok(saved.ok);
  const rowId = saved.ok ? (saved.value.id as string) : '';

  // Prepared after the change: the job input names the new row, and the pack keeps it.
  const after = await h.newDesign();
  const later = await h.prepare(after.designId);
  const [laterPack] = await h.packs(later.designVersionId);
  assert.equal(h.pipeline.packInfo(laterPack)?.jobInput.inkSystemId, rowId);
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, later.jobId));
  assert.equal((job.input as { inkSystemId?: string }).inkSystemId, rowId);

  // A change after that leaves the pack pinned to the row it ran with.
  const newer = await h.inkSystem.updateInkSystem(manager, profileWith({ name: 'MagnaPrint, remeasured', pressHeads: 12 }));
  assert.ok(newer.ok);
  assert.equal(h.pipeline.packInfo((await h.packs(later.designVersionId))[0])?.jobInput.inkSystemId, rowId);
  assert.equal((await h.inkSystem.getInkSystemById(rowId))?.pressHeads, 10, 'and that row still says what it said');

  // Preparing the same design again, with the new profile, is a different job: another input, another pack.
  const again = await h.printPrep.preparePrint(h.drop(after.designId));
  assert.ok(again.ok);
  assert.notEqual(again.ok ? again.value.jobId : '', later.jobId);
});

test('sample mode: the default is the profile, and saving checks access and the profile but writes nothing', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });
  process.env.PRINT_MOCK = '1';
  try {
    assert.deepEqual(await h.inkSystem.getActiveInkSystem(), { id: null, profile: DEFAULT_INK_SYSTEM, updatedAt: null });
    const saved = await h.inkSystem.updateInkSystem(manager, profileWith({ pressHeads: 9 }));
    assert.ok(saved.ok);
    assert.equal(saved.ok ? saved.value.profile.pressHeads : 0, 9);
    assert.equal(saved.ok ? saved.value.id : 'x', null);
    assert.deepEqual(await h.inkSystem.updateInkSystem(await h.staff({ prepress: 'view' }), profileWith({ pressHeads: 9 })), { ok: false, error: "You don't have Manage access to Pre-press." });
    assert.equal((await h.inkSystem.updateInkSystem(manager, profileWith({ pressHeads: 0 }))).ok, false, 'a profile with something wrong in it is still refused');
  } finally {
    delete process.env.PRINT_MOCK;
  }
  assert.equal((await allRows()).length, 0);
});
