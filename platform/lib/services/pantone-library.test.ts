// The house Pantone library: the colour maths it shares with the engine, what it
// suggests, what pre-press assigns to a film, and who may. PGlite, with the fake
// engine, pack writers, storage and queue; nothing here touches Neon or the network.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { PermissionError } from '@/lib/auth/permissions';
import type { Lab, PrintJobInput } from '@/lib/print/types';
import type { PackRow, StoredManifest } from '@/lib/print/pipeline';
import { bootstrapPrint, PALETTE, type Harness } from '@/lib/print/test-support';

let h: Harness;

before(async () => {
  h = await bootstrapPrint();
});

after(async () => {
  await h.close();
});

const lab = (L: number, a: number, b: number): Lab => ({ L, a, b });
const emptyLibrary = () => h.db.delete(schema.pantoneLibrary);
const rows = () => h.db.select().from(schema.pantoneLibrary);

async function preparedPacks() {
  const { designId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const packs = await h.packs(designVersionId);
  return {
    designId,
    darks: packs.find((p) => p.screenSetKey === 'darks')!,
    lights: packs.find((p) => p.screenSetKey === 'lights')!,
    dtg: packs.find((p) => p.technique === 'dtg_dtf')!,
  };
}

const reload = async (pack: PackRow): Promise<PackRow> => (await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, pack.id)))[0];
const inkOf = async (pack: PackRow, index: number) => ((await reload(pack)).manifest as StoredManifest).inks.find((i) => i.index === index);
const refreshJobs = async (pack: PackRow) =>
  (await h.db.select().from(schema.printJobs).where(and(eq(schema.printJobs.kind, 'reupload'), eq(schema.printJobs.status, 'queued')))).filter((j) => (j.input as PrintJobInput).reupload?.packId === pack.id);

// -- the colour maths -----------------------------------------------------------------

test('colour distance is CIEDE2000: the published test pairs, in both directions', () => {
  // Sharma, Wu and Dalal (2005), checked against a second implementation to four decimals.
  const pairs: [Lab, Lab, number][] = [
    [lab(50, 2.6772, -79.7751), lab(50, 0, -82.7485), 2.0425],
    [lab(50, 3.1571, -77.2803), lab(50, 0, -82.7485), 2.8615],
    [lab(50, 2.8361, -74.02), lab(50, 0, -82.7485), 3.4412],
    [lab(50, -1.3802, -84.2814), lab(50, 0, -82.7485), 1.0],
    [lab(50, 0, 0), lab(50, -1, 2), 2.3669],
    [lab(50, 2.49, -0.001), lab(50, -2.49, 0.0009), 7.1792],
    [lab(50, 2.5, 0), lab(50, 0, -2.5), 4.3065],
    [lab(50, 2.5, 0), lab(73, 25, -18), 27.1492],
    [lab(50, 2.5, 0), lab(61, -5, 29), 22.8977],
    [lab(50, 2.5, 0), lab(56, -27, -3), 31.903],
    [lab(50, 2.5, 0), lab(58, 24, 15), 19.4535],
    [lab(60.2574, -34.0099, 36.2677), lab(60.4626, -34.1751, 39.4387), 1.2644],
    [lab(63.0109, -31.0961, -5.8663), lab(62.8187, -29.7946, -4.0864), 1.263],
    [lab(22.7233, 20.0904, -46.694), lab(23.0331, 14.973, -42.5619), 2.0373],
    [lab(90.8027, -2.0831, 1.441), lab(91.1528, -1.6435, 0.0447), 1.4441],
    [lab(2.0776, 0.0795, -1.135), lab(0.9033, -0.0636, -0.5514), 0.9082],
  ];
  for (const [a, b, expected] of pairs) {
    assert.ok(Math.abs(h.pantone.deltaE2000(a, b) - expected) < 5e-4, `${JSON.stringify(a)} to ${JSON.stringify(b)}: ${h.pantone.deltaE2000(a, b)}, expected ${expected}`);
    assert.ok(Math.abs(h.pantone.deltaE2000(b, a) - expected) < 5e-4, 'the same the other way round');
  }
  assert.equal(h.pantone.deltaE2000(lab(40, 20, -30), lab(40, 20, -30)), 0);
});

test('hex and Lab convert as the engine does, and come back to the same hex', () => {
  assert.deepEqual(h.pantone.hexToLab('#FFFFFF'), lab(100, 0, 0));
  assert.deepEqual(h.pantone.hexToLab('#000000'), lab(0, 0, 0));
  const grey = h.pantone.hexToLab('#808080');
  assert.ok(Math.abs(grey.L - 53.585) < 0.01 && grey.a === 0 && grey.b === 0, 'greys are neutral');

  // The palette in the fake engine was made with these functions.
  for (const swatch of PALETTE) {
    const converted = h.pantone.hexToLab(swatch.hex);
    assert.ok(Math.abs(converted.L - swatch.lab.L) < 0.01 && Math.abs(converted.a - swatch.lab.a) < 0.01 && Math.abs(converted.b - swatch.lab.b) < 0.01, swatch.hex);
  }
  for (const hex of ['#ED90DC', '#C363DA', '#5456AC', '#3E0E61', '#18181A', '#F2F2F0', '#1B1C1E', '#222A3D']) assert.equal(h.pantone.labToHex(h.pantone.hexToLab(hex)), hex, hex);

  // A colour outside sRGB is held to the nearest hex, never an invalid one.
  assert.match(h.pantone.labToHex(lab(50, 128, 128)), /^#[0-9A-F]{6}$/);
  assert.match(h.pantone.labToHex(lab(120, 0, 0)), /^#[0-9A-F]{6}$/);
  assert.match(h.pantone.labToHex(lab(-10, 0, 0)), /^#[0-9A-F]{6}$/);
});

test('a code is normalised the way MagnaMix shows it', () => {
  const normalise = h.pantone.normalisePantoneCode;
  assert.equal(normalise('186 c'), 'PANTONE 186 C');
  assert.equal(normalise('  pantone   2582  c '), 'PANTONE 2582 C');
  assert.equal(normalise('PANTONE 186 C'), 'PANTONE 186 C');
  assert.equal(normalise('Pantone Process Blue C'), 'PANTONE PROCESS BLUE C');
  assert.equal(normalise('7541 cp'), 'PANTONE 7541 CP');
  assert.equal(normalise(''), null);
  assert.equal(normalise('   '), null);
  assert.equal(normalise('pantone'), null);
  assert.equal(normalise(' PANTONE  '), null);
});

// -- suggestions ----------------------------------------------------------------------

test('the closest remembered colour within reach is suggested, with its distance', () => {
  const orchid = h.pantone.hexToLab('#ED90DC');
  const nearOrchid = h.pantone.hexToLab('#EE92DD');
  const violet = h.pantone.hexToLab('#C363DA');
  const library = [
    { code: 'PANTONE 2582 C', lab: violet },
    { code: 'PANTONE 237 C', lab: nearOrchid },
    { code: 'PANTONE 238 C', lab: h.pantone.hexToLab('#F09ADF') },
  ];

  // Exact colour, nearest one wins, and the distance is rounded to hundredths.
  assert.deepEqual(h.pantone.suggestFromLibrary(library, violet), { code: 'PANTONE 2582 C', deltaE: 0 });
  const found = h.pantone.suggestFromLibrary(library, orchid)!;
  assert.equal(found.code, 'PANTONE 237 C');
  assert.equal(found.deltaE, Math.round(h.pantone.deltaE2000(orchid, nearOrchid) * 100) / 100);
  assert.ok(found.deltaE > 0 && found.deltaE <= 3);

  // Nothing close enough: the default reach is 3, and a caller can set another.
  const indigo = h.pantone.hexToLab('#5456AC');
  assert.equal(h.pantone.suggestFromLibrary(library, indigo), null);
  assert.equal(h.pantone.DEFAULT_SUGGEST_DELTA_E, 3);
  const distance = h.pantone.deltaE2000(indigo, violet);
  assert.equal(h.pantone.suggestFromLibrary(library, indigo, distance + 0.01)?.code, 'PANTONE 2582 C', 'a wider reach finds it');
  assert.equal(h.pantone.suggestFromLibrary(library, indigo, distance - 0.01), null);
  assert.equal(h.pantone.suggestFromLibrary(library, orchid, 0.001), null, 'a tight reach finds only a match');
  assert.equal(h.pantone.suggestFromLibrary([], orchid), null, 'an empty library suggests nothing');
});

test('only the codes pre-press picked are suggested, not measured prints, and none in sample mode', async () => {
  await emptyLibrary();
  const orchid = h.pantone.hexToLab('#ED90DC');
  assert.equal(await h.pantone.suggestPantone(orchid), null, 'an empty library');

  // A measured print describes a printed result, not the colour a code was picked for.
  await h.db.insert(schema.pantoneLibrary).values({ code: 'PANTONE 9999 C', labL: orchid.L, labA: orchid.a, labB: orchid.b, source: 'measured', substrate: 'white_cotton' });
  assert.equal(await h.pantone.suggestPantone(orchid), null);

  await h.db.insert(schema.pantoneLibrary).values({ code: 'PANTONE 237 C', labL: orchid.L + 0.5, labA: orchid.a, labB: orchid.b, source: 'assigned' });
  const hit = await h.pantone.suggestPantone(orchid);
  assert.equal(hit?.code, 'PANTONE 237 C');
  assert.ok(hit && hit.deltaE > 0 && hit.deltaE < 1);
  assert.equal(await h.pantone.suggestPantone(orchid, 0.01), null, 'with a tighter reach');
  assert.deepEqual((await h.pantone.loadAssignedLibrary()).map((c) => c.code), ['PANTONE 237 C']);

  process.env.PRINT_MOCK = '1';
  try {
    assert.equal(await h.pantone.suggestPantone(orchid), null);
  } finally {
    delete process.env.PRINT_MOCK;
  }
});

// -- assigning ------------------------------------------------------------------------

test('a code entered for a film is kept on the pack, remembered, and the files are queued to be rewritten once', async () => {
  await emptyLibrary();
  const { darks } = await preparedPacks();
  const worker = await h.staff({ prepress: 'work' });

  assert.equal((await inkOf(darks, 2))?.pantone, null);
  assert.deepEqual(await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 2, code: '186 c' }), { ok: true, value: null });
  assert.equal((await inkOf(darks, 2))?.pantone, 'PANTONE 186 C', 'the code is normalised on the pack');
  assert.equal((await inkOf(darks, 3))?.pantone, null, 'other films are untouched');

  // Remembered for the colour the film had, so a close colour is named next time.
  const [remembered] = await rows();
  assert.equal(remembered.code, 'PANTONE 186 C');
  assert.equal(remembered.source, 'assigned');
  assert.equal(remembered.createdBy, worker.userId);
  assert.ok(Math.abs(remembered.labL - h.pantone.hexToLab('#ED90DC').L) < 0.01);

  // The films carry the code in their names, so the worker rewrites the files: one job, however many codes.
  assert.equal((await refreshJobs(darks)).length, 1);
  assert.deepEqual(await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 3, code: 'pantone 2582 c' }), { ok: true, value: null });
  assert.equal((await refreshJobs(darks)).length, 1, 'a second code joins the job already waiting');
  assert.equal((await rows()).length, 2);

  // The same code for the same colour again is already known.
  assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 2, code: 'PANTONE 186 C' })).ok);
  assert.equal((await rows()).length, 2, 'no second row for the same code and colour');
  // The same code for another colour is a second memory of it.
  assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 4, code: '186 C' })).ok);
  assert.deepEqual((await rows()).map((r) => r.code).sort(), ['PANTONE 186 C', 'PANTONE 186 C', 'PANTONE 2582 C']);

  // A new code for a film replaces its code on the pack.
  assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: 2, code: '237 C' })).ok);
  assert.equal((await inkOf(darks, 2))?.pantone, 'PANTONE 237 C');

  // The activity log has each entry under the person's name, with what they entered.
  const entered = h.fakes.activity.filter((a) => a.actorId === worker.userId && a.entry.action === 'pantone.assign' && a.entry.itemId === darks.id);
  assert.deepEqual(entered.map((a) => a.entry.detail), [
    { plateIndex: 2, code: 'PANTONE 186 C' },
    { plateIndex: 3, code: 'PANTONE 2582 C' },
    { plateIndex: 2, code: 'PANTONE 186 C' },
    { plateIndex: 4, code: 'PANTONE 186 C' },
    { plateIndex: 2, code: 'PANTONE 237 C' },
  ]);
  assert.ok(entered.every((a) => a.entry.area === 'prepress' && a.entry.itemType === 'production_pack'));

  // The worker rewrites the files with every code there is; after it, nothing is left to do.
  const [job] = await refreshJobs(darks);
  await h.runJob(job.id);
  assert.equal(h.pipeline.filesNeedRefresh(await reload(darks)), false);
  assert.equal((await refreshJobs(darks)).length, 0);
});

test('a code the library has, for a colour a new design also uses, names that design’s ink when it is built', async () => {
  await emptyLibrary();
  const first = await preparedPacks();
  const worker = await h.staff({ prepress: 'work' });
  assert.ok((await h.pantone.assignPantone(worker, { packId: first.darks.id, plateIndex: 2, code: '237 C' })).ok);

  const second = await preparedPacks();
  assert.equal((await inkOf(second.darks, 2))?.pantone, 'PANTONE 237 C', 'Orchid pink was named from the library');
  assert.equal((await inkOf(second.darks, 3))?.pantone, null, 'a colour nobody has coded stays open');
  const detail = (await h.prepress.getPackDetail(worker, second.lights.id))!;
  assert.equal(detail.films.find((f) => f.clientName === 'Orchid pink')?.pantone, 'PANTONE 237 C');
});

test('what cannot take a code is refused in words, and nothing is written', async () => {
  await emptyLibrary();
  const { darks, dtg } = await preparedPacks();
  const worker = await h.staff({ prepress: 'work' });
  const ask = async (packId: string, plateIndex: number, code: string) => {
    const r = await h.pantone.assignPantone(worker, { packId, plateIndex, code });
    return r.ok ? 'ok' : r.error;
  };
  const jobsBefore = (await h.db.select().from(schema.printJobs)).length;

  assert.equal(await ask(darks.id, 2, ''), 'Enter a Pantone code, for example 186 C.');
  assert.equal(await ask(darks.id, 2, '   '), 'Enter a Pantone code, for example 186 C.');
  assert.equal(await ask(darks.id, 2, 'pantone'), 'Enter a Pantone code, for example 186 C.');
  assert.equal(await ask(darks.id, 2, `${'1'.repeat(40)} C`), 'That code is too long. Enter it the way MagnaMix shows it, for example 186 C.');
  assert.equal(await ask(darks.id, 1, '186 C'), 'The white films have no Pantone code. Only colour inks do.', 'the underbase');
  assert.equal(await ask(darks.id, 6, '186 C'), 'The white films have no Pantone code. Only colour inks do.', 'the highlight white');
  assert.equal(await ask(darks.id, 7, '186 C'), 'That film is not in this pack.');
  assert.equal(await ask(darks.id, 0, '186 C'), 'That film is not in this pack.');
  assert.equal(await ask(dtg.id, 1, '186 C'), 'Only screen prints have Pantone inks.');
  assert.equal(await ask(randomUUID(), 2, '186 C'), 'Pack not found.');

  assert.equal((await rows()).length, 0, 'nothing was remembered');
  assert.equal((await inkOf(darks, 2))?.pantone, null);
  assert.equal((await h.db.select().from(schema.printJobs)).length, jobsBefore, 'and no job was queued');
});

test('only people with Work access to Pre-press can enter a code, and a refusal leaves no trace', async () => {
  await emptyLibrary();
  const { darks } = await preparedPacks();
  const viewer = await h.staff({ prepress: 'view' });
  const stranger = await h.staff({ support: 'manage' });
  const suspended = { ...(await h.staff({ prepress: 'manage' })), suspended: true };
  const manager = await h.staff({ prepress: 'manage' });
  const denial = "You don't have Work access to Pre-press.";

  for (const [who, actor] of [['a viewer', viewer], ['staff in another area', stranger], ['a suspended manager', suspended], ['an artist', { userId: h.artist.userId, role: 'artist' as const }]] as const) {
    assert.deepEqual(await h.pantone.assignPantone(actor, { packId: darks.id, plateIndex: 2, code: '186 C' }), { ok: false, error: denial }, who);
  }
  assert.equal((await rows()).length, 0);
  assert.equal((await inkOf(darks, 2))?.pantone, null);
  assert.equal((await refreshJobs(darks)).length, 0);
  assert.equal(h.fakes.activity.filter((a) => a.entry.action === 'pantone.assign' && a.entry.itemId === darks.id).length, 0);

  // Manage includes Work, and the owner can do anything.
  assert.ok((await h.pantone.assignPantone(manager, { packId: darks.id, plateIndex: 2, code: '186 C' })).ok);
  assert.ok((await h.pantone.assignPantone(h.owner, { packId: darks.id, plateIndex: 3, code: '2582 C' })).ok);

  // Sample mode: said yes to, with nothing written.
  process.env.PRINT_MOCK = '1';
  try {
    assert.deepEqual(await h.pantone.assignPantone(h.owner, { packId: 'sample', plateIndex: 2, code: '186 C' }), { ok: true, value: null });
    assert.deepEqual(await h.pantone.assignPantone(viewer, { packId: 'sample', plateIndex: 2, code: '186 C' }), { ok: false, error: denial }, 'access is still checked');
  } finally {
    delete process.env.PRINT_MOCK;
  }
  assert.equal((await rows()).length, 2);
});

// -- the list -------------------------------------------------------------------------

test('the library lists newest first, searches by code, caps the length, and needs View access', async () => {
  await emptyLibrary();
  const base = new Date('2026-10-01T10:00:00Z').getTime();
  const entries: [string, Lab, string][] = [
    ['PANTONE 186 C', h.pantone.hexToLab('#C8102E'), 'assigned'],
    ['PANTONE 2582 C', h.pantone.hexToLab('#C363DA'), 'assigned'],
    ['PANTONE 237 C', h.pantone.hexToLab('#ED90DC'), 'assigned'],
    ['PANTONE 50%_OFF', h.pantone.hexToLab('#808080'), 'measured'],
  ];
  for (const [i, [code, colour, source]] of entries.entries()) {
    await h.db.insert(schema.pantoneLibrary).values({ code, labL: colour.L, labA: colour.a, labB: colour.b, source, substrate: source === 'measured' ? 'white_cotton' : null, createdAt: new Date(base + i * 60_000) });
  }
  const viewer = await h.staff({ prepress: 'view' });
  const list = (opts?: { search?: string; limit?: number }) => h.pantone.listPantoneLibrary(viewer, opts);

  const all = await list();
  assert.deepEqual(all.map((r) => r.code), ['PANTONE 50%_OFF', 'PANTONE 237 C', 'PANTONE 2582 C', 'PANTONE 186 C'], 'newest first');
  assert.deepEqual(all.map((r) => r.source), ['measured', 'assigned', 'assigned', 'assigned']);
  assert.equal(all[0].substrate, 'white_cotton');
  assert.equal(all[1].substrate, null);
  assert.equal(all[1].hex, '#ED90DC', 'a swatch from the stored Lab');
  assert.ok(Math.abs(all[1].lab.L - h.pantone.hexToLab('#ED90DC').L) < 0.01);
  assert.equal(all[1].createdAt, new Date(base + 2 * 60_000).toISOString());

  assert.deepEqual((await list({ search: '186' })).map((r) => r.code), ['PANTONE 186 C']);
  assert.deepEqual((await list({ search: '  pantone 2 ' })).map((r) => r.code), ['PANTONE 237 C', 'PANTONE 2582 C'], 'the edges of the search are trimmed, the inside is not');
  assert.deepEqual((await list({ search: 'pantone  2' })).map((r) => r.code), [], 'two spaces are not one');
  assert.deepEqual((await list({ search: 'c' })).map((r) => r.code), ['PANTONE 237 C', 'PANTONE 2582 C', 'PANTONE 186 C'], 'any case');
  assert.deepEqual((await list({ search: '%' })).map((r) => r.code), ['PANTONE 50%_OFF'], 'a % is a character, not a wildcard');
  assert.deepEqual((await list({ search: '_' })).map((r) => r.code), ['PANTONE 50%_OFF'], 'and so is a _');
  assert.deepEqual(await list({ search: 'nothing like this' }), []);

  assert.equal((await list({ limit: 2 })).length, 2);
  assert.equal((await list({ limit: 0 })).length, 1, 'at least one');
  assert.equal((await list({ limit: -5 })).length, 1);
  assert.equal((await list({ limit: 10_000 })).length, 4, 'and at most 500');

  await assert.rejects(h.pantone.listPantoneLibrary({ userId: h.artist.userId, role: 'artist' }, {}), PermissionError);
  await assert.rejects(h.pantone.listPantoneLibrary(await h.staff({ support: 'manage' }), {}), PermissionError);
  assert.equal((await h.pantone.listPantoneLibrary(h.owner)).length, 4);

  process.env.PRINT_MOCK = '1';
  try {
    assert.deepEqual(await h.pantone.listPantoneLibrary(viewer), []);
  } finally {
    delete process.env.PRINT_MOCK;
  }
});
