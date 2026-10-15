import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RECIPE } from '@/lib/print/defaults';
import { IDENTITY_TRANSFER, halftoneField, makeScreen, makeTransfer, transfer } from './halftone';
import { forEachComponent } from './morphology';
import { distinctValues } from './testing';

const PPI = 600;
const SIZE = 1000;

function coverageOf(c: number, dot: 'round' | 'ellipse', angleDeg = 22.5): number {
  const field = new Uint8Array(SIZE * SIZE).fill(Math.round(c * 255));
  const out = halftoneField(field, SIZE, SIZE, makeScreen({ lpi: 55, angleDeg, dot }, PPI), IDENTITY_TRANSFER);
  let on = 0;
  for (let i = 0; i < out.length; i++) if (out[i]) on++;
  return on / out.length;
}

test('50% in gives 50% ± 2% out at 600 ppi, 55 lpi, 22.5°', () => {
  const got = coverageOf(0.5, 'round');
  assert.ok(Math.abs(got - 0.5) <= 0.02, `coverage ${got}`);
});

test('coverage is linear across the tone range, round and elliptical dots', () => {
  for (const dot of ['round', 'ellipse'] as const) {
    for (const c of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const want = Math.round(c * 255) / 255;
      const got = coverageOf(c, dot);
      assert.ok(Math.abs(got - want) <= 0.02, `${dot} ${c}: ${got}`);
    }
  }
});

test('output is binary', () => {
  const field = new Uint8Array(400 * 400);
  for (let i = 0; i < field.length; i++) field[i] = i % 256;
  const out = halftoneField(field, 400, 400, makeScreen({ lpi: 55, angleDeg: 22.5, dot: 'round' }, PPI));
  assert.deepEqual([...distinctValues(out)].sort((a, b) => a - b), [0, 255]);
});

function dotLattice(angleDeg: number): { angles: number[]; spacings: number[] } {
  const n = 700;
  const field = new Uint8Array(n * n).fill(Math.round(0.15 * 255));
  const out = halftoneField(field, n, n, makeScreen({ lpi: 55, angleDeg, dot: 'round' }, PPI), IDENTITY_TRANSFER);
  const centres: [number, number][] = [];
  forEachComponent(out, n, n, 10000, (c) => {
    if (c.label !== 255 || !c.spans) return;
    let sx = 0;
    let sy = 0;
    let a = 0;
    for (let k = 0; k < c.spans.length; k += 3) {
      for (let x = c.spans[k + 1]; x <= c.spans[k + 2]; x++) {
        sx += x;
        sy += c.spans[k];
        a++;
      }
    }
    const cx = sx / a;
    const cy = sy / a;
    if (cx > 50 && cx < n - 50 && cy > 50 && cy < n - 50) centres.push([cx, cy]);
  });
  const angles: number[] = [];
  const spacings: number[] = [];
  for (const [x, y] of centres) {
    let best = Infinity;
    let vec: [number, number] = [0, 0];
    for (const [u, v] of centres) {
      const d = Math.hypot(u - x, v - y);
      if (d > 1 && d < best) {
        best = d;
        vec = [u - x, v - y];
      }
    }
    spacings.push(best);
    // press convention: counter-clockwise on the film, image y points down
    const deg = (Math.atan2(-vec[1], vec[0]) * 180) / Math.PI;
    angles.push(((deg % 90) + 90) % 90);
  }
  return { angles, spacings };
}

test('the dot lattice runs at the screen angle with the screen spacing', () => {
  for (const angle of [22.5, 45, 15, 75]) {
    const { angles, spacings } = dotLattice(angle);
    assert.ok(angles.length > 100, `found ${angles.length} dots`);
    const median = (v: number[]): number => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
    const want = angle % 90;
    const diff = Math.abs(median(angles) - want);
    assert.ok(Math.min(diff, 90 - diff) <= 1, `angle ${angle}: median ${median(angles)}`);
    const pitch = PPI / 55;
    assert.ok(Math.abs(median(spacings) - pitch) <= pitch * 0.03, `spacing ${median(spacings)} vs ${pitch}`);
  }
});

test('a crop with its origin halftones exactly like the same region of the whole', () => {
  const w = 300;
  const h = 200;
  const field = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) field[y * w + x] = (x * 255) / w;
  const whole = halftoneField(field, w, h, makeScreen({ lpi: 55, angleDeg: 22.5, dot: 'round' }, PPI));
  const x0 = 123;
  const y0 = 57;
  const cw = 90;
  const ch = 70;
  const sub = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) sub[y * cw + x] = field[(y0 + y) * w + x0 + x];
  const crop = halftoneField(sub, cw, ch, makeScreen({ lpi: 55, angleDeg: 22.5, dot: 'round' }, PPI, { x: x0, y: y0 }));
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) assert.equal(crop[y * cw + x], whole[(y0 + y) * w + x0 + x]);
});

test('mesh limits: tones under the minimum dot drop or round up, past the maximum go solid', () => {
  const lut = makeTransfer(DEFAULT_RECIPE.halftone);
  assert.equal(transfer(lut, 0.02), 0);
  assert.ok(Math.abs(transfer(lut, 0.03) - 0.05) < 1e-6);
  assert.ok(Math.abs(transfer(lut, 0.3) - 0.3) < 1e-3);
  assert.ok(Math.abs(transfer(lut, 0.92) - 0.9) < 1e-6);
  assert.equal(transfer(lut, 0.96), 1);
  assert.equal(transfer(lut, 0), 0);
  assert.equal(transfer(lut, 1), 1);
  // a dot-gain curve plugs in before the limits
  const gained = makeTransfer(DEFAULT_RECIPE.halftone, (c) => c * 0.8);
  assert.ok(Math.abs(transfer(gained, 0.5) - 0.4) < 1e-3);
});
