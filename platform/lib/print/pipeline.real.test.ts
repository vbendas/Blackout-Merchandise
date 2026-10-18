// The job handler with the real engine and the real pack writers, readers and checks,
// on small flat art, with fake storage and queue on PGlite. The other pipeline tests use
// fakes for both; this is the one place the three are run together, so a mismatch between
// what the pipeline hands over and what they expect shows here and not in production.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import * as schema from '@db/schema';
import { drawArt } from '@/lib/print/engine/testing';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import type { CheckResult, PackFile } from '@/lib/print/types';
import { bootstrapPrint, sha256, type Harness } from './test-support';
import type { PackRow } from './pipeline';

let h: Harness;
let pack: typeof import('@/lib/print/pack');
let jobSheets: typeof import('@/lib/services/job-sheets');

before(async () => {
  h = await bootstrapPrint();
  pack = await import('@/lib/print/pack');
  jobSheets = await import('@/lib/services/job-sheets');

  // The real engine, pack and sleeve proof: only storage, queue, activity and the photos stay fake.
  const { engine: _engine, pack: _pack, sleeveProof: _sleeveProof, ...rest } = h.fakes.deps;
  void _engine;
  void _pack;
  void _sleeveProof;
  h.pipeline.overridePrintDeps({
    ...rest,
    // The real writers take seconds, not milliseconds.
    uploadWait: { timeoutMs: 120_000, intervalMs: 25 },
    imageSize: async (bytes) => {
      const meta = await sharp(bytes).metadata();
      return meta.width && meta.height ? { widthPx: meta.width, heightPx: meta.height } : null;
    },
    loadPackshot: async (_blank, _colour, position) => ({
      image: await sharp({ create: { width: 560, height: 700, channels: 3, background: '#8a8a8a' } }).png().toBuffer(),
      printBox: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 },
      position,
      widthCm: 28,
    }),
  });
});

after(async () => {
  await h.close();
});

const SMALL = { position: 'front_chest', widthMm: 60 };

async function png(shapes: Parameters<typeof drawArt>[2]): Promise<Buffer> {
  const art = drawArt(600, 720, shapes);
  return sharp(Buffer.from(art.data), { raw: { width: art.width, height: art.height, channels: 4 } }).png().toBuffer();
}

/** Three flat colours on a transparent ground, like the engine's own tests. */
const colourful = () =>
  png([
    { kind: 'circle', cx: 300, cy: 260, r: 190, colour: [237, 144, 220] },
    { kind: 'ring', cx: 300, cy: 260, r: 150, width: 22, colour: [84, 86, 172] },
    { kind: 'rect', x: 90, y: 520, w: 420, h: 110, colour: [62, 14, 97] },
    { kind: 'rect', x: 140, y: 555, w: 320, h: 40, colour: [250, 250, 250] },
  ]);

async function prepareFor(art: Buffer) {
  const { designId } = await h.newDesign();
  h.fakes.setArt(designId, art);
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), placements: [SMALL] });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  const result = await h.runJob(queued.value.jobId);
  return { designId, designVersionId: queued.value.designVersionId, jobId: queued.value.jobId, result };
}

const files = (row: PackRow) => row.files as PackFile[];
const checks = (row: PackRow) => row.checks as CheckResult[];
const byId = (list: CheckResult[]) => Object.fromEntries(list.map((c) => [c.id, c]));

test('a prepare job on the real engine and pack makes packs whose files open and whose checks pass', async () => {
  const { designId, designVersionId, jobId, result } = await prepareFor(await colourful());
  const [job] = await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.id, jobId));
  assert.equal(job.status, 'done', job.error ?? '');
  const packs = await h.packs(designVersionId);
  assert.equal(packs.length, 3, JSON.stringify(result));
  assert.ok(packs.every((p) => p.buildStatus === 'ready'));
  const screens = packs.filter((p) => p.technique === 'screen');
  const dtg = packs.find((p) => p.technique === 'dtg_dtf')!;
  assert.deepEqual(screens.map((p) => p.screenSetKey).sort(), ['darks', 'lights']);

  for (const row of screens) {
    // The PSD reads back with the films the pack row counts.
    const psdFile = files(row).find((f) => f.kind === 'screen_psd')!;
    const psd = h.fakes.storage.objects.get(psdFile.key)!.data;
    const parsed = await pack.readScreenPsd(psd);
    assert.equal(parsed.plates.length, row.screenCount, `${row.screenSetKey}: films in the PSD`);
    assert.equal(parsed.effectsOn, false);
    assert.equal(parsed.hasOriginal, true);
    assert.equal(files(row).filter((f) => f.kind === 'film_preview').length, row.screenCount);
    assert.ok(files(row).filter((f) => f.kind === 'proof').length >= 1);

    // No check failed; the ones a person has to look at are the ones the plan says.
    const failed = checks(row).filter((c) => c.state === 'failed');
    assert.deepEqual(failed, [], `${row.screenSetKey}: ${failed.map((c) => `${c.id}: ${c.detail}`).join(' | ')}`);
    const results = byId(checks(row));
    for (const id of ['size', 'plates', 'marks', 'screens']) assert.equal(results[id]?.state, 'passed', `${row.screenSetKey} ${id}: ${results[id]?.detail}`);
  }

  // DTG/DTF: a PNG per garment colour that decodes, the PSD, the zip beside them.
  const pngs = files(dtg).filter((f) => f.kind === 'dtg_png');
  assert.equal(pngs.length, 3);
  for (const file of pngs) {
    const meta = await sharp(h.fakes.storage.objects.get(file.key)!.data).metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.channels, 4);
  }
  assert.equal(checks(dtg).filter((c) => c.state === 'failed').length, 0, checks(dtg).map((c) => `${c.id}:${c.state}`).join(' '));
  const zip = h.pipeline.packInfo(dtg)?.pngZip;
  assert.ok(zip && h.fakes.storage.objects.has(zip.key));

  // The manifest.json the pack module wrote lists every file with the hash the row has.
  const manifestFile = files(dtg).find((f) => f.kind === 'manifest')!;
  const manifest = JSON.parse(h.fakes.storage.objects.get(manifestFile.key)!.data.toString('utf8')) as { files: { name: string; sha256: string }[]; inputHash: string };
  assert.equal(manifest.inputHash, dtg.inputHash);
  for (const listed of manifest.files) assert.equal(listed.sha256, files(dtg).find((f) => f.name === listed.name)?.sha256, listed.name);

  // The design's job sheet, drawn by the real renderer from these packs: a landscape PDF that opens, with the
  // proofs of both ways of printing on it as images.
  const sheet = (await jobSheets.getDesignJobSheet(h.owner, designId))!;
  assert.equal(sheet.bytes.subarray(0, 5).toString('latin1'), '%PDF-');
  const doc = await PDFDocument.load(sheet.bytes);
  assert.ok(doc.getPageCount() >= 1);
  assert.match(doc.getTitle() ?? '', /^Job sheet MF-.+ · v1$/);
  assert.equal(doc.getPage(0).getSize().width > doc.getPage(0).getSize().height, true, 'landscape');
  assert.equal(sheet.bytes.toString('latin1').match(/\/DCTDecode/g)?.length, 6, 'a thumbnail for each of the six proofs');

  // The artist sees proofs for each colour, both ways of printing, and can approve.
  const view = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId }))!;
  assert.equal(view.status, 'ready');
  assert.equal(view.canApprove, true, view.warnings.join(' | '));
  assert.equal(view.proofs.length, 6);
  assert.ok((await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId })).ok);

  // The files are intact as the real writers made them, so a job that comes back builds nothing.
  const stored = h.fakes.storage.keys(`print/${designId}/`).map((k) => [k, sha256(h.fakes.storage.objects.get(k)!.data)]);
  await h.pipeline.handlePrintJob({ ...job, status: 'running' });
  assert.equal((await h.packs(designVersionId)).length, 3);
  assert.deepEqual(h.fakes.storage.keys(`print/${designId}/`).map((k) => [k, sha256(h.fakes.storage.objects.get(k)!.data)]), stored, 'not one file was written again');
});

test('a Pantone code entered for a film is written onto the real films, in the layer name and on the strip, and pre-press can then sign the pack', async () => {
  await h.db.delete(schema.pantoneLibrary);
  const { designVersionId } = await prepareFor(await colourful());
  const darks = (await h.packs(designVersionId)).find((p) => p.screenSetKey === 'darks')!;
  const worker = await h.staff({ prepress: 'work' }, { name: 'Pat Presser' });
  const psdOf = async (row: PackRow) => h.fakes.storage.objects.get(files(row).find((f) => f.kind === 'screen_psd')!.key)!.data;
  const before = await pack.readScreenPsd(await psdOf(darks));
  const inkFilms = before.plates.filter((p) => !/underbase|highlight/i.test(p.name));
  assert.ok(inkFilms.length >= 1);
  assert.ok(before.plates.every((p) => !/PANTONE/.test(p.name)), 'no codes yet');

  // Codes for every colour ink, entered through the service, rewritten by the worker.
  const manifest = darks.manifest as { inks: { index: number; role: string }[] };
  let code = 237;
  for (const ink of manifest.inks.filter((i) => i.role === 'ink')) assert.ok((await h.pantone.assignPantone(worker, { packId: darks.id, plateIndex: ink.index, code: `${code++} C` })).ok);
  const [refresh] = (await h.db.select().from(schema.printJobs).where(eq(schema.printJobs.kind, 'reupload'))).filter((j) => (j.input as { reupload?: { packId: string } }).reupload?.packId === darks.id);
  const refreshed = await h.runJob(refresh.id);
  assert.deepEqual(refreshed.packIds, [darks.id], 'the same pack, rewritten in place');

  const row = (await h.packs(designVersionId)).find((p) => p.id === darks.id)!;
  const after = await pack.readScreenPsd(await psdOf(row));
  assert.equal(after.plates.length, before.plates.length);
  const named = after.plates.filter((p) => /PANTONE 23\d|PANTONE 24\d/.test(p.name));
  assert.equal(named.length, manifest.inks.filter((i) => i.role === 'ink').length, after.plates.map((p) => p.name).join(' | '));
  // The film art is the same: only names and label strips moved.
  for (const plate of after.plates) {
    const earlier = before.plates.find((p) => p.index === plate.index)!;
    assert.equal(plate.plate.width, earlier.plate.width);
    assert.equal(plate.plate.height, earlier.plate.height);
  }
  assert.equal(checks(row).filter((c) => c.state === 'failed').length, 0, checks(row).map((c) => `${c.id}:${c.state}:${c.detail}`).join(' | '));
  assert.equal(h.pipeline.filesNeedRefresh(row), false);

  // Now the pack can be signed. Signing writes none of the pack's files again: the sign-off is on the design's
  // job sheet, which reads it from the pack when it is opened, and is a different sheet once it is signed.
  const designId = (await h.db.select().from(schema.designVersions).where(eq(schema.designVersions.id, designVersionId)))[0].designId;
  const unsigned = (await jobSheets.getDesignJobSheet(worker, designId))!;
  assert.deepEqual(await h.prepress.approvePack(worker, darks.id), { ok: true, value: null });
  const signed = (await h.packs(designVersionId)).find((p) => p.id === darks.id)!;
  assert.equal(signed.auditStatus, 'approved');
  assert.deepEqual(files(signed).map((f) => f.sha256), files(row).map((f) => f.sha256), 'the pack’s files are as they were');
  const sheet = (await jobSheets.getDesignJobSheet(worker, designId))!;
  assert.equal(sheet.bytes.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.notEqual(sheet.contentHash, unsigned.contentHash, 'the design’s sheet changed when the pack was signed');
});

test('a set where nothing prints, made by the real engine, has no PSD and one failed check carrying the engine’s warning', async () => {
  // Art in the shirt's own black: nothing to print on Black or French Navy, but it prints on white.
  const { designId, designVersionId } = await prepareFor(await png([{ kind: 'circle', cx: 300, cy: 300, r: 220, colour: [27, 28, 30] }, { kind: 'rect', x: 120, y: 540, w: 360, h: 90, colour: [27, 28, 30] }]));
  const packs = await h.packs(designVersionId);
  const darks = packs.find((p) => p.screenSetKey === 'darks')!;
  const lights = packs.find((p) => p.screenSetKey === 'lights');

  assert.equal(darks.buildStatus, 'ready');
  assert.equal(darks.screenCount, 0);
  assert.deepEqual(files(darks).map((f) => f.kind).sort(), ['manifest'], 'no PSD, no film previews, no proofs');
  const result = checks(darks);
  assert.deepEqual(result.map((c) => [c.id, c.state]), [['plates', 'failed']]);
  assert.match(result[0].detail, /nothing prints on/i);
  assert.ok(h.pipeline.packInfo(darks)?.warnings.some((w) => w.severity === 'block'), 'the warning is the engine’s, and it blocks');
  if (lights) assert.ok(files(lights).some((f) => f.kind === 'screen_psd'), 'white still prints');

  // The artist cannot approve it, and is told why in the engine's words.
  const view = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId }))!;
  assert.equal(view.canApprove, false);
  assert.ok(view.warnings.some((w) => /nothing prints on/i.test(w)), view.warnings.join(' | '));
  // The design's job sheet is still a PDF, with the reason on it for the set that prints nothing.
  const sheet = (await jobSheets.getDesignJobSheet(h.owner, designId))!;
  assert.equal(sheet.bytes.subarray(0, 5).toString('latin1'), '%PDF-');
  const collected = (await jobSheets.collectJobSheet(designId))!;
  const empty = collected.source.screenSets.find((x) => x.setName === 'Darks')!;
  assert.deepEqual(empty.inks, []);
  assert.match(empty.note ?? '', /nothing prints on/i);
});

/** What a corrected file is: the pack's own PSD put in storage where the browser would, then the service asked. */
async function upload(actor: Awaited<ReturnType<Harness['staff']>>, row: PackRow, bytes: Buffer) {
  const key = `prepress-uploads/${row.id}/${randomUUID()}/MF-corrected.psd`;
  await h.fakes.storage.putObject({ key, data: bytes, contentType: 'application/octet-stream', visibility: 'private' });
  h.fakes.queue.worker = { kinds: new Set(['reupload']), delayMs: 5 };
  try {
    return await h.prepress.uploadCorrectedPsd(actor, row.id, key);
  } finally {
    h.fakes.queue.worker = null;
    await Promise.all(h.fakes.queue.pending);
  }
}

const on = (data: Uint8Array) => data.reduce((n, v) => n + (v > 127 ? 1 : 0), 0);

test('a corrected PSD is read by the real reader, matched to the films, compared with the pack, and rebuilt into a new one', async () => {
  // Films carry the names they were built with, so the file written here must be built the same way: no codes from the library.
  await h.db.delete(schema.pantoneLibrary);
  const art = await colourful();
  const { designId, designVersionId } = await prepareFor(art);
  assert.ok((await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: designVersionId })).ok);
  const worker = await h.staff({ prepress: 'work' });
  const darks = (await h.packs(designVersionId)).find((p) => p.screenSetKey === 'darks')!;
  const psdOf = (row: PackRow) => h.fakes.storage.objects.get(files(row).find((f) => f.kind === 'screen_psd')!.key)!.data;
  const info = h.pipeline.packInfo(darks)!;

  // The file as it went out, uploaded again: nothing differs, the artist is not asked, a new pack replaces the old one.
  const same = await upload(worker, darks, Buffer.from(psdOf(darks)));
  assert.ok(same.ok, same.ok ? '' : same.error);
  assert.deepEqual(same.ok && same.value.changes, ['No film changed.']);
  assert.equal(same.ok && same.value.needsReapproval, false);
  assert.equal(same.ok && same.value.checks.filter((c) => c.state === 'failed').length, 0, same.ok ? same.value.checks.map((c) => `${c.id}:${c.state}:${c.detail}`).join(' | ') : '');
  const first = (await h.packs(designVersionId)).find((p) => p.id === (same.ok ? same.value.newPackId : ''))!;
  assert.equal(first.correctedFromPackId, darks.id);
  assert.equal(first.screenCount, darks.screenCount);
  assert.equal(h.pipeline.packInfo((await h.packs(designVersionId)).find((p) => p.id === darks.id)!)?.supersededBy, first.id);

  // A film corrected in Photoshop: made heavier inside the print area, written with the real writer.
  const { decodeArt, separateScreen } = await import('@/lib/print/engine');
  const garments = await h.pipeline.loadGarments(info.blankCode, ['C002', 'C727', 'C001']);
  const separated = await separateScreen({ art: await decodeArt(art), placement: SMALL, garments, recipe: info.jobInput.recipe, inks: DEFAULT_INK_SYSTEM, label: info.label });
  const set = separated.sets.find((x) => x.key === 'darks')!;
  const film = set.plates.find((p) => p.role === 'ink')!;
  const before = on(film.plate.data);
  const { x, y } = set.canvas.art;
  for (let row = y + 40; row < y + 140; row++) for (let col = x + 40; col < x + 140; col++) film.plate.data[row * film.plate.width + col] = 255;
  assert.ok(on(film.plate.data) > before, 'the test changed the film');
  const original = { bytes: art, filename: 'art.png', mime: 'image/png', widthPx: 600, heightPx: 720 };
  const edited = await pack.writeScreenPsd({ set, garments: garments.filter((g) => set.garmentCodes.includes(g.code)), original, label: info.label, inks: DEFAULT_INK_SYSTEM });

  const fixed = await upload(worker, first, edited);
  assert.ok(fixed.ok, fixed.ok ? '' : fixed.error);
  const outcome = fixed.ok ? fixed.value : null!;
  assert.equal(outcome.changes.filter((c) => c.startsWith('Film ')).length, 1, outcome.changes.join(' | '));
  assert.match(outcome.changes[0], new RegExp(`^Film ${film.index} \\(.+\\) changed: \\d+\\.\\d% of the print area is different, and its coverage went from \\d+\\.\\d% to \\d+\\.\\d%\\.$`));
  assert.equal(outcome.checks.filter((c) => c.state === 'failed').length, 0, outcome.checks.map((c) => `${c.id}:${c.state}:${c.detail}`).join(' | '));
  const proof = outcome.checks.find((c) => c.id === 'proof');
  assert.ok(proof, 'the proof is compared with the one the artist saw');
  assert.equal(outcome.needsReapproval, proof.state !== 'passed', 'the artist is asked again exactly when the proof check says it changed');

  // The new pack holds the corrected film, and records the pack it corrects.
  const rebuilt = (await h.packs(designVersionId)).find((p) => p.id === outcome.newPackId)!;
  const parsed = await pack.readScreenPsd(psdOf(rebuilt));
  assert.equal(on(parsed.plates.find((p) => p.index === film.index)!.plate.data), on(film.plate.data), 'the corrected film, pixel for pixel');
  assert.equal(parsed.effectsOn, false);
  assert.equal(h.pipeline.packInfo(rebuilt)?.correction?.fromPackId, first.id);
  const sheet = (await jobSheets.getDesignJobSheet(h.owner, designId))!;
  assert.equal(sheet.bytes.subarray(0, 5).toString('latin1'), '%PDF-');

  // The pack that was corrected is replaced: a file sent to it again is turned away before any work, and nothing is written.
  const stored = h.fakes.storage.keys(`print/${designId}/`).length;
  const again = await upload(worker, first, edited);
  assert.deepEqual(again, { ok: false, error: 'A newer pack replaced this one. Upload the corrected file to the newer one.' });
  assert.equal(h.fakes.storage.keys(`print/${designId}/`).length, stored, 'nothing was written');
});

test('a sleeve print: the real engine draws it flat, the real renderer lays it true size on a sleeve outline, and no photo is asked for', async () => {
  const { designId } = await h.newDesign();
  h.fakes.setArt(designId, await colourful());
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), garmentCodes: ['C002', 'C001'], placements: [{ position: 'sleeve_left', widthMm: 80 }] });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  await h.runJob(queued.value.jobId);

  const packs = (await h.packs(queued.value.designVersionId)).filter((p) => p.buildStatus === 'ready');
  const dtg = packs.find((p) => p.technique === 'dtg_dtf');
  assert.ok(dtg, 'a DTG/DTF pack for the sleeve');
  assert.ok(!checks(dtg).some((c) => c.id === 'garment_photos'), 'no garment photo is asked for a sleeve');
  const proofs = files(dtg).filter((f) => f.kind === 'proof');
  const sleeveCheck = byId(checks(dtg)).sleeve_proof;
  if (sleeveCheck) {
    // A machine without a font for the labels: said so on the pack, never silently.
    assert.match(sleeveCheck.detail, /No sleeve proof on/);
    return;
  }
  assert.deepEqual(proofs.map((f) => f.name).sort(), ['proof-dtg-C001.png', 'proof-dtg-C002.png']);
  for (const proof of proofs) {
    const meta = await sharp(h.fakes.storage.objects.get(proof.key)!.data).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ['png', 800, 1000], 'a 4:5 proof beside the 4:5 mockups');
  }
  // the screen sets draw theirs too
  for (const screen of packs.filter((p) => p.technique === 'screen' && files(p).some((f) => f.kind === 'screen_psd'))) {
    assert.ok(files(screen).some((f) => f.kind === 'proof' && f.name.endsWith('.png')), screen.screenSetKey ?? '');
  }
  const view = (await h.printPrep.getApprovalView({ storeId: h.artist.storeId, designId }))!;
  assert.deepEqual(view.areas?.map((a) => [a.label, a.sleeve]), [['Left sleeve', true]]);
  assert.ok(view.proofs.some((p) => p.flat && p.technique === 'dtg_dtf'));
});
