// Dot-gain calibration in the ink system profile: who may save and reset it,
// what is refused, that a save is a new row (so packs made before it keep the
// curve they ran with), that the engine's hook reads it, and that the edits of
// the rest of the profile leave it alone. PGlite, with the fake engine, pack
// writers, storage and queue.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { desc } from 'drizzle-orm';
import * as schema from '@db/schema';
import { dotGainFor } from '@/lib/print/calibration/curve';
import { LINEAR_DOT_GAIN } from '@/lib/print/engine/halftone';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import type { DotGainInput } from '@/lib/print/calibration/profile';
import type { InkSystemProfile } from '@/lib/print/types';
import { bootstrapPrint, type Harness } from '@/lib/print/test-support';

let h: Harness;

before(async () => {
  h = await bootstrapPrint();
});

after(async () => {
  await h.close();
});

const parabola = (peak: number) => (c: number) => c + 4 * peak * c * (1 - c);
const measurement = (over: Partial<DotGainInput> = {}): DotGainInput => ({
  method: 'scan',
  lpi: 55,
  angleDeg: 22.5,
  mesh: 230,
  points: Array.from({ length: 21 }, (_, i) => ({ input: i / 20, printed: parabola(0.18)(i / 20) })),
  ...over,
});
const allRows = () => h.db.select().from(schema.inkSystems).orderBy(desc(schema.inkSystems.updatedAt), desc(schema.inkSystems.id));
const clear = async () => {
  await h.db.delete(schema.inkSystems);
  h.fakes.activity.length = 0;
};
const denial = "You don't have Manage access to Pre-press.";

test('only people with Manage access to Pre-press can save or reset a calibration, and a refusal writes nothing', async () => {
  await clear();
  const viewer = await h.staff({ prepress: 'view' });
  const worker = await h.staff({ prepress: 'work' });
  const other = await h.staff({ team: 'manage' });
  const paused = { ...(await h.staff({ prepress: 'manage' })), suspended: true };
  const artist = { userId: h.artist.userId, role: 'artist' as const };
  for (const [who, actor] of [['a viewer', viewer], ['a worker', worker], ['staff in another area', other], ['a suspended manager', paused], ['an artist', artist]] as const) {
    assert.deepEqual(await h.inkSystem.saveDotGain(actor, measurement()), { ok: false, error: denial }, `${who} saving`);
    assert.deepEqual(await h.inkSystem.resetDotGain(actor), { ok: false, error: denial }, `${who} resetting`);
  }
  assert.equal((await allRows()).length, 0);
  assert.equal(h.fakes.activity.length, 0);
  // Access first: a measurement with something wrong in it still gets the access answer from someone who may not.
  assert.deepEqual(await h.inkSystem.saveDotGain(worker, measurement({ points: [] })), { ok: false, error: denial });

  const manager = await h.staff({ prepress: 'manage' });
  assert.ok((await h.inkSystem.saveDotGain(manager, measurement())).ok);
  assert.ok((await h.inkSystem.saveDotGain(h.owner, measurement({ method: 'manual' }))).ok, 'the owner can too');
});

test('a measurement with something wrong in it is refused in words, and nothing is saved', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });
  const refusal = async (input: DotGainInput) => {
    const r = await h.inkSystem.saveDotGain(manager, input);
    return r.ok ? 'ok' : r.error;
  };
  assert.match(await refusal(measurement({ points: [{ input: 0.5, printed: 0.7 }] })), /at least 3 readings/);
  assert.match(await refusal(measurement({ points: [{ input: 0, printed: 0 }, { input: 1, printed: 1 }, { input: Number.NaN, printed: 0.3 }] })), /at least 3 readings/, 'the fixed ends and what is not a number are not readings');
  assert.match(await refusal(measurement({ lpi: 5 })), /Lines per inch goes from 15 to 150/);
  assert.match(await refusal(measurement({ mesh: 12.5 })), /whole number/);
  assert.match(await refusal(measurement({ angleDeg: 400 })), /angle goes from 0 to 180/);
  assert.match(await refusal(measurement({ method: 'guess' as unknown as 'scan' })), /how the chart was read/);
  assert.match(await refusal(measurement({ points: [{ input: 0.2, printed: 0.3 }, { input: 0.5, printed: 0.97 }, { input: 0.8, printed: 0.9 }] })), /further than a press moves a tone/);
  assert.match(await refusal(measurement({ points: [{ input: 0.2, printed: 0.3 }, { input: 0.4, printed: 0.62 }, { input: 0.5, printed: 0.5 }, { input: 0.8, printed: 0.9 }] })), /falls from 62 % at 40 % to 50 % at 50 %/);
  assert.match(await refusal(measurement({ measuredAt: 'yesterday' })), /date of the measurement isn’t valid/);
  assert.equal((await allRows()).length, 0, 'none of them was saved');
  assert.equal(h.fakes.activity.length, 0);
});

test('a calibration is a new active row of the whole profile, the old row is kept as it was, and the engine reads the new one', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' }, { name: 'Mo Manager' });
  const first = await h.inkSystem.updateInkSystem(manager, { ...DEFAULT_INK_SYSTEM, name: 'MagnaPrint, May', pressHeads: 10 });
  assert.ok(first.ok);
  const one = first.ok ? first.value : null!;
  assert.equal(one.profile.dotGain, undefined);
  assert.equal(dotGainFor(one.profile), LINEAR_DOT_GAIN, 'no calibration: linear');

  const saved = await h.inkSystem.saveDotGain(manager, measurement({ measuredAt: '2026-10-14T08:30:00.000Z' }));
  assert.ok(saved.ok);
  const two = saved.ok ? saved.value : null!;
  assert.notEqual(two.id, one.id);
  assert.equal(two.profile.name, 'MagnaPrint, May', 'the rest of the profile carries over');
  assert.equal(two.profile.pressHeads, 10);
  assert.equal(two.profile.dotGain?.method, 'scan');
  assert.equal(two.profile.dotGain?.measuredAt, '2026-10-14T08:30:00.000Z');
  assert.deepEqual([two.profile.dotGain?.lpi, two.profile.dotGain?.angleDeg, two.profile.dotGain?.mesh], [55, 22.5, 230]);
  assert.equal(two.profile.dotGain?.points.length, 19, 'the fixed ends are not stored');
  assert.deepEqual(two.profile.dotGain?.points[9], { input: 0.5, printed: 0.68 });

  const rows = await allRows();
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.filter((r) => r.isActive).map((r) => r.id), [two.id]);
  assert.equal((rows.find((r) => r.id === one.id)?.profile as InkSystemProfile).dotGain, undefined, 'the old row still says what it said');
  assert.equal(rows.find((r) => r.id === two.id)?.updatedBy, manager.userId);

  // A job that ran with the old row reads linear; a job prepared now reads the calibration.
  const old = await h.inkSystem.getInkSystemById(one.id as string);
  assert.ok(old);
  assert.equal(dotGainFor(old), LINEAR_DOT_GAIN);
  const active = await h.inkSystem.getActiveInkSystem();
  assert.equal(active.id, two.id);
  const fn = dotGainFor(active.profile);
  assert.notEqual(fn, LINEAR_DOT_GAIN);
  assert.ok(fn(0.5) < 0.35 && fn(0.5) > 0.3, `film coverage for a wanted 50%: ${fn(0.5)}`);
  assert.equal(fn(0), 0);
  assert.equal(fn(1), 1);

  // In the team log, with what a person wants to see of it.
  const logged = h.fakes.activity.filter((a) => a.entry.action === 'ink_system.dot_gain');
  assert.equal(logged.length, 1);
  assert.equal(logged[0].actorId, manager.userId);
  assert.deepEqual([logged[0].entry.area, logged[0].entry.itemType, logged[0].entry.itemId], ['prepress', 'ink_system', two.id]);
  assert.deepEqual(logged[0].entry.detail, { method: 'scan', lpi: 55, angleDeg: 22.5, mesh: 230, readings: 19, measuredAt: '2026-10-14T08:30:00.000Z', printedAt50: 0.68 });
});

test('with no ink system row yet, a calibration is saved on top of the code default', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });
  const saved = await h.inkSystem.saveDotGain(manager, measurement());
  assert.ok(saved.ok);
  assert.deepEqual({ ...(saved.ok ? saved.value.profile : DEFAULT_INK_SYSTEM), dotGain: undefined }, { ...DEFAULT_INK_SYSTEM, dotGain: undefined });
  assert.equal((await allRows()).length, 1);
});

test('readings in any order, with the ends and repeats, are made into a clean measurement', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });
  const saved = await h.inkSystem.saveDotGain(
    manager,
    measurement({
      method: 'manual',
      points: [
        { input: 1, printed: 1 },
        { input: 0.5, printed: 0.7 },
        { input: 0.25, printed: 0.4 },
        { input: 0, printed: 0.02 },
        { input: 0.5, printed: 0.72 },
        { input: 0.75, printed: 0.9 },
      ],
    }),
  );
  assert.ok(saved.ok);
  assert.deepEqual(saved.ok ? saved.value.profile.dotGain?.points : null, [
    { input: 0.25, printed: 0.4 },
    { input: 0.5, printed: 0.71 },
    { input: 0.75, printed: 0.9 },
  ]);
});

test('reset takes the calibration out as a new row, and does nothing when there is none', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });

  const nothing = await h.inkSystem.resetDotGain(manager);
  assert.ok(nothing.ok);
  assert.equal((await allRows()).length, 0, 'nothing to reset, nothing written');
  assert.equal(h.fakes.activity.length, 0);

  const saved = await h.inkSystem.saveDotGain(manager, measurement());
  assert.ok(saved.ok);
  const reset = await h.inkSystem.resetDotGain(manager);
  assert.ok(reset.ok);
  const value = reset.ok ? reset.value : null!;
  assert.notEqual(value.id, saved.ok ? saved.value.id : '');
  assert.equal(value.profile.dotGain, undefined);
  assert.equal(Object.hasOwn(value.profile, 'dotGain'), false);
  assert.equal(dotGainFor(value.profile), LINEAR_DOT_GAIN);
  assert.equal((await allRows()).length, 2);
  assert.deepEqual((await allRows()).filter((r) => r.isActive).map((r) => r.id), [value.id]);
  assert.equal(h.fakes.activity.filter((a) => a.entry.action === 'ink_system.dot_gain_reset').length, 1);
  // The row that held the calibration still does.
  assert.ok((await h.inkSystem.getInkSystemById(saved.ok ? (saved.value.id as string) : ''))?.dotGain);
});

test('editing the rest of the profile keeps the calibration, and a profile that carries one is accepted (the assistant’s tool does this)', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });
  const saved = await h.inkSystem.saveDotGain(manager, measurement());
  assert.ok(saved.ok);
  const current = saved.ok ? saved.value.profile : DEFAULT_INK_SYSTEM;
  const edited = await h.inkSystem.updateInkSystem(manager, { ...current, pressHeads: 12 });
  assert.ok(edited.ok);
  assert.deepEqual(edited.ok ? edited.value.profile.dotGain : null, current.dotGain);
  assert.equal(h.inkSystem.inkProfileProblem(current), null);

  // A malformed calibration inside a profile is refused like any other wrong value.
  const bad = { ...current, dotGain: { ...current.dotGain!, lpi: 500 } } as InkSystemProfile;
  assert.match(h.inkSystem.inkProfileProblem(bad) ?? '', /^dotGain > lpi: /);
  assert.equal((await h.inkSystem.updateInkSystem(manager, bad)).ok, false);
  const unknown = { ...current, dotGain: { ...current.dotGain!, extra: 1 } } as unknown as InkSystemProfile;
  assert.notEqual(h.inkSystem.inkProfileProblem(unknown), null, 'no stray fields');
});

test('a job prepared before a calibration keeps its pack; a job prepared after it pins the new row', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });
  assert.ok((await h.inkSystem.updateInkSystem(manager, { ...DEFAULT_INK_SYSTEM, name: 'Before' })).ok);
  const before = await h.newDesign();
  const earlier = await h.prepare(before.designId);
  const [earlierPack] = await h.packs(earlier.designVersionId);
  const earlierRow = h.pipeline.packInfo(earlierPack)?.jobInput.inkSystemId;
  assert.ok(earlierRow);

  const saved = await h.inkSystem.saveDotGain(manager, measurement());
  assert.ok(saved.ok);
  const newRow = saved.ok ? (saved.value.id as string) : '';
  const after = await h.newDesign();
  const later = await h.prepare(after.designId);
  const [laterPack] = await h.packs(later.designVersionId);
  assert.equal(h.pipeline.packInfo(laterPack)?.jobInput.inkSystemId, newRow, 'new packs use the calibrated row');
  assert.equal(h.pipeline.packInfo((await h.packs(earlier.designVersionId))[0])?.jobInput.inkSystemId, earlierRow, 'the earlier pack keeps the row it ran with');
  assert.equal((await h.inkSystem.getInkSystemById(earlierRow as string))?.dotGain, undefined);
  assert.ok((await h.inkSystem.getInkSystemById(newRow))?.dotGain);
});

test('sample mode: a calibration is checked and answered but nothing is written', async () => {
  await clear();
  const manager = await h.staff({ prepress: 'manage' });
  process.env.PRINT_MOCK = '1';
  try {
    const saved = await h.inkSystem.saveDotGain(manager, measurement());
    assert.ok(saved.ok);
    assert.equal(saved.ok ? saved.value.id : 'x', null);
    assert.equal(saved.ok ? saved.value.profile.dotGain?.method : '', 'scan');
    assert.equal((await h.inkSystem.saveDotGain(manager, measurement({ points: [] }))).ok, false);
    assert.deepEqual(await h.inkSystem.saveDotGain(await h.staff({ prepress: 'view' }), measurement()), { ok: false, error: denial });
    assert.ok((await h.inkSystem.resetDotGain(manager)).ok);
  } finally {
    delete process.env.PRINT_MOCK;
  }
  assert.equal((await allRows()).length, 0);
});
