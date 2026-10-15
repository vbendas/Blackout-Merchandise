// The DTG/DTF PNG for GTX Graphics Lab: RGBA, sRGB ICC, 300 ppi in pHYs,
// alpha strictly 0/255, pixels exactly as the engine made them. Decoded with
// pngjs (independent of png.ts) and with sharp/libvips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderFilmPreview, writeDtgPng } from './index';
import { decodePngIndependently } from './independent';
import { encodePng, parseIccp, parsePhys, readPngChunks } from './png';
import { packBitsRow, unpackBits } from './rle';
import { SRGB_PROFILE_NAME, srgbIccProfile } from './srgb-icc';
import { BLACK, WHITE, syntheticDtgLayers, syntheticScreenSet } from './synthetic';

test('the DTG PNG carries sRGB, 300 ppi and the exact RGBA, alpha only 0 or 255', async () => {
  const [layer] = syntheticDtgLayers([BLACK], { width: 472, height: 566 }, 300);
  const png = await writeDtgPng(layer);

  const chunks = readPngChunks(png);
  const types = chunks.map((c) => c.type);
  assert.equal(types[0], 'IHDR');
  assert.equal(types.at(-1), 'IEND');
  assert.ok(types.indexOf('iCCP') < types.indexOf('IDAT'), 'iCCP before the image data');
  assert.ok(types.indexOf('pHYs') < types.indexOf('IDAT'), 'pHYs before the image data');
  assert.ok(!types.includes('sRGB'), 'iCCP alone, as the PNG spec asks');

  const ihdr = chunks[0].data;
  assert.equal(ihdr.readUInt32BE(0), layer.raster.width);
  assert.equal(ihdr.readUInt32BE(4), layer.raster.height);
  assert.equal(ihdr[8], 8, '8 bits per channel');
  assert.equal(ihdr[9], 6, 'RGBA');
  assert.equal(ihdr[12], 0, 'not interlaced');

  const phys = parsePhys(chunks.find((c) => c.type === 'pHYs')!);
  assert.deepEqual(phys, { x: 11811, y: 11811, unit: 1 });

  const icc = parseIccp(chunks.find((c) => c.type === 'iCCP')!);
  assert.equal(icc.name, SRGB_PROFILE_NAME);
  assert.ok(icc.profile.equals(srgbIccProfile()));
  assert.equal(icc.profile.toString('latin1', 36, 40), 'acsp');
  assert.equal(icc.profile[8], 2, 'ICC v2');

  const decoded = decodePngIndependently(png);
  assert.equal(decoded.width, layer.raster.width);
  assert.ok(Buffer.from(decoded.data).equals(Buffer.from(layer.raster.data)), 'pixels exact');
  let soft = 0;
  let white = 0;
  for (let i = 3; i < decoded.data.length; i += 4) {
    if (decoded.data[i] !== 0 && decoded.data[i] !== 255) soft++;
    if (decoded.data[i] === 255 && decoded.data[i - 3] === 255 && decoded.data[i - 2] === 255 && decoded.data[i - 1] === 255) white++;
  }
  assert.equal(soft, 0);
  assert.ok(white > 0, 'RGB 255 whites survive on a dark garment, so they print white ink');

  // libvips reads the same file: profile, density and pixels.
  const meta = await sharp(png).metadata();
  assert.equal(meta.density, 300);
  assert.equal(meta.hasProfile, true);
  assert.equal(meta.hasAlpha, true);
  const { data } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  assert.ok(Buffer.from(data).equals(Buffer.from(layer.raster.data)));
});

test('lcms accepts the embedded sRGB profile and treats it as sRGB', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pack-icc-'));
  const path = join(dir, 'srgb.icc');
  writeFileSync(path, srgbIccProfile());
  const colours = [
    [255, 255, 255],
    [0, 0, 0],
    [237, 144, 220],
    [84, 86, 172],
    [62, 14, 97],
  ];
  const raw = Buffer.from(colours.flat());
  const viaFile = await sharp(raw, { raw: { width: colours.length, height: 1, channels: 3 } }).withIccProfile(path).raw().toBuffer();
  const viaBuiltIn = await sharp(raw, { raw: { width: colours.length, height: 1, channels: 3 } }).withIccProfile('srgb').raw().toBuffer();
  for (let i = 0; i < raw.length; i++) assert.ok(Math.abs(viaFile[i] - viaBuiltIn[i]) <= 1, `channel ${i}: ${viaFile[i]} vs ${viaBuiltIn[i]}`);
});

test('the PNG writer is deterministic and the white-garment layer has no RGB 255', async () => {
  const [, onWhite] = syntheticDtgLayers([BLACK, WHITE], { width: 300, height: 360 }, 300);
  const a = await writeDtgPng(onWhite);
  const b = await writeDtgPng(onWhite);
  assert.ok(a.equals(b));
  const d = decodePngIndependently(a).data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 255) assert.ok(!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255));
  }
});

test('an empty DTG layer still makes a valid PNG that prints nothing', async () => {
  const png = await writeDtgPng({
    garmentCode: 'C001',
    raster: { width: 0, height: 0, channels: 4, data: new Uint8Array(0), ppi: 300 },
    offsetPx: { x: 0, y: 0 },
    printAreaPx: { width: 100, height: 100 },
    fadeShare: 0,
    whitesTransparent: true,
  });
  const d = decodePngIndependently(png);
  assert.equal(d.width, 1);
  assert.equal(d.data[3], 0);
});

test('encodePng handles grey and RGB, and every filter choice decodes back', async () => {
  const w = 37;
  const h = 23;
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 7919) % 251;
  const png = await encodePng({ width: w, height: h, channels: 3, data: rgb, ppi: 600 });
  const d = decodePngIndependently(png);
  for (let p = 0; p < w * h; p++) {
    assert.equal(d.data[p * 4], rgb[p * 3]);
    assert.equal(d.data[p * 4 + 2], rgb[p * 3 + 2]);
    assert.equal(d.data[p * 4 + 3], 255);
  }
  assert.equal(parsePhys(readPngChunks(png).find((c) => c.type === 'pHYs')!).x, 23622);
  await assert.rejects(encodePng({ width: 2, height: 2, channels: 4, data: new Uint8Array(3) }));
});

test('PackBits rows decode back exactly, runs and literals alike', () => {
  const cases = [new Uint8Array(1000), new Uint8Array(300).fill(255), Uint8Array.from({ length: 777 }, (_, i) => (i % 5 === 0 ? 255 : i % 3)), Uint8Array.from([1, 2, 2, 3, 3, 3, 4]), Uint8Array.from([9])];
  for (const row of cases) {
    const out = new Uint8Array(row.length * 2 + 8);
    const n = packBitsRow(row, 0, 1, row.length, out, 0);
    assert.ok(Buffer.from(unpackBits(out.subarray(0, n), row.length)).equals(Buffer.from(row)));
    assert.ok(n <= row.length + Math.ceil(row.length / 128));
  }
});

test('a film preview is black ink on white, downsampled from the film', async () => {
  const s = syntheticScreenSet({ plates: 3, widthMm: 20, heightMm: 24 });
  const plate = s.set.plates[1];
  const png = await renderFilmPreview(plate, s.label, 200);
  const meta = await sharp(png).metadata();
  assert.equal(meta.height, 200);
  assert.equal(meta.channels, 1);
  const chunks = readPngChunks(png);
  const title = chunks.find((c) => c.type === 'tEXt')!.data.toString('latin1');
  assert.match(title, /^Title\0UNDERWRITER v3 · Front · film 2 · PANTONE 237 C$/);
  const img = decodePngIndependently(png);
  const grey = (x: number, y: number) => img.data[(y * img.width + x) * 4];
  // Corners are clear film: white.
  assert.equal(grey(0, 0), 255);
  assert.equal(grey(img.width - 1, img.height - 1), 255);
  // The solid block at 10-30% across the art prints black.
  const art = s.set.canvas.art;
  const fx = Math.round(((art.x + art.width * 0.2) / s.set.canvas.widthPx) * img.width);
  let darkest = 255;
  for (let y = 0; y < img.height; y++) darkest = Math.min(darkest, grey(fx, y));
  assert.ok(darkest < 40, `found ink (${darkest})`);
});
