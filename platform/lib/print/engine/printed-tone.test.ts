// Printed tone (printed-tone.ts): with a calibrated press the films carry
// compensated, smaller dots, and the proofs and the accuracy figure add the
// measured gain back, so they show the print rather than the film. Synthetic
// films at 600 ppi; no database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type { DotGainProfile, InkSystemProfile, ScreenSet } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE } from '@/lib/print/defaults';
import { compensationFor, printedCoverageFor } from '@/lib/print/calibration/curve';
import { deltaE2000, hexToLab, rgb8ToLab } from './colour';
import { makeScreen, screenRow } from './halftone';
import { halftoneEdgeDensity, printedToneOf, toneScratch, toneShift, ToneTally } from './printed-tone';
import { screenLayers, screenProof } from './proof';
import { canvasSpec } from './units';
import { WHITE } from './testing';
import { hexToLinear } from './colour';

const PPI = 600;
const SCREEN = DEFAULT_RECIPE.halftone;
/** A typical screen-print gain: 50% on the film prints as 65%. */
const GAIN: DotGainProfile = {
  measuredAt: '2026-10-16T09:00:00Z',
  method: 'manual',
  lpi: 55,
  angleDeg: 22.5,
  mesh: 230,
  points: [
    { input: 0.25, printed: 0.36 },
    { input: 0.5, printed: 0.65 },
    { input: 0.75, printed: 0.86 },
  ],
};
const CALIBRATED: InkSystemProfile = { ...DEFAULT_INK_SYSTEM, dotGain: GAIN };
const RED = '#C8102E';

/** A W x H print area with a margin, one ink plate: the left half a flat tint at film coverage `film`, the right half solid. */
function tintAndSolid(film: number, W = 2400, H = 1200): ScreenSet {
  const canvas = canvasSpec({ widthPx: W, heightPx: H, ppi: PPI, widthMm: (W / PPI) * 25.4, heightMm: (H / PPI) * 25.4, sourcePpi: PPI }, { sideMarginMm: 5, endMarginMm: 5, inkGapMm: 1 });
  const data = new Uint8Array(canvas.widthPx * canvas.heightPx);
  const screen = makeScreen(SCREEN, PPI);
  const th = new Float32Array(W);
  for (let y = 0; y < H; y++) {
    const cy = canvas.art.y + y;
    screenRow(screen, cy, canvas.art.x, W, th);
    for (let x = 0; x < W; x++) {
      const on = x < W / 2 ? film > th[x] : true;
      if (on) data[cy * canvas.widthPx + canvas.art.x + x] = 255;
    }
  }
  return {
    key: 'lights',
    garmentCodes: [WHITE.code],
    needsUnderbase: false,
    method: 'spot',
    canvas,
    plates: [
      {
        index: 1,
        role: 'ink',
        target: { hex: RED, lab: hexToLab(RED) },
        base: DEFAULT_INK_SYSTEM.bases.light,
        plate: { width: canvas.widthPx, height: canvas.heightPx, ppi: PPI, data },
        coverage: 0,
        halftone: { ...SCREEN },
        meshSuggestion: 230,
      },
    ],
    warnings: [],
  };
}

async function packshot(): Promise<Buffer> {
  return sharp({ create: { width: 1000, height: 600, channels: 4, background: WHITE.hex } })
    .png()
    .toBuffer();
}

/** Mean colour (Lab) of the proof over a box given in print-area fractions. The print (2400 px) spans 150 proof pixels, 16 film
 * pixels to a proof pixel, about one and a half halftone cells, as a 28 cm print on a packshot does. */
async function proofLab(set: ScreenSet, inks: InkSystemProfile, box: { x0: number; x1: number; y0: number; y1: number }) {
  const image = (await screenProof(set, WHITE, { image: await packshot(), printBox: { x: 0.1, y: 0.1, w: 0.15, h: 0.6 } }, inks)).image;
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // the print box: x 100..250, the print 150 px wide and 75 tall from y 60
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = Math.round(60 + 75 * box.y0); y < Math.round(60 + 75 * box.y1); y++) {
    for (let x = Math.round(100 + 150 * box.x0); x < Math.round(100 + 150 * box.x1); x++) {
      const o = (y * info.width + x) * 3;
      sum[0] += data[o];
      sum[1] += data[o + 1];
      sum[2] += data[o + 2];
      n++;
    }
  }
  return rgb8ToLab(Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n));
}

test('a halftone has edges at every tone and none when solid or bare; the curve is the one the engine compensates by', () => {
  const density = halftoneEdgeDensity(SCREEN, PPI);
  assert.equal(density(0), 0);
  assert.equal(density(1), 0);
  for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) assert.ok(density(f) > 0.05, `edges at ${f}: ${density(f)}`);
  assert.ok(density(0.5) > density(0.1) && density(0.5) > density(0.9));
  // printedToneOf reads the same fitted curve that dotGainFor inverts
  const tone = printedToneOf(tintAndSolid(0.5), CALIBRATED);
  const compensate = compensationFor(GAIN);
  assert.ok(tone && compensate);
  for (const p of [0.2, 0.5, 0.8]) assert.ok(Math.abs(tone.tone(compensate(p)) - p) < 1e-6);
});

test('no calibration, an unusable one, or an index set: the films print as they are', () => {
  assert.equal(printedToneOf(tintAndSolid(0.5), DEFAULT_INK_SYSTEM), null);
  assert.equal(printedToneOf(tintAndSolid(0.5), { dotGain: { ...GAIN, points: [] } }), null);
  assert.equal(printedToneOf({ ...tintAndSolid(0.5), method: 'index' }, CALIBRATED), null);
});

test('a flat tint gains what the curve says; a solid edge covering as much of a region gains only a small share of it', () => {
  const set = tintAndSolid(0.4);
  const tone = printedToneOf(set, CALIBRATED);
  assert.ok(tone);
  const { art, widthPx: W } = set.canvas;
  const data = set.plates[0].plate.data;
  // two regions of 40 x 40 px: one inside the tint, one straddling the tint/solid boundary... and one on a solid edge
  const tally = new ToneTally(2, 1);
  const tint = (x: number, y: number) => x >= 100 && x < 140 && y >= 100 && y < 140;
  for (let y = 1; y < art.height; y++) {
    for (let x = 1; x < art.width; x++) {
      const at = (yy: number, xx: number) => (data[(art.y + yy) * W + art.x + xx] ? 1 : 0);
      if (tint(x, y)) tally.add(0, at(y, x), at(y, x - 1), at(y - 1, x));
    }
  }
  // a solid edge: half the region on, straight boundary
  for (let y = 0; y < 40; y++) {
    for (let x = 0; x < 40; x++) {
      const on = x < 20 ? 1 : 0;
      tally.add(1, on, x > 0 ? (x - 1 < 20 ? 1 : 0) : on, on);
    }
  }
  const layers = screenLayers(set, CALIBRATED);
  const ground = hexToLinear(WHITE.hex);
  const scratch = toneScratch(1);
  const delta: [number, number, number] = [0, 0, 0];
  const f = tally.on[0] / tally.total[0];
  const grownTint = toneShift(tone, tally, 0, layers, ground, scratch, delta);
  assert.ok(grownTint !== null);
  const wanted = (printedCoverageFor(GAIN) as (v: number) => number)(f) - f;
  assert.ok(Math.abs(grownTint - wanted) < 0.25 * wanted, `tint grows ${grownTint.toFixed(3)}, the curve says ${wanted.toFixed(3)}`);
  const grownEdge = toneShift(tone, tally, 1, layers, ground, scratch, delta);
  const edgeWanted = (printedCoverageFor(GAIN) as (v: number) => number)(0.5) - 0.5;
  assert.ok(grownEdge !== null && grownEdge < 0.35 * edgeWanted, `a solid edge grows ${grownEdge?.toFixed(3)}, a 50% tint ${edgeWanted.toFixed(3)}`);
});

test('proofs show the print: compensated films proof as the uncalibrated ones do, solids and tints, where the film alone looks lighter', async () => {
  const compensate = compensationFor(GAIN);
  assert.ok(compensate);
  const plain = tintAndSolid(0.5);
  const compensated = tintAndSolid(compensate(0.5));
  const tintBox = { x0: 0.1, x1: 0.4, y0: 0.2, y1: 0.8 };
  const solidBox = { x0: 0.6, x1: 0.9, y0: 0.2, y1: 0.8 };

  const before = await proofLab(plain, DEFAULT_INK_SYSTEM, tintBox);
  const after = await proofLab(compensated, CALIBRATED, tintBox);
  const filmOnly = await proofLab(compensated, DEFAULT_INK_SYSTEM, tintBox);
  assert.ok(deltaE2000(before, after) < 2, `calibrated proof ΔE ${deltaE2000(before, after).toFixed(2)} from the uncalibrated one`);
  assert.ok(deltaE2000(before, filmOnly) > 5, `the compensated film alone is lighter: ΔE ${deltaE2000(before, filmOnly).toFixed(2)}`);
  assert.ok(after.L < filmOnly.L);

  const solidBefore = await proofLab(plain, DEFAULT_INK_SYSTEM, solidBox);
  const solidAfter = await proofLab(compensated, CALIBRATED, solidBox);
  assert.ok(deltaE2000(solidBefore, solidAfter) < 0.5, 'a solid prints as it did');
});
