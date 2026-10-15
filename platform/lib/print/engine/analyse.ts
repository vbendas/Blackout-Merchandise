// Spot analysis on the work grid (the art at its own resolution, capped at
// ENGINE_TUNING.workPpiMax): composite over the set's reference garment,
// pick the palette, give every pixel its ink and tint, fold anti-aliased
// edge pixels into their neighbours, remove islands below the smallest
// printable feature, and measure what the method chooser needs. The plates
// are rendered from these records at the screen resolution (render.ts).
import type { GarmentColour, Lab, PrintRecipe, Raster, ScreenMethod } from '@/lib/print/types';
import { ENGINE_TUNING } from '@/lib/print/defaults';
import { SRGB8_TO_LINEAR, deltaE2000, hexToRgb8, linearToLab, linearToOklab, type Vec3 } from './colour';
import { GARMENT, SpotClassifier, unpackErr, unpackKnockedOut, unpackLabel, unpackTint } from './classify';
import { removeSmallComponents } from './morphology';
import { buildBins, choosePalette, type PaletteChoice, type PaletteEntry, type SetContext } from './palette';
import { nestedCoverageColour, type InkSystemModel, type ModelLayer } from './model';
import { denoiseRgba, resizeRgba, toRgba } from './raster';
import { mmToPx, type PrintSize } from './units';

export interface WorkGrid {
  width: number;
  height: number;
  ppi: number;
  /** denoised straight-alpha RGBA */
  rgba: Uint8Array;
}

/** The art on the work grid: its own resolution, capped, then denoised. */
export async function makeWorkGrid(art: Raster, size: PrintSize): Promise<WorkGrid> {
  const src = toRgba(art);
  const ppi = Math.min(size.sourcePpi, ENGINE_TUNING.workPpiMax);
  let width = src.width;
  let height = src.height;
  let rgba = src.data;
  if (size.sourcePpi > ENGINE_TUNING.workPpiMax) {
    width = Math.max(1, Math.round(mmToPx(size.widthMm, ppi)));
    height = Math.max(1, Math.round(mmToPx(size.heightMm, ppi)));
    rgba = await resizeRgba(src.data, src.width, src.height, width, height);
  }
  return { width, height, ppi: width / (size.widthMm / 25.4), rgba: denoiseRgba(rgba, width, height) };
}

/** Per work pixel: up to two (label, tint) pairs mixed by s (an anti-aliased edge), else one. */
export interface Records {
  width: number;
  height: number;
  labA: Uint8Array;
  tA: Uint8Array;
  labB: Uint8Array;
  tB: Uint8Array;
  /** share of B, 0..255; 0 for plain pixels */
  s: Uint8Array;
  /** reproduction error, OKLab x 500 */
  err: Uint8Array;
}

export interface SetStats {
  /** printed pixels of the art (not the garment) on the work grid */
  artPixels: number;
  /** shares of artPixels */
  unexplained: number;
  flat: number;
  smooth: number;
  /** soft shading the spot inks miss */
  gradient: number;
  /** printed as a halftoned tint (fades), not solid */
  tint: number;
  islandsRemoved: number;
  /** share of the art's opaque pixels left out because they match the garment */
  knockedOut: number;
}

export interface SetAnalysis {
  reference: GarmentColour;
  dark: boolean;
  ctx: SetContext;
  palette: PaletteChoice;
  entries: PaletteEntry[];
  records: Records;
  stats: SetStats;
  method: ScreenMethod;
  methodReason: string;
}

/** The art over a garment (8-bit sRGB), as the artist saw it: sRGB "normal" blending. */
export function compositeOver(rgba: Uint8Array, pixels: number, garment: Vec3): Uint8Array {
  const out = new Uint8Array(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    const a = rgba[i * 4 + 3];
    if (a === 255) {
      out[i * 3] = rgba[i * 4];
      out[i * 3 + 1] = rgba[i * 4 + 1];
      out[i * 3 + 2] = rgba[i * 4 + 2];
    } else if (a === 0) {
      out[i * 3] = garment[0];
      out[i * 3 + 1] = garment[1];
      out[i * 3 + 2] = garment[2];
    } else {
      const f = a / 255;
      out[i * 3] = Math.round(rgba[i * 4] * f + garment[0] * (1 - f));
      out[i * 3 + 1] = Math.round(rgba[i * 4 + 1] * f + garment[1] * (1 - f));
      out[i * 3 + 2] = Math.round(rgba[i * 4 + 2] * f + garment[2] * (1 - f));
    }
  }
  return out;
}

const FLAT_PER_MM = 3;
const EDGE_PER_MM = 60;
const FLAT_WEIGHT_PER_MM = 30;
/** a fade climbs at least this much per mm on both sides of a pixel */
const FADE_PER_MM = 1.2;

/** 3x3 box mean of an RGB image (separable), so residual noise reads as flat. */
function boxMean3(comp: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const rows = new Uint16Array(n * 3);
  const cnt = new Uint8Array(w);
  for (let x = 0; x < w; x++) cnt[x] = (x > 0 ? 1 : 0) + 1 + (x < w - 1 ? 1 : 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) rows[i + c] = comp[i + c] + (x > 0 ? comp[i - 3 + c] : 0) + (x < w - 1 ? comp[i + 3 + c] : 0);
    }
  }
  const out = new Uint8Array(n * 3);
  for (let y = 0; y < h; y++) {
    const ny = (y > 0 ? 1 : 0) + 1 + (y < h - 1 ? 1 : 0);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const div = ny * cnt[x];
      for (let c = 0; c < 3; c++) {
        const v = rows[i + c] + (y > 0 ? rows[i - w * 3 + c] : 0) + (y < h - 1 ? rows[i + w * 3 + c] : 0);
        out[i + c] = Math.round(v / div);
      }
    }
  }
  return out;
}

/**
 * Per pixel, from a 3x3 box mean of the art (8-bit sRGB distance per mm):
 * a flatness weight for the palette (anti-aliased edges weigh little), and a
 * class: 0 flat, 1 shading or texture, 2 edge. A fade is told from noise and
 * from a nearby edge by its slope over 1 mm on both sides of the pixel.
 */
function slopes(comp: Uint8Array, w: number, h: number, ppi: number): { weight: Float32Array; cls: Uint8Array } {
  const n = w * h;
  const box = boxMean3(comp, w, h);
  const d = Math.max(1, Math.round(mmToPx(0.25, ppi)));
  const mmSpan = (2 * d * 25.4) / ppi;
  const dl = Math.max(2, Math.round(mmToPx(1, ppi)));
  const fadeStep = (FADE_PER_MM * dl * 25.4) / ppi;
  const weight = new Float32Array(n);
  const cls = new Uint8Array(n);
  // both halves climb, in the same direction, by comparable amounts
  const ramp = (i: number, back: number, fwd: number): boolean => {
    const a0 = box[i] - box[back];
    const a1 = box[i + 1] - box[back + 1];
    const a2 = box[i + 2] - box[back + 2];
    const b0 = box[fwd] - box[i];
    const b1 = box[fwd + 1] - box[i + 1];
    const b2 = box[fwd + 2] - box[i + 2];
    const ma = Math.hypot(a0, a1, a2);
    const mb = Math.hypot(b0, b1, b2);
    if (ma < fadeStep || mb < fadeStep) return false;
    if (Math.min(ma, mb) < 0.33 * Math.max(ma, mb)) return false;
    return a0 * b0 + a1 * b1 + a2 * b2 > 0.5 * ma * mb;
  };
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - d);
    const yb = Math.min(h - 1, y + d);
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - d);
      const xb = Math.min(w - 1, x + d);
      const p = (y * w + xa) * 3;
      const q = (y * w + xb) * 3;
      const u = (ya * w + x) * 3;
      const v = (yb * w + x) * 3;
      const gx = Math.hypot(box[q] - box[p], box[q + 1] - box[p + 1], box[q + 2] - box[p + 2]);
      const gy = Math.hypot(box[v] - box[u], box[v + 1] - box[u + 1], box[v + 2] - box[u + 2]);
      const slope = Math.hypot(gx, gy) / mmSpan;
      const i = y * w + x;
      weight[i] = 1 / (1 + (slope / FLAT_WEIGHT_PER_MM) ** 2);
      if (slope >= EDGE_PER_MM) {
        cls[i] = 2;
        continue;
      }
      const c = i * 3;
      const fade =
        (x >= dl && x + dl < w && ramp(c, c - dl * 3, c + dl * 3)) || (y >= dl && y + dl < h && ramp(c, c - dl * w * 3, c + dl * w * 3));
      cls[i] = fade || slope >= FLAT_PER_MM ? 1 : 0;
    }
  }
  return { weight, cls };
}

/** The set's palette and context, before any per-pixel work (used for join checks too). */
export function setContext(reference: GarmentColour, dark: boolean, recipe: PrintRecipe, sys: InkSystemModel): SetContext {
  const [r, g, b] = hexToRgb8(reference.hex);
  const garment: Vec3 = [SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]];
  return {
    dark,
    sys,
    garment,
    garmentLab: linearToLab(garment[0], garment[1], garment[2]),
    knockoutDeltaE: recipe.knockoutDeltaE,
    highlightWhite: recipe.highlightWhite,
  };
}

const FOLD_SLACK_OK = 0.012;
const ERR_SCALE = 500;

/** Separates the art for one reference garment on the work grid. */
export function analyseSet(grid: WorkGrid, reference: GarmentColour, dark: boolean, recipe: PrintRecipe, sys: InkSystemModel): SetAnalysis {
  const { width: w, height: h } = grid;
  const n = w * h;
  const ctx = setContext(reference, dark, recipe, sys);
  const g8 = hexToRgb8(reference.hex);
  const comp = compositeOver(grid.rgba, n, g8);
  const { weight, cls } = slopes(comp, w, h, grid.ppi);
  const isFlat = new Uint8Array(n);
  for (let i = 0; i < n; i++) isFlat[i] = cls[i] === 0 ? 1 : 0;
  const bins = buildBins(grid.rgba, weight, isFlat, n, ctx.garmentLab, ctx.knockoutDeltaE);
  const palette = choosePalette(bins, ctx, recipe.maxScreens, recipe.lockedInks);
  const entries = palette.entries;
  const classifier = new SpotClassifier(
    ctx.garment,
    ctx.garmentLab,
    entries.map((e) => e.lin),
    ctx.knockoutDeltaE,
  );

  // 1. every pixel's nearest ink and tint
  const lab = new Uint8Array(n);
  const tint = new Uint8Array(n);
  const err = new Uint8Array(n);
  const knocked = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = classifier.classify8(comp[i * 3], comp[i * 3 + 1], comp[i * 3 + 2]);
    lab[i] = unpackLabel(p);
    tint[i] = unpackTint(p);
    err[i] = Math.min(254, Math.round(unpackErr(p) * ERR_SCALE));
    knocked[i] = unpackKnockedOut(p) ? 1 : 0;
  }

  // 2. Core pixels sit inside a block of their own label: 3x3 for solid ink
  //    and bare garment; about 0.5 mm across for tints, so only fades wider
  //    than a 55 lpi cell (0.46 mm) are halftoned and a soft edge is not.
  //    The rest are edges, slivers and specks.
  const rf = Math.max(1, Math.round(mmToPx(0.2, grid.ppi)));
  const block = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const L = lab[i];
      const frac = tint[i] > 0 && tint[i] < 255;
      const r = frac ? rf : 1;
      if (x < r || y < r || x >= w - r || y >= h - r) continue;
      let ok = true;
      for (let dy = -r; dy <= r && ok; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const j = i + dy * w + dx;
          if (lab[j] !== L || (frac && (tint[j] === 0 || tint[j] === 255))) {
            ok = false;
            break;
          }
        }
      }
      block[i] = ok ? 1 : 0;
    }
  }
  const core = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const L = lab[i];
      const frac = tint[i] > 0 && tint[i] < 255;
      const r = frac ? rf : 1;
      let c = 0;
      for (let dy = -r; dy <= r && !c; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          // a tint is only core inside a block of tints, never beside a solid block
          if (block[j] && lab[j] === L && (!frac || (tint[j] > 0 && tint[j] < 255))) {
            c = 1;
            break;
          }
        }
      }
      core[i] = c;
    }
  }

  // 3. records: core pixels keep their ink; the rest fold into the two core
  //    neighbours whose mix explains them (anti-aliasing), else keep their own.
  const rec: Records = {
    width: w,
    height: h,
    labA: new Uint8Array(lab),
    tA: new Uint8Array(tint),
    labB: new Uint8Array(n).fill(GARMENT),
    tB: new Uint8Array(n),
    s: new Uint8Array(n),
    err: new Uint8Array(err),
  };
  const candLabel = new Int32Array(8);
  const candIdx = new Int32Array(8);
  const pOk: Vec3 = [0, 0, 0];
  const mOk: Vec3 = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (core[i]) continue;
      // nearest core pixel per label within two pixels, nearest rings first
      let nc = 0;
      for (let ring = 1; ring <= 2; ring++) {
        for (let dy = -ring; dy <= ring; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -ring; dx <= ring; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const j = yy * w + xx;
            if (!core[j]) continue;
            const L = lab[j];
            let seen = false;
            for (let c = 0; c < nc; c++) if (candLabel[c] === L) seen = true;
            if (!seen && nc < 8) {
              candLabel[nc] = L;
              candIdx[nc] = j;
              nc++;
            }
          }
        }
      }
      if (nc === 0) {
        hardenThin(rec, i);
        continue;
      }
      const own = err[i] / ERR_SCALE;
      const pr = comp[i * 3];
      const pg = comp[i * 3 + 1];
      const pb = comp[i * 3 + 2];
      linearToOklab(SRGB8_TO_LINEAR[pr], SRGB8_TO_LINEAR[pg], SRGB8_TO_LINEAR[pb], pOk);
      // best pair by distance in sRGB (anti-aliasing mixes sRGB values), then
      // its residual in OKLab for the decision
      let bestD2 = Infinity;
      let ba = -1;
      let bb = -1;
      let bs = 0;
      for (let a = 0; a < nc; a++) {
        for (let b = a; b < nc; b++) {
          const ja = candIdx[a] * 3;
          const jb = candIdx[b] * 3;
          const ex = comp[jb] - comp[ja];
          const ey = comp[jb + 1] - comp[ja + 1];
          const ez = comp[jb + 2] - comp[ja + 2];
          const len2 = ex * ex + ey * ey + ez * ez;
          let s = 0;
          if (len2 > 0) {
            s = ((pr - comp[ja]) * ex + (pg - comp[ja + 1]) * ey + (pb - comp[ja + 2]) * ez) / len2;
            s = s < 0 ? 0 : s > 1 ? 1 : s;
          }
          const dx = comp[ja] + s * ex - pr;
          const dy = comp[ja + 1] + s * ey - pg;
          const dz = comp[ja + 2] + s * ez - pb;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestD2) {
            bestD2 = d2;
            ba = a;
            bb = b;
            bs = s;
          }
        }
      }
      if (ba < 0) continue;
      const ja = candIdx[ba] * 3;
      const jb = candIdx[bb] * 3;
      linearToOklab(
        srgb8Lin(comp[ja] + bs * (comp[jb] - comp[ja])),
        srgb8Lin(comp[ja + 1] + bs * (comp[jb + 1] - comp[ja + 1])),
        srgb8Lin(comp[ja + 2] + bs * (comp[jb + 2] - comp[ja + 2])),
        mOk,
      );
      const best = Math.hypot(pOk[0] - mOk[0], pOk[1] - mOk[1], pOk[2] - mOk[2]);
      if (best > own + FOLD_SLACK_OK) {
        hardenThin(rec, i);
        continue;
      }
      const ia = candIdx[ba];
      const ib = candIdx[bb];
      const share = ba === bb ? 0 : Math.round(bs * 255);
      rec.labA[i] = lab[ia];
      rec.tA[i] = lab[ia] === GARMENT ? 0 : tint[ia];
      if (share > 0) {
        rec.labB[i] = lab[ib];
        rec.tB[i] = lab[ib] === GARMENT ? 0 : tint[ib];
        rec.s[i] = share;
      } else {
        rec.labB[i] = GARMENT;
        rec.tB[i] = 0;
        rec.s[i] = 0;
      }
      rec.err[i] = Math.min(254, Math.round(best * ERR_SCALE));
    }
  }

  // 4. islands smaller than the smallest printable feature merge into their surroundings
  const dominant = new Uint8Array(n);
  for (let i = 0; i < n; i++) dominant[i] = rec.s[i] >= 128 ? rec.labB[i] : rec.labA[i];
  const minSidePx = mmToPx(recipe.minFeatureMm, grid.ppi);
  const minArea = (Math.PI / 4) * minSidePx * minSidePx;
  const islands = removeSmallComponents(dominant, w, h, minArea, {
    relabel: (i, L) => {
      // take the tint of a neighbour that already carries the label
      const y = (i / w) | 0;
      const x = i - y * w;
      let t = L === GARMENT ? 0 : 255;
      const around = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const q of around) {
        if (q >= 0 && rec.labA[q] === L && rec.s[q] === 0) {
          t = rec.tA[q];
          break;
        }
      }
      rec.labA[i] = L;
      rec.tA[i] = t;
      rec.labB[i] = GARMENT;
      rec.tB[i] = 0;
      rec.s[i] = 0;
    },
  });

  // 5. what the method chooser needs
  const explained = Math.round(ENGINE_TUNING.explainedOk * ERR_SCALE);
  let artPixels = 0;
  let unexplained = 0;
  let flat = 0;
  let smooth = 0;
  let gradient = 0;
  let tints = 0;
  let knockedArt = 0;
  let opaque = 0;
  for (let i = 0; i < n; i++) {
    const alpha = grid.rgba[i * 4 + 3];
    if (alpha >= 128) {
      opaque++;
      if (knocked[i]) knockedArt++;
    }
    // the shirt showing where the art is the shirt's colour is not art to print
    if (knocked[i]) continue;
    artPixels++;
    const bad = rec.err[i] > explained;
    if (bad) unexplained++;
    if (cls[i] === 0) flat++;
    else if (cls[i] === 1) {
      smooth++;
      if (bad) gradient++;
    }
    if (rec.s[i] === 0 && rec.tA[i] > 0 && rec.tA[i] < 255) tints++;
  }
  const share = (v: number): number => (artPixels > 0 ? v / artPixels : 0);
  const stats: SetStats = {
    artPixels,
    unexplained: share(unexplained),
    flat: share(flat),
    smooth: share(smooth),
    gradient: share(gradient),
    tint: share(tints),
    islandsRemoved: islands.components,
    knockedOut: opaque > 0 ? knockedArt / opaque : 0,
  };
  const chosen = chooseMethod(recipe, palette, stats, ctx);
  return { reference, dark, ctx, palette, entries, records: rec, stats, ...chosen };
}

/**
 * A partly covered pixel outside any wide tint is the edge of something thin
 * (a hairline, a fine tip), not a fade: record it as solid ink mixed with
 * bare garment, so it is thresholded after resampling (a crisp line of the
 * right width) instead of halftoned into dots.
 */
function hardenThin(rec: Records, i: number): void {
  const t = rec.tA[i];
  if (rec.labA[i] === GARMENT || t === 0 || t === 255 || rec.s[i] !== 0) return;
  rec.tA[i] = 255;
  rec.labB[i] = GARMENT;
  rec.tB[i] = 0;
  rec.s[i] = 255 - t;
}

function srgb8Lin(v: number): number {
  const lo = Math.floor(v);
  const f = v - lo;
  const a = SRGB8_TO_LINEAR[lo < 0 ? 0 : lo > 255 ? 255 : lo];
  if (f === 0) return a;
  const b = SRGB8_TO_LINEAR[lo + 1 > 255 ? 255 : lo + 1];
  return a + (b - a) * f;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function colourBudget(recipe: PrintRecipe, ctx: SetContext): number {
  if (!ctx.dark) return recipe.maxScreens;
  return Math.max(1, recipe.maxScreens - 1 - (recipe.highlightWhite ? 1 : 0));
}

/** Spot when the inks fit and reproduce the art; otherwise flag index or simulated process. */
function chooseMethod(recipe: PrintRecipe, palette: PaletteChoice, stats: SetStats, ctx: SetContext): { method: ScreenMethod; methodReason: string } {
  const colours = palette.entries.filter((e) => e.kind === 'ink' || !ctx.dark).length;
  const inkWord = (k: number): string => `${k} ink${k === 1 ? '' : 's'}`;
  const reproduce = (k: number): string => `${inkWord(k)} reproduce${k === 1 ? 's' : ''}`;
  if (recipe.method === 'spot') {
    return { method: 'spot', methodReason: `The recipe asks for spot colour: ${inkWord(colours)}${palette.fits ? '' : ', the closest the screens allow'}.` };
  }
  if (recipe.method === 'index' || recipe.method === 'sim_process') {
    const name = recipe.method === 'index' ? 'index' : 'simulated process';
    return {
      method: recipe.method,
      methodReason: `The recipe asks for ${name}, which is finished by hand for now. The attached spot draft uses ${inkWord(colours)}.`,
    };
  }
  if (stats.artPixels === 0) return { method: 'spot', methodReason: 'Nothing prints on this garment colour.' };
  const spotOk = palette.fits && stats.unexplained <= ENGINE_TUNING.unexplainedMax && stats.gradient <= ENGINE_TUNING.gradientMax;
  if (spotOk) {
    const tints = stats.tint > 0.01 ? ', with halftoned tints only where the art fades' : '';
    return {
      method: 'spot',
      methodReason: `Flat colour: ${reproduce(colours)} ${pct(1 - stats.unexplained)} of the art${tints}.`,
    };
  }
  const needed = palette.coloursNeeded;
  const budget = colourBudget(recipe, ctx);
  if (stats.flat >= ENGINE_TUNING.indexFlatMin && stats.smooth <= 0.25) {
    const why = needed !== null ? `It needs ${needed} spot colours and ${budget} fit` : `It needs more spot colours than the ${budget} that fit`;
    return {
      method: 'index',
      methodReason: `Many flat colours with little shading. ${why}, so index separation would hold them. The spot draft merges the nearest colours into ${inkWord(colours)}.`,
    };
  }
  const shading = stats.gradient >= stats.unexplained / 2 ? 'Soft shading' : 'Shading and texture';
  const need = needed !== null ? ` Spot colour would need ${needed} inks.` : '';
  return {
    method: 'sim_process',
    methodReason: `${shading} runs through ${pct(stats.unexplained)} of the art, so solid spot shapes would lose it.${need} The spot draft uses ${inkWord(colours)} for reference.`,
  };
}

// ---------------------------------------------------------------------------
// Coverage per pixel, and the predicted print for set joins
// ---------------------------------------------------------------------------

export type PlateRoleKey = { role: 'underbase' } | { role: 'ink'; entry: number } | { role: 'highlight'; entry: number };

/** Per-label coverage factors for a plate: the share of a label's tint the plate prints. */
export function plateFactors(key: PlateRoleKey, entries: PaletteEntry[]): Float32Array {
  const f = new Float32Array(256);
  if (key.role === 'underbase') entries.forEach((e, k) => (f[k] = e.u));
  else f[key.entry] = 1;
  return f;
}

/** Coverage (0..1) a plate prints at work pixel i. */
export function coverageAt(rec: Records, factors: Float32Array, i: number): number {
  let v = factors[rec.labA[i]] * (rec.tA[i] / 255);
  const s = rec.s[i];
  if (s === 0) return v;
  v *= 1 - s / 255;
  return v + factors[rec.labB[i]] * (rec.tB[i] / 255) * (s / 255);
}

export interface PlanPlate {
  key: PlateRoleKey;
  layer: ModelLayer;
  /** L* of the ink, for print order */
  lightness: number;
}

/** Press order: underbase, colours light to dark, highlight white last. */
export function plannedPlates(a: Pick<SetAnalysis, 'entries' | 'dark' | 'ctx'>): PlanPlate[] {
  const { entries, dark, ctx } = a;
  const sys = ctx.sys;
  const plates: PlanPlate[] = [];
  if (entries.length === 0) return plates;
  if (dark) plates.push({ key: { role: 'underbase' }, layer: { kind: 'underbase', colour: sys.white, opacity: sys.underbaseOpacity }, lightness: 100 });
  const colours: PlanPlate[] = [];
  entries.forEach((e, k) => {
    if (e.kind === 'white' && dark) return;
    colours.push({ key: { role: 'ink', entry: k }, layer: { kind: 'ink', colour: e.lin, opacity: e.opacity }, lightness: e.lab.L });
  });
  colours.sort((p, q) => q.lightness - p.lightness || (p.key.role === 'ink' && q.key.role === 'ink' ? p.key.entry - q.key.entry : 0));
  plates.push(...colours);
  const white = entries.findIndex((e) => e.kind === 'white');
  if (dark && white >= 0 && ctx.highlightWhite) {
    plates.push({ key: { role: 'highlight', entry: white }, layer: { kind: 'highlight', colour: sys.white, opacity: sys.highlightOpacity }, lightness: 100 });
  }
  return plates;
}

export interface JoinCheck {
  meanDeltaE: number;
  p95DeltaE: number;
}

/** A garment joins a set when its proof is within the target, or nearly as good as the reference's. */
export function joins(check: JoinCheck, reference: JoinCheck): boolean {
  const t = ENGINE_TUNING;
  return (
    check.meanDeltaE <= Math.max(t.setJoinMeanDeltaE, reference.meanDeltaE + t.setJoinSlackDeltaE) &&
    check.p95DeltaE <= Math.max(t.setJoinP95DeltaE, reference.p95DeltaE + t.setJoinP95SlackDeltaE)
  );
}

/**
 * Would garment g print well from this set's screens? Predicts the print on
 * g from the work-grid coverages (nested dots, the proof model) and compares
 * it with the art over g. Samples about 200k pixels.
 */
export function joinCheck(grid: WorkGrid, a: SetAnalysis, g: GarmentColour): JoinCheck {
  const { width: w, height: h } = grid;
  const n = w * h;
  const plan = plannedPlates(a);
  const factors = plan.map((p) => plateFactors(p.key, a.entries));
  const layers = plan.map((p) => p.layer);
  const [gr, gg, gb] = hexToRgb8(g.hex);
  const garment: Vec3 = [SRGB8_TO_LINEAR[gr], SRGB8_TO_LINEAR[gg], SRGB8_TO_LINEAR[gb]];
  const garmentLab = linearToLab(garment[0], garment[1], garment[2]);
  const step = Math.max(1, Math.floor(Math.sqrt(n / 200000)));
  const cov = new Float64Array(plan.length);
  const pred: Vec3 = [0, 0, 0];
  const des: number[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = y * w + x;
      let anyInk = false;
      for (let p = 0; p < plan.length; p++) {
        cov[p] = coverageAt(a.records, factors[p], i);
        if (cov[p] > 0) anyInk = true;
      }
      const alpha = grid.rgba[i * 4 + 3];
      if (!anyInk && alpha === 0) continue;
      const f = alpha / 255;
      const tr = SRGB8_TO_LINEAR[Math.round(grid.rgba[i * 4] * f + gr * (1 - f))];
      const tg = SRGB8_TO_LINEAR[Math.round(grid.rgba[i * 4 + 1] * f + gg * (1 - f))];
      const tb = SRGB8_TO_LINEAR[Math.round(grid.rgba[i * 4 + 2] * f + gb * (1 - f))];
      const targetLab = linearToLab(tr, tg, tb);
      const predLab: Lab = anyInk ? (nestedCoverageColour(garment, layers, cov, pred), linearToLab(pred[0], pred[1], pred[2])) : garmentLab;
      des.push(deltaE2000(targetLab, predLab));
    }
  }
  if (des.length === 0) return { meanDeltaE: 0, p95DeltaE: 0 };
  des.sort((p, q) => p - q);
  const mean = des.reduce((s, v) => s + v, 0) / des.length;
  const p95 = des[Math.min(des.length - 1, Math.floor(des.length * 0.95))];
  return { meanDeltaE: mean, p95DeltaE: p95 };
}
