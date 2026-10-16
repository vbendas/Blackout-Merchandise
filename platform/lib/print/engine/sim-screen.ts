// The films of a simulated-process set, all plates together. The plan holds
// each plate's visible area per work pixel (sim-lut.ts). Here the areas are
// resampled to the film (Lanczos-3, as the spot films), and nested into
// coverages at every film pixel: resampling coverages instead would blend
// two neighbouring recipes as stacked dots (later plates inside earlier
// ones), not as the colours between them, and fine detail would print off.
// Then each plate is screened on the set's one screen (halftone.ts: same
// lattice, same threshold matrix, same dot), so the dots nest as the model
// assumes.
//
// The mesh limits are met by dithering whole cells, not by rounding tones: a
// tone between the largest dot and solid prints some cells solid and the
// rest at the largest dot, a tone under the smallest dot prints some cells at
// the smallest dot and leaves the rest empty, in the proportions that keep
// the tone. Rounding instead draws a contour where a smooth gradient crosses
// a limit. Every dot stays within the limits. Cells are picked by a
// low-discrepancy sequence over the lattice (R2), the same on every plate and
// every crop.
//
// Hard pixels are thresholded at 50% instead of screened, so edges stay
// crisp: where a plate prints solid or nothing, and the one anti-aliased step
// between the two.
import type { HalftoneSpec } from '@/lib/print/types';
import { makeScreen, makeTransfer, transfer, type DotGainCurve, type Screen } from './halftone';
import { FieldResampler } from './raster';
import type { AreaSolver } from './sim-model';
import type { PrintSize } from './units';

const R2_A = 0.7548776662466927;
const R2_B = 0.5698402909980532;

/** Thresholds (as halftone.ts screenRow) and each pixel's cell order (0..1) for one row. */
export function screenRowCells(screen: Screen, y: number, x0: number, count: number, th: Float32Array, order: Float32Array): void {
  const { lpi, ppi, cos, sin, dsx, dtx, matrix, n } = screen;
  const X = (x0 + 0.5) / ppi + screen.originXIn;
  const Y = (y + 0.5) / ppi + screen.originYIn;
  let s = (X * cos - Y * sin) * lpi;
  let t = (X * sin + Y * cos) * lpi;
  for (let i = 0; i < count; i++, s += dsx, t += dtx) {
    const cs = Math.floor(s);
    const ct = Math.floor(t);
    const fs = s - cs;
    const ft = t - ct;
    th[i] = matrix[((ft * n) | 0) * n + ((fs * n) | 0)];
    const d = cs * R2_A + ct * R2_B;
    order[i] = d - Math.floor(d);
  }
}

/**
 * Whether the screen prints a pixel of wanted coverage c (after the dot-gain
 * curve), at threshold th in a cell of order `order`, within the mesh limits.
 */
export function screenPixel(c: number, th: number, order: number, minDot: number, maxDot: number): boolean {
  if (c >= 1) return true;
  if (c <= 0) return false;
  if (c < minDot) return c > order * minDot && minDot > th;
  if (c > maxDot) return c - maxDot > order * (1 - maxDot) || maxDot > th;
  return c > th;
}

/** Plates that print a coverage of exactly 0 or 1 at a work pixel, as bits; partial pixels between an
 * on and an off neighbour count too (an anti-aliased edge). */
export function hardBits(areas: Uint8Array[], w: number, h: number, nester: Pick<AreaSolver, 'nestWithinLimit' | 'n' | 'm'>): Uint16Array {
  const n = areas.length;
  if (n > 16) throw new Error(`hardBits: ${n} plates`);
  const out = new Uint16Array(w * h);
  // per row: level per plate and pixel (0 off, 1 solid, 2 partial), three rows kept
  const levels = [new Uint8Array(w * n), new Uint8Array(w * n), new Uint8Array(w * n)];
  const wv = new Float64Array(n + 1);
  const cov = new Float64Array(n);
  const fill = (y: number, into: Uint8Array): void => {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      for (let j = 0; j < n; j++) wv[j + 1] = areas[j][i] / 255;
      nester.nestWithinLimit(wv, cov);
      for (let j = 0; j < n; j++) into[x * n + j] = cov[j] <= 0 ? 0 : cov[j] >= 1 ? 1 : 2;
    }
  };
  if (h > 0) fill(0, levels[1]);
  for (let y = 0; y < h; y++) {
    const prev = y > 0 ? levels[0] : null;
    const cur = levels[1];
    const next = y + 1 < h ? levels[2] : null;
    if (next) fill(y + 1, next);
    for (let x = 0; x < w; x++) {
      let bits = 0;
      for (let j = 0; j < n; j++) {
        const l = cur[x * n + j];
        if (l !== 2) {
          bits |= 1 << j;
          continue;
        }
        let on = false;
        let off = false;
        for (let dy = -1; dy <= 1; dy++) {
          const row = dy < 0 ? prev : dy > 0 ? next : cur;
          if (!row) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if ((dx === 0 && dy === 0) || xx < 0 || xx >= w) continue;
            const ln = row[xx * n + j];
            if (ln === 1) on = true;
            else if (ln === 0) off = true;
          }
        }
        if (on && off) bits |= 1 << j;
      }
      out[y * w + x] = bits;
    }
    // rotate: prev <- cur <- next
    const t = levels[0];
    levels[0] = levels[1];
    levels[1] = levels[2];
    levels[2] = t;
  }
  return out;
}

export interface SimFilmsInput {
  /** visible area per plate on the work grid, 0..255 */
  areas: Uint8Array[];
  hard: Uint16Array;
  srcW: number;
  srcH: number;
  size: PrintSize;
  canvasWidth: number;
  artX: number;
  artY: number;
  halftone: HalftoneSpec;
  /** the press's dot-gain compensation (lib/print/calibration) */
  gain: DotGainCurve;
  nester: Pick<AreaSolver, 'nestWithinLimit' | 'n' | 'm'>;
  /** the underbase plate, or -1: its footprint goes into `foot` for the choke */
  underbase: number;
  /** canvases, one per plate */
  out: Uint8Array[];
  /** print-area sized: 1 where the underbase prints anything */
  foot: Uint8Array;
}

/** Renders every plate of the set. Returns, per plate, its ink pixels and how many of them are screened. */
export function renderSimFilms(input: SimFilmsInput): { on: number; halftoned: number }[] {
  const { areas, hard, srcW, srcH, size, canvasWidth, artX, artY, halftone, nester, underbase, out, foot } = input;
  const n = areas.length;
  const Wp = size.widthPx;
  const Hp = size.heightPx;
  const res = areas.map(
    (field, j) =>
      new FieldResampler(srcW, srcH, Wp, Hp, (row, values, hd, range) => {
        let lo = srcW;
        let hi = -1;
        const base = row * srcW;
        const bit = 1 << j;
        for (let x = 0; x < srcW; x++) {
          const v = field[base + x];
          values[x] = v / 255;
          hd[x] = hard[base + x] & bit ? 1 : 0;
          if (v > 0) {
            if (x < lo) lo = x;
            hi = x;
          }
        }
        range[0] = lo;
        range[1] = hi + 1;
        return hi >= 0;
      }),
  );
  const screen = makeScreen(halftone, size.ppi);
  const curve = makeTransfer({ minDot: 0, maxDot: 1 }, input.gain);
  const minDot = Math.max(0, Math.min(0.5, halftone.minDot));
  const maxDot = Math.max(0.5, Math.min(1, halftone.maxDot));
  const anyLevel = Math.max(1e-3, minDot / 2);
  const rows = areas.map(() => new Float32Array(Wp));
  const th = new Float32Array(Wp);
  const order = new Float32Array(Wp);
  const w = new Float64Array(n + 1);
  const cov = new Float64Array(n);
  const stats = areas.map(() => ({ on: 0, halftoned: 0 }));
  const c0 = res[0]?.c0;
  const c1 = res[0]?.c1;
  foot.fill(0);
  for (let y = 0; y < Hp; y++) {
    let x0 = Wp;
    let x1 = 0;
    for (let j = 0; j < n; j++) {
      const r = res[j].row(y, rows[j]);
      if (r) {
        if (r[0] < x0) x0 = r[0];
        if (r[1] > x1) x1 = r[1];
      }
    }
    if (x1 <= x0) continue;
    screenRowCells(screen, artY + y, artX + x0, x1 - x0, th, order);
    const outRow = (artY + y) * canvasWidth + artX;
    const footRow = y * Wp;
    for (let x = x0; x < x1; x++) {
      let any = false;
      for (let j = 0; j < n; j++) {
        const a = rows[j][x];
        w[j + 1] = a > 0 ? a : 0;
        if (a > 0) any = true;
      }
      if (!any) continue;
      nester.nestWithinLimit(w, cov);
      const a0 = c0[x];
      const b0 = c1[x];
      const t = th[x - x0];
      const o = order[x - x0];
      for (let j = 0; j < n; j++) {
        const v = cov[j];
        if (!(v > 0)) continue;
        const r = res[j];
        const isHard = r.hard0[a0] & r.hard0[b0] & r.hard1[a0] & r.hard1[b0];
        let ink: boolean;
        if (isHard) {
          ink = v >= 0.5;
        } else {
          ink = screenPixel(transfer(curve, v), t, o, minDot, maxDot);
          if (ink) stats[j].halftoned++;
        }
        if (ink) {
          out[j][outRow + x] = 255;
          stats[j].on++;
        }
        if (j === underbase && (isHard ? v >= 0.5 : v > anyLevel)) foot[footRow + x] = 1;
      }
    }
  }
  return stats;
}
