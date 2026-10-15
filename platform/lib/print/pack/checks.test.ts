// The automatic checks (Plan 6.4): a clean synthetic pack passes, and every
// seeded fault is caught by the check that owns it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { writePsdUint8Array, type Layer } from 'ag-psd';
import type { CheckResult, ChecksInput, DtgLayer, GarmentColour, PackFile, ScreenSet } from '@/lib/print/types';
import { ensureAgPsd } from './ag-psd-setup';
import { hexToRgb } from './colour';
import { buildPackManifest, describePackFile, runChecks, screenSetPrints, writeDtgPng, writeDtgPsd, writeScreenPsd } from './index';
import { plateLayerName } from './names';
import { encodePng } from './png';
import { SRGB_PROFILE_NAME, srgbIccProfile } from './srgb-icc';
import { BLACK, WHITE, clearTarget, drawTargetAt, mmToPx, syntheticDtgLayers, syntheticOriginal, syntheticScreenSet, type SyntheticSet } from './synthetic';

const label = { designCode: 'UNDERWRITER', version: 3, placementLabel: 'Front' };

function stateOf(checks: CheckResult[], id: string): CheckResult {
  const c = checks.find((x) => x.id === id);
  assert.ok(c, `check ${id} ran`);
  return c;
}

/** A proof: the films in colour on the garment, scaled down, as WebP. */
async function screenProof(set: ScreenSet, garment: GarmentColour): Promise<Buffer> {
  const { widthPx: W, heightPx: H } = set.canvas;
  const rgb = Buffer.alloc(W * H * 3);
  const g = hexToRgb(garment.hex);
  for (let i = 0; i < W * H; i++) rgb.set(g, i * 3);
  for (const p of [...set.plates].sort((a, b) => a.index - b.index)) {
    const c = hexToRgb(p.target.hex);
    for (let i = 0; i < W * H; i++) if (p.plate.data[i]) rgb.set(c, i * 3);
  }
  return sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).resize({ width: 400 }).webp({ quality: 90 }).toBuffer();
}

async function dtgProof(layer: DtgLayer, garment: GarmentColour): Promise<Buffer> {
  const { width: W, height: H } = layer.printAreaPx;
  const rgb = Buffer.alloc(W * H * 3);
  const g = hexToRgb(garment.hex);
  for (let i = 0; i < W * H; i++) rgb.set(g, i * 3);
  const r = layer.raster;
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      const p = (y * r.width + x) * 4;
      if (r.data[p + 3] >= 128) rgb.set([r.data[p], r.data[p + 1], r.data[p + 2]], ((y + layer.offsetPx.y) * W + x + layer.offsetPx.x) * 3);
    }
  }
  return sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).resize({ width: 300 }).webp({ quality: 90 }).toBuffer();
}

interface ScreenPackOptions {
  /** what goes into the PSD instead of the engine's set */
  writtenSet?: ScreenSet;
  psdBytes?: Buffer;
  approvedProof?: Buffer;
  tamper?: boolean;
  placementWidthMm?: number;
}

async function screenPack(s: SyntheticSet, o: ScreenPackOptions = {}): Promise<{ input: ChecksInput; proof: Buffer }> {
  const original = await syntheticOriginal(200, 240);
  const written = o.writtenSet ?? s.set;
  const psd = o.psdBytes ?? (await writeScreenPsd({ set: written, garments: s.garments, original, label, inks: s.inks }));
  const proof = await screenProof(written, s.garments[0]);
  const files: { file: PackFile; bytes: Buffer }[] = [
    { file: describePackFile({ kind: 'screen_psd', name: 'MF-UNDERWRITER-v3-FRONT-DARKS.psd', key: 'k/psd', bytes: psd }), bytes: psd },
    { file: describePackFile({ kind: 'proof', name: 'proof-black.webp', key: 'k/proof', bytes: proof, garmentCode: s.garments[0].code }), bytes: proof },
  ];
  if (o.tamper) files[0].bytes = Buffer.concat([psd.subarray(0, psd.length - 1), Buffer.from([psd[psd.length - 1] ^ 0xff])]);
  const manifest = buildPackManifest({
    designId: 'design-1',
    designVersionId: 'version-3',
    versionNumber: 3,
    placement: { ...s.placement, widthMm: o.placementWidthMm ?? s.placement.widthMm },
    technique: 'screen',
    screenSetKey: s.set.key,
    garmentCodes: s.set.garmentCodes,
    method: 'spot',
    files: files.map((f) => f.file),
    inputHash: 'input-hash',
    createdAt: '2026-10-15T10:00:00.000Z',
    label,
    set: s.set,
    garments: s.garments,
    inkSystem: s.inks,
    recipe: s.recipe,
  });
  return {
    proof,
    input: { technique: 'screen', manifest, files, recipe: s.recipe, inks: s.inks, garments: s.garments, expected: { set: s.set }, approvedProof: o.approvedProof },
  };
}

function withPlates(set: ScreenSet, change: (index: number, data: Uint8Array) => void): ScreenSet {
  return {
    ...set,
    plates: set.plates.map((p) => {
      const data = new Uint8Array(p.plate.data);
      change(p.index, data);
      return { ...p, plate: { ...p.plate, data } };
    }),
  };
}

test('a clean screen pack passes every check (inks not measured is for review)', async () => {
  const s = syntheticScreenSet({ plates: 5 });
  const { input } = await screenPack(s);
  const checks = await runChecks(input);
  assert.deepEqual(
    checks.map((c) => c.id),
    ['size', 'structure', 'plates', 'marks', 'screens', 'features', 'inks_measured', 'proof'],
  );
  for (const c of checks) {
    if (c.id === 'inks_measured') {
      assert.equal(c.state, 'review');
      assert.equal(c.title, 'Inks not measured');
    } else assert.equal(c.state, 'passed', `${c.id}: ${c.detail}`);
  }
  assert.match(stateOf(checks, 'size').detail, /^2,127 × 2,316 px at 600 ppi: a 4 × 4\.8 cm print plus a 25 mm margin\.$/);
  assert.equal(stateOf(checks, 'screens').detail, '5 of 8, so no surcharge.');
  assert.match(stateOf(checks, 'marks').detail, /^Identical registration marks on every film, \d+(\.\d)? mm or more clear of the art\.$/);
});

test('a solid film fails the films check', async () => {
  const s = syntheticScreenSet({ plates: 4 });
  const solid = withPlates(s.set, (i, d) => {
    if (i === 2) d.fill(255);
  });
  const { input } = await screenPack({ ...s, set: solid });
  const plates = stateOf(await runChecks(input), 'plates');
  assert.equal(plates.state, 'failed');
  assert.match(plates.detail, /film 2 is solid black, margins included/i);
});

test('an empty film fails, and a film that differs from the engine render fails', async () => {
  const s = syntheticScreenSet({ plates: 4 });
  const empty = withPlates(s.set, (i, d) => {
    if (i === 3) {
      const { widthPx: W, art } = s.set.canvas;
      for (let y = art.y; y < art.y + art.height; y++) d.fill(0, y * W + art.x, y * W + art.x + art.width);
    }
  });
  const { input } = await screenPack(s, { writtenSet: empty });
  const plates = stateOf(await runChecks(input), 'plates');
  assert.equal(plates.state, 'failed');
  assert.match(plates.detail, /film 3 is empty/i);
  assert.match(plates.detail, /film 3 differs from the engine's render in [\d,]+ pixels/);
});

test('a mark shifted on one film fails the marks check, with the shift in mm', async () => {
  const s = syntheticScreenSet({ plates: 4 });
  const shift = mmToPx(1, s.set.canvas.ppi);
  const shifted = withPlates(s.set, (i, d) => {
    if (i !== 3) return;
    clearTarget(d, s.set.canvas, 15, 'left');
    drawTargetAt(d, s.set.canvas, 15, 'left', shift, 0);
  });
  const { input } = await screenPack({ ...s, set: shifted });
  const marks = stateOf(await runChecks(input), 'marks');
  assert.equal(marks.state, 'failed');
  assert.match(marks.detail, /the left mark on film 3 sits 1(\.0\d)? mm off film 1's/i);
});

test('a hairline is flagged for review by the fine lines check', async () => {
  const s = syntheticScreenSet({ plates: 4 });
  const { widthPx: W, art, ppi } = s.set.canvas;
  const hair = withPlates(s.set, (i, d) => {
    if (i !== 2) return;
    const y0 = art.y + Math.round(art.height * 0.95);
    const x0 = art.x + mmToPx(5, ppi);
    for (let y = y0; y < y0 + 3; y++) d.fill(255, y * W + x0, y * W + x0 + mmToPx(8, ppi));
  });
  const { input } = await screenPack({ ...s, set: hair });
  const features = stateOf(await runChecks(input), 'features');
  assert.equal(features.state, 'review');
  assert.match(features.detail, /film 2 has lines under 0\.3 mm in 1 place/i);
});

test('more than 8 screens is flagged for the surcharge, more than 15 fails', async () => {
  const nine = syntheticScreenSet({ plates: 10, widthMm: 20, heightMm: 24 });
  const screens = stateOf(await runChecks((await screenPack(nine)).input), 'screens');
  assert.equal(screens.state, 'review');
  assert.match(screens.detail, /10 screens, 2 above 8: €2 per piece/);
  assert.match(screens.detail, /more screens than the press's 8 heads/);

  const fifteen = syntheticScreenSet({ plates: 15, widthMm: 20, heightMm: 24 });
  const extra = { ...fifteen.set.plates[1], index: 16 };
  const sixteen = { ...fifteen, set: { ...fifteen.set, plates: [...fifteen.set.plates, extra] } };
  const over = stateOf(await runChecks((await screenPack(sixteen)).input), 'screens');
  assert.equal(over.state, 'failed');
  assert.match(over.detail, /16 screens; the most we print is 15/);
});

test('a colour overlay left on, a missing ORIGINAL and a visible garment fail the structure check', async () => {
  const s = syntheticScreenSet({ plates: 3, widthMm: 20, heightMm: 24 });
  const { widthPx: W, heightPx: H } = s.set.canvas;
  ensureAgPsd();
  const film = (index: number, overlayOn: boolean): Layer => {
    const p = s.set.plates[index - 1];
    const px = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) px[i * 4 + 3] = p.plate.data[i];
    const [r, g, b] = hexToRgb(p.target.hex);
    return { name: plateLayerName(p, 3), imageData: { width: W, height: H, data: px }, effects: { solidFill: [{ enabled: overlayOn, color: { r, g, b }, opacity: 1, blendMode: 'normal' }] } };
  };
  const garment: Layer = { name: 'GARMENT · Black', hidden: false, imageData: { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) } };
  const bytes = Buffer.from(
    writePsdUint8Array(
      {
        width: W,
        height: H,
        children: [garment, film(1, false), film(2, true), film(3, false)],
        imageResources: { resolutionInfo: { horizontalResolution: 600, horizontalResolutionUnit: 'PPI', widthUnit: 'Inches', verticalResolution: 600, verticalResolutionUnit: 'PPI', heightUnit: 'Inches' } },
      },
      { generateThumbnail: false },
    ),
  );
  const { input } = await screenPack(s, { psdBytes: bytes });
  const checks = await runChecks(input);
  const structure = stateOf(checks, 'structure');
  assert.equal(structure.state, 'failed');
  assert.match(structure.detail, /the colour overlay on film 2 is switched on/i);
  assert.match(structure.detail, /no "ORIGINAL \(do not print\)" layer/);
  assert.match(structure.detail, /"GARMENT · Black" is visible/);
  assert.equal(stateOf(checks, 'plates').state, 'passed', 'the films themselves are still right');
});

test('a PSD that changed after the manifest, or a print area of the wrong width, fails the size check', async () => {
  const s = syntheticScreenSet({ plates: 3, widthMm: 20, heightMm: 24 });
  const tampered = stateOf(await runChecks((await screenPack(s, { tamper: true })).input), 'size');
  assert.equal(tampered.state, 'failed');
  assert.match(tampered.detail, /differs from the manifest \(hash\)/);
  const wide = stateOf(await runChecks((await screenPack(s, { placementWidthMm: 30 })).input), 'size');
  assert.equal(wide.state, 'failed');
  assert.match(wide.detail, /the print area is 20 mm wide, the placement says 30 mm/);
});

test('the proof check compares with the approved proof: same passes, an ink change fails', async () => {
  const s = syntheticScreenSet({ plates: 4, widthMm: 20, heightMm: 24 });
  const first = await screenPack(s);
  const same = stateOf(await runChecks({ ...first.input, approvedProof: first.proof }), 'proof');
  assert.equal(same.state, 'passed');
  assert.match(same.detail, /^Matches the proof the artist approved/);

  // The artist approved pink; the corrected pack prints film 2 in green.
  const green = { ...s.set, plates: s.set.plates.map((p) => (p.index === 2 ? { ...p, target: { ...p.target, hex: '#2F9E6E' } } : p)) };
  const approved = await screenProof(s.set, s.garments[0]);
  const changed = await screenPack({ ...s, set: green }, { approvedProof: approved });
  const proof = stateOf(await runChecks(changed.input), 'proof');
  assert.equal(proof.state, 'failed');
  assert.match(proof.detail, /the artist must approve again/);
});

// ---------------------------------------------------------------------------
// DTG/DTF
// ---------------------------------------------------------------------------

const AREA = { width: 472, height: 566 };

async function dtgPack(layers: DtgLayer[], garments: GarmentColour[], o: { pngs?: Buffer[] } = {}): Promise<ChecksInput> {
  const original = await syntheticOriginal(200, 240);
  const psd = await writeDtgPsd({ layers, garments, original, label });
  const pngs = o.pngs ?? (await Promise.all(layers.map((l) => writeDtgPng(l))));
  const files: { file: PackFile; bytes: Buffer }[] = [{ file: describePackFile({ kind: 'dtg_psd', name: 'dtg.psd', key: 'k/dtg', bytes: psd }), bytes: psd }];
  for (let i = 0; i < layers.length; i++) {
    const g = garments.find((x) => x.code === layers[i].garmentCode)!;
    files.push({ file: describePackFile({ kind: 'dtg_png', name: `dtg-${g.name}.png`, key: `k/${g.code}`, bytes: pngs[i], garmentCode: g.code }), bytes: pngs[i] });
    const proof = await dtgProof(layers[i], g);
    files.push({ file: describePackFile({ kind: 'proof', name: `proof-${g.code}.webp`, key: `k/p/${g.code}`, bytes: proof, garmentCode: g.code }), bytes: proof });
  }
  const s = syntheticScreenSet({ plates: 2, widthMm: 20, heightMm: 24 });
  const manifest = buildPackManifest({
    designId: 'design-1',
    designVersionId: 'version-3',
    versionNumber: 3,
    placement: { position: 'front', widthMm: 40 },
    technique: 'dtg_dtf',
    screenSetKey: null,
    garmentCodes: layers.map((l) => l.garmentCode),
    method: 'dtg',
    files: files.map((f) => f.file),
    inputHash: 'input-hash',
    createdAt: '2026-10-15T10:00:00.000Z',
    label,
    dtgLayers: layers,
    garments,
  });
  return { technique: 'dtg_dtf', manifest, files, recipe: s.recipe, inks: s.inks, garments, expected: { dtgLayers: layers } };
}

test('a clean DTG/DTF pack passes every check', async () => {
  const garments = [BLACK, WHITE];
  const checks = await runChecks(await dtgPack(syntheticDtgLayers(garments, AREA, 300), garments));
  assert.deepEqual(
    checks.map((c) => c.id),
    ['size', 'structure', 'dtg_alpha', 'whites', 'proof'],
  );
  for (const c of checks) assert.equal(c.state, 'passed', `${c.id}: ${c.detail}`);
  assert.match(stateOf(checks, 'whites').detail, /No RGB 255 white left on White/);
});

test('semi-transparent pixels in a DTG PNG fail the transparency check', async () => {
  const garments = [BLACK];
  const layers = syntheticDtgLayers(garments, AREA, 300);
  const soft = { ...layers[0], raster: { ...layers[0].raster, data: new Uint8Array(layers[0].raster.data) } };
  for (let i = 0; i < 500; i++) soft.raster.data[i * 4 * 37 + 3] = 128;
  const alpha = stateOf(await runChecks(await dtgPack([soft], garments)), 'dtg_alpha');
  assert.equal(alpha.state, 'failed');
  assert.match(alpha.detail, /semi-transparent pixels, which print a halo/);
});

test('RGB 255 left on a white garment fails the whites check', async () => {
  const garments = [WHITE];
  const [layer] = syntheticDtgLayers(garments, AREA, 300);
  const leaked = { ...layer, raster: { ...layer.raster, data: new Uint8Array(layer.raster.data) } };
  const d = leaked.raster.data;
  for (let i = 0; i < 2000; i++) d.set([255, 255, 255, 255], (i + 5000) * 4);
  const whites = stateOf(await runChecks(await dtgPack([leaked], garments)), 'whites');
  assert.equal(whites.state, 'failed');
  assert.match(whites.detail, /2,000 pure white pixels on White would print white ink/);
});

test('garment-coloured pixels left in a knocked-out area fail the transparency check', async () => {
  const garments = [BLACK];
  const [layer] = syntheticDtgLayers(garments, AREA, 300);
  const left = { ...layer, raster: { ...layer.raster, data: new Uint8Array(layer.raster.data) } };
  const [r, g, b] = hexToRgb(BLACK.hex);
  for (let i = 0; i < 6000; i++) left.raster.data.set([r + 1, g, b, 255], i * 4);
  const alpha = stateOf(await runChecks(await dtgPack([left], garments)), 'dtg_alpha');
  assert.equal(alpha.state, 'failed');
  assert.match(alpha.detail, /of the Black print is the garment's own colour/);
});

test('a DTG PNG without 300 ppi or without its profile fails the size check', async () => {
  const garments = [BLACK];
  const layers = syntheticDtgLayers(garments, AREA, 300);
  const r = layers[0].raster;
  const at72 = await encodePng({ width: r.width, height: r.height, channels: 4, data: r.data, ppi: 72, icc: { name: SRGB_PROFILE_NAME, profile: srgbIccProfile() } });
  const size = stateOf(await runChecks(await dtgPack(layers, garments, { pngs: [at72] })), 'size');
  assert.equal(size.state, 'failed');
  assert.match(size.detail, /says 72 ppi, it should say 300/);

  const noProfile = await encodePng({ width: r.width, height: r.height, channels: 4, data: r.data, ppi: 300 });
  const size2 = stateOf(await runChecks(await dtgPack(layers, garments, { pngs: [noProfile] })), 'size');
  assert.equal(size2.state, 'failed');
  assert.match(size2.detail, /has no sRGB profile/);
});

test('a set where nothing prints gets no PSD and one failed check carrying the engine warning', async () => {
  const s = syntheticScreenSet({ plates: 2, widthMm: 20, heightMm: 24 });
  const warning = 'Screen print: nothing prints on Black, French Navy. The art is the same colour as the shirt.';
  const empty: ScreenSet = { ...s.set, plates: [], warnings: [{ code: 'empty_print', severity: 'block', message: warning }] };
  assert.equal(screenSetPrints(empty), false);
  assert.equal(screenSetPrints(s.set), true);
  const original = await syntheticOriginal(100, 120);
  const psd = await writeScreenPsd({ set: empty, garments: s.garments, original, label, inks: s.inks });
  assert.equal(psd.length, 0, 'no PSD, and no error');

  const manifest = buildPackManifest({
    designId: 'design-1',
    designVersionId: 'version-3',
    versionNumber: 3,
    placement: s.placement,
    technique: 'screen',
    screenSetKey: empty.key,
    garmentCodes: empty.garmentCodes,
    method: 'spot',
    files: [],
    inputHash: 'input-hash',
    createdAt: '2026-10-15T10:00:00.000Z',
    label,
    set: empty,
    garments: s.garments,
    inkSystem: s.inks,
  });
  assert.equal(manifest.screenCount, 0);
  assert.deepEqual(manifest.inks, []);
  const checks = await runChecks({ technique: 'screen', manifest, files: [], recipe: s.recipe, inks: s.inks, garments: s.garments, expected: { set: empty } });
  assert.deepEqual(
    checks.map((c) => [c.id, c.state]),
    [['plates', 'failed']],
  );
  assert.equal(checks[0].detail, warning);
});

test('a garment where nothing prints DTG gets a transparent PNG and a failed transparency check, not a crash', async () => {
  const garments = [BLACK, WHITE];
  const layers = syntheticDtgLayers(garments, AREA, 300);
  layers[0] = { ...layers[0], raster: { ...layers[0].raster, width: 0, height: 0, data: new Uint8Array(0) }, fadeShare: 0 };
  const checks = await runChecks(await dtgPack(layers, garments));
  for (const c of checks) assert.doesNotMatch(c.detail, /could not run/, `${c.id} ran`);
  const alpha = stateOf(checks, 'dtg_alpha');
  assert.equal(alpha.state, 'failed');
  assert.match(alpha.detail, /nothing prints on Black/i);
  assert.equal(stateOf(checks, 'size').state, 'passed');
  assert.equal(stateOf(checks, 'whites').state, 'passed');
});
