import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chokeBy, dilateSquare, discHalfWidths, erodeSquare, forEachComponent, fullView, removeSmallComponents, spreadInto, thinPixels } from './morphology';

function rect(mask: Uint8Array, w: number, x0: number, y0: number, x1: number, y1: number, v = 255): void {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * w + x] = v;
}

function count(mask: Uint8Array): number {
  let n = 0;
  for (const v of mask) if (v) n++;
  return n;
}

test('disc chords', () => {
  assert.deepEqual([...discHalfWidths(2)], [0, 1, 2, 1, 0]);
  assert.deepEqual([...discHalfWidths(2.5)], [1, 2, 2, 2, 1]);
});

test('trap: an ink spreads by the radius into the later ink, and nowhere else', () => {
  const w = 60;
  const h = 40;
  const a = new Uint8Array(w * h);
  const later = new Uint8Array(w * h);
  rect(a, w, 0, 0, 30, h); // lighter ink on the left
  rect(later, w, 30, 10, w, 30); // darker ink on the right, middle rows only
  const added = spreadInto(fullView(a, w, h), fullView(later, w, h), 4.5);
  assert.ok(added > 0);
  for (let y = 0; y < h; y++) {
    let reach = 0;
    for (let x = 30; x < w && a[y * w + x]; x++) reach++;
    if (y >= 10 && y < 30) assert.equal(reach, 4, `row ${y}`);
    else assert.equal(reach, 0, `row ${y} is outside the later ink`);
  }
});

test('choke: pulls a plate in from its footprint edge by the radius', () => {
  const w = 50;
  const h = 50;
  const plate = new Uint8Array(w * h);
  const foot = new Uint8Array(w * h);
  rect(plate, w, 10, 10, 40, 40);
  rect(foot, w, 10, 10, 40, 40, 1);
  const removed = chokeBy(fullView(plate, w, h), fullView(foot, w, h), 3.2);
  assert.equal(removed, 30 * 30 - 24 * 24);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) assert.equal(plate[y * w + x] !== 0, x >= 13 && x < 37 && y >= 13 && y < 37, `${x},${y}`);
});

test('choke treats the edge of the print area as an edge', () => {
  const w = 20;
  const h = 20;
  const plate = new Uint8Array(w * h).fill(255);
  const foot = new Uint8Array(w * h).fill(1);
  chokeBy(fullView(plate, w, h), fullView(foot, w, h), 2);
  assert.equal(count(plate), 16 * 16);
});

test('thin pixels: a line under the minimum width is all thin, a wide one is not', () => {
  const w = 80;
  const h = 60;
  const f = new Uint8Array(w * h);
  rect(f, w, 5, 10, 75, 13, 1); // 3 px tall line
  rect(f, w, 5, 30, 75, 50, 1); // 20 px tall bar
  const scratch = new Uint8Array(w * h);
  const { thin, area } = thinPixels(fullView(f, w, h), 3.5, fullView(scratch, w, h));
  assert.equal(area, 70 * 3 + 70 * 20);
  // the line, plus a few corner pixels of the bar a disc cannot reach
  assert.ok(thin >= 70 * 3 && thin <= 70 * 3 + 4 * 6, `thin ${thin}`);
});

test('square erosion and dilation', () => {
  const w = 10;
  const h = 10;
  const m = new Uint8Array(w * h);
  rect(m, w, 2, 2, 8, 8, 1);
  assert.equal(count(erodeSquare(m, w, h, 1)), 16);
  assert.equal(count(dilateSquare(m, w, h, 1)), 64);
});

test('components are 8-connected and report their area', () => {
  const w = 10;
  const h = 10;
  const m = new Uint8Array(w * h);
  m[0] = 1;
  m[11] = 1; // diagonal: same component
  rect(m, w, 5, 5, 8, 8, 1);
  const found: number[] = [];
  forEachComponent(m, w, h, 100, (c) => {
    if (c.label === 1) found.push(c.area);
  });
  assert.deepEqual(found.sort(), [2, 9]);
});

test('islands under the minimum merge into their surroundings; protected regions stay', () => {
  const w = 30;
  const h = 30;
  const labels = new Uint8Array(w * h); // 0 = background
  rect(labels, w, 5, 5, 25, 25, 1); // a big region of ink 1
  labels[10 * w + 10] = 2; // a speck of ink 2 inside it
  labels[2 * w + 2] = 1; // a speck of ink 1 outside
  rect(labels, w, 26, 26, 28, 28, 3); // a 2x2 island of ink 3 next to...
  labels[26 * w + 28] = 7; // ...a protected pixel
  const changed: number[] = [];
  const res = removeSmallComponents(labels, w, h, 3, { isProtected: (l) => l === 7, relabel: (i) => changed.push(i) });
  assert.equal(labels[10 * w + 10], 1);
  assert.equal(labels[2 * w + 2], 0);
  assert.equal(labels[26 * w + 26], 3, 'touches a protected label, kept');
  assert.equal(res.components, 2);
  assert.deepEqual(changed.sort((a, b) => a - b), [2 * w + 2, 10 * w + 10]);
});
