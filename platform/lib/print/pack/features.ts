// Printable-minimum checks on a binary film (Plan 6.4, Features).
//
// Halftones are full of small features by design, so neither check can apply
// the art's minimums blindly:
// - Specks: isolated ink smaller than half the smallest dot the mesh holds
//   (recipe minDot of one halftone cell) can't print. Only specks with no other
//   ink within one cell count: those are noise in open space. Dots cut where a
//   tint meets an edge are just as small but harmless, and every halftone has
//   them. The art's own smallest feature (minFeatureMm, 0.25 mm) is not used
//   here: a lone halftone dot in a fade is smaller than that and still holds,
//   and a film can't tell the two apart (measured on soft art, Oct 2026: it
//   flagged a thousand dots on one underbase). The engine removes such islands
//   from the art before halftoning.
// - Thin lines: for every ink pixel, the lengths of the ink runs through it
//   along 0°, 45°, 90° and 135°. A pixel is on a thin line when its shortest
//   run is under the minimum line width, its longest run is at least four
//   halftone cells long, and beyond both ends of the shortest run the clear
//   goes on for at least 1.2 cells: open background. Dots never run that long,
//   and the webs between the holes of a tint end in holes, which are under a
//   cell across, at any screen angle (checked from 0° to 82.5° and 35 to 85
//   lpi). Places are connected groups of such pixels at least four cells long.
//   Hairlines closer than 1.2 cells to other ink are left to the engine's own
//   thin-line warning, which sees the art before halftoning.
// Lengths are saturated (63 px for the shortest, 255 px for the longest), far
// above both thresholds at print resolution.
import type { PixelRect } from '@/lib/print/types';

export interface FeatureOptions {
  ppi: number;
  lpi: number;
  /** smallest dot the mesh holds, 0..1 of a cell */
  minDot: number;
  minLineMm: number;
}

export interface FeatureFindings {
  /** isolated specks below the printable minimum */
  specks: number;
  /** components this size or smaller count as specks */
  speckMaxPx: number;
  thinPlaces: number;
  thinPixels: number;
  /** where the first problem sits, in mm from the print area's top left */
  firstAt: { xMm: number; yMm: number } | null;
}

export function featureThresholds(o: FeatureOptions): { speckMaxPx: number; minLinePx: number; longPx: number; cellPx: number; openPx: number } {
  const cell = o.ppi / o.lpi;
  return {
    cellPx: cell,
    speckMaxPx: Math.max(1, Math.floor(0.5 * o.minDot * cell * cell)),
    minLinePx: Math.min(62, (o.minLineMm * o.ppi) / 25.4),
    longPx: Math.min(255, Math.max(4 * cell, (1.5 * o.ppi) / 25.4)),
    // clear space this deep on both sides of a line is open background
    openPx: Math.max(1.2 * cell, (o.minLineMm * o.ppi) / 25.4),
  };
}

/** Copies the area out of a full film as 0/1. */
function extract(plate: Uint8Array, width: number, area: PixelRect): Uint8Array {
  const out = new Uint8Array(area.width * area.height);
  for (let y = 0; y < area.height; y++) {
    const src = (area.y + y) * width + area.x;
    const dst = y * area.width;
    for (let x = 0; x < area.width; x++) out[dst + x] = plate[src + x] >= 128 ? 1 : 0;
  }
  return out;
}

const NX = [-1, 0, 1, -1, 1, -1, 0, 1];
const NY = [-1, -1, -1, 0, 0, 1, 1, 1];

const BIG = 2;
const SMALL = 3;

/** Capped flood fill from one pixel over pixels equal to `value`: marks the
 * component SMALL (at most `cap` pixels) or BIG in `state`, and returns its
 * size when small, 0 when big. Meeting a pixel already marked BIG ends it. */
function classifyFrom(m: Uint8Array, w: number, h: number, value: 0 | 1, cap: number, state: Uint8Array, start: number, queue: Int32Array): number {
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  state[start] = 1;
  let big = false;
  while (head < tail && !big) {
    const p = queue[head++];
    const px = p % w;
    const py = (p - px) / w;
    for (let k = 0; k < 8; k++) {
      const x = px + NX[k];
      const y = py + NY[k];
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const q = y * w + x;
      if (m[q] !== value) continue;
      const s = state[q];
      if (s === BIG) {
        big = true;
        break;
      }
      if (s === 0) {
        state[q] = 1;
        queue[tail++] = q;
        if (tail > cap) {
          big = true;
          break;
        }
      }
    }
  }
  const mark = big ? BIG : SMALL;
  for (let i = 0; i < tail; i++) state[queue[i]] = mark;
  return big ? 0 : tail;
}

/** Every small component (at most `cap` pixels) of the ink. A pixel touching
 * ink already known to be big (left or above) is big without a flood fill. */
function smallInkComponents(m: Uint8Array, w: number, h: number, cap: number, state: Uint8Array): { start: number; size: number }[] {
  const queue = new Int32Array(cap + 9);
  const small: { start: number; size: number }[] = [];
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const start = row + x;
      if (!m[start] || state[start]) continue;
      if (
        (x > 0 && state[start - 1] === BIG) ||
        (y > 0 && (state[start - w] === BIG || (x > 0 && state[start - w - 1] === BIG) || (x + 1 < w && state[start - w + 1] === BIG)))
      ) {
        state[start] = BIG;
        continue;
      }
      const size = classifyFrom(m, w, h, 1, cap, state, start, queue);
      if (size) small.push({ start, size });
    }
  }
  return small;
}

/** True when a speck has no other ink within `radius` px. */
function isolated(m: Uint8Array, w: number, h: number, speck: { start: number; size: number }, radius: number): boolean {
  const sx = speck.start % w;
  const sy = (speck.start - sx) / w;
  let ink = 0;
  for (let y = Math.max(0, sy - radius); y <= Math.min(h - 1, sy + radius); y++) {
    const row = y * w;
    for (let x = Math.max(0, sx - radius); x <= Math.min(w - 1, sx + radius); x++) {
      ink += m[row + x];
      if (ink > speck.size) return false;
    }
  }
  return true;
}

// Run directions: 0 = 0°, 1 = 90°, 2 = 45° (down-right), 3 = 135° (down-left).
const DIR_X = [1, 0, 1, -1];
const DIR_Y = [0, 1, 1, 1];

/** Shortest run (low 6 bits, with its direction in the top 2 bits) and longest
 * run through every ink pixel, in px. */
function chordLengths(m: Uint8Array, w: number, h: number, minRun: Uint8Array, maxRun: Uint8Array, scratch: Uint8Array): void {
  // Rows first: the first direction sets both lengths outright.
  minRun.fill(63);
  maxRun.fill(0);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let x = 0;
    while (x < w) {
      if (!m[row + x]) {
        x++;
        continue;
      }
      const s = x;
      while (x < w && m[row + x]) x++;
      const len = x - s;
      minRun.fill(len < 63 ? len : 63, row + s, row + x);
      maxRun.fill(len < 255 ? len : 255, row + s, row + x);
    }
  }
  // Columns and diagonals: the run-in from above goes into `scratch`, then a
  // walk up from the bottom adds the run-in from below.
  const below = new Uint8Array(w);
  const belowNext = new Uint8Array(w);
  for (let dir = 1; dir < 4; dir++) {
    const dx = DIR_X[dir];
    const step = dx === 0 ? 1 : Math.SQRT2;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      const prev = row - w;
      for (let x = 0; x < w; x++) {
        if (!m[row + x]) {
          scratch[row + x] = 0;
          continue;
        }
        const px = x - dx;
        const up = y > 0 && px >= 0 && px < w ? scratch[prev + px] : 0;
        scratch[row + x] = up < 255 ? up + 1 : 255;
      }
    }
    below.fill(0);
    const tag = dir << 6;
    for (let y = h - 1; y >= 0; y--) {
      const row = y * w;
      belowNext.fill(0);
      for (let x = 0; x < w; x++) {
        const i = row + x;
        if (!m[i]) continue;
        const nx = x + dx;
        const down = (nx >= 0 && nx < w ? below[nx] : 0) + 1;
        belowNext[x] = down < 255 ? down : 255;
        const len = Math.round((scratch[i] + down - 1) * step);
        if (len < (minRun[i] & 63)) minRun[i] = tag | len;
        if (len > maxRun[i]) maxRun[i] = len < 255 ? len : 255;
      }
      below.set(belowNext);
    }
  }
}

/** Walks from ink pixel i along a direction, out of the ink and on through
 * the clear beyond it; true when the clear runs at least `openPx` (or leaves
 * the area): open background, not a halftone hole, which is under a cell
 * across in every direction. */
function opensOnto(m: Uint8Array, w: number, h: number, i: number, dx: number, dy: number, openPx: number): boolean {
  let x = i % w;
  let y = (i - x) / w;
  const stepPx = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
  let k = 0;
  // through the rest of the line
  for (; k < 64; k++) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= w || y >= h) return true;
    if (!m[y * w + x]) break;
  }
  if (k === 64) return false;
  // then across the clear beyond it
  for (let run = stepPx; run < openPx; run += stepPx) {
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= w || y >= h) return true;
    if (m[y * w + x]) return false;
  }
  return true;
}

/** Groups marked pixels (1 in `marks`) into places of at least `minPx` pixels. */
function countPlaces(marks: Uint8Array, w: number, h: number, minPx: number): { places: number; pixels: number; first: number } {
  let places = 0;
  let pixels = 0;
  let first = -1;
  const queue: number[] = [];
  for (let start = 0; start < marks.length; start++) {
    if (marks[start] !== 1) continue;
    queue.length = 0;
    queue.push(start);
    marks[start] = 2;
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head];
      const px = p % w;
      const py = (p - px) / w;
      for (let k = 0; k < 8; k++) {
        const x = px + NX[k];
        const y = py + NY[k];
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const q = y * w + x;
        if (marks[q] === 1) {
          marks[q] = 2;
          queue.push(q);
        }
      }
    }
    if (queue.length >= minPx) {
      places++;
      pixels += queue.length;
      if (first < 0) first = start;
    }
  }
  return { places, pixels, first };
}

export function analyseFeatures(plate: Uint8Array, plateWidth: number, area: PixelRect, options: FeatureOptions): FeatureFindings {
  const t = featureThresholds(options);
  const w = area.width;
  const h = area.height;
  if (w <= 0 || h <= 0) return { specks: 0, speckMaxPx: t.speckMaxPx, thinPlaces: 0, thinPixels: 0, firstAt: null };
  const m = extract(plate, plateWidth, area);
  const state = new Uint8Array(w * h);

  const radius = Math.ceil(t.cellPx);
  const lone = smallInkComponents(m, w, h, t.speckMaxPx, state).filter((s) => isolated(m, w, h, s, radius));

  const minRun = new Uint8Array(w * h);
  const maxRun = new Uint8Array(w * h);
  const scratch = new Uint8Array(w * h);
  chordLengths(m, w, h, minRun, maxRun, scratch);
  const marks = scratch;
  marks.fill(0);
  let marked = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const len = minRun[i] & 63;
    if (len >= t.minLinePx || maxRun[i] < t.longPx) continue;
    const dir = minRun[i] >> 6;
    const dx = DIR_X[dir];
    const dy = DIR_Y[dir];
    if (opensOnto(m, w, h, i, dx, dy, t.openPx) && opensOnto(m, w, h, i, -dx, -dy, t.openPx)) {
      marks[i] = 1;
      marked++;
    }
  }
  const places = marked ? countPlaces(marks, w, h, Math.round(t.longPx)) : { places: 0, pixels: 0, first: -1 };

  const firstIndex = lone.length ? lone[0].start : places.first;
  const firstAt = firstIndex >= 0 ? { xMm: ((firstIndex % w) * 25.4) / options.ppi, yMm: (Math.floor(firstIndex / w) * 25.4) / options.ppi } : null;
  return { specks: lone.length, speckMaxPx: t.speckMaxPx, thinPlaces: places.places, thinPixels: places.pixels, firstAt };
}
