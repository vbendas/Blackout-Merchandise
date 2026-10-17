// Print prep for artists: the approval view, approval pinning hashes, the screen
// count, and what preparePrint accepts. Fake engine, pack, storage and queue on PGlite.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser } from '@/scripts/test/pglite';
import { bootstrapPrint, seedShopOrder, type Harness } from '@/lib/print/test-support';

let h: Harness;

before(async () => {
  h = await bootstrapPrint();
});

after(async () => {
  await h.close();
});

const view = (designId: string) => h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId });
const approve = (designId: string, versionId: string) => h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId });
const approvalRows = (designId: string) => h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId));

/** The artist's session, or another one: who is signed in, and which shop they are in. */
const session = (who: { userId?: string; storeId?: string | null } = {}) => ({
  user: { id: who.userId ?? h.artist.userId },
  store: who.storeId === null ? null : { id: who.storeId ?? h.artist.storeId },
});
const revoke = (designId: string, as = session()) => h.printPrep.revokeApproval(as, designId);

const NOTHING_TO_UNDO = "This design isn't approved, so there is nothing to undo.";

test('approval records the version, the recipe, the inks, the colours, the placements and a hash for every pack', async () => {
  const { designId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);

  const before = await view(designId);
  assert.equal(before?.status, 'ready');
  assert.equal(before?.canApprove, true);
  assert.equal(before?.approvedAt, null);

  const approved = await approve(designId, designVersionId);
  assert.ok(approved.ok);

  const rows = await h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId));
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row.id, approved.ok ? approved.value.approvalId : '');
  assert.equal(row.designVersionId, designVersionId);
  assert.equal(row.approvedBy, h.artist.userId);
  assert.equal(row.invalidatedAt, null);
  assert.deepEqual(row.garmentCodes, ['C002', 'C727', 'C001']);
  assert.deepEqual(row.placements, [{ position: 'front_chest', widthMm: 280 }]);

  // One hash per pack, and each is the hash of that pack's job input and files.
  const packs = await h.pipeline.loadCurrentPacks(designVersionId);
  const hashes = row.packHashes as Record<string, string>;
  assert.deepEqual(Object.keys(hashes).sort(), packs.map((p) => p.id).sort());
  for (const pack of packs) {
    assert.match(hashes[pack.id], /^[0-9a-f]{64}$/);
    assert.equal(hashes[pack.id], h.pipeline.packHash(pack));
  }
  // The hash follows the bytes: another proof file is another hash.
  const darks = packs.find((p) => p.screenSetKey === 'darks')!;
  const files = (darks.files as { kind: string; sha256: string }[]).map((f) => (f.kind === 'proof' ? { ...f, sha256: '0'.repeat(64) } : f));
  assert.notEqual(h.pipeline.packHash({ ...darks, files }), hashes[darks.id]);

  // The recipe column holds the recipe and the ink set the artist approved.
  const snapshot = row.recipe as { recipe: { maxScreens: number; halftone: { lpi: number } }; inks: Record<string, { index: number; role: string; hex: string; base: string; clientName: string }[]> };
  assert.equal(snapshot.recipe.maxScreens, 8);
  assert.equal(snapshot.recipe.halftone.lpi, 55);
  assert.deepEqual(Object.keys(snapshot.inks).sort(), ['darks', 'lights']);
  assert.equal(snapshot.inks.darks.length, 6);
  assert.deepEqual(snapshot.inks.darks[1], { index: 2, role: 'ink', hex: '#ED90DC', base: 'HB Opaque', clientName: 'Orchid pink', pantone: null });

  const after = await view(designId);
  assert.equal(after?.status, 'approved');
  assert.ok(after?.approvedAt);
  assert.equal(after?.canApprove, false);

  // Approving again changes nothing.
  const again = await approve(designId, designVersionId);
  assert.deepEqual(again, approved);
  assert.equal((await h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId))).length, 1);
});

test('the approval view reads in the artist’s words, and never carries a Pantone code', async () => {
  const { designId } = await h.newDesign();
  h.fakes.engine.options.warnings = [
    { code: 'thin_lines', severity: 'review', message: 'The finest lines are under 0.3 mm and may close up in screen print.' },
    { code: 'fine', severity: 'info', message: 'Not worth a mention.' },
    { code: 'leak', severity: 'review', message: 'Ink 2 matches PANTONE 237 C.' },
  ];
  try {
    const { designVersionId } = await h.prepare(designId);
    const packs = await h.pipeline.loadCurrentPacks(designVersionId);
    // Pre-press has entered a code for one ink: it must stay in the admin.
    const darks = packs.find((p) => p.screenSetKey === 'darks')!;
    const assigned = await h.pantone.assignPantone(h.owner, { packId: darks.id, plateIndex: 2, code: '237 c' });
    assert.ok(assigned.ok);

    const v = (await view(designId))!;
    assert.doesNotMatch(JSON.stringify(v), /pantone/i);
    assert.equal(v.designName, 'Underwriter tee');
    assert.equal(v.versionNumber, 1);
    assert.equal(v.placementLabel, 'Front chest · 28 × 33.6 cm');
    assert.deepEqual(v.warnings, ['The finest lines are under 0.3 mm and may close up in screen print.']);

    assert.deepEqual(
      v.garments.map((g) => [g.code, g.name, g.isLight, g.screenSetKey]),
      [['C002', 'Black', false, 'darks'], ['C727', 'French Navy', false, 'darks'], ['C001', 'White', true, 'lights']],
    );

    // Proofs: DTG/DTF first, then screen, one per garment colour each.
    assert.deepEqual(v.proofs.map((p) => `${p.technique}:${p.garmentCode}`), ['dtg_dtf:C002', 'dtg_dtf:C727', 'dtg_dtf:C001', 'screen:C002', 'screen:C727', 'screen:C001']);
    assert.ok(v.proofs.every((p) => p.url.startsWith('/fake-files/public/print/')));
    assert.match(v.proofs[0].alt, /^DTG proof of the Underwriter tee design on the .+ in Black$/);
    assert.match(v.proofs[3].alt, /^Screen print proof of the Underwriter tee design on the .+ in Black$/);

    assert.deepEqual(
      v.loupes.map((l) => l.caption),
      ['True size · 45 lpi dots in fades · on Black', 'True size · 55 lpi dots · on Black', 'True size · 55 lpi dots · on White'],
    );
    assert.deepEqual(Object.keys(v.dtgFacts).sort(), ['C001', 'C002', 'C727']);
    assert.equal(v.dtgFacts.C002.length, 4);
    assert.ok(v.dtgFacts.C002.includes('White areas print in white ink.'));
    assert.ok(v.dtgFacts.C001.includes('White areas print no ink on a white shirt.'));

    const [dark, light] = v.screenSets;
    assert.equal(dark.key, 'darks');
    assert.equal(dark.name, 'Darks');
    assert.equal(dark.screenCount, 6);
    assert.equal(dark.headline, '6 screens, within the standard 8.');
    assert.equal(dark.shared, 'Black and French Navy print from the same 6 screens, over a white underbase.');
    assert.equal(dark.priceNote, 'No surcharge on this print position. On a run, each colour above 8 adds €1.00 per piece on each print position.');
    assert.deepEqual(dark.inks.map((i) => i.name), ['White underbase', 'Orchid pink', 'Violet', 'Indigo', 'Deep purple', 'Highlight white']);
    assert.deepEqual(dark.inks.map((i) => i.detail), ['Under the colours so they stay bright', '', '', '', '', 'The brightest points, printed last']);
    assert.equal(light.name, 'Lights');
    assert.equal(light.shared, 'White prints from its own 4 screens, with no underbase.');
  } finally {
    h.fakes.engine.options.warnings = [];
  }
});

test('a design is approved only when its newest version is ready and nothing blocks it', async () => {
  const { designId } = await h.newDesign();

  // Not prepared yet: no version, so no view and nothing to approve.
  assert.equal(await view(designId), null);

  // Prepared but the worker has not run: the files are still being made.
  const queued = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(queued.ok);
  assert.equal((await view(designId))?.status, 'preparing');
  assert.equal((await view(designId))?.canApprove, false);
  const early = await approve(designId, queued.ok ? queued.value.designVersionId : '');
  assert.deepEqual(early, { ok: false, error: 'The print files are still being prepared. Try again in a few minutes.' });

  await h.runJob(queued.ok ? queued.value.jobId : '');
  const v1 = queued.ok ? queued.value.designVersionId : '';

  // The artist changes the artwork: version 2, and version 1 can no longer be approved.
  h.fakes.setArt(designId, Buffer.from('a new drawing'));
  const second = await h.prepare(designId);
  assert.notEqual(second.designVersionId, v1);
  const versions = await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, designId));
  assert.deepEqual(versions.map((v) => v.version).sort(), [1, 2]);
  assert.equal(versions.find((v) => v.version === 2)?.parentVersionId, v1);
  const stale = await approve(designId, v1);
  assert.ok(!stale.ok && /newer version/.test(stale.error), JSON.stringify(stale));
  assert.equal((await view(designId))?.versionNumber, 2);
  assert.ok((await approve(designId, second.designVersionId)).ok);

  // A blocking warning keeps the approve button off.
  const other = await h.newDesign();
  h.fakes.engine.options.warnings = [{ code: 'empty_art', severity: 'block', message: 'The artwork is empty.' }];
  try {
    const { designVersionId } = await h.prepare(other.designId);
    assert.equal((await view(other.designId))?.canApprove, false);
    const blocked = await approve(other.designId, designVersionId);
    assert.ok(!blocked.ok && /The artwork is empty/.test(blocked.error), JSON.stringify(blocked));
  } finally {
    h.fakes.engine.options.warnings = [];
  }
});

test('the same artwork keeps its version; new artwork makes the next one', async () => {
  const { designId } = await h.newDesign();
  const first = await h.prepare(designId);
  const again = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(again.ok);
  assert.equal(again.value.designVersionId, first.designVersionId, 'same pixels, same version');
  assert.equal(again.value.jobId, first.jobId, 'and the finished job for them is reused, not queued again');
  assert.equal((await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.designVersionId, first.designVersionId))).length, 1);

  h.fakes.setArt(designId, Buffer.from('another file'));
  const next = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(next.ok);
  assert.notEqual(next.value.designVersionId, first.designVersionId);
  assert.notEqual(next.value.jobId, first.jobId);
});

test('approving checks the design, the shop, the owner and the version again, from the ids alone', async () => {
  const { designId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const stranger = await seedUser(h.db, { email: 'approver@merchfrom.test', withStore: true });
  const ask = async (patch: Partial<Parameters<typeof h.printPrep.approveDesign>[0]> = {}) => {
    const r = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId, ...patch });
    return r.ok ? 'ok' : r.error;
  };

  // The design must be this shop's, and the shop this person's.
  const notYours = 'Design not found for this shop.';
  assert.equal(await ask({ storeId: stranger.storeId as string }), notYours, "someone else's shop");
  assert.equal(await ask({ userId: stranger.userId }), notYours, "someone else's account for this shop");
  assert.equal(await ask({ storeId: stranger.storeId as string, userId: stranger.userId }), notYours, 'a shop and an owner that agree with each other but not with the design');
  assert.equal(await ask({ designId: randomUUID() }), notYours);
  assert.equal(await ask({ designId: 'not-a-uuid' }), notYours);
  assert.equal(await ask({ userId: 'someone' }), notYours);
  assert.equal(await ask({ storeId: '' }), notYours);

  // The version must exist and belong to this design.
  const unknown = "That version of the design wasn't found.";
  assert.equal(await ask({ versionId: 'nope' }), unknown);
  assert.equal(await ask({ versionId: randomUUID() }), unknown);
  const elsewhere = await h.newDesign();
  const otherVersion = (await h.prepare(elsewhere.designId)).designVersionId;
  assert.equal(await ask({ versionId: otherVersion }), unknown, "another design's version");

  // A design with no print files has nothing to approve.
  assert.equal(await ask({ designId: (await h.newDesign()).designId }), 'This design has no print files yet.');

  assert.equal((await approvalRows(designId)).length, 0, 'none of that approved anything');
  assert.equal((await approvalRows(elsewhere.designId)).length, 0);

  // The real thing works; and once the artwork changes, the old version is named as old, not as missing.
  assert.equal(await ask(), 'ok');
  h.fakes.setArt(designId, Buffer.from('the artwork, redrawn'));
  await h.prepare(designId);
  assert.equal(await ask(), 'There is a newer version of this design. Look over that one instead.');
  assert.equal((await approvalRows(designId)).length, 1);
});

test('the artist can undo an approval while nothing has used the files; the design goes back to waiting for them', async () => {
  const { designId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const rowsBefore = (await h.packs(designVersionId)).length;
  const filesBefore = h.fakes.storage.keys(`print/${designId}/`).length;

  assert.deepEqual(await revoke(designId), { ok: false, error: NOTHING_TO_UNDO }, 'nothing approved yet');

  assert.equal((await view(designId))?.canRevoke, false, 'nothing to undo before approving');
  const first = await approve(designId, designVersionId);
  assert.ok(first.ok);
  assert.equal((await view(designId))?.status, 'approved');
  assert.equal((await view(designId))?.canRevoke, true, 'the page offers Undo');

  assert.deepEqual(await revoke(designId), { ok: true, value: null });
  const [row] = await approvalRows(designId);
  assert.equal(row.id, first.ok ? first.value.approvalId : '', 'the record stays, marked withdrawn');
  assert.ok(row.invalidatedAt);
  assert.equal(row.invalidatedReason, 'The artist undid their approval.');
  const waiting = (await view(designId))!;
  assert.equal(waiting.status, 'ready');
  assert.equal(waiting.canApprove, true);
  assert.equal(waiting.canRevoke, false);
  assert.equal(waiting.approvedAt, null);

  // The print files are left as they were.
  assert.equal((await h.packs(designVersionId)).length, rowsBefore);
  assert.equal(h.fakes.storage.keys(`print/${designId}/`).length, filesBefore);

  // Undoing again has nothing to undo.
  assert.deepEqual(await revoke(designId), { ok: false, error: NOTHING_TO_UNDO });

  // Approving again is a new approval of the same files.
  const second = await approve(designId, designVersionId);
  assert.ok(second.ok);
  assert.notEqual(second.ok ? second.value.approvalId : '', first.ok ? first.value.approvalId : '');
  assert.equal((await view(designId))?.status, 'approved');
  assert.equal((await approvalRows(designId)).length, 2);
  assert.deepEqual(await revoke(designId), { ok: true, value: null }, 'and that one can be undone too');
});

test('only the shop owner can undo an approval, and only for their own design', async () => {
  const { designId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  assert.ok((await approve(designId, designVersionId)).ok);

  const stranger = await seedUser(h.db, { email: 'undoer@merchfrom.test', withStore: true });
  const notYours = { ok: false, error: 'Design not found for this shop.' };
  assert.deepEqual(await revoke(designId, session({ userId: stranger.userId, storeId: stranger.storeId })), notYours, 'another artist in their own shop');
  assert.deepEqual(await revoke(designId, session({ storeId: stranger.storeId })), notYours, "the owner's account with another shop");
  assert.deepEqual(await revoke(designId, session({ userId: stranger.userId })), notYours, "another account in the owner's shop");
  assert.deepEqual(await revoke(designId, session({ storeId: null })), { ok: false, error: 'This account has no shop, so there is no approval to undo.' });
  assert.deepEqual(await revoke('not-a-uuid'), notYours);
  assert.deepEqual(await revoke(randomUUID()), notYours);

  assert.equal((await view(designId))?.status, 'approved', 'none of those undid it');
  assert.equal((await approvalRows(designId))[0].invalidatedAt, null);
});

test('an approval cannot be undone once an order waits on the files or pre-press has checked them', async () => {
  // An order has been placed against the approved files.
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  assert.ok((await approve(designId, designVersionId)).ok);
  assert.deepEqual(await revoke(designId), { ok: true, value: null }, 'undoable before the order');
  assert.ok((await approve(designId, designVersionId)).ok);

  const sale = await seedShopOrder(h.db, { storeId: h.artist.storeId, productId });
  await h.prepress.markPacksNeededForOrder(sale);
  assert.deepEqual(await revoke(designId), {
    ok: false,
    error: "An order is already waiting on these print files, so the approval can't be undone. Message us if something needs to change.",
  });
  assert.equal((await view(designId))?.status, 'approved');
  assert.equal((await view(designId))?.canRevoke, false, 'Undo is hidden once an order waits');
  assert.equal((await approvalRows(designId)).filter((a) => a.invalidatedAt === null).length, 1);

  // Pre-press has audited a pack, with no order linked to it: production could already be working from it.
  const audited = await h.newDesign();
  const auditedVersion = (await h.prepare(audited.designId)).designVersionId;
  assert.ok((await approve(audited.designId, auditedVersion)).ok);
  const [pack] = await h.packs(auditedVersion);
  await h.db.update(schema.productionPacks).set({ auditStatus: 'approved', auditedAt: new Date() }).where(eq(schema.productionPacks.id, pack.id));
  assert.deepEqual(await revoke(audited.designId), {
    ok: false,
    error: "Our pre-press team has already checked these print files, so the approval can't be undone. Message us if something needs to change.",
  });
  assert.equal((await view(audited.designId))?.status, 'approved');
  assert.equal((await view(audited.designId))?.canRevoke, false, 'Undo is hidden once pre-press has checked the files');

  // A pack that pre-press audited and a correction then replaced still counts: the files were worked on.
  const corrected = await h.newDesign();
  const correctedVersion = (await h.prepare(corrected.designId)).designVersionId;
  assert.ok((await approve(corrected.designId, correctedVersion)).ok);
  const [first] = await h.packs(correctedVersion);
  await h.db
    .update(schema.productionPacks)
    .set({ auditedAt: new Date(), manifest: { ...(first.manifest as object), pipeline: { ...h.pipeline.packInfo(first)!, supersededBy: randomUUID() } } as never })
    .where(eq(schema.productionPacks.id, first.id));
  const late = await revoke(corrected.designId);
  assert.ok(!late.ok && late.error.startsWith('Our pre-press team has already checked these print files'), JSON.stringify(late));
  assert.equal((await view(corrected.designId))?.status, 'approved', 'the replaced pack is not in the view, and the approval still stands');
});

test('an approval of an older version is not the one to undo: the newest version has none', async () => {
  const { designId } = await h.newDesign();
  const first = await h.prepare(designId);
  assert.ok((await approve(designId, first.designVersionId)).ok);

  h.fakes.setArt(designId, Buffer.from('another drawing'));
  await h.prepare(designId);
  assert.deepEqual(await revoke(designId), { ok: false, error: NOTHING_TO_UNDO });
});

test('changing the screen count queues the screen job, keeps the choice, and shows the surcharge', async () => {
  const { designId } = await h.newDesign();
  h.fakes.engine.options.colourCap = 13;
  try {
    const { designVersionId } = await h.prepare(designId);
    const before = (await view(designId))!;
    assert.equal(before.screenSets[0].screenCount, 8, 'underbase, six colours and the highlight white');
    assert.ok(before.screenSets[0].headline.startsWith('8 screens, within the standard 8'));

    const changed = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens: 12 });
    assert.ok(changed.ok);
    const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, changed.ok ? changed.value.jobId : ''));
    const input = job.input as { techniques: string[]; recipe: { maxScreens: number }; rerun?: unknown };
    assert.deepEqual(input.techniques, ['screen'], 'only the screen print is made again');
    assert.equal(input.recipe.maxScreens, 12);
    assert.equal(job.kind, 'prepare');
    assert.equal((await view(designId))?.status, 'preparing');

    // The design remembers it, so a later prepare keeps the choice.
    const [remembered] = await h.db.select().from(schema.printRecipes).where(eq(schema.printRecipes.designId, designId));
    assert.deepEqual(remembered.recipe, { maxScreens: 12 });

    await h.runJob(job.id);
    const after = (await view(designId))!;
    const darks = after.screenSets.find((s) => s.key === 'darks')!;
    assert.equal(darks.screenCount, 12);
    assert.equal(darks.headline, '12 screens, 4 above the standard 8.');
    assert.equal(darks.priceNote, 'On a run, the 4 colours above 8 on this print position add €4.00 per piece. Each print position is counted on its own.');
    assert.equal(after.versionId, designVersionId);
    assert.equal(after.status, 'ready');
  } finally {
    h.fakes.engine.options.colourCap = 4;
  }
});

test('the screen count must be a whole number from 1 to 15, for a design that has print files', async () => {
  const { designId } = await h.newDesign();
  const ask = (screens: number, id = designId) => h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId: id, screens });

  assert.deepEqual(await ask(3), { ok: false, error: 'Prepare the print files first, then the screen count can change.' });
  await h.prepare(designId);
  for (const bad of [0, 16, 2.5, -1]) assert.deepEqual(await ask(bad), { ok: false, error: 'Choose between 1 and 15 screens.' }, String(bad));
  assert.ok((await ask(15)).ok);
  assert.ok((await ask(1)).ok);

  const other = await seedUser(h.db, { email: 'other@merchfrom.test', withStore: true });
  const foreign = await h.printPrep.changeScreenCount({ storeId: other.storeId as string, userId: other.userId, designId, screens: 4 });
  assert.deepEqual(foreign, { ok: false, error: 'Design not found for this shop.' });
});

test('preparePrint says what is wrong with a drop in plain words', async () => {
  const { designId } = await h.newDesign();
  const drop = h.drop(designId);
  const prepare = (patch: Partial<typeof drop>) => h.printPrep.preparePrint({ ...drop, ...patch });
  const message = async (patch: Partial<typeof drop>) => {
    const r = await prepare(patch);
    return r.ok ? 'ok' : r.error;
  };

  assert.equal(await message({ blankCode: 'NOPE' }), 'Unknown blank "NOPE".');
  assert.match(await message({ garmentCodes: ['C002', 'C999'] }), /^C999 isn't available on the /);
  assert.equal(await message({ garmentCodes: [] }), 'Pick at least one garment colour.');
  assert.equal(await message({ placements: [] }), 'Say where the print goes.');
  assert.match(await message({ placements: [{ position: 'sleeve', widthMm: 100 }] }), /has no "sleeve" print position\. Use one of: front chest, front, left chest, back, left sleeve, right sleeve\./);
  // a sleeve is a position on a tee, up to the short sleeve's size
  assert.match(await message({ placements: [{ position: 'sleeve_left', widthMm: 120 }] }), /A short-sleeve print can be at most 10 × 10 cm\./);
  assert.equal(await message({ placements: [{ position: 'front_chest', widthMm: 5 }] }), 'The print width must be between 2 and 40 cm: a design is at most 40 × 54 cm.');
  // wider than an A2 film holds with its marks: refused before any work is queued
  assert.equal(await message({ placements: [{ position: 'back', widthMm: 410 }] }), 'The print width must be between 2 and 40 cm: a design is at most 40 × 54 cm.');
  assert.equal(await message({ designId: '5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11' }), 'Design not found for this shop.');
  assert.equal(await message({ designId: 'not-a-uuid' }), 'Design not found for this shop.');

  const other = await seedUser(h.db, { email: 'someone-else@merchfrom.test', withStore: true });
  assert.equal(await message({ storeId: other.storeId as string }), 'Design not found for this shop.', "another shop's design is not theirs to prepare");

  // Nothing above queued a job or made a version.
  assert.equal((await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, designId))).length, 0);
});

test('the placement defaults to the blank’s usual spot and width', async () => {
  assert.deepEqual(await h.printPrep.defaultPlacement('STTU169'), { position: 'front_chest', widthMm: 280 });
  assert.deepEqual(await h.printPrep.defaultPlacement('STTU169', { position: 'back' }), { position: 'back', widthMm: 320 });
  assert.deepEqual(await h.printPrep.defaultPlacement('STTU169', { widthCm: 20 }), { position: 'front_chest', widthMm: 200 });
  assert.equal(await h.printPrep.defaultPlacement('NOPE'), null);
});

test('PRINT_MOCK=1 returns the sample views from the approved mocks', async () => {
  process.env.PRINT_MOCK = '1';
  try {
    const sample = await h.printPrep.getApprovalView({ storeId: 'any', designId: 'design-123' });
    assert.equal(sample?.designId, 'design-123');
    assert.equal(sample?.designName, 'Underwriter');
    assert.equal(sample?.status, 'ready');
    assert.equal(sample?.proofs.length, 6);
    assert.deepEqual(await h.printPrep.approveDesign({ storeId: 'any', userId: 'u', designId: 'design-123', versionId: 'v3' }), { ok: true, value: { approvalId: 'mock-approval-v3' } });
    assert.deepEqual(await h.printPrep.revokeApproval({ user: { id: 'u' }, store: { id: 'any' } }, 'design-123'), { ok: true, value: null });
    assert.ok((await h.printPrep.preparePrint(h.drop())).ok);
    assert.ok((await h.printPrep.changeScreenCount({ storeId: 'any', userId: 'u', designId: 'design-123', screens: 4 })).ok);
  } finally {
    delete process.env.PRINT_MOCK;
  }
});
