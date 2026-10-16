// Index separations, step 1: the cell grid (plan section 4.3). Square cells
// of one size on the film (default 200 per inch: 3 x 3 px at 600 ppi),
// anchored at the print area's top left, so every plate of a set shares one
// grid. Each cell gets the art over the set's reference garment, as the
// artist saw it (sRGB "normal" blending, as analyse.ts does): area-averaged
// in linear light where the work grid is finer than the cells, Lanczos-3
// clamped to the four nearest art pixels where it is coarser (edges stay
// sharp and do not ring). A cell whose colour is within the knockout
// tolerance of the garment is bare garment by design: it prints nothing and
// the dither never spills into it. Anti-aliased edge cells are then folded
// into the side they mostly belong to (foldEdges), as analyse.ts folds them
// for spot: an edge blend is not a colour of its own, and dithering it
// brings in inks from nowhere near (a sky-blue rim on a brown shape).
import type { Lab, PrintRecipe } from '@/lib/print/types';
import { SRGB8_TO_LINEAR, deltaE2000, linearToLab, linearToOklab, linearToSrgb8, srgbToLinear, type Vec3 } from './colour';
import type { WorkGrid } from './analyse';
import { MM_PER_INCH, type PrintSize } from './units';

/** Default cell resolution: 200 cells per inch, 0.127 mm squares. */
export const INDEX_CELL_PPI = 200;

/** The coarsest grid: 1 mm squares. Coarser cells would print as visible blocks, and a near-zero value would ask for cells
 * hundreds of millions of pixels wide. */
export const MIN_INDEX_CELL_PPI = 25;

/** Cells per inch: the recipe's `indexCellPpi` (25 at the coarsest, no finer than the films' own pixels), else 200. */
export function indexCellPpi(recipe: PrintRecipe): number {
  const v = (recipe as PrintRecipe & { indexCellPpi?: number }).indexCellPpi;
  if (!(typeof v === 'number' && Number.isFinite(v) && v > 0)) return INDEX_CELL_PPI;
  const finest = recipe.screenPpi > 0 ? recipe.screenPpi : Infinity;
  return Math.min(finest, Math.max(MIN_INDEX_CELL_PPI, v));
}

/** Film pixels per cell side: a whole number, so every cell on the film is the same square. */
export function indexCellPx(screenPpi: number, cellPpi: number): number {
  return Math.max(1, Math.round(screenPpi / cellPpi));
}

export interface CellGrid {
  /** cells across and down; the last column and row may be cut by the print area */
  cw: number;
  ch: number;
  /** film pixels per cell side at the screen ppi */
  cellPx: number;
  /** cells per inch as made (screen ppi / cellPx) */
  cellPpi: number;
  /** the print area in film pixels */
  widthPx: number;
  heightPx: number;
  /** the art over the reference garment per cell: 8-bit sRGB, RGB interleaved */
  rgb: Uint8Array;
  /** 1 where the art prints, 0 where it is bare garment (transparent or knocked out) */
  body: Uint8Array;
  /** 1 for printing cells inside a flat area (foldEdges sets it); 0 for edges, hairlines and steep shading */
  flat: Uint8Array;
}

/** Cell side in mm. */
export function cellMm(cells: Pick<CellGrid, 'cellPpi'>): number {
  return MM_PER_INCH / cells.cellPpi;
}

/** 7-bit colour key, as classify.ts caches by. */
export function key7(r: number, g: number, b: number): number {
  return ((r >> 1) << 14) | ((g >> 1) << 7) | (b >> 1);
}

/** Linear value of a 7-bit bin centre (two 8-bit levels). */
export const BIN7_TO_LINEAR: Float64Array = (() => {
  const t = new Float64Array(128);
  for (let i = 0; i < 128; i++) t[i] = srgbToLinear((2 * i + 0.5) / 255);
  return t;
})();

interface AxisTaps {
  /** taps per output sample */
  k: number;
  idx: Int32Array;
  w: Float32Array;
  /** the two source samples nearest each output (the anti-ringing range) */
  near0: Int32Array;
  near1: Int32Array;
}

function lanczos3(x: number): number {
  if (x === 0) return 1;
  if (x <= -3 || x >= 3) return 0;
  const p = Math.PI * x;
  return (3 * Math.sin(p) * Math.sin(p / 3)) / (p * p);
}

/**
 * Taps from n source samples onto `cells` cells of `cellPx` film pixels over
 * `filmPx` film pixels (the same extent as the source). Box (area) weights
 * when a cell covers at least one source sample, Lanczos-3 when it covers
 * less. `up` says which.
 */
function axisTaps(n: number, filmPx: number, cellPx: number, cells: number): { taps: AxisTaps; up: boolean } {
  const scale = n / filmPx;
  const up = cellPx * scale < 0.999;
  const k = up ? 6 : Math.ceil(cellPx * scale) + 2;
  const idx = new Int32Array(cells * k);
  const w = new Float32Array(cells * k);
  const near0 = new Int32Array(cells);
  const near1 = new Int32Array(cells);
  const clamp = (i: number): number => (i < 0 ? 0 : i >= n ? n - 1 : i);
  for (let c = 0; c < cells; c++) {
    const f0 = c * cellPx;
    const f1 = Math.min(filmPx, f0 + cellPx);
    const a = f0 * scale;
    const b = f1 * scale;
    const o = c * k;
    const centre = (a + b) / 2 - 0.5;
    near0[c] = clamp(Math.floor(centre));
    near1[c] = clamp(Math.floor(centre) + 1);
    if (!up) {
      let t = 0;
      const span = b - a;
      for (let i = Math.floor(a); i < Math.ceil(b) && t < k; i++) {
        const overlap = Math.min(b, i + 1) - Math.max(a, i);
        if (overlap <= 0) continue;
        idx[o + t] = clamp(i);
        w[o + t] = overlap / span;
        t++;
      }
      for (; t < k; t++) idx[o + t] = idx[o];
    } else {
      const i0 = Math.floor(centre) - 2;
      let sum = 0;
      for (let t = 0; t < 6; t++) {
        const v = lanczos3(i0 + t - centre);
        idx[o + t] = clamp(i0 + t);
        w[o + t] = v;
        sum += v;
      }
      for (let t = 0; t < 6; t++) w[o + t] /= sum;
    }
  }
  return { taps: { k, idx, w, near0, near1 }, up };
}

interface RowSlot {
  j: number;
  /** horizontally resampled linear RGB, cw * 3 */
  v: Float32Array;
  /** per channel min and max of the two nearest source samples (upsampling only) */
  lo: Float32Array;
  hi: Float32Array;
}

/**
 * The cell grid of the art over the reference garment `garment8` (8-bit
 * sRGB). Streams the work grid row by row; memory is the output plus a few
 * rows.
 */
export function sampleCells(grid: WorkGrid, garment8: Vec3, garmentLab: Lab, knockoutDeltaE: number, size: PrintSize, cellPx: number): CellGrid {
  const { width: w, height: h, rgba } = grid;
  const Wp = size.widthPx;
  const Hp = size.heightPx;
  const cw = Math.ceil(Wp / cellPx);
  const ch = Math.ceil(Hp / cellPx);
  const cols = axisTaps(w, Wp, cellPx, cw);
  const rows = axisTaps(h, Hp, cellPx, ch);
  const up = cols.up || rows.up;
  const [gr, gg, gb] = garment8;

  const line = new Float32Array(w * 3);
  const slots: RowSlot[] = Array.from({ length: rows.taps.k + 2 }, () => ({
    j: -1,
    v: new Float32Array(cw * 3),
    lo: new Float32Array(up ? cw * 3 : 0),
    hi: new Float32Array(up ? cw * 3 : 0),
  }));
  const ct = cols.taps;
  const slotFor = (j: number): RowSlot => {
    const s = slots[j % slots.length];
    if (s.j === j) return s;
    s.j = j;
    // the art over the garment, sRGB blending, then linear
    const base = j * w * 4;
    for (let x = 0; x < w; x++) {
      const p = base + x * 4;
      const a = rgba[p + 3];
      let r: number;
      let g: number;
      let b: number;
      if (a === 255) {
        r = rgba[p];
        g = rgba[p + 1];
        b = rgba[p + 2];
      } else if (a === 0) {
        r = gr;
        g = gg;
        b = gb;
      } else {
        const f = a / 255;
        r = Math.round(rgba[p] * f + gr * (1 - f));
        g = Math.round(rgba[p + 1] * f + gg * (1 - f));
        b = Math.round(rgba[p + 2] * f + gb * (1 - f));
      }
      line[x * 3] = SRGB8_TO_LINEAR[r];
      line[x * 3 + 1] = SRGB8_TO_LINEAR[g];
      line[x * 3 + 2] = SRGB8_TO_LINEAR[b];
    }
    const k = ct.k;
    for (let c = 0; c < cw; c++) {
      let v0 = 0;
      let v1 = 0;
      let v2 = 0;
      for (let t = 0; t < k; t++) {
        const wt = ct.w[c * k + t];
        if (wt === 0) continue;
        const q = ct.idx[c * k + t] * 3;
        v0 += wt * line[q];
        v1 += wt * line[q + 1];
        v2 += wt * line[q + 2];
      }
      s.v[c * 3] = v0;
      s.v[c * 3 + 1] = v1;
      s.v[c * 3 + 2] = v2;
      if (up) {
        const qa = ct.near0[c] * 3;
        const qb = ct.near1[c] * 3;
        for (let ch3 = 0; ch3 < 3; ch3++) {
          const A = line[qa + ch3];
          const B = line[qb + ch3];
          s.lo[c * 3 + ch3] = A < B ? A : B;
          s.hi[c * 3 + ch3] = A < B ? B : A;
        }
      }
    }
    return s;
  };

  const rgb = new Uint8Array(cw * ch * 3);
  const body = new Uint8Array(cw * ch);
  // knockout per 7-bit colour: 0 unknown, 1 prints, 2 garment
  const knock = new Uint8Array(1 << 21);
  const rt = rows.taps;
  const live: RowSlot[] = [];
  const lw: number[] = [];
  for (let cy = 0; cy < ch; cy++) {
    live.length = 0;
    lw.length = 0;
    for (let t = 0; t < rt.k; t++) {
      const wt = rt.w[cy * rt.k + t];
      if (wt === 0) continue;
      live.push(slotFor(rt.idx[cy * rt.k + t]));
      lw.push(wt);
    }
    const s0 = up ? slotFor(rt.near0[cy]) : null;
    const s1 = up ? slotFor(rt.near1[cy]) : null;
    for (let c = 0; c < cw; c++) {
      const o = (cy * cw + c) * 3;
      for (let ch3 = 0; ch3 < 3; ch3++) {
        let v = 0;
        for (let t = 0; t < live.length; t++) v += lw[t] * live[t].v[c * 3 + ch3];
        if (s0 && s1) {
          const lo = Math.min(s0.lo[c * 3 + ch3], s1.lo[c * 3 + ch3]);
          const hi = Math.max(s0.hi[c * 3 + ch3], s1.hi[c * 3 + ch3]);
          v = v < lo ? lo : v > hi ? hi : v;
        }
        rgb[o + ch3] = linearToSrgb8(v);
      }
      const r = rgb[o];
      const g = rgb[o + 1];
      const b = rgb[o + 2];
      const key = key7(r, g, b);
      let kn = knock[key];
      if (kn === 0) {
        const lab = linearToLab(BIN7_TO_LINEAR[r >> 1], BIN7_TO_LINEAR[g >> 1], BIN7_TO_LINEAR[b >> 1]);
        kn = deltaE2000(lab, garmentLab) <= knockoutDeltaE ? 2 : 1;
        knock[key] = kn;
      }
      body[cy * cw + c] = kn === 1 ? 1 : 0;
    }
  }
  return { cw, ch, cellPx, cellPpi: size.ppi / cellPx, widthPx: Wp, heightPx: Hp, rgb, body, flat: new Uint8Array(cw * ch) };
}

let OK7: Float32Array | null = null;

/** OKLab of every 7-bit colour (bin centres), built once per process (24 MB). */
export function ok7Table(): Float32Array {
  if (OK7) return OK7;
  const t = new Float32Array((1 << 21) * 3);
  const q: Vec3 = [0, 0, 0];
  for (let r = 0; r < 128; r++) {
    for (let g = 0; g < 128; g++) {
      for (let b = 0; b < 128; b++) {
        linearToOklab(BIN7_TO_LINEAR[r], BIN7_TO_LINEAR[g], BIN7_TO_LINEAR[b], q);
        const o = ((r << 14) | (g << 7) | b) * 3;
        t[o] = q[0];
        t[o + 1] = q[1];
        t[o + 2] = q[2];
      }
    }
  }
  OK7 = t;
  return t;
}

/** Neighbours this close (OKLab) make a cell part of a flat area. */
const CORE_OK = 0.025;
/** Candidate colours closer than this are one. */
const SAME_OK = 0.02;
/** An edge cell within this (OKLab) of a blend of two neighbouring colours is that blend... */
const FOLD_OK = 0.03;
/** ... when the two differ by at least this: an edge, not a step of a soft fade. */
const FOLD_CONTRAST_OK = 0.1;
const MAX_ENDS = 6;

/**
 * Folds anti-aliased edge cells into their neighbours. A cell that is not
 * flat and whose colour is (within FOLD_OK) an sRGB blend of two contrasting
 * colours within two cells of it (or of one and the bare garment) takes the
 * colour it is more than half of; a blend that is mostly garment becomes
 * garment. The colours it can fold into are flat cells, and cells in a
 * uniform run of three (the solid middle of a line too thin to have flat
 * cells), so lines two or three cells wide get clean edges too. Shading and
 * hairlines finer than a cell are not blends of their neighbours and stay
 * as they are (the dither renders them). Marks the flat cells (cells.flat),
 * the folded ones with them. Returns the cells changed.
 */
export function foldEdges(cells: CellGrid, garment8: Vec3): number {
  const { cw, ch, rgb, body } = cells;
  const n = cw * ch;
  const OK = ok7Table();
  const okOf = (i: number): number => key7(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]) * 3;
  const near = (a: number, b: number, tol: number): boolean => (OK[a] - OK[b]) ** 2 + (OK[a + 1] - OK[b + 1]) ** 2 + (OK[a + 2] - OK[b + 2]) ** 2 < tol * tol;
  // core: the whole 3 x 3 alike; pure: alike with both neighbours along some direction
  const core = new Uint8Array(n);
  const pure = new Uint8Array(n);
  const alike = (oi: number, x: number, y: number): boolean => x >= 0 && y >= 0 && x < cw && y < ch && body[y * cw + x] !== 0 && near(oi, okOf(y * cw + x), CORE_OK);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (!body[i]) continue;
      const oi = okOf(i);
      const l = alike(oi, x - 1, y);
      const r = alike(oi, x + 1, y);
      const u = alike(oi, x, y - 1);
      const d = alike(oi, x, y + 1);
      const ul = alike(oi, x - 1, y - 1);
      const dr = alike(oi, x + 1, y + 1);
      const ur = alike(oi, x + 1, y - 1);
      const dl = alike(oi, x - 1, y + 1);
      core[i] = l && r && u && d && ul && dr && ur && dl ? 1 : 0;
      pure[i] = (l && r) || (u && d) || (ul && dr) || (ur && dl) ? 1 : 0;
    }
  }
  // endpoints: the cell index of a pure neighbour, or -2 for the bare garment
  const ends = new Int32Array(MAX_ENDS);
  const endRgb = new Float64Array(MAX_ENDS * 3);
  const endOk = new Float64Array(MAX_ENDS * 3);
  const ok: Vec3 = [0, 0, 0];
  const gOk: Vec3 = [0, 0, 0];
  linearToOklab(SRGB8_TO_LINEAR[garment8[0]], SRGB8_TO_LINEAR[garment8[1]], SRGB8_TO_LINEAR[garment8[2]], gOk);
  const to = new Int32Array(n).fill(-1);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (!body[i] || core[i]) continue;
      const oi = okOf(i);
      let ne = 0;
      let garmentSeen = false;
      for (let ring = 1; ring <= 2 && ne < MAX_ENDS; ring++) {
        for (let dy = -ring; dy <= ring && ne < MAX_ENDS; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= ch) continue;
          for (let dx = -ring; dx <= ring && ne < MAX_ENDS; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
            const xx = x + dx;
            if (xx < 0 || xx >= cw) continue;
            const j = yy * cw + xx;
            if (!body[j]) {
              if (garmentSeen) continue;
              garmentSeen = true;
              ends[ne] = -2;
              endRgb[ne * 3] = garment8[0];
              endRgb[ne * 3 + 1] = garment8[1];
              endRgb[ne * 3 + 2] = garment8[2];
              endOk.set(gOk, ne * 3);
              ne++;
              continue;
            }
            if (!pure[j]) continue;
            const oj = okOf(j);
            // a run of the cell's own colour is the same blend, not a side of it
            if (near(oi, oj, SAME_OK)) continue;
            let dup = false;
            for (let e = 0; e < ne && !dup; e++) if (ends[e] >= 0 && near(okOf(ends[e]), oj, SAME_OK)) dup = true;
            if (dup) continue;
            ends[ne] = j;
            endRgb[ne * 3] = rgb[j * 3];
            endRgb[ne * 3 + 1] = rgb[j * 3 + 1];
            endRgb[ne * 3 + 2] = rgb[j * 3 + 2];
            endOk[ne * 3] = OK[oj];
            endOk[ne * 3 + 1] = OK[oj + 1];
            endOk[ne * 3 + 2] = OK[oj + 2];
            ne++;
          }
        }
      }
      if (ne === 0) continue;
      const pr = rgb[i * 3];
      const pg = rgb[i * 3 + 1];
      const pb = rgb[i * 3 + 2];
      // of the blends that explain the cell, the two most different colours are
      // the edge's two sides (a grey is a blend of any two other greys)
      let bestContrast = -1;
      let pick = -1;
      for (let a = 0; a < ne; a++) {
        for (let b = a; b < ne; b++) {
          const contrast = Math.hypot(endOk[a * 3] - endOk[b * 3], endOk[a * 3 + 1] - endOk[b * 3 + 1], endOk[a * 3 + 2] - endOk[b * 3 + 2]);
          if (b !== a && contrast < FOLD_CONTRAST_OK) continue;
          if (contrast <= bestContrast) continue;
          // anti-aliasing blends in sRGB
          const ex = endRgb[b * 3] - endRgb[a * 3];
          const ey = endRgb[b * 3 + 1] - endRgb[a * 3 + 1];
          const ez = endRgb[b * 3 + 2] - endRgb[a * 3 + 2];
          const len2 = ex * ex + ey * ey + ez * ez;
          let t = 0;
          if (len2 > 0) {
            t = ((pr - endRgb[a * 3]) * ex + (pg - endRgb[a * 3 + 1]) * ey + (pb - endRgb[a * 3 + 2]) * ez) / len2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
          }
          linearToOklab(
            srgbToLinear((endRgb[a * 3] + t * ex) / 255),
            srgbToLinear((endRgb[a * 3 + 1] + t * ey) / 255),
            srgbToLinear((endRgb[a * 3 + 2] + t * ez) / 255),
            ok,
          );
          const d = Math.hypot(ok[0] - OK[oi], ok[1] - OK[oi + 1], ok[2] - OK[oi + 2]);
          if (d > FOLD_OK) continue;
          bestContrast = contrast;
          pick = t < 0.5 ? ends[a] : ends[b];
        }
      }
      if (pick !== -1) to[i] = pick;
    }
  }
  let changed = 0;
  for (let i = 0; i < n; i++) {
    cells.flat[i] = core[i];
    const j = to[i];
    if (j === -1) continue;
    changed++;
    if (j === -2) {
      body[i] = 0;
      rgb[i * 3] = garment8[0];
      rgb[i * 3 + 1] = garment8[1];
      rgb[i * 3 + 2] = garment8[2];
    } else {
      rgb[i * 3] = rgb[j * 3];
      rgb[i * 3 + 1] = rgb[j * 3 + 1];
      rgb[i * 3 + 2] = rgb[j * 3 + 2];
      // part of the flat area it folded into; a line's middle may itself be a blend
      cells.flat[i] = core[j];
    }
  }
  return changed;
}
