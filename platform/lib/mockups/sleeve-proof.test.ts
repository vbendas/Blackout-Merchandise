import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { renderSleeveProof, SleeveProofError, type SleeveProofErrorCode, type SleeveProofInput } from './sleeve-proof';
import { PLATE_HEX, SLEEVE_SPECS, formatCm, layoutSleeve, proofHeight, sleeveScale, type SleeveKind } from './sleeve-geometry';

type Rgb = [number, number, number];

const PLATFORM = path.resolve(__dirname, '../..');
const MAGENTA: Rgb = [255, 0, 255];
const GARMENT = '#3366CC';
const GARMENT_RGB: Rgb = [0x33, 0x66, 0xcc];
const PLATE: Rgb = [0xec, 0xe5, 0xda];

interface Pixels {
  data: Buffer;
  width: number;
  height: number;
}

async function decode(png: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function at(p: Pixels, x: number, y: number): Rgb {
  const o = (y * p.width + x) * 4;
  return [p.data[o], p.data[o + 1], p.data[o + 2]];
}

function close(a: Rgb, b: Rgb, tolerance = 2): boolean {
  return a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
}

/** Bare plate, give or take the soft edge of a line drawn on it. */
function isPlate(p: Pixels, x: number, y: number): boolean {
  const c = at(p, x, y);
  return Math.abs(c[0] - PLATE[0]) + Math.abs(c[1] - PLATE[1]) + Math.abs(c[2] - PLATE[2]) <= 6;
}

/** The box of the pixels that are this colour (give or take a rounding step). */
function boundsOf(p: Pixels, colour: Rgb): { left: number; top: number; width: number; height: number } {
  let left = Infinity;
  let top = Infinity;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      if (!close(at(p, x, y), colour)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  assert.ok(right >= 0, `no ${colour} pixels in the proof`);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** A PNG of one opaque colour at 100 px per cm, so its shape is the shape of its printed size. */
function solidPrint(widthCm: number, heightCm: number, [r, g, b]: Rgb = MAGENTA): Promise<Buffer> {
  return sharp({ create: { width: Math.round(widthCm * 100), height: Math.round(heightCm * 100), channels: 4, background: { r, g, b, alpha: 1 } } })
    .png()
    .toBuffer();
}

/** A proof of a magenta print of the size given (9 x 9 cm on a short left sleeve unless said otherwise). */
async function proofOf(over: Partial<SleeveProofInput> = {}): Promise<Buffer> {
  const printWidthCm = over.printWidthCm ?? 9;
  const printHeightCm = over.printHeightCm ?? 9;
  return renderSleeveProof({
    print: await solidPrint(printWidthCm, printHeightCm),
    printWidthCm,
    printHeightCm,
    garmentHex: GARMENT,
    side: 'left',
    sleeve: 'short',
    ...over,
  });
}

async function assertRefused(run: Promise<unknown>, code: SleeveProofErrorCode, message: RegExp): Promise<SleeveProofError> {
  const err = await run.then(
    () => assert.fail(`expected a ${code} error, but a proof was drawn`),
    (e: unknown) => e,
  );
  assert.ok(err instanceof SleeveProofError, `expected a SleeveProofError, got ${String(err)}`);
  assert.equal(err.code, code, err.message);
  assert.match(err.message, message);
  return err;
}

// ---------------------------------------------------------------------------
// Size and scale
// ---------------------------------------------------------------------------

test('a proof is a PNG, 4:5 like the mockups it sits beside, 800 px wide unless asked otherwise', async () => {
  for (const sleeve of ['short', 'long'] as const) {
    const png = await proofOf({ sleeve, printWidthCm: 5, printHeightCm: 5 });
    const meta = await sharp(png).metadata();
    assert.equal(meta.format, 'png');
    assert.equal(meta.width, 800, sleeve);
    assert.equal(meta.height, 1000, sleeve);
    assert.equal(meta.hasAlpha, false, 'the plate is opaque');
  }
  const narrow = await sharp(await proofOf({ widthPx: 640 })).metadata();
  assert.deepEqual([narrow.width, narrow.height], [640, 800]);
  const odd = await sharp(await proofOf({ widthPx: 333 })).metadata();
  assert.deepEqual([odd.width, odd.height], [333, proofHeight(333)]);
});

test('the print lands at its printed size at the proof scale, within a pixel, centred on the sleeve', async () => {
  const cases: Array<{ sleeve: SleeveKind; w: number; h: number; widthPx: number }> = [
    { sleeve: 'short', w: 9, h: 9, widthPx: 800 },
    { sleeve: 'short', w: 12, h: 3.5, widthPx: 800 },
    { sleeve: 'short', w: 2.5, h: 2.5, widthPx: 1200 },
    { sleeve: 'long', w: 4, h: 24, widthPx: 800 },
    { sleeve: 'long', w: 9, h: 40, widthPx: 640 },
  ];
  for (const { sleeve, w, h, widthPx } of cases) {
    const p = await decode(await proofOf({ sleeve, printWidthCm: w, printHeightCm: h, widthPx }));
    const box = boundsOf(p, MAGENTA);
    const scale = sleeveScale(sleeve, widthPx);
    const label = `${sleeve} ${w} x ${h} cm at ${widthPx} px`;
    assert.ok(Math.abs(box.width - w * scale) <= 1, `${label}: ${box.width} px wide, expected ${w * scale}`);
    assert.ok(Math.abs(box.height - h * scale) <= 1, `${label}: ${box.height} px tall, expected ${h * scale}`);
    assert.ok(Math.abs(box.left + box.width / 2 - widthPx / 2) <= 1, `${label}: centred on the outer centre line`);
    // and exactly where the layout says, so the dimension lines are drawn along the print's real edges
    assert.deepEqual(box, layoutSleeve({ sleeve, side: 'left', widthPx, printWidthCm: w, printHeightCm: h }).print, label);
  }
});

test('the sleeve is drawn at the same scale as the print', async () => {
  for (const sleeve of ['short', 'long'] as const) {
    const spec = SLEEVE_SPECS[sleeve];
    const p = await decode(await proofOf({ sleeve, printWidthCm: 5, printHeightCm: 5 }));
    const scale = sleeveScale(sleeve);
    // the span of everything that is not bare plate, row by row, below the label
    const span = (y: number) => {
      let first = -1;
      let last = -1;
      for (let x = 0; x < p.width; x++) {
        if (isPlate(p, x, y)) continue;
        if (first < 0) first = x;
        last = x;
      }
      return first < 0 ? 0 : last - first + 1;
    };
    let widest = 0;
    let lastRow = 0;
    for (let y = Math.round(p.height * 0.1); y < p.height; y++) {
      const s = span(y);
      if (s > 0) lastRow = y;
      widest = Math.max(widest, s);
    }
    assert.ok(Math.abs(widest / (spec.widthCm * scale) - 1) <= 0.015, `${sleeve}: widest ${widest} px, expected ${spec.widthCm * scale}`);
    const hem = span(lastRow - 4);
    assert.ok(Math.abs(hem / (spec.hemWidthCm * scale) - 1) <= 0.03, `${sleeve}: hem ${hem} px, expected ${spec.hemWidthCm * scale}`);
  }
});

test('the largest print each sleeve takes sits clear of the seams', async () => {
  for (const sleeve of ['short', 'long'] as const) {
    const { maxPrintWidthCm: w, maxPrintHeightCm: h } = SLEEVE_SPECS[sleeve];
    const p = await decode(await proofOf({ sleeve, printWidthCm: w, printHeightCm: h }));
    const box = boundsOf(p, MAGENTA);
    const scale = sleeveScale(sleeve);
    for (const y of [box.top + 1, box.top + box.height - 2]) {
      let left = 0;
      for (let x = box.left - 1; x >= 0 && !isPlate(p, x, y); x--) left++;
      let right = 0;
      for (let x = box.left + box.width; x < p.width && !isPlate(p, x, y); x++) right++;
      assert.ok(left >= 2 * scale, `${sleeve}: ${(left / scale).toFixed(1)} cm to the seam on the left at row ${y}`);
      assert.ok(right >= 2 * scale, `${sleeve}: ${(right / scale).toFixed(1)} cm to the seam on the right at row ${y}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Left and right
// ---------------------------------------------------------------------------

function numbersIn(path: string): number[] {
  return (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** What is not bare plate, below the label. */
function silhouette(p: Pixels): Uint8Array {
  const mask = new Uint8Array(p.width * p.height);
  for (let y = Math.round(p.height * 0.1); y < p.height; y++) for (let x = 0; x < p.width; x++) mask[y * p.width + x] = isPlate(p, x, y) ? 0 : 1;
  return mask;
}

function flipped(mask: Uint8Array, width: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[Math.floor(i / width) * width + (width - 1 - (i % width))];
  return out;
}

function overlap(a: Uint8Array, b: Uint8Array): number {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) both++;
    if (a[i] || b[i]) either++;
  }
  return both / either;
}

test('a right sleeve is the mirror of a left one, and is not the same shape', async () => {
  for (const sleeve of ['short', 'long'] as const) {
    const base = { sleeve, widthPx: 800, printWidthCm: 4, printHeightCm: 8 } as const;
    const left = numbersIn(layoutSleeve({ ...base, side: 'left' }).outline);
    const right = numbersIn(layoutSleeve({ ...base, side: 'right' }).outline);
    assert.equal(left.length, right.length);
    left.forEach((v, i) => {
      // x runs across, y down
      const expected = i % 2 === 0 ? 800 - v : v;
      assert.ok(Math.abs(right[i] - expected) <= 0.011, `${sleeve} outline number ${i}: ${right[i]} is not ${expected}`);
    });

    const l = await decode(await proofOf({ ...base, side: 'left' }));
    const r = await decode(await proofOf({ ...base, side: 'right' }));
    const maskL = silhouette(l);
    const maskR = silhouette(r);
    assert.ok(overlap(maskL, flipped(maskR, r.width)) > 0.999, `${sleeve}: the right sleeve is the left one flipped`);
    assert.ok(overlap(maskL, flipped(maskL, l.width)) < 0.99, `${sleeve}: a sleeve that is its own mirror image would make left and right the same`);
  }
});

test('the print itself is never mirrored', async () => {
  // red on the left half, blue on the right
  const art = await sharp({ create: { width: 800, height: 400, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 1 } } })
    .composite([{ input: await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 30, g: 30, b: 200, alpha: 1 } } }).png().toBuffer(), left: 400, top: 0 }])
    .png()
    .toBuffer();
  for (const side of ['left', 'right'] as const) {
    const png = await renderSleeveProof({ print: art, printWidthCm: 8, printHeightCm: 4, garmentHex: '#ffffff', side, sleeve: 'short' });
    const p = await decode(png);
    const { print } = layoutSleeve({ sleeve: 'short', side, widthPx: 800, printWidthCm: 8, printHeightCm: 4 });
    const y = print.top + Math.round(print.height / 2);
    assert.ok(close(at(p, print.left + 10, y), [200, 30, 30]), `${side}: red stays on the left`);
    assert.ok(close(at(p, print.left + print.width - 11, y), [30, 30, 200]), `${side}: blue stays on the right`);
  }
});

// ---------------------------------------------------------------------------
// Transparency
// ---------------------------------------------------------------------------

test('the garment colour shows through the print where it is transparent', async () => {
  // 200 x 100 px for 4 x 2 cm: top left clear, top right opaque white, bottom left black at half, bottom right magenta at a quarter
  const quadrants: Array<[number, number, number, number]> = [
    [0, 0, 0, 0],
    [255, 255, 255, 255],
    [0, 0, 0, 128],
    [255, 0, 255, 64],
  ];
  const raw = Buffer.alloc(200 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 200; x++) raw.set(quadrants[(y < 50 ? 0 : 2) + (x < 100 ? 0 : 1)], (y * 200 + x) * 4);
  }
  const print = await sharp(raw, { raw: { width: 200, height: 100, channels: 4 } }).png().toBuffer();
  const png = await renderSleeveProof({ print, printWidthCm: 4, printHeightCm: 2, garmentHex: GARMENT, side: 'left', sleeve: 'short' });
  const p = await decode(png);
  const box = layoutSleeve({ sleeve: 'short', side: 'left', widthPx: 800, printWidthCm: 4, printHeightCm: 2 }).print;
  const centre = (qx: number, qy: number) => at(p, box.left + Math.round(box.width * (qx ? 0.75 : 0.25)), box.top + Math.round(box.height * (qy ? 0.75 : 0.25)));

  const [gr, gg, gb] = GARMENT_RGB;
  assert.ok(close(centre(0, 0), GARMENT_RGB), `clear: ${centre(0, 0)} is not the garment colour`);
  assert.ok(close(centre(1, 0), [255, 255, 255]), `opaque: ${centre(1, 0)}`);
  const half = 1 - 128 / 255;
  assert.ok(close(centre(0, 1), [gr * half, gg * half, gb * half]), `half black over the garment: ${centre(0, 1)}`);
  const quarter = 64 / 255;
  assert.ok(
    close(centre(1, 1), [gr * (1 - quarter) + 255 * quarter, gg * (1 - quarter), gb * (1 - quarter) + 255 * quarter]),
    `a quarter of magenta over the garment: ${centre(1, 1)}`,
  );
});

test('the garment colour is read as #rrggbb, #rgb or rrggbb', async () => {
  for (const hex of ['#ff0000', '#f00', 'FF0000']) {
    const p = await decode(await proofOf({ garmentHex: hex }));
    // below the print and its measurements, inside the sleeve
    assert.ok(close(at(p, 400, 700), [255, 0, 0]), `${hex}: ${at(p, 400, 700)}`);
  }
});

// ---------------------------------------------------------------------------
// The same bytes, a sensible size, the label
// ---------------------------------------------------------------------------

test('the same input gives the same bytes', async () => {
  for (const side of ['left', 'right'] as const) {
    const print = await solidPrint(9, 6, [30, 160, 90]);
    const input = { print, printWidthCm: 9, printHeightCm: 6, garmentHex: '#18181a', side, sleeve: 'long' } as const;
    const a = await renderSleeveProof(input);
    const b = await renderSleeveProof({ ...input, print: Buffer.from(print) });
    assert.ok(a.equals(b), `${side}: two renders differ`);
  }
});

/** Photo-like noise at one print pixel per proof pixel: about the least a PNG can squeeze. */
function noisyPrint(widthPx: number, heightPx: number): Promise<Buffer> {
  const raw = Buffer.alloc(widthPx * heightPx * 4);
  let seed = 0x2f6e2b1;
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  for (let y = 0; y < heightPx; y++) {
    for (let x = 0; x < widthPx; x++) {
      const o = (y * widthPx + x) * 4;
      raw[o] = Math.round((x / widthPx) * 220 + next() * 30);
      raw[o + 1] = Math.round((y / heightPx) * 220 + next() * 30);
      raw[o + 2] = Math.round(128 + next() * 60);
      raw[o + 3] = 255;
    }
  }
  return sharp(raw, { raw: { width: widthPx, height: heightPx, channels: 4 } }).png().toBuffer();
}

test('a proof stays under 300 KB even for the largest, noisiest print', async () => {
  for (const sleeve of ['short', 'long'] as const) {
    const { maxPrintWidthCm: w, maxPrintHeightCm: h } = SLEEVE_SPECS[sleeve];
    const scale = sleeveScale(sleeve);
    const print = await noisyPrint(Math.round(w * scale), Math.round(h * scale));
    const png = await renderSleeveProof({ print, printWidthCm: w, printHeightCm: h, garmentHex: '#e8e0d0', side: 'left', sleeve });
    assert.ok(png.length < 300_000, `${sleeve}: ${png.length} bytes`);
  }
});

test('the label and the figures are drawn, and the label says which sleeve', async () => {
  const left = await decode(await proofOf({ side: 'left' }));
  const right = await decode(await proofOf({ side: 'right' }));
  // the label's strip, above the sleeve: ink on the plate
  let inkLeft = 0;
  let inkRight = 0;
  let differ = 0;
  for (let y = 30; y < 90; y++) {
    for (let x = 30; x < 560; x++) {
      if (!isPlate(left, x, y)) inkLeft++;
      if (!isPlate(right, x, y)) inkRight++;
      if (!close(at(left, x, y), at(right, x, y), 40)) differ++;
    }
  }
  assert.ok(inkLeft > 300 && inkRight > 300, `the label has ink on the plate (${inkLeft}, ${inkRight} px)`);
  assert.ok(differ > 50, 'the label reads Left on one and Right on the other');
  // a figure is written under the print: ink on the garment, below the line it hangs from and above the stitching
  const { print } = layoutSleeve({ sleeve: 'short', side: 'left', widthPx: 800, printWidthCm: 9, printHeightCm: 9 });
  const bottom = print.top + print.height;
  let figure = 0;
  for (let y = bottom + 18; y < bottom + 44; y++) {
    for (let x = 400 - 40; x < 400 + 40; x++) if (!close(at(left, x, y), GARMENT_RGB, 8)) figure++;
  }
  assert.ok(figure > 100, `a figure is written under the print (${figure} px)`);
});

test('sizes are stated to the millimetre, without a trailing zero', () => {
  assert.equal(formatCm(9), '9');
  assert.equal(formatCm(9.04), '9');
  assert.equal(formatCm(12.46), '12.5');
  assert.equal(formatCm(0.25), '0.3');
  const layout = layoutSleeve({ sleeve: 'short', side: 'left', widthPx: 800, printWidthCm: 12.46, printHeightCm: 9 });
  assert.equal(layout.widthDim.text.label, '12.5 cm');
  assert.equal(layout.heightDim.text.label, '9 cm');
  assert.equal(layout.widthDim.text.vertical, false);
  assert.equal(layout.heightDim.text.vertical, true);
  assert.equal(PLATE_HEX, '#ECE5DA');
});

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

test('an empty or unreadable print is refused in words', async () => {
  const ok = { printWidthCm: 9, printHeightCm: 9, garmentHex: GARMENT, side: 'left', sleeve: 'short' } as const;
  await assertRefused(renderSleeveProof({ ...ok, print: Buffer.alloc(0) }), 'invalid_print', /print is empty/);
  await assertRefused(renderSleeveProof({ ...ok, print: Buffer.from('definitely not a png') }), 'invalid_print', /not an image/);
  const clear = await sharp({ create: { width: 90, height: 90, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } }).png().toBuffer();
  await assertRefused(renderSleeveProof({ ...ok, print: clear }), 'empty_print', /every pixel of it is transparent/);
  const faint = await sharp({ create: { width: 90, height: 90, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 3 / 255 } } }).png().toBuffer();
  await assertRefused(renderSleeveProof({ ...ok, print: faint }), 'empty_print', /transparent/);
});

test('a printed size that is not a size is refused', async () => {
  const print = await solidPrint(9, 9);
  const ok = { print, garmentHex: GARMENT, side: 'left', sleeve: 'short' } as const;
  for (const [w, h] of [
    [0, 9],
    [9, 0],
    [-9, 9],
    [0.05, 9],
    [Number.NaN, 9],
    [9, Number.POSITIVE_INFINITY],
  ]) {
    await assertRefused(renderSleeveProof({ ...ok, printWidthCm: w, printHeightCm: h }), 'invalid_print', /printed size must be a width and a height of at least 0\.1 cm/);
  }
  await assertRefused(renderSleeveProof({ ...ok, printWidthCm: '9' as unknown as number, printHeightCm: 9 }), 'invalid_print', /got "9" × 9/);
});

test('a print larger than the sleeve takes is refused, naming the most it takes', async () => {
  const short = await assertRefused(proofOf({ sleeve: 'short', printWidthCm: 12.5, printHeightCm: 9 }), 'too_large', /12\.5 × 9 cm print is larger than a short sleeve takes.*most it takes is 12 × 12 cm/);
  assert.deepEqual(short.max, { widthCm: 12, heightCm: 12 });
  await assertRefused(proofOf({ sleeve: 'short', printWidthCm: 9, printHeightCm: 13 }), 'too_large', /9 × 13 cm.*12 × 12 cm/);
  const long = await assertRefused(proofOf({ sleeve: 'long', printWidthCm: 4, printHeightCm: 41 }), 'too_large', /4 × 41 cm print is larger than a long sleeve takes.*9 × 40 cm/);
  assert.deepEqual(long.max, { widthCm: 9, heightCm: 40 });
  await assertRefused(proofOf({ sleeve: 'long', printWidthCm: 9.5, printHeightCm: 20 }), 'too_large', /9 × 40 cm/);
  // the most it takes is taken, and a hair over, as sizes are stated to the millimetre
  await proofOf({ sleeve: 'short', printWidthCm: 12, printHeightCm: 12 });
  await proofOf({ sleeve: 'long', printWidthCm: 9, printHeightCm: 40 });
  await proofOf({ sleeve: 'short', printWidthCm: 12.04, printHeightCm: 12 });
});

test('a print whose shape is not its printed size is refused, and the rounding of a size is not', async () => {
  const ok = { garmentHex: GARMENT, side: 'left', sleeve: 'short' } as const;
  const wide = await solidPrint(18, 9);
  await assertRefused(renderSleeveProof({ ...ok, print: wide, printWidthCm: 9, printHeightCm: 9 }), 'print_shape', /1800 × 900 px.*9 × 9 cm/);
  const slightly = await sharp({ create: { width: 900, height: 1000, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toBuffer();
  await assertRefused(renderSleeveProof({ ...ok, print: slightly, printWidthCm: 9, printHeightCm: 9 }), 'print_shape', /900 × 1000 px/);
  // a pixel of rounding in the image
  const nearly = await sharp({ create: { width: 1063, height: 1062, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toBuffer();
  await renderSleeveProof({ ...ok, print: nearly, printWidthCm: 9, printHeightCm: 9 });
  // a height worked out from the art's aspect and rounded to the millimetre: 9 cm wide, 5.562 cm tall, said to be 5.6
  const rounded = await sharp({ create: { width: 1000, height: 618, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toBuffer();
  await renderSleeveProof({ ...ok, print: rounded, printWidthCm: 9, printHeightCm: 5.6 });
  // and on a small print, where half a millimetre is a lot: 2.5 cm wide, 1.545 cm tall, said to be 1.5
  const small = await sharp({ create: { width: 1000, height: 618, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toBuffer();
  await renderSleeveProof({ ...ok, print: small, printWidthCm: 2.5, printHeightCm: 1.5 });
  await assertRefused(renderSleeveProof({ ...ok, print: small, printWidthCm: 2.5, printHeightCm: 2 }), 'print_shape', /2\.5 × 2 cm/);
});

test('the garment, the side, the sleeve and the width are checked', async () => {
  const print = await solidPrint(9, 9);
  const ok = { print, printWidthCm: 9, printHeightCm: 9, garmentHex: GARMENT, side: 'left', sleeve: 'short' } as const;
  for (const garmentHex of ['red', '#12345', '', '#GGGGGG', 123 as unknown as string]) {
    await assertRefused(renderSleeveProof({ ...ok, garmentHex }), 'invalid_input', /hex colour/);
  }
  await assertRefused(renderSleeveProof({ ...ok, side: 'top' as unknown as 'left' }), 'invalid_input', /"left" or "right"/);
  await assertRefused(renderSleeveProof({ ...ok, sleeve: 'three-quarter' as unknown as 'short' }), 'invalid_input', /"short" or "long"/);
  await assertRefused(renderSleeveProof({ ...ok, sleeve: 'constructor' as unknown as 'short' }), 'invalid_input', /"short" or "long"/);
  for (const widthPx of [100, 5000, Number.NaN]) {
    await assertRefused(renderSleeveProof({ ...ok, widthPx }), 'invalid_input', /width must be between/);
  }
});

// ---------------------------------------------------------------------------
// The renderer's font
// ---------------------------------------------------------------------------

test('on a machine with no font the proof is refused, not drawn with empty boxes for figures', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sleeve-nofont-'));
  try {
    const conf = path.join(dir, 'fonts.conf');
    writeFileSync(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${path.join(dir, 'none')}</dir><cachedir>${path.join(dir, 'cache')}</cachedir></fontconfig>`);
    writeFileSync(path.join(dir, 'print.png'), await solidPrint(9, 9));
    const script = path.join(dir, 'probe.ts');
    writeFileSync(
      script,
      `import { readFileSync } from 'node:fs';
import { renderSleeveProof } from ${JSON.stringify(path.join(PLATFORM, 'lib/mockups/sleeve-proof'))};
(async () => {
  const print = readFileSync(${JSON.stringify(path.join(dir, 'print.png'))});
  try {
    await renderSleeveProof({ print, printWidthCm: 9, printHeightCm: 9, garmentHex: '#18181a', side: 'left', sleeve: 'short' });
    console.log(JSON.stringify({ drawn: true }));
  } catch (e) {
    console.log(JSON.stringify({ code: (e as { code?: string }).code, message: (e as Error).message }));
  }
})();
`,
    );
    // FONTCONFIG_FILE takes the system's fonts away; PANGOCAIRO_BACKEND=fc makes macOS use fontconfig, as Linux does
    const run = spawnSync(process.execPath, [path.join(PLATFORM, 'node_modules/tsx/dist/cli.mjs'), script], {
      cwd: PLATFORM,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NODE_ENV: 'test', FONTCONFIG_FILE: conf, PANGOCAIRO_BACKEND: 'fc' },
      timeout: 60_000,
    });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const out = JSON.parse(run.stdout.split('\n').filter((line) => line.startsWith('{')).pop() ?? '{}') as { drawn?: boolean; code?: string; message?: string };
    assert.equal(out.code, 'no_font', run.stdout);
    assert.match(out.message ?? '', /Install fontconfig and a font/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
