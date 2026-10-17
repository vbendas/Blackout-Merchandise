// PSD round trips: what ag-psd writes, read back by @webtoon/psd (independent)
// and by ag-psd's own reader, plus the corrected-upload reader and its diff.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPsd, writePsdUint8Array, type Layer } from 'ag-psd';
import { ensureAgPsd } from './ag-psd-setup';
import { parsePsdIndependently, type WebtoonLayer } from './independent';
import { ORIGINAL_LAYER_NAME, plateLayerName } from './names';
import { PsdReadError, diffScreenPsd, readScreenPsdDetail, rebuildScreenSet } from './psd-read';
import { writeDtgPsdWithStats, writeScreenPsdWithStats } from './psd-write';
import { BLACK, NAVY, WHITE, drawTargetAt, syntheticDtgLayers, syntheticOriginal, syntheticScreenSet } from './synthetic';
import { sha256Hex } from './hash';
import { srgbIccProfile } from './srgb-icc';
import { hexToRgb } from './colour';

function descriptorOf(layer: WebtoonLayer, key: string) {
  const block = (layer.additionalProperties as unknown as Record<string, { descriptor?: { items: Map<string, { type: string; value?: unknown; descriptor?: { items: Map<string, { type: string; value?: unknown }> } }> }; data?: unknown }>)[key];
  return block?.descriptor?.items;
}

test('the screen PSD round-trips: names, order, hidden flags, overlays off, ppi, alpha, smart object', async () => {
  const s = syntheticScreenSet({ plates: 5 });
  const original = await syntheticOriginal(400, 480);
  const { bytes, stats } = await writeScreenPsdWithStats({ set: s.set, garments: s.garments, original, label: s.label, inks: s.inks });
  const { widthPx: W, heightPx: H } = s.set.canvas;
  assert.equal(stats.psb, false);
  assert.equal(bytes.readUInt16BE(4), 1, 'a PSD, not PSB');
  assert.equal(bytes.readUInt16BE(22), 8, '8-bit');
  assert.equal(bytes.readUInt16BE(24), 3, 'RGB');

  const psd = await parsePsdIndependently(bytes);
  assert.equal(psd.width, W);
  assert.equal(psd.height, H);
  assert.equal(psd.resolutionInfo?.horizontal, 600);
  assert.equal(psd.resolutionInfo?.vertical, 600);
  assert.equal(psd.resolutionInfo?.horizontalUnit, 1, 'pixels per inch');
  assert.ok(psd.icc_profile && Buffer.from(psd.icc_profile).equals(srgbIccProfile()), 'sRGB profile embedded');

  // @webtoon/psd lists the stack top first: films last to first, garments, ORIGINAL.
  const expectedNames = [
    ...[...s.set.plates].reverse().map((p) => plateLayerName(p, 5)),
    'GARMENT · French Navy',
    'GARMENT · Black',
    ORIGINAL_LAYER_NAME,
  ];
  assert.deepEqual(
    psd.layers.map((l) => l.name),
    expectedNames,
  );
  assert.equal(psd.layers[4].name, '1/5  Underbase · Aquaflex V2 White · flash · 55 lpi 22.5°');
  assert.equal(psd.layers[3].name, '2/5  PANTONE 237 C · HB Opaque · 55 lpi 22.5°');

  for (const p of s.set.plates) {
    const layer = psd.layers.find((l) => l.name === plateLayerName(p, 5))!;
    assert.equal(layer.isHidden, false, `film ${p.index} visible`);
    const fx = descriptorOf(layer, 'lfx2');
    assert.ok(fx, `film ${p.index} has a layer style`);
    assert.equal(fx.get('masterFXSwitch')?.value, true);
    const sofi = fx.get('SoFi')?.descriptor?.items;
    assert.equal(sofi?.get('enab')?.value, false, `film ${p.index} overlay is off`);
    const colour = (sofi?.get('Clr ') as unknown as { descriptor: { items: Map<string, { value: number }> } }).descriptor.items;
    assert.deepEqual([colour.get('Rd  ')?.value, colour.get('Grn ')?.value, colour.get('Bl  ')?.value].map((v) => Math.round(v ?? -1)), hexToRgb(p.target.hex));

    const px = await layer.composite(false);
    assert.equal(px.length, W * H * 4);
    let mismatches = 0;
    for (let i = 0; i < W * H; i++) {
      if (px[i * 4 + 3] !== p.plate.data[i]) mismatches++;
      if (px[i * 4] !== 0 || px[i * 4 + 1] !== 0 || px[i * 4 + 2] !== 0) mismatches++;
    }
    assert.equal(mismatches, 0, `film ${p.index} is the plate exactly, black on transparency`);
  }

  for (const name of ['GARMENT · Black', 'GARMENT · French Navy']) {
    const layer = psd.layers.find((l) => l.name === name)!;
    assert.equal(layer.isHidden, true, `${name} hidden`);
  }
  const orig = psd.layers.find((l) => l.name === ORIGINAL_LAYER_NAME)!;
  assert.equal(orig.isHidden, true);
  assert.equal(orig.isTransparencyLocked, true);
  const lspf = (orig.additionalProperties as unknown as Record<string, { data: Uint8Array }>).lspf.data;
  assert.equal(lspf[3] & 0x7, 0x7, 'transparency, pixels and position locked');
  const idnt = (orig.additionalProperties as unknown as Record<string, { data: { descriptor: { items: Map<string, { value: string }> } } }>).SoLd.data.descriptor.items.get('Idnt')?.value;
  const linked = (psd.additionalLayerProperties as unknown as Record<string, { layers: { uniqueId: string; filename: string; contents: Uint8Array }[] }>).lnk2.layers;
  assert.equal(linked.length, 1);
  assert.equal(linked[0].uniqueId, idnt, 'the smart object points at the embedded file');
  assert.equal(linked[0].filename, 'underwriter-v3.png');
  assert.ok(Buffer.from(linked[0].contents).equals(original.bytes), 'the untouched approved art is embedded');

  // Merged image: the print in colour on the first garment.
  const merged = await psd.composite();
  const [gr, gg, gb] = hexToRgb(BLACK.hex);
  assert.deepEqual([merged[0], merged[1], merged[2], merged[3]], [gr, gg, gb, 255]);
  const ink2 = s.set.plates[1];
  const later = s.set.plates.slice(2);
  const at = [...ink2.plate.data.keys()].find((i) => ink2.plate.data[i] && later.every((p) => !p.plate.data[i]))!;
  assert.deepEqual([merged[at * 4], merged[at * 4 + 1], merged[at * 4 + 2]], hexToRgb(ink2.target.hex));

  // ag-psd's own reader sees the same flags.
  ensureAgPsd();
  const ag = readPsd(bytes, { skipLayerImageData: true, skipCompositeImageData: true, useRawThumbnail: true });
  const agFilms = (ag.children ?? []).filter((l) => /^\d+\/\d+/.test(l.name ?? ''));
  assert.equal(agFilms.length, 5);
  for (const l of agFilms) assert.equal(l.effects?.solidFill?.[0]?.enabled, false);
  const agOrig = (ag.children ?? []).find((l) => l.name === ORIGINAL_LAYER_NAME)!;
  assert.deepEqual(agOrig.protected, { transparency: true, composite: true, position: true });
  assert.equal(agOrig.placedLayer?.type, 'raster');
  assert.equal(ag.imageResources?.resolutionInfo?.horizontalResolution, 600);
  assert.ok(ag.imageResources?.thumbnailRaw, 'a thumbnail for Finder and Bridge');
});

test('the same input writes the same bytes', async () => {
  const s = syntheticScreenSet({ plates: 3, widthMm: 20, heightMm: 24 });
  const original = await syntheticOriginal(200, 240);
  const input = { set: s.set, garments: s.garments, original, label: s.label, inks: s.inks };
  const a = await writeScreenPsdWithStats(input);
  const b = await writeScreenPsdWithStats(input);
  assert.equal(sha256Hex(a.bytes), sha256Hex(b.bytes));
});

test('a canvas wider than 30,000 px is written as PSB and still reads back', async () => {
  // 1,280 mm wide at 600 ppi, 4 mm tall: cheap, but past the PSD side limit.
  const s = syntheticScreenSet({ plates: 2, widthMm: 1280, heightMm: 4, marks: { sideMarginMm: 1, endMarginMm: 1, inkGapMm: 0.2 }, ppi: 600 });
  const original = await syntheticOriginal(320, 1);
  const { bytes, stats } = await writeScreenPsdWithStats({ set: s.set, garments: s.garments, original, label: s.label, inks: s.inks });
  assert.ok(s.set.canvas.widthPx > 30000);
  assert.equal(stats.psb, true);
  assert.equal(bytes.readUInt16BE(4), 2, 'PSB version');
  const psd = await parsePsdIndependently(bytes);
  assert.equal(psd.width, s.set.canvas.widthPx);
  const film = psd.layers.find((l) => l.name.startsWith('2/2'))!;
  const px = await film.composite(false);
  let diff = 0;
  for (let i = 0; i < s.set.plates[1].plate.data.length; i++) if (px[i * 4 + 3] !== s.set.plates[1].plate.data[i]) diff++;
  assert.equal(diff, 0);
  // ag-psd reads the PSB's embedded file with its 8-byte length, as Adobe specifies.
  ensureAgPsd();
  const ag = readPsd(bytes, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true });
  assert.equal(ag.linkedFiles?.length, 1);
  assert.ok(Buffer.from(ag.linkedFiles![0].data!).equals(original.bytes));
});

test('the DTG/DTF PSD has one layer per garment at its crop, garment fills and ORIGINAL', async () => {
  const garments = [BLACK, WHITE];
  const area = { width: 472, height: 566 };
  const layers = syntheticDtgLayers(garments, area, 300);
  const original = await syntheticOriginal(300, 360);
  const { bytes } = await writeDtgPsdWithStats({ layers, garments, original, label: { designCode: 'UNDERWRITER', version: 3, placementLabel: 'Front' } });
  const psd = await parsePsdIndependently(bytes);
  assert.equal(psd.width, area.width);
  assert.equal(psd.height, area.height);
  assert.equal(psd.resolutionInfo?.horizontal, 300);
  assert.deepEqual(
    psd.layers.map((l) => [l.name, l.isHidden]),
    [
      ['DTG/DTF on White', true],
      ['GARMENT · White', true],
      ['DTG/DTF on Black', false],
      ['GARMENT · Black', true],
      [ORIGINAL_LAYER_NAME, true],
    ],
  );
  for (const l of layers) {
    const layer = psd.layers.find((x) => x.name === `DTG/DTF on ${garments.find((g) => g.code === l.garmentCode)!.name}`)!;
    assert.equal(layer.left, l.offsetPx.x);
    assert.equal(layer.top, l.offsetPx.y);
    const px = await layer.composite(false);
    assert.ok(Buffer.from(px.buffer, px.byteOffset, px.byteLength).equals(Buffer.from(l.raster.data)), `${l.garmentCode} pixels exact`);
  }
});

test('readScreenPsd parses our own file back unchanged', async () => {
  const s = syntheticScreenSet({ plates: 4 });
  const original = await syntheticOriginal(200, 240);
  const { bytes } = await writeScreenPsdWithStats({ set: s.set, garments: s.garments, original, label: s.label, inks: s.inks });
  const parsed = await readScreenPsdDetail(bytes);
  assert.equal(parsed.widthPx, s.set.canvas.widthPx);
  assert.equal(parsed.ppi, 600);
  assert.equal(parsed.hasOriginal, true);
  assert.equal(parsed.effectsOn, false);
  assert.deepEqual(parsed.garmentLayers.sort(), ['Black', 'French Navy']);
  assert.deepEqual(parsed.otherLayers, []);
  assert.equal(parsed.orderFrom, 'names');
  assert.deepEqual(parsed.warnings, []);
  assert.deepEqual(
    parsed.plates.map((p) => p.index),
    [1, 2, 3, 4],
  );
  for (const p of parsed.plates) assert.ok(Buffer.from(p.plate.data).equals(Buffer.from(s.set.plates[p.index - 1].plate.data)));
  const diff = diffScreenPsd(s.set, parsed);
  assert.equal(diff.changed.length, 0);
  assert.equal(diff.added.length + diff.removed.length, 0);
  assert.equal(diff.summary, 'No film changed.');

  // Storage may hand back a plain Uint8Array, or a view into a bigger buffer.
  const padded = new Uint8Array(bytes.length + 16);
  padded.set(bytes, 8);
  const fromView = await readScreenPsdDetail(padded.subarray(8, 8 + bytes.length));
  assert.equal(fromView.plates.length, 4);
  assert.ok(Buffer.from(fromView.plates[3].plate.data).equals(Buffer.from(s.set.plates[3].plate.data)));
});

/** A corrected file as Photoshop might save it: films cropped to their content,
 * one overlay switched on, a grey brush stroke, a stray layer, a film renamed. */
function correctedPsd(s: ReturnType<typeof syntheticScreenSet>): Buffer {
  ensureAgPsd();
  const { widthPx: W, heightPx: H } = s.set.canvas;
  const total = s.set.plates.length;
  const filmLayer = (data: Uint8Array, name: string, overlayOn = false): Layer => {
    let x0 = W;
    let y0 = H;
    let x1 = 0;
    let y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[y * W + x]) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + 1);
      y1 = Math.max(y1, y + 1);
    }
    const w = x1 - x0;
    const h = y1 - y0;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[(y * w + x) * 4 + 3] = data[(y + y0) * W + x + x0];
    return {
      name,
      left: x0,
      top: y0,
      imageData: { width: w, height: h, data: px },
      effects: { solidFill: [{ enabled: overlayOn, color: { r: 200, g: 0, b: 100 }, opacity: 1, blendMode: 'normal' }] },
    };
  };
  const films = s.set.plates.map((p) => new Uint8Array(p.plate.data));
  // Film 2: a speck cleaned away inside the art, and a grey stroke added.
  const art = s.set.canvas.art;
  const f2 = films[1];
  for (let y = art.y + 10; y < art.y + 30; y++) for (let x = art.x + 10; x < art.x + 30; x++) f2[y * W + x] = 255;
  const layers: Layer[] = s.set.plates.map((p, i) => filmLayer(films[i], plateLayerName(p, total), i === 2));
  // Film 2 gets a grey (not black) patch: thresholded, and warned about.
  const grey = layers[1];
  const gpx = grey.imageData!.data;
  for (let i = 0; i < 40; i++) {
    gpx[i * 4] = 128;
    gpx[i * 4 + 1] = 128;
    gpx[i * 4 + 2] = 128;
    gpx[i * 4 + 3] = 255;
  }
  layers.push({ name: 'Layer 7', left: 0, top: 0, imageData: { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) } });
  return Buffer.from(writePsdUint8Array({ width: W, height: H, children: layers, imageResources: { resolutionInfo: { horizontalResolution: 600, horizontalResolutionUnit: 'PPI', widthUnit: 'Inches', verticalResolution: 600, verticalResolutionUnit: 'PPI', heightUnit: 'Inches' } } }, { generateThumbnail: false }));
}

test('readScreenPsd reads a corrected file: overlays on, grey pixels, stray layers, cropped films', async () => {
  const s = syntheticScreenSet({ plates: 4 });
  const parsed = await readScreenPsdDetail(correctedPsd(s));
  assert.equal(parsed.plates.length, 4);
  assert.equal(parsed.effectsOn, true, 'the overlay left on is reported, so the regenerated pack switches it off');
  assert.equal(parsed.hasOriginal, false);
  assert.deepEqual(parsed.otherLayers, ['Layer 7']);
  const codes = parsed.warnings.map((w) => w.code);
  assert.ok(codes.includes('film_not_binary'));
  assert.ok(codes.includes('unknown_layers'));
  assert.ok(codes.includes('original_missing'));
  // Cropped layers land back on the full canvas.
  assert.ok(Buffer.from(parsed.plates[0].plate.data).equals(Buffer.from(s.set.plates[0].plate.data)));

  const diff = diffScreenPsd(s.set, parsed);
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0].index, 2);
  assert.ok(diff.changed[0].coverageDelta > 0);
  assert.deepEqual(diff.unchanged.sort(), [1, 3, 4]);
  assert.match(diff.summary, /1 film changed \(2\/4: /);
  assert.match(diff.summary, /Colour overlays were on/);
  assert.match(diff.summary, /Left out: Layer 7/);

  const rebuilt = rebuildScreenSet(s.set, parsed);
  assert.equal(rebuilt.plates.length, 4);
  assert.equal(rebuilt.plates[1].pantone, s.set.plates[1].pantone);
  assert.ok(rebuilt.plates[1].coverage > s.set.plates[1].coverage);
});

test('readScreenPsd follows the names when the stack was reordered, and flags it', async () => {
  const s = syntheticScreenSet({ plates: 3, widthMm: 20, heightMm: 24 });
  const original = await syntheticOriginal(100, 120);
  const { bytes } = await writeScreenPsdWithStats({ set: s.set, garments: s.garments, original, label: s.label, inks: s.inks });
  ensureAgPsd();
  const psd = readPsd(bytes, { useImageData: true, skipThumbnail: true });
  const films = psd.children!.filter((l) => /^\d\//.test(l.name ?? ''));
  const others = psd.children!.filter((l) => !/^\d\//.test(l.name ?? ''));
  psd.children = [...others, films[1], films[0], films[2]];
  const moved = Buffer.from(writePsdUint8Array(psd, { generateThumbnail: false }));
  const parsed = await readScreenPsdDetail(moved);
  assert.deepEqual(
    parsed.plates.map((p) => p.name.slice(0, 3)),
    ['1/3', '2/3', '3/3'],
  );
  assert.ok(parsed.warnings.some((w) => w.code === 'order_differs'));
});

test('readScreenPsd refuses files it cannot use, in words pre-press can act on', async () => {
  await assert.rejects(readScreenPsdDetail(Buffer.from('not a psd at all, just text')), (e: unknown) => e instanceof PsdReadError && e.code === 'not_psd');
  const s = syntheticScreenSet({ plates: 2, widthMm: 20, heightMm: 24 });
  const original = await syntheticOriginal(100, 120);
  const { bytes } = await writeScreenPsdWithStats({ set: s.set, garments: s.garments, original, label: s.label, inks: s.inks });
  const cmyk = Buffer.from(bytes);
  cmyk.writeUInt16BE(4, 24);
  await assert.rejects(readScreenPsdDetail(cmyk), (e: unknown) => e instanceof PsdReadError && e.code === 'unsupported' && /CMYK/.test(e.message));
  ensureAgPsd();
  const noFilms = Buffer.from(writePsdUint8Array({ width: 10, height: 10, children: [{ name: 'Background', imageData: { width: 10, height: 10, data: new Uint8ClampedArray(400).fill(255) } }] }, { generateThumbnail: false }));
  await assert.rejects(readScreenPsdDetail(noFilms), (e: unknown) => e instanceof PsdReadError && e.code === 'no_films');
});

test('a film with its marks redrawn elsewhere is a changed film in the diff', async () => {
  const s = syntheticScreenSet({ plates: 3, widthMm: 20, heightMm: 24 });
  const original = await syntheticOriginal(100, 120);
  const moved = { ...s.set, plates: s.set.plates.map((p) => ({ ...p, plate: { ...p.plate, data: new Uint8Array(p.plate.data) } })) };
  drawTargetAt(moved.plates[2].plate.data, s.set.canvas, 'top left', 24, 0);
  const { bytes } = await writeScreenPsdWithStats({ set: moved, garments: [BLACK, NAVY], original, label: s.label, inks: s.inks });
  const diff = diffScreenPsd(s.set, await readScreenPsdDetail(bytes));
  assert.deepEqual(
    diff.changed.map((c) => c.index),
    [3],
  );
  assert.equal(diff.changed[0].coverageDelta, 0, 'marks sit outside the print area');
});
