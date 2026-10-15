// The print job handler end to end, with a fake engine, fake pack writers, fake
// storage and a fake queue, on PGlite. Nothing here touches Neon or the network.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as zlib from 'node:zlib';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import type { PackFile, PackManifest, PrintJobInput } from '@/lib/print/types';
import { bootstrapPrint, readFakePsd, sha256, type Harness } from './test-support';

let h: Harness;

before(async () => {
  h = await bootstrapPrint();
});

after(async () => {
  await h.close();
});

const kinds = (files: PackFile[]) => files.map((f) => f.kind).sort();
const count = (files: PackFile[], kind: PackFile['kind']) => files.filter((f) => f.kind === kind).length;

test('a prepare job writes the design version, the packs, their files and their rows', async () => {
  const { jobId, designVersionId, result } = await h.prepare();

  // The version pins the artwork: its hash, its size and a copy in print storage.
  const [version] = await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.id, designVersionId));
  assert.equal(version.version, 1, "an upload is the artist's own pixels: one version, nothing rendered");
  assert.equal(version.source, 'upload');
  assert.equal(version.sha256, sha256(Buffer.from(`artwork:${h.designId}`)));
  assert.ok(version.artKey);
  assert.deepEqual([version.widthPx, version.heightPx], [1000, 1200]);
  assert.ok(h.fakes.storage.objects.has(version.artKey as string), 'the art is copied into print storage');

  // One pack per screen set and one for DTG/DTF, all published together.
  const packs = await h.packs(designVersionId);
  assert.equal(packs.length, 3);
  assert.deepEqual(result.packIds.sort(), packs.map((p) => p.id).sort());
  assert.ok(packs.every((p) => p.buildStatus === 'ready' && p.auditStatus === 'idle' && p.jobId === jobId));
  const darks = packs.find((p) => p.screenSetKey === 'darks')!;
  const lights = packs.find((p) => p.screenSetKey === 'lights')!;
  const dtg = packs.find((p) => p.technique === 'dtg_dtf')!;

  assert.deepEqual(darks.garmentCodes, ['C002', 'C727']);
  assert.equal(darks.screenCount, 6, 'underbase, four colours and the highlight white');
  assert.equal(darks.method, 'spot');
  assert.deepEqual(lights.garmentCodes, ['C001']);
  assert.equal(lights.screenCount, 4, 'no underbase on a light garment');
  assert.equal(dtg.screenCount, null);
  assert.equal(dtg.method, 'dtg');
  assert.deepEqual(dtg.garmentCodes, ['C002', 'C727', 'C001']);

  // Files: the PSD, a preview per film, a proof per garment colour, a loupe and the manifest. No job sheet:
  // that is one per design (lib/services/job-sheets.ts), not a file of each pack.
  const darkFiles = darks.files as PackFile[];
  assert.equal(count(darkFiles, 'screen_psd'), 1);
  assert.equal(count(darkFiles, 'film_preview'), 6);
  assert.equal(count(darkFiles, 'proof'), 2);
  assert.equal(count(darkFiles, 'loupe'), 1);
  assert.equal(count(darkFiles, 'manifest'), 1);
  const dtgFiles = dtg.files as PackFile[];
  assert.deepEqual(kinds(dtgFiles), ['dtg_png', 'dtg_png', 'dtg_png', 'dtg_psd', 'loupe', 'manifest', 'proof', 'proof', 'proof']);
  assert.equal(h.fakes.pack.sheets.length, 0, 'a build draws no job sheet');
  assert.deepEqual(h.fakes.storage.keys().filter((k) => k.includes('job-sheet')), [], 'and stores none');

  // Proofs for every garment colour and every technique.
  const proofs = packs.flatMap((p) => (p.files as PackFile[]).filter((f) => f.kind === 'proof').map((f) => `${p.technique}:${f.garmentCode}`));
  assert.deepEqual(proofs.sort(), ['dtg_dtf:C001', 'dtg_dtf:C002', 'dtg_dtf:C727', 'screen:C001', 'screen:C002', 'screen:C727']);

  // Every file is in storage with the hash and size the row says, and the print files stay private.
  for (const pack of packs) {
    for (const file of pack.files as PackFile[]) {
      const stored = h.fakes.storage.objects.get(file.key);
      assert.ok(stored, `${file.name} is stored`);
      assert.equal(sha256(stored.data), file.sha256);
      assert.equal(stored.data.length, file.bytes);
      assert.equal(stored.visibility, file.visibility);
      // Only what the artist sees is public; films carry Pantone codes, so they are private.
      const publicKinds = ['proof', 'loupe'];
      assert.equal(file.visibility, publicKinds.includes(file.kind) ? 'public' : 'private', `${file.kind} visibility`);
    }
  }

  // The manifest in the row is the typed manifest plus what the pipeline keeps beside it.
  const manifest = darks.manifest as PackManifest & { pipeline: { blankCode: string; jobInput: PrintJobInput } };
  assert.equal(manifest.pipeline.blankCode, 'STTU169');
  assert.equal(manifest.pipeline.jobInput.designVersionId, designVersionId);
  assert.equal(manifest.inputHash, darks.inputHash);
  assert.ok(!manifest.files.some((f) => f.kind === 'manifest'), 'a manifest does not list itself');
  assert.ok(!manifest.files.some((f) => (f.kind as string) === 'job_sheet'), 'the job sheet is not among a pack’s files');
  // The manifest.json in storage is the plain manifest, without the pipeline's extras.
  const manifestFile = darkFiles.find((f) => f.kind === 'manifest')!;
  const plain = JSON.parse(h.fakes.storage.objects.get(manifestFile.key)!.data.toString('utf8')) as Record<string, unknown>;
  assert.equal(plain.pipeline, undefined);

  // The white films are named by the pipeline; the colour inks keep the engine's client names, and no code yet.
  assert.deepEqual(
    manifest.inks.map((i) => [i.role, i.clientName, i.pantone]),
    [
      ['underbase', 'White underbase', null],
      ['ink', 'Orchid pink', null],
      ['ink', 'Violet', null],
      ['ink', 'Indigo', null],
      ['ink', 'Deep purple', null],
      ['highlight', 'Highlight white', null],
    ],
  );

  // The job finished with its pack ids, and the artwork was read once.
  assert.equal(h.fakes.engine.calls.filter((c) => c === 'decodeArt').length, 1);
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId));
  assert.equal(job.status, 'done');
  assert.deepEqual((job.result as { packIds: string[] }).packIds.sort(), result.packIds.sort());
});

test('running a job again (a retry) reuses its pack rows instead of adding more', async () => {
  const [version] = await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, h.designId));
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.designVersionId, version.id));
  const before = await h.packs(version.id);

  const again = await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  const after = await h.packs(version.id);

  assert.equal(after.length, before.length);
  assert.deepEqual(again.packIds.sort(), before.map((p) => p.id).sort());
  assert.ok(after.every((p) => p.buildStatus === 'ready'));
});

test('inks are named from the house library when it holds a close colour', async () => {
  const { designId } = await h.newDesign();
  // Pre-press picked a code for Orchid pink earlier; nobody has for Indigo.
  await h.db.insert(schema.pantoneLibrary).values({ code: 'PANTONE 237 C', labL: 71.9, labA: 43.5, labB: -23.9, source: 'assigned' });

  const { designVersionId } = await h.prepare(designId);
  const darks = (await h.packs(designVersionId)).find((p) => p.screenSetKey === 'darks')!;
  const manifest = darks.manifest as PackManifest;

  assert.equal(manifest.inks.find((i) => i.clientName === 'Orchid pink')?.pantone, 'PANTONE 237 C');
  assert.equal(manifest.inks.find((i) => i.clientName === 'Indigo')?.pantone, null);

  // The code is in the PSD's layer names, so the pressroom can read it off the file.
  const psd = (darks.files as PackFile[]).find((f) => f.kind === 'screen_psd')!;
  const layers = readFakePsd(h.fakes.storage.objects.get(psd.key)!.data).plates.map((p) => p.name);
  assert.ok(layers.some((name) => name.includes('PANTONE 237 C')), layers.join(' | '));
  assert.ok(layers.some((name) => name.startsWith('1/6  Underbase')));
});

test('a failed job leaves no half-built pack visible, and a retry finishes the work', async () => {
  const { designId } = await h.newDesign();
  const real = h.fakes.engine.engine.prepareDtg;
  h.fakes.engine.engine.prepareDtg = async () => {
    throw new Error('the engine fell over');
  };
  try {
    await assert.rejects(h.prepare(designId), /the engine fell over/);
  } finally {
    h.fakes.engine.engine.prepareDtg = real;
  }

  const version = await h.printPrep.latestVersion(designId);
  const rows = await h.packs(version!.id);
  assert.ok(rows.length > 0, 'the screen packs were built before the DTG step failed');
  assert.ok(rows.every((p) => p.buildStatus === 'failed'), rows.map((p) => p.buildStatus).join());
  assert.deepEqual(await h.pipeline.loadCurrentPacks(version!.id), []);
  const view = await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId });
  assert.equal(view?.status, 'failed');

  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.designVersionId, version!.id));
  assert.equal(job.status, 'failed');
  const retried = await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  const after = await h.packs(version!.id);
  assert.equal(after.length, 3, 'the retry reused the failed rows');
  assert.ok(after.every((p) => p.buildStatus === 'ready'));
  assert.equal(retried.packIds.length, 3);
});

test('artwork that no longer matches its version is refused', async () => {
  const { designId } = await h.newDesign();
  const queued = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(queued.ok);
  // Somebody swaps the file behind the version before the worker gets to it.
  const [version] = await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.id, queued.value.designVersionId));
  const stored = h.fakes.storage.objects.get(version.artKey as string)!;
  h.fakes.storage.objects.set(version.artKey as string, { ...stored, data: Buffer.from('somebody swapped the file') });

  await assert.rejects(h.runJob(queued.value.jobId), /no longer matches/);
  assert.equal((await h.packs(version.id)).filter((p) => p.buildStatus === 'ready').length, 0);
});

test('a garment with no photo gets no proof and a check says so; a method needing a person is flagged', async () => {
  const { designId } = await h.newDesign();
  h.fakes.noPackshot.add('C001');
  h.fakes.engine.options.needsManual = true;
  try {
    const { designVersionId } = await h.prepare(designId);
    const packs = await h.packs(designVersionId);
    const lights = packs.find((p) => p.screenSetKey === 'lights')!;
    const checks = lights.checks as { id: string; state: string; detail: string }[];

    assert.equal((lights.files as PackFile[]).filter((f) => f.kind === 'proof').length, 0);
    assert.equal(checks.find((c) => c.id === 'garment_photos')?.state, 'review');
    assert.match(checks.find((c) => c.id === 'garment_photos')?.detail ?? '', /White/);
    assert.equal(checks.find((c) => c.id === 'method')?.state, 'review');
    assert.equal(packs.find((p) => p.technique === 'dtg_dtf')!.checks && (packs.find((p) => p.technique === 'dtg_dtf')!.checks as { id: string }[]).some((c) => c.id === 'method'), false, 'DTG/DTF has no method to flag');
  } finally {
    h.fakes.noPackshot.delete('C001');
    h.fakes.engine.options.needsManual = false;
  }
});

test('a newer job replaces the packs of an older one and takes over the orders waiting on them', async () => {
  const { designId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const first = await h.packs(designVersionId);
  const oldDarks = first.find((p) => p.screenSetKey === 'darks')!;
  const dtg = first.find((p) => p.technique === 'dtg_dtf')!;

  // A screen-printed run needs the dark set; its need puts the pack in the queue.
  const { orderId } = await (await import('./test-support')).seedRun(h.db, {
    storeId: h.artist.storeId,
    designId,
    lines: [{ colourCode: 'C002', qty: 120, printServiceCode: 'screen_2c' }],
  });
  await h.prepress.markPacksNeededForOrder(orderId);
  const [waiting] = await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, oldDarks.id));
  assert.equal(waiting.auditStatus, 'waiting');

  // The artist approves, then asks for fewer screens.
  const approved = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId });
  assert.ok(approved.ok);
  const changed = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens: 3 });
  assert.ok(changed.ok);
  const [approval] = await h.db.select().from(schema.designApprovals).where(eq(schema.designApprovals.designId, designId));
  assert.ok(approval.invalidatedAt, 'new separations withdraw the approval');
  await h.runJob(changed.ok ? changed.value.jobId : '');

  const all = await h.packs(designVersionId);
  const current = await h.pipeline.loadCurrentPacks(designVersionId);
  assert.equal(all.length, 5, 'three first, then two new screen packs');
  assert.equal(current.length, 3);
  assert.ok(current.some((p) => p.id === dtg.id), 'DTG/DTF was not part of the new job and stays');

  const newDarks = current.find((p) => p.screenSetKey === 'darks')!;
  assert.equal(newDarks.screenCount, 3, 'underbase, one colour and the highlight white');
  assert.equal(newDarks.correctedFromPackId, oldDarks.id);
  assert.equal(newDarks.auditStatus, 'waiting', 'a rebuilt pack goes back to the auditor');
  assert.deepEqual((newDarks.neededFor as { orderId: string; qty: number }[]).map((n) => [n.orderId, n.qty]), [[orderId, 120]]);

  const [retired] = await h.db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, oldDarks.id));
  assert.equal(h.pipeline.packInfo(retired)?.supersededBy, newDarks.id);
  assert.deepEqual(retired.neededFor, []);
  assert.equal(retired.auditStatus, 'idle');
});

test('a job that finishes after a newer one is itself the older: its packs are born replaced', async () => {
  const { designId } = await h.newDesign();
  const queued = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(queued.ok);
  const changed = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens: 3 });
  assert.ok(changed.ok);
  assert.notEqual(queued.ok && queued.value.jobId, changed.ok && changed.value.jobId);

  // The newer job (3 screens) finishes first; the older one (8) arrives late.
  await h.runJob(changed.ok ? changed.value.jobId : '');
  await h.runJob(queued.ok ? queued.value.jobId : '');

  const current = await h.pipeline.loadCurrentPacks(queued.ok ? queued.value.designVersionId : '');
  const screens = current.filter((p) => p.technique === 'screen');
  assert.deepEqual(screens.map((p) => [p.screenSetKey, p.screenCount]).sort(), [['darks', 3], ['lights', 3]], 'the newer separations win');
  assert.equal(current.filter((p) => p.technique === 'dtg_dtf').length, 1, 'the DTG/DTF pack only came from the older job and stays');
});

// -- the 4K final, in the worker -------------------------------------------------

test('a generated design is finalised by the worker job, never in the request, and the packs are built on the 4K final', async () => {
  const { designId } = await h.newDesign({ generated: true });
  const queued = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(queued.ok);

  // The request pinned the draft and queued the job. No render has been paid for.
  const renders = () => h.fakes.finaliseCalls.filter((id) => id === designId);
  assert.deepEqual(renders(), []);
  let versions = await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, designId));
  assert.deepEqual(versions.map((v) => [v.version, v.source]), [[1, 'generated']]);
  assert.equal((await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId }))?.status, 'preparing');

  const result = await h.runJob(queued.value.jobId);
  assert.deepEqual(renders(), [designId], 'one render, in the job');
  versions = (await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, designId))).sort((a, b) => a.version - b.version);
  assert.deepEqual(versions.map((v) => [v.version, v.source]), [[1, 'generated'], [2, 'final_4k']]);
  const [draft, final] = versions;
  assert.equal(final.parentVersionId, draft.id);
  assert.equal(final.sha256, sha256(Buffer.from(`final-4k:${designId}`)));
  assert.deepEqual([final.widthPx, final.heightPx], [4000, 4800]);
  assert.ok(h.fakes.storage.objects.has(final.artKey as string), 'the final is copied into print storage');

  // The packs belong to the final; the job stays on the draft it was queued on.
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, queued.value.jobId));
  assert.equal(job.designVersionId, draft.id);
  const packs = await h.packs(final.id);
  assert.equal(packs.length, 3);
  assert.deepEqual(result.packIds.sort(), packs.map((p) => p.id).sort());
  assert.equal((await h.packs(draft.id)).length, 0);
  // What a re-run starts from names the final too.
  assert.ok(packs.every((p) => h.pipeline.packInfo(p)?.jobInput.designVersionId === final.id));

  // The artist reads one piece of art, version 1: the final is the draft rendered at print size.
  const view = await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId });
  assert.equal(view?.status, 'ready');
  assert.equal(view?.versionId, final.id);
  assert.equal(view?.versionNumber, 1);
  const files = (packs.find((p) => p.screenSetKey === 'darks')!.files as PackFile[]).map((f) => f.name);
  assert.ok(files.some((n) => /-v1-FRONT-CHEST-DARKS\.psd$/.test(n)), files.join(', '));
  const label = (h.pipeline.packInfo(packs[0]) as { label: { version: number } }).label;
  assert.equal(label.version, 1);

  // Asking again for the same drop is the same job: nothing is queued, nothing is rendered.
  const again = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(again.ok);
  assert.equal(again.value.jobId, queued.value.jobId);
  assert.equal(again.value.designVersionId, final.id);
  assert.deepEqual(renders(), [designId]);

  // The old draft cannot be approved; the final can.
  const early = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: draft.id });
  assert.deepEqual(early, { ok: false, error: 'There is a newer version of this design. Look over that one instead.' });
  assert.ok((await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: final.id })).ok);
});

test('a render that fails is tried again; a job that comes back reuses the final it pinned instead of rendering another', async () => {
  const { designId } = await h.newDesign({ generated: true });
  const queued = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(queued.ok);

  h.fakes.finaliseFails.add(designId);
  await assert.rejects(h.runJob(queued.value.jobId), /The full-size render did not finish: the model timed out\./);
  assert.equal((await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, designId))).length, 1, 'no version for a render that never came');
  const [failed] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, queued.value.jobId));
  assert.equal(failed.status, 'failed');
  assert.match(failed.error ?? '', /did not finish/);

  h.fakes.finaliseFails.delete(designId);
  await h.pipeline.handlePrintJob({ ...failed, status: 'running' });
  const rendered = [...h.fakes.finaliseCalls].filter((id) => id === designId).length;
  assert.equal(rendered, 2, 'the failed try, then the one that worked');

  // The same job once more (a recovery): the final is already pinned, so nothing renders and nothing is built.
  const callsBefore = h.fakes.engine.calls.length;
  await h.pipeline.handlePrintJob({ ...failed, status: 'running' });
  assert.equal(h.fakes.finaliseCalls.filter((id) => id === designId).length, 2);
  assert.equal(h.fakes.engine.calls.length, callsBefore);
  assert.equal((await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, designId))).length, 2);
});

// -- idempotent per input hash -----------------------------------------------------

test('a job that runs again builds nothing twice: no new rows, no new files, no engine work', async () => {
  const { designId } = await h.newDesign();
  const { jobId, designVersionId } = await h.prepare(designId);
  const rowsBefore = await h.packs(designVersionId);
  const keysBefore = h.fakes.storage.keys(`print/${designId}/`);
  const engineCalls = h.fakes.engine.calls.length;
  const hashesBefore = Object.fromEntries(keysBefore.map((k) => [k, sha256(h.fakes.storage.objects.get(k)!.data)]));

  // A lost worker's job comes back.
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId));
  const again = await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.deepEqual(again.packIds.sort(), rowsBefore.map((p) => p.id).sort());
  assert.equal(h.fakes.engine.calls.length, engineCalls, 'the engine was not asked again');
  assert.deepEqual(await h.packs(designVersionId), rowsBefore, 'the rows are untouched');
  assert.deepEqual(h.fakes.storage.keys(`print/${designId}/`), keysBefore);
  for (const key of keysBefore) assert.equal(sha256(h.fakes.storage.objects.get(key)!.data), hashesBefore[key], key);

  // A second job row with the very same input (an admin retry, a re-enqueue) finds the same packs.
  const input = job.input as PrintJobInput;
  const second = await h.fakes.deps.jobs!.enqueuePrintJob({ kind: 'prepare', input, createdBy: h.artist.userId });
  assert.equal(second.deduped, false, 'the first job is done, so this is a new job');
  const result = await h.runJob(second.jobId);
  assert.deepEqual(result.packIds.sort(), rowsBefore.map((p) => p.id).sort());
  assert.equal((await h.packs(designVersionId)).length, rowsBefore.length, 'no row was added');
  assert.equal(h.fakes.engine.calls.length, engineCalls);
  assert.equal(h.fakes.storage.keys(`print/${designId}/`).length, keysBefore.length, 'no file was added');
});

test('a file that went missing, or changed, is built again into the same row', async () => {
  const { designId } = await h.newDesign();
  const { jobId, designVersionId } = await h.prepare(designId);
  const darks = (await h.packs(designVersionId)).find((p) => p.screenSetKey === 'darks')!;
  const proof = (darks.files as PackFile[]).find((f) => f.kind === 'proof')!;
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId));

  // One proof is gone from storage: the outputs are not intact, so the job builds them again.
  h.fakes.storage.objects.delete(proof.key);
  const calls = h.fakes.engine.calls.length;
  await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.ok(h.fakes.engine.calls.length > calls, 'the engine ran again');
  assert.ok(h.fakes.storage.objects.has(proof.key), 'and the file is back');
  const rows = await h.packs(designVersionId);
  assert.equal(rows.length, 3, 'in the rows it had');
  assert.ok(rows.every((p) => p.buildStatus === 'ready'));
  assert.ok(rows.some((p) => p.id === darks.id));

  // A file with other bytes than the row says counts the same.
  const before = h.fakes.engine.calls.length;
  h.fakes.storage.objects.set(proof.key, { ...h.fakes.storage.objects.get(proof.key)!, data: Buffer.from('tampered') });
  await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.ok(h.fakes.engine.calls.length > before);
  assert.equal(sha256(h.fakes.storage.objects.get(proof.key)!.data), proof.sha256);
});

test('a job for inputs an earlier job already made brings those packs back, and an older job never overrides a newer one', async () => {
  const { designId } = await h.newDesign();
  const first = await h.prepare(designId);
  const original = await h.packs(first.designVersionId);
  const [job1] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, first.jobId));

  // The artist asks for 3 screens, then 5: each replaces the one before.
  const three = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens: 3 });
  assert.ok(three.ok);
  await h.runJob(three.value.jobId);
  const five = await h.printPrep.changeScreenCount({ storeId: h.artist.storeId, userId: h.artist.userId, designId, screens: 5 });
  assert.ok(five.ok);
  await h.runJob(five.value.jobId);
  const screensNow = async () => (await h.pipeline.loadCurrentPacks(first.designVersionId)).filter((p) => p.technique === 'screen').map((p) => `${p.screenSetKey}:${p.screenCount}`).sort();
  assert.deepEqual(await screensNow(), ['darks:5', 'lights:4']);
  const rowsAfter = (await h.packs(first.designVersionId)).length;

  // The job that made the 3-screen packs comes back (a recovery): they were replaced, and a job older than
  // what replaced them does not put them back.
  const [job3] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, three.value.jobId));
  await h.pipeline.handlePrintJob({ ...job3, status: 'running' });
  assert.deepEqual(await screensNow(), ['darks:5', 'lights:4']);
  assert.equal((await h.packs(first.designVersionId)).length, rowsAfter, 'and builds nothing');

  // A new job with the 3-screen inputs is newer than the 5-screen packs, so it does bring them back, row for row.
  const again = await h.fakes.deps.jobs!.enqueuePrintJob({ kind: 'prepare', input: job3.input as PrintJobInput, createdBy: h.artist.userId });
  const calls = h.fakes.engine.calls.length;
  await h.runJob(again.jobId);
  assert.deepEqual(await screensNow(), ['darks:3', 'lights:3']);
  assert.equal((await h.packs(first.designVersionId)).length, rowsAfter, 'no row was added');
  assert.equal(h.fakes.engine.calls.length, calls);
  // The 8-screen packs the first job made are still the oldest, and stay replaced.
  const firstScreens = (await h.packs(first.designVersionId)).filter((p) => original.some((o) => o.id === p.id) && p.technique === 'screen');
  assert.ok(firstScreens.every((p) => h.pipeline.isSuperseded(p)));
  assert.ok(job1.id);
});

// -- proofs are drawn at the placement's width ----------------------------------------

test('the print box a proof is drawn in is resized to the placement, centred and clear of the edges', async () => {
  const box = { x: 0.3, y: 0.35, w: 0.4, h: 0.4 };
  // Calibrated at 28 cm; a 20 cm print is 20/28 of that, still centred under the collar.
  const small = h.pipeline.printBoxFor({ printBox: box, widthCm: 28 }, { position: 'front_chest', widthMm: 200 });
  assert.ok(Math.abs(small.w - 0.4 * (200 / 280)) < 1e-9);
  assert.ok(Math.abs(small.h - 0.4 * (200 / 280)) < 1e-9);
  assert.ok(Math.abs(small.x + small.w / 2 - 0.5) < 1e-9, 'the print stays centred');
  assert.equal(small.y, 0.35, 'and keeps the box’s top, the standard position, when the placement has no offset');

  // The calibrated width itself changes nothing.
  assert.deepEqual(h.pipeline.printBoxFor({ printBox: box, widthCm: 28 }, { position: 'front_chest', widthMm: 280 }), box);

  // A print wider than the garment photo is held inside it.
  const wide = h.pipeline.printBoxFor({ printBox: box, widthCm: 28 }, { position: 'front_chest', widthMm: 900 });
  assert.ok(wide.w <= 1 && wide.x >= 0 && wide.x + wide.w <= 1 + 1e-9 && wide.y + wide.h <= 1 + 1e-9);

  // No width to go by: the calibrated box as it is.
  assert.deepEqual(h.pipeline.printBoxFor({ printBox: box, widthCm: 0 }, { position: 'front_chest', widthMm: 200 }), box);
});

test('a print a product moved is drawn where it will print: the box moves by the offset at its own scale and is held on the photo', () => {
  const box = { x: 0.3, y: 0.35, w: 0.4, h: 0.4 };
  const shot = { printBox: box, widthCm: 28 }; // no size: the standard 1200 x 1500 photo
  const perCm = (0.4 * 1200) / 28 / 1500; // a cm, as a fraction of the photo's height
  const at = (placement: { widthMm: number; offsetYMm?: number }, more: object = {}) => h.pipeline.printBoxFor({ ...shot, ...more }, { position: 'front_chest', ...placement });
  const near = (a: number, b: number, message: string) => assert.ok(Math.abs(a - b) < 1e-12, `${message}: ${a} is not ${b}`);

  // 3 cm lower: the top moves down by 3 cm. The width and the centring do not change.
  const lower = at({ widthMm: 280, offsetYMm: 30 });
  near(lower.y, 0.35 + 3 * perCm, '3 cm lower');
  assert.deepEqual([lower.x, lower.w], [box.x, box.w]);
  // 2 cm higher: up by 2 cm. No offset, or 0, is the standard position.
  near(at({ widthMm: 280, offsetYMm: -20 }).y, 0.35 - 2 * perCm, '2 cm higher');
  assert.equal(at({ widthMm: 280, offsetYMm: 0 }).y, 0.35);
  assert.deepEqual(at({ widthMm: 280 }), box);

  // The usable area ends where it did, so a print moved down has less room (the proof then says it runs past), and one moved up more.
  near(lower.y + lower.h, 0.35 + 0.4, 'the bottom of the usable area stays');
  near(at({ widthMm: 280, offsetYMm: -20 }).h, 0.4 + 2 * perCm, 'moved up, more room');

  // The offset is converted at the box's own scale, not at the print's: a 20 cm print moves just as far for 3 cm.
  const narrow = at({ widthMm: 200, offsetYMm: 30 });
  near(narrow.y, 0.35 + 3 * perCm, 'a 20 cm print, 3 cm lower');
  near(narrow.w, 0.4 * (200 / 280), 'and it is still 20 cm wide');

  // The photo's real size sets the scale: on a shorter photo the same cm is more of its height.
  near(at({ widthMm: 280, offsetYMm: 30 }, { size: { widthPx: 1200, heightPx: 1200 } }).y, 0.35 + (3 * 0.4 * 1200) / 28 / 1200, 'a 1200 px square photo');

  // Held on the photo: moved above its top, it sits at the top; moved far down, the box still ends on the photo.
  assert.equal(at({ widthMm: 280, offsetYMm: -2000 }).y, 0);
  const far = at({ widthMm: 280, offsetYMm: 2000 });
  near(far.y, 1 - 0.4, 'far down');
  assert.ok(far.y + far.h <= 1 + 1e-12 && far.h > 0, 'the box stays on the photo, with some room left to measure the overflow against');

  // A hoodie's pocket: the usable area never reaches below it, so a print moved toward it is flagged, not drawn through it.
  const pocket = 0.5;
  near(at({ widthMm: 280 }, { pocketLine: pocket }).h, pocket - 0.35, 'the pocket ends the usable area');
  near(at({ widthMm: 280, offsetYMm: 30 }, { pocketLine: pocket }).h, pocket - (0.35 + 3 * perCm), 'and a print moved down has even less');
  assert.equal(at({ widthMm: 280 }, { pocketLine: 0.9 }).h, 0.4, 'a pocket below the box changes nothing');
  assert.ok(at({ widthMm: 280, offsetYMm: 2000 }, { pocketLine: pocket }).h > 0, 'and there is always some room, so the overflow can be measured');
});

test('the engine draws every proof in a box as wide as the print', async () => {
  const { designId } = await h.newDesign();
  const before = h.fakes.engine.proofRequests.length;
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), placements: [{ position: 'front_chest', widthMm: 200 }] });
  assert.ok(queued.ok);
  await h.runJob(queued.value.jobId);

  const requests = h.fakes.engine.proofRequests.slice(before);
  assert.equal(requests.length, 6, 'three colours, two ways of printing');
  for (const r of requests) {
    assert.equal(r.widthMm, 200);
    assert.ok(Math.abs(r.printBox.w - 0.4 * (200 / 280)) < 1e-9, `${r.technique} ${r.garmentCode}: ${r.printBox.w}`);
  }
});

test('a placement with an offset reaches the engine as a moved box, for every proof', async () => {
  const { designId } = await h.newDesign();
  const before = h.fakes.engine.proofRequests.length;
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), placements: [{ position: 'front_chest', widthMm: 280, offsetYMm: 30 }] });
  assert.ok(queued.ok);
  await h.runJob(queued.value.jobId);

  // The stand-in photo's box is {y: 0.3, w: 0.4} at 28 cm: 3 cm lower is 3 * (0.4 * 1200 / 28) / 1500 further down.
  const requests = h.fakes.engine.proofRequests.slice(before);
  assert.equal(requests.length, 6);
  for (const r of requests) assert.ok(Math.abs(r.printBox.y - (0.3 + (3 * 0.4 * 1200) / 28 / 1500)) < 1e-9, `${r.technique} ${r.garmentCode}: ${r.printBox.y}`);
});

// -- film labels carry the Pantone code ----------------------------------------------------

test('a code from the house library goes on the film strip when the pack is built, and every code entered later is drawn onto the films', async () => {
  const { designId } = await h.newDesign();
  await h.db.delete(schema.pantoneLibrary);
  await h.db.insert(schema.pantoneLibrary).values({ code: 'PANTONE 237 C', labL: 71.9, labA: 43.5, labB: -23.9, source: 'assigned' });
  const relabelsBefore = h.fakes.engine.relabels.length;
  const { designVersionId } = await h.prepare(designId);

  // Built: only the film that matched a remembered code is redrawn, with that code.
  const built = h.fakes.engine.relabels.slice(relabelsBefore);
  assert.ok(built.length >= 1);
  assert.ok(built.every((r) => r.inkName === 'PANTONE 237 C'), JSON.stringify(built));

  // Entered later: the worker redraws every strip with the codes there are, then rewrites the PSD and the sheet.
  const darks = (await h.packs(designVersionId)).find((p) => p.screenSetKey === 'darks')!;
  const [violet] = (darks.manifest as { inks: { index: number; clientName: string }[] }).inks.filter((i) => i.clientName === 'Violet');
  const done = await h.pantone.assignPantone(h.owner, { packId: darks.id, plateIndex: violet.index, code: '2582 c' });
  assert.ok(done.ok);
  const marks = h.fakes.engine.relabels.length;
  const [refresh] = (await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.kind, 'reupload'))).filter((j) => (j.input as PrintJobInput).reupload?.packId === darks.id);
  await h.runJob(refresh.id);
  const redrawn = h.fakes.engine.relabels.slice(marks);
  assert.equal(redrawn.length, 6, 'every film of the set');
  assert.deepEqual(redrawn.map((r) => r.inkName).filter(Boolean).sort(), ['PANTONE 237 C', 'PANTONE 2582 C']);
});

// -- a set where nothing prints ---------------------------------------------------------------

test('a set where nothing prints gets no PSD, previews or proofs, one failed Films check with the engine’s warning, and cannot be approved', async () => {
  const { designId } = await h.newDesign();
  const writesBefore = h.fakes.pack.psdWrites;
  h.fakes.engine.options.nothingPrintsOnDarks = true;
  let designVersionId: string;
  let jobId: string;
  try {
    ({ designVersionId, jobId } = await h.prepare(designId));
  } finally {
    h.fakes.engine.options.nothingPrintsOnDarks = false;
  }

  const packs = await h.packs(designVersionId);
  assert.equal(packs.length, 3, 'the empty set still has its pack, so pre-press can see why');
  const darks = packs.find((p) => p.screenSetKey === 'darks')!;
  const lights = packs.find((p) => p.screenSetKey === 'lights')!;
  const message = 'Screen print: nothing prints on Black, French Navy. The art is the same colour as the shirt.';

  assert.equal(darks.buildStatus, 'ready');
  assert.equal(darks.screenCount, 0);
  assert.deepEqual(kinds(darks.files as PackFile[]), ['manifest'], 'no PSD, no film previews, no proofs, no loupe');
  assert.equal(h.fakes.pack.psdWrites - writesBefore, 1, 'a PSD was only asked for the set that prints');
  assert.deepEqual(
    (darks.checks as { id: string; state: string; detail: string }[]).map((c) => [c.id, c.state, c.detail]),
    [['plates', 'failed', message]],
    'the one check result carries the engine’s warning',
  );
  assert.deepEqual(h.pipeline.packInfo(darks)?.warnings.map((w) => `${w.severity}:${w.message}`), [`block:${message}`]);

  // The set that does print is built as always.
  assert.equal(count(lights.files as PackFile[], 'screen_psd'), 1);
  assert.equal(count(lights.files as PackFile[], 'film_preview'), 4);
  assert.equal(count(lights.files as PackFile[], 'proof'), 1);

  // The artist sees the reason, not an empty set of screens, and cannot approve.
  const view = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId }))!;
  assert.equal(view.canApprove, false);
  assert.deepEqual(view.warnings, [message]);
  assert.deepEqual(view.screenSets.map((s) => s.key), ['lights']);
  assert.deepEqual(view.garments.map((g) => [g.code, g.screenSetKey]), [['C002', null], ['C727', null], ['C001', 'lights']]);
  assert.deepEqual(view.proofs.filter((p) => p.technique === 'screen').map((p) => p.garmentCode), ['C001']);
  assert.deepEqual(
    await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId }),
    { ok: false, error: `This can't be printed yet: ${message}` },
  );

  // Pre-press sees the failed check, has no PSD to download, and cannot approve or correct the empty pack.
  const worker = await h.staff({ prepress: 'work' });
  const detail = (await h.prepress.getPackDetail(worker, darks.id))!;
  assert.deepEqual([detail.films.length, detail.downloadUrl, detail.screenSetKey], [0, null, 'darks']);
  assert.deepEqual(detail.checks.map((c) => [c.id, c.state, c.detail]), [['plates', 'failed', message]]);
  assert.deepEqual(await h.prepress.approvePack(worker, darks.id), { ok: false, error: 'A check failed (Films). Run the pack again or upload a corrected PSD first.' });
  assert.deepEqual(await h.pipeline.runCorrectedUpload({ packId: darks.id, bytes: Buffer.from('a file'), filename: 'fix.psd', actorId: worker.userId }), {
    ok: false,
    error: 'Nothing prints on this set, so there is no PSD to correct. Run the pack again with other settings, or send it back to the artist.',
  });

  // The job comes back after it finished: nothing is built twice.
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId));
  const calls = h.fakes.engine.calls.length;
  await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.equal((await h.packs(designVersionId)).length, 3);
  assert.equal(h.fakes.engine.calls.length, calls);
});

// -- the PNG zip ------------------------------------------------------------------------------

/** Reads a zip back the way an unzipper does, through its central directory, and checks what it can. */
function readZip(zip: Buffer): { name: string; data: Buffer; flags: number }[] {
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50, 'it ends with the end-of-directory record');
  const count = zip.readUInt16LE(end + 10);
  assert.equal(zip.readUInt32LE(end + 12) + zip.readUInt32LE(end + 16), end, 'the directory ends where the end record starts');
  let at = zip.readUInt32LE(end + 16);
  const out: { name: string; data: Buffer; flags: number }[] = [];
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(at), 0x02014b50, 'a directory entry');
    const flags = zip.readUInt16LE(at + 8);
    assert.equal(zip.readUInt16LE(at + 10), 0, 'stored, not compressed');
    const crc = zip.readUInt32LE(at + 16);
    const size = zip.readUInt32LE(at + 24);
    assert.equal(zip.readUInt32LE(at + 20), size);
    const nameLength = zip.readUInt16LE(at + 28);
    const offset = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    assert.equal(zip.readUInt32LE(offset), 0x04034b50, 'the local header it points at');
    assert.equal(zip.toString('utf8', offset + 30, offset + 30 + zip.readUInt16LE(offset + 26)), name);
    const start = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
    const data = zip.subarray(start, start + size);
    if (typeof zlib.crc32 === 'function') assert.equal(zlib.crc32(data), crc, `CRC of ${name}`);
    out.push({ name, data, flags });
    at += 46 + nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
  return out;
}

/** The system's own unzip, as a decoder that is not ours; skipped where there is none. */
function unzipTests(zip: Buffer): { ran: boolean; ok: boolean; output: string } {
  let dir: string | null = null;
  try {
    dir = mkdtempSync(path.join(tmpdir(), 'zip-'));
    const file = path.join(dir, 'pngs.zip');
    writeFileSync(file, zip);
    const run = spawnSync('unzip', ['-t', file], { encoding: 'utf8' });
    if (run.error) return { ran: false, ok: true, output: '' };
    return { ran: true, ok: run.status === 0, output: `${run.stdout}${run.stderr}` };
  } catch {
    return { ran: false, ok: true, output: '' };
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

test('zipStore makes a plain stored zip in name order, with fixed dates, so the same files are the same bytes', () => {
  const a = { name: 'MF-A-DTG-BLACK.png', data: Buffer.from([1, 2, 3, 4]) };
  const b = { name: 'MF-A-DTG-WHITE.png', data: Buffer.from('white pixels') };
  const c = { name: 'MF-A-DTG-ÉCRU.png', data: Buffer.alloc(0) };
  const zip = h.pipeline.zipStore([b, c, a]);

  assert.deepEqual(zip, h.pipeline.zipStore([a, b, c]), 'the order they are given in makes no difference');
  const entries = readZip(zip);
  assert.deepEqual(entries.map((e) => e.name), ['MF-A-DTG-BLACK.png', 'MF-A-DTG-WHITE.png', 'MF-A-DTG-ÉCRU.png']);
  assert.deepEqual(entries.map((e) => e.data), [a.data, b.data, c.data]);
  assert.ok(entries.every((e) => (e.flags & 0x0800) !== 0), 'names are flagged as UTF-8');
  // Fixed dates: 1980-01-01 00:00:00 in every header.
  assert.equal(zip.readUInt16LE(10), 0);
  assert.equal(zip.readUInt16LE(12), (1 << 5) | 1);

  const empty = h.pipeline.zipStore([]);
  assert.equal(empty.length, 22);
  assert.deepEqual(readZip(empty), []);

  const outside = unzipTests(zip);
  assert.ok(outside.ok, outside.output);
});

test('a DTG/DTF pack keeps every garment colour’s PNG in one zip beside its files, and builds it again when it goes missing', async () => {
  const { designId } = await h.newDesign();
  const { designVersionId, jobId } = await h.prepare(designId);
  const packs = await h.packs(designVersionId);
  const dtg = packs.find((p) => p.technique === 'dtg_dtf')!;
  const zip = h.pipeline.packInfo(dtg)?.pngZip;
  assert.ok(zip);
  assert.match(zip.name, /^MF-.+-DTG-DTF-PNGs\.zip$/);
  assert.ok(!(dtg.files as PackFile[]).some((f) => f.name === zip.name || f.key === zip.key), 'it is not one of the pack’s own files, so the checks never open it');
  assert.ok(packs.filter((p) => p.technique === 'screen').every((p) => !h.pipeline.packInfo(p)?.pngZip), 'screen packs have none');

  const stored = h.fakes.storage.objects.get(zip.key)!;
  assert.equal(stored.visibility, 'private');
  assert.equal(stored.contentType, 'application/zip');
  assert.equal(sha256(stored.data), zip.sha256);
  assert.equal(stored.data.length, zip.bytes);

  // Inside: each garment colour's PNG, byte for byte as the pack has it.
  const pngs = (dtg.files as PackFile[]).filter((f) => f.kind === 'dtg_png');
  assert.equal(pngs.length, 3);
  const entries = readZip(stored.data);
  assert.deepEqual(entries.map((e) => e.name), pngs.map((f) => f.name).sort());
  for (const entry of entries) assert.deepEqual(entry.data, h.fakes.storage.objects.get(pngs.find((f) => f.name === entry.name)!.key)!.data);
  const outside = unzipTests(stored.data);
  assert.ok(outside.ok, outside.output);

  // The zip is part of what a build leaves behind: with it gone, the job builds the pack again, into the same row.
  h.fakes.storage.objects.delete(zip.key);
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId));
  const calls = h.fakes.engine.calls.length;
  await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.ok(h.fakes.engine.calls.length > calls, 'the pack was built again');
  assert.equal((await h.packs(designVersionId)).length, 3, 'in its own row');
  const again = h.pipeline.packInfo((await h.packs(designVersionId)).find((p) => p.id === dtg.id)!)!.pngZip!;
  assert.equal(again.sha256, zip.sha256, 'the same files make the same zip');
  assert.ok(h.fakes.storage.objects.has(again.key));

  // And left alone, a job that comes back builds nothing, the zip included.
  const settled = h.fakes.engine.calls.length;
  await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.equal(h.fakes.engine.calls.length, settled);
});
