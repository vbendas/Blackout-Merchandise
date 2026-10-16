// Colour maths, names, the manifest and the proof comparison.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type { Lab } from '@/lib/print/types';
import { deltaE2000, hexToLab, isWhiteGarment } from './colour';
import { canonicalJson, sha256Hex } from './hash';
import { buildPackManifest, describePackFile, manifestJson, suggestMesh } from './manifest';
import {
  displayPantone,
  dtgPngFileName,
  guidFromHex,
  parsePlateLayerName,
  plateIdentity,
  plateLayerName,
  screenPsdFileName,
  screenRulingText,
} from './names';
import { indexScreenText } from '@/lib/print/engine/index-method';
import { compareProofs } from './proof-compare';
import { BLACK, NAVY, WHITE, syntheticDtgLayers, syntheticScreenSet } from './synthetic';

test('CIEDE2000 matches the published reference pairs (Sharma, Wu and Dalal 2005)', () => {
  const pairs: [Lab, Lab, number][] = [
    [{ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 }, 2.0425],
    [{ L: 50, a: 3.1571, b: -77.2803 }, { L: 50, a: 0, b: -82.7485 }, 2.8615],
    [{ L: 50, a: 2.5, b: 0 }, { L: 50, a: 0, b: -2.5 }, 4.3065],
    [{ L: 50, a: 2.5, b: 0 }, { L: 73, a: 25, b: -18 }, 27.1492],
    [{ L: 60.2574, a: -34.0099, b: 36.2677 }, { L: 60.4626, a: -34.1751, b: 39.4387 }, 1.2644],
    [{ L: 22.7233, a: 20.0904, b: -46.694 }, { L: 23.0331, a: 14.973, b: -42.5619 }, 2.0373],
    [{ L: 2.0776, a: 0.0795, b: -1.135 }, { L: 0.9033, a: -0.0636, b: -0.5514 }, 0.9082],
  ];
  for (const [a, b, want] of pairs) assert.ok(Math.abs(deltaE2000(a, b) - want) < 1e-4, `${deltaE2000(a, b)} vs ${want}`);
  const white = hexToLab('#FFFFFF');
  assert.ok(Math.abs(white.L - 100) < 0.01 && Math.abs(white.a) < 0.01 && Math.abs(white.b) < 0.01, 'sRGB white is D50 white');
  assert.ok(isWhiteGarment(WHITE.hex));
  assert.ok(!isWhiteGarment(BLACK.hex));
});

test('film layer names read back, Pantone codes normalise and ids are stable GUIDs', () => {
  const s = syntheticScreenSet({ plates: 6, widthMm: 10, heightMm: 12 });
  const names = s.set.plates.map((p) => plateLayerName(p, 6));
  assert.equal(names[0], '1/6  Underbase · Aquaflex V2 White · flash · 55 lpi 22.5°');
  assert.equal(names[1], '2/6  PANTONE 237 C · HB Opaque · 55 lpi 22.5°');
  assert.equal(names[5], '6/6  Highlight white · Aquaflex V2 White · 55 lpi 22.5°');
  const parsed = parsePlateLayerName(names[1])!;
  assert.deepEqual(
    { index: parsed.index, total: parsed.total, role: parsed.role, pantone: parsed.pantone, base: parsed.base, lpi: parsed.lpi, angle: parsed.angleDeg, flash: parsed.flash },
    { index: 2, total: 6, role: 'ink', pantone: 'PANTONE 237 C', base: 'HB Opaque', lpi: 55, angle: 22.5, flash: false },
  );
  const under = parsePlateLayerName(names[0])!;
  assert.equal(under.role, 'underbase');
  assert.equal(under.flash, true);
  assert.equal(plateIdentity(parsePlateLayerName('3/6 pantone 237 c · HB Opaque')!), 'pantone 237 c');
  assert.equal(parsePlateLayerName('Layer 7'), null);
  const noCode = { ...s.set.plates[2], pantone: null };
  assert.equal(plateLayerName(noCode, 6), '3/6  Ink #C363DA · HB Opaque · 55 lpi 22.5°');
  assert.equal(displayPantone(' pantone  2582 c '), 'PANTONE 2582 C');
  const stem = { designCode: 'Underwriter', version: 3, position: 'front' };
  assert.equal(screenPsdFileName(stem, 'darks'), 'MF-UNDERWRITER-v3-FRONT-DARKS.psd');
  assert.equal(dtgPngFileName(stem, 'French Navy'), 'MF-UNDERWRITER-v3-FRONT-DTG-FRENCH-NAVY.png');
  const guid = guidFromHex(sha256Hex('art'));
  assert.match(guid, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(guid, guidFromHex(sha256Hex('art')));
});

test('an index film is named by its square-cell grid, as its label strip is, and reads back', () => {
  const s = syntheticScreenSet({ plates: 6, widthMm: 10, heightMm: 12 });
  // index plates carry their grid in the halftone: cells per inch, 0°
  const plate = { ...s.set.plates[1], halftone: { ...s.set.plates[1].halftone, lpi: 200, angleDeg: 0 } };
  const name = plateLayerName(plate, 6, 'index');
  assert.equal(name, '2/6  PANTONE 237 C · HB Opaque · Index 200 ppi');
  assert.ok(name.endsWith(indexScreenText(200)), 'the layer and the film strip say the same');
  assert.equal(screenRulingText(600 / 7, 0, 'index'), indexScreenText(600 / 7), 'a grid that is not whole: the same two decimals');
  const parsed = parsePlateLayerName(name)!;
  assert.deepEqual([parsed.role, parsed.pantone, parsed.base, parsed.lpi, parsed.angleDeg], ['ink', 'PANTONE 237 C', 'HB Opaque', 200, 0]);
  // spot and simulated process keep the ruling
  assert.equal(plateLayerName(plate, 6, 'sim_process'), '2/6  PANTONE 237 C · HB Opaque · 200 lpi 0°');
});

test('the manifest hashes every input, records sizes, screens and DTG crops, and serialises stably', () => {
  const s = syntheticScreenSet({ plates: 10, widthMm: 20, heightMm: 24 });
  const file = describePackFile({ kind: 'screen_psd', name: 'a.psd', key: 'k/a.psd', bytes: Buffer.from('psd bytes') });
  assert.equal(file.sha256, sha256Hex(Buffer.from('psd bytes')));
  assert.equal(file.bytes, 9);
  assert.equal(file.visibility, 'private');
  assert.equal(file.contentType, 'image/vnd.adobe.photoshop');
  assert.equal(describePackFile({ kind: 'proof', name: 'p.webp', key: 'k/p', bytes: Buffer.from('x') }).visibility, 'public');

  const base = {
    designId: 'd',
    designVersionId: 'v',
    versionNumber: 3,
    placement: s.placement,
    technique: 'screen' as const,
    screenSetKey: 'darks',
    garmentCodes: [BLACK.code, NAVY.code],
    method: 'spot' as const,
    files: [file],
    inputHash: 'h',
    createdAt: '2026-10-15T10:00:00.000Z',
    label: s.label,
    artSha256: sha256Hex('art'),
    recipe: s.recipe,
    garments: [BLACK, NAVY, WHITE],
    inkSystem: s.inks,
    inkSystemVersion: 'ink-1',
    set: s.set,
  };
  const m = buildPackManifest(base);
  assert.equal(m.schema, 1);
  assert.equal(m.screenCount, 10);
  assert.equal(m.inks.length, 10);
  assert.equal(m.inks[1].pantone, '237 C');
  assert.equal(m.inks[1].mesh, 230);
  assert.equal(m.designCode, 'UNDERWRITER');
  assert.equal(m.inputs.artSha256, sha256Hex('art'));
  assert.equal(m.inputs.recipeSha256, sha256Hex(canonicalJson(s.recipe)));
  assert.equal(m.inputs.garmentsSha256, sha256Hex(canonicalJson([BLACK, NAVY])), 'only the garments in the pack');
  assert.equal(m.inputs.inkSystemVersion, 'ink-1');
  assert.deepEqual(m.screenSet && { screens: m.screenSet.screens, extra: m.screenSet.extraScreens, over: m.screenSet.overPressHeads }, { screens: 10, extra: 2, over: true });
  assert.equal(m.print?.ppi, 600);
  assert.equal(m.print?.marginMm, 25);
  // Same inputs, same manifest bytes; any input change, a different hash.
  assert.ok(manifestJson(m).equals(manifestJson(buildPackManifest(base))));
  const other = buildPackManifest({ ...base, recipe: { ...s.recipe, trapMm: 0.3 } });
  assert.notEqual(other.inputs.recipeSha256, m.inputs.recipeSha256);
  assert.match(manifestJson(m).toString('utf8'), /^\{\n {2}"createdAt": /);

  const layers = syntheticDtgLayers([BLACK], { width: 472, height: 566 }, 300);
  const dtg = buildPackManifest({ ...base, technique: 'dtg_dtf', method: 'dtg', screenSetKey: null, garmentCodes: [BLACK.code], set: undefined, dtgLayers: layers });
  assert.equal(dtg.screenCount, null);
  assert.deepEqual(dtg.inks, []);
  assert.deepEqual(dtg.dtg?.[0].offsetPx, layers[0].offsetPx);
  assert.equal(dtg.dtg?.[0].offsetMm.x, Math.round(((layers[0].offsetPx.x * 25.4) / 300) * 100) / 100);
  assert.equal(dtg.print?.ppi, 300);

  // A mesh outside the ink system's range falls back to the profile's default for the role.
  assert.equal(suggestMesh({ role: 'underbase', meshSuggestion: 0 }, s.inks), 200);
  assert.equal(suggestMesh({ role: 'ink', meshSuggestion: 999 }, s.inks), 230);
});

async function proofWith(colour: string, speck = false): Promise<Buffer> {
  const svg = `<svg width="400" height="480"><rect width="400" height="480" fill="#1B1C1E"/><circle cx="200" cy="180" r="110" fill="${colour}"/><rect x="80" y="330" width="240" height="60" fill="#5456AC"/>${speck ? '<rect x="40" y="40" width="2" height="2" fill="#ffffff"/>' : ''}</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
}

test('proof comparison: the same proof, a speck fixed, an ink swapped for one of the same lightness', async () => {
  const approved = await proofWith('#ED90DC');
  const same = await compareProofs(approved, await proofWith('#ED90DC'));
  assert.equal(same.verdict, 'same');
  assert.ok(same.ssim > 0.99);
  const speck = await compareProofs(approved, await proofWith('#ED90DC', true));
  assert.equal(speck.verdict, 'same', 'a speck fix needs no new approval');
  // A green of about the same lightness: SSIM on lightness alone would miss it.
  const swapped = await compareProofs(approved, await proofWith('#5FC3A0'));
  assert.equal(swapped.verdict, 'different');
  assert.ok(swapped.changedShare > 0.1);
  const reframed = await compareProofs(approved, await sharp(approved).resize(400, 300, { fit: 'fill' }).webp().toBuffer());
  assert.equal(reframed.sameFraming, false);
  assert.equal(reframed.verdict, 'different');
});
