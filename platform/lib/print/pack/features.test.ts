// Fine-line and speck detection on films: halftones at any screen angle are
// not lines, hairlines and noise are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseFeatures, featureThresholds } from './features';
import { amDot, mmToPx } from './synthetic';

const PPI = 600;
const options = (lpi = 55) => ({ ppi: PPI, lpi, minDot: 0.05, minLineMm: 0.3 });

function ramp(angleDeg: number, lpi: number): { plate: Uint8Array; W: number; H: number } {
  const W = mmToPx(30, PPI);
  const H = mmToPx(20, PPI);
  const plate = new Uint8Array(W * H);
  const cell = PPI / lpi;
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  const sin = Math.sin((angleDeg * Math.PI) / 180);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (amDot(x, y, cell, cos, sin, 0.05 + 0.85 * (x / W))) plate[y * W + x] = 255;
  return { plate, W, H };
}

test('a 5-90% AM halftone has no thin lines and no specks, at any common screen angle', () => {
  for (const angle of [0, 15, 22.5, 45, 75]) {
    for (const lpi of [45, 55, 65]) {
      const { plate, W, H } = ramp(angle, lpi);
      const f = analyseFeatures(plate, W, { x: 0, y: 0, width: W, height: H }, options(lpi));
      assert.equal(f.thinPlaces, 0, `${angle}° ${lpi} lpi: no thin lines`);
      assert.equal(f.specks, 0, `${angle}° ${lpi} lpi: no specks`);
    }
  }
});

test('hairlines, a too-thin line and isolated specks are found; a 0.5 mm line is fine', () => {
  const W = mmToPx(40, PPI);
  const H = mmToPx(30, PPI);
  const run = (draw: (p: Uint8Array) => void) => {
    const plate = new Uint8Array(W * H);
    draw(plate);
    return analyseFeatures(plate, W, { x: 0, y: 0, width: W, height: H }, options());
  };
  const block = (p: Uint8Array) => {
    for (let y = 100; y < 400; y++) p.fill(255, y * W + 100, y * W + 400);
  };
  assert.equal(run(block).thinPlaces, 0, 'a solid block has no thin lines');
  // a 3 px (0.13 mm) hairline 5 mm long sticking out of the block
  const hair = run((p) => {
    block(p);
    for (let y = 250; y < 253; y++) p.fill(255, y * W + 400, y * W + 520);
  });
  assert.equal(hair.thinPlaces, 1);
  assert.ok(hair.firstAt && hair.firstAt.xMm > 16 && hair.firstAt.xMm < 17.5);
  const diagonal = run((p) => {
    for (let i = 0; i < 150; i++) for (let k = 0; k < 3; k++) p[(500 + i) * W + 100 + i + k] = 255;
  });
  assert.equal(diagonal.thinPlaces, 1, 'a diagonal hairline');
  const thin = run((p) => {
    for (let y = 600; y < 606; y++) p.fill(255, y * W + 100, y * W + 400);
  });
  assert.equal(thin.thinPlaces, 1, 'a 0.25 mm line is under 0.3 mm');
  const fine = run((p) => {
    for (let y = 600; y < 612; y++) p.fill(255, y * W + 100, y * W + 400);
  });
  assert.equal(fine.thinPlaces, 0, 'a 0.5 mm line holds');
  const specks = run((p) => {
    block(p);
    p[50 * W + 50] = 255;
    p[60 * W + 600] = 255;
    p[61 * W + 600] = 255;
  });
  assert.equal(specks.specks, 2);
});

test('the thresholds follow the recipe and the screen ruling', () => {
  const t = featureThresholds(options());
  assert.equal(t.speckMaxPx, 2, 'half of a 5% dot at 55 lpi, 600 ppi');
  assert.ok(Math.abs(t.minLinePx - 7.09) < 0.01);
  assert.ok(Math.abs(t.longPx - (4 * 600) / 55) < 0.01, 'four halftone cells');
});
