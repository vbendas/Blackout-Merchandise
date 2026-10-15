// Ink palette for spot separation: weighted k-means in OKLab over colour bins
// of the art, near-duplicates merged, the garment dropped (it is a free ink),
// whites folded into the white ink. Bins hold each pixel's own colour (not
// its mix with the shirt), weighted by alpha and flatness: a 50% transparent
// red is red ink at half coverage, not a new dark red, and anti-aliased edge
// colours barely pull the centres.
import type { Hex, Lab } from '@/lib/print/types';
import { ENGINE_TUNING, WHITE_INK_HEX } from '@/lib/print/defaults';
import {
  SRGB8_TO_LINEAR,
  deltaE2000,
  hexToRgb8,
  linearToLab,
  linearToOklab,
  linearToSrgb8,
  oklabToLinear,
  rgb8ToHex,
  type Vec3,
} from './colour';
import { SpotClassifier, type Classified } from './classify';
import { overlay, underbaseOn, underbaseWeight, mix, type InkSystemModel } from './model';
import { mulberry32 } from './rng';

export interface Bins {
  n: number;
  /** flatness-weighted pixel count */
  weight: Float64Array;
  /** plain pixel count */
  count: Float64Array;
  /** pixels in flat areas (not edges, not shading) */
  flat: Float64Array;
  /** mean colour, linear */
  lin: Float64Array;
  /** mean colour, OKLab */
  ok: Float64Array;
  /** all printed (non-garment) pixels, for shares */
  totalCount: number;
}

/** Pixels more transparent than this add nothing to the palette. */
const MIN_ALPHA = 26;

/**
 * 6-bit colour bins of the art's own colours (straight RGBA), without the
 * garment colour. Keeps the heaviest maxBins bins (ties by colour, so the
 * result is stable).
 */
export function buildBins(rgba: Uint8Array, weights: Float32Array, isFlat: Uint8Array, pixels: number, garmentLab: Lab, knockoutDeltaE: number, maxBins = 12000): Bins {
  const KEYS = 1 << 18;
  const count = new Float64Array(KEYS);
  const weight = new Float64Array(KEYS);
  const flat = new Float64Array(KEYS);
  const sum = new Float64Array(KEYS * 3);
  for (let i = 0; i < pixels; i++) {
    const a = rgba[i * 4 + 3];
    if (a < MIN_ALPHA) continue;
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const k = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    count[k] += 1;
    weight[k] += weights[i] * (a / 255);
    flat[k] += isFlat[i];
    sum[k * 3] += r;
    sum[k * 3 + 1] += g;
    sum[k * 3 + 2] += b;
  }
  const keys: number[] = [];
  let totalCount = 0;
  for (let k = 0; k < KEYS; k++) {
    if (count[k] === 0) continue;
    const c = count[k];
    const lab = linearToLab(SRGB8_TO_LINEAR[Math.round(sum[k * 3] / c)], SRGB8_TO_LINEAR[Math.round(sum[k * 3 + 1] / c)], SRGB8_TO_LINEAR[Math.round(sum[k * 3 + 2] / c)]);
    if (deltaE2000(lab, garmentLab) <= knockoutDeltaE) continue;
    totalCount += c;
    keys.push(k);
  }
  keys.sort((p, q) => weight[q] - weight[p] || p - q);
  const kept = keys.slice(0, maxBins);
  const n = kept.length;
  const out: Bins = {
    n,
    weight: new Float64Array(n),
    count: new Float64Array(n),
    flat: new Float64Array(n),
    lin: new Float64Array(n * 3),
    ok: new Float64Array(n * 3),
    totalCount,
  };
  const q: Vec3 = [0, 0, 0];
  kept.forEach((k, i) => {
    const c = count[k];
    out.weight[i] = weight[k];
    out.count[i] = c;
    out.flat[i] = flat[k];
    for (let ch = 0; ch < 3; ch++) out.lin[i * 3 + ch] = SRGB8_TO_LINEAR[Math.round(sum[k * 3 + ch] / c)];
    linearToOklab(out.lin[i * 3], out.lin[i * 3 + 1], out.lin[i * 3 + 2], q);
    out.ok[i * 3] = q[0];
    out.ok[i * 3 + 1] = q[1];
    out.ok[i * 3 + 2] = q[2];
  });
  return out;
}

export interface Clusters {
  /** K centres, OKLab */
  centres: Float64Array;
  /** total bin weight per centre */
  weights: Float64Array;
  k: number;
}

/** Weighted k-means++ in OKLab with a seeded generator (same input, same centres). */
export function kmeans(bins: Bins, K: number, seed: number): Clusters {
  const n = bins.n;
  const k = Math.max(1, Math.min(K, n));
  const C = new Float64Array(k * 3);
  const ok = bins.ok;
  const w = bins.weight;
  const rand = mulberry32(seed);
  // first centre: the heaviest bin
  let first = 0;
  for (let i = 1; i < n; i++) if (w[i] > w[first]) first = i;
  C.set(ok.subarray(first * 3, first * 3 + 3), 0);
  const d2 = new Float64Array(n).fill(Infinity);
  for (let c = 1; c < k; c++) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      const o = (c - 1) * 3;
      const e = (ok[i * 3] - C[o]) ** 2 + (ok[i * 3 + 1] - C[o + 1]) ** 2 + (ok[i * 3 + 2] - C[o + 2]) ** 2;
      if (e < d2[i]) d2[i] = e;
      total += d2[i] * w[i];
    }
    let pick = 0;
    if (total > 0) {
      let r = rand() * total;
      for (let i = 0; i < n; i++) {
        r -= d2[i] * w[i];
        if (r <= 0) {
          pick = i;
          break;
        }
        pick = i;
      }
    }
    C.set(ok.subarray(pick * 3, pick * 3 + 3), c * 3);
  }
  const assign = new Int32Array(n).fill(-1);
  const acc = new Float64Array(k * 4);
  for (let iter = 0; iter < 40; iter++) {
    let changed = 0;
    acc.fill(0);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const e = (ok[i * 3] - C[c * 3]) ** 2 + (ok[i * 3 + 1] - C[c * 3 + 1]) ** 2 + (ok[i * 3 + 2] - C[c * 3 + 2]) ** 2;
        if (e < bd) {
          bd = e;
          best = c;
        }
      }
      if (assign[i] !== best) changed++;
      assign[i] = best;
      acc[best * 4] += ok[i * 3] * w[i];
      acc[best * 4 + 1] += ok[i * 3 + 1] * w[i];
      acc[best * 4 + 2] += ok[i * 3 + 2] * w[i];
      acc[best * 4 + 3] += w[i];
    }
    for (let c = 0; c < k; c++) {
      if (acc[c * 4 + 3] <= 0) continue;
      C[c * 3] = acc[c * 4] / acc[c * 4 + 3];
      C[c * 3 + 1] = acc[c * 4 + 1] / acc[c * 4 + 3];
      C[c * 3 + 2] = acc[c * 4 + 2] / acc[c * 4 + 3];
    }
    if (changed === 0) break;
  }
  const weights = new Float64Array(k);
  for (let c = 0; c < k; c++) weights[c] = acc[c * 4 + 3];
  return { centres: C, weights, k };
}

// ---------------------------------------------------------------------------
// Palette entries
// ---------------------------------------------------------------------------

export interface PaletteEntry {
  /** 'white' prints as the white ink (highlight on darks, an ink on lights) */
  kind: 'ink' | 'white';
  /** target colour, as printed on white */
  lin: Vec3;
  hex: Hex;
  lab: Lab;
  base: string;
  opacity: number;
  /** underbase weight under this colour (dark sets) */
  u: number;
  /** printed solid on the set's reference garment, linear */
  appearance: Vec3;
  /** share of the art's weight it took in clustering */
  share: number;
}

export interface SetContext {
  dark: boolean;
  sys: InkSystemModel;
  garment: Vec3;
  garmentLab: Lab;
  knockoutDeltaE: number;
  highlightWhite: boolean;
}

function fromHex(hex: Hex): { lin: Vec3; hex: Hex; lab: Lab } {
  const [r, g, b] = hexToRgb8(hex);
  const lin: Vec3 = [SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]];
  return { lin, hex: rgb8ToHex(r, g, b), lab: linearToLab(lin[0], lin[1], lin[2]) };
}

/** Completes an entry for a set: base, opacity, underbase weight, appearance. */
export function finishEntry(kind: 'ink' | 'white', colourHex: Hex, share: number, ctx: SetContext): PaletteEntry {
  const c = fromHex(kind === 'white' ? WHITE_INK_HEX : colourHex);
  const { sys, garment, dark } = ctx;
  let base: string;
  let opacity: number;
  let u = 0;
  const appearance: Vec3 = [0, 0, 0];
  if (kind === 'white') {
    base = dark ? sys.highlightInk : sys.underbaseInk;
    opacity = dark ? sys.highlightOpacity : sys.underbaseOpacity;
    if (dark) {
      u = 1;
      const ub = underbaseOn(sys, garment);
      if (ctx.highlightWhite) overlay(ub, sys.white, opacity, appearance);
      else {
        appearance[0] = ub[0];
        appearance[1] = ub[1];
        appearance[2] = ub[2];
      }
    } else {
      overlay(garment, c.lin, opacity, appearance);
    }
  } else {
    base = dark ? sys.darkBase : sys.lightBase;
    opacity = sys.opacityOf(base);
    if (dark) {
      u = underbaseWeight(sys, garment, c.lin, opacity);
      const under = mix(garment, underbaseOn(sys, garment), u, [0, 0, 0]);
      overlay(under, c.lin, opacity, appearance);
    } else {
      overlay(garment, c.lin, opacity, appearance);
    }
  }
  return { kind, lin: c.lin, hex: c.hex, lab: c.lab, base, opacity, u, appearance, share };
}

/** Centres to entries: gamut-clamped, merged, garment dropped, whites folded together. */
export function entriesFromCentres(cl: Clusters, ctx: SetContext): PaletteEntry[] {
  const total = cl.weights.reduce((s, v) => s + v, 0) || 1;
  const lin: Vec3 = [0, 0, 0];
  type Cand = { hex: Hex; lab: Lab; w: number };
  const cands: Cand[] = [];
  for (let c = 0; c < cl.k; c++) {
    if (cl.weights[c] <= 0) continue;
    oklabToLinear(cl.centres[c * 3], cl.centres[c * 3 + 1], cl.centres[c * 3 + 2], lin);
    const hex = rgb8ToHex(linearToSrgb8(lin[0]), linearToSrgb8(lin[1]), linearToSrgb8(lin[2]));
    cands.push({ hex, lab: fromHex(hex).lab, w: cl.weights[c] });
  }
  cands.sort((a, b) => b.w - a.w || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0));
  const kept: Cand[] = [];
  for (const c of cands) {
    const near = kept.find((k) => deltaE2000(k.lab, c.lab) < ENGINE_TUNING.paletteMergeDeltaE);
    if (near) near.w += c.w;
    else kept.push({ ...c });
  }
  const whiteLab = fromHex(WHITE_INK_HEX).lab;
  const out: PaletteEntry[] = [];
  let whiteShare = 0;
  for (const c of kept) {
    if (deltaE2000(c.lab, ctx.garmentLab) <= ctx.knockoutDeltaE) continue;
    if (deltaE2000(c.lab, whiteLab) <= ENGINE_TUNING.whiteDeltaE) {
      whiteShare += c.w / total;
      continue;
    }
    out.push(finishEntry('ink', c.hex, c.w / total, ctx));
  }
  if (whiteShare > 0) out.push(finishEntry('white', WHITE_INK_HEX, whiteShare, ctx));
  return out;
}

/** Screens a palette needs on press. */
export function screensFor(entries: PaletteEntry[], ctx: SetContext): number {
  if (!ctx.dark) return entries.length;
  const inks = entries.filter((e) => e.kind === 'ink').length;
  const white = entries.some((e) => e.kind === 'white') && ctx.highlightWhite ? 1 : 0;
  return inks + white + (entries.length > 0 ? 1 : 0);
}

export interface PaletteScore {
  meanErr: number;
  p90Err: number;
  /** weight share reproduced worse than ENGINE_TUNING.explainedOk, or as a halftone in a flat area */
  badShare: number;
}

/** How well the palette reproduces the bins (flatness-weighted, OKLab). `labels` gets each bin's entry. */
export function scorePalette(bins: Bins, entries: PaletteEntry[], ctx: SetContext, labels?: Int32Array): PaletteScore {
  if (bins.n === 0) return { meanErr: 0, p90Err: 0, badShare: 0 };
  const cls = new SpotClassifier(
    ctx.garment,
    ctx.garmentLab,
    entries.map((e) => e.lin),
    ctx.knockoutDeltaE,
  );
  const errs = new Float64Array(bins.n);
  const out: Classified = { label: 0, t: 0, err: 0, knockedOut: false };
  const lin: Vec3 = [0, 0, 0];
  let sw = 0;
  let se = 0;
  let bad = 0;
  for (let i = 0; i < bins.n; i++) {
    lin[0] = bins.lin[i * 3];
    lin[1] = bins.lin[i * 3 + 1];
    lin[2] = bins.lin[i * 3 + 2];
    cls.classifyLinear(lin, out);
    if (labels) labels[i] = out.label;
    errs[i] = out.err;
    sw += bins.weight[i];
    se += bins.weight[i] * out.err;
    // a flat area printed as a halftone fits only when screens run short:
    // flat colour gets a solid ink of its own while the budget allows
    const flatTint = out.t > 0 && out.t < 1 && bins.flat[i] > 0.5 * bins.count[i];
    if (out.err > ENGINE_TUNING.explainedOk || flatTint) bad += bins.weight[i];
  }
  const order = Array.from({ length: bins.n }, (_, i) => i).sort((a, b) => errs[a] - errs[b] || a - b);
  let acc = 0;
  let p90 = errs[order[order.length - 1]];
  for (const i of order) {
    acc += bins.weight[i];
    if (acc >= 0.9 * sw) {
      p90 = errs[i];
      break;
    }
  }
  return { meanErr: sw > 0 ? se / sw : 0, p90Err: p90, badShare: sw > 0 ? bad / sw : 0 };
}

export interface PaletteChoice {
  entries: PaletteEntry[];
  score: PaletteScore;
  screens: number;
  /** the inks reproduce the art within the target and fit the screens */
  fits: boolean;
  /** smallest number of colour inks that reproduces the art, when one was found */
  coloursNeeded: number | null;
}

function colourCount(entries: PaletteEntry[], ctx: SetContext): number {
  return entries.filter((e) => e.kind === 'ink' || !ctx.dark).length;
}

function meetsTarget(s: PaletteScore): boolean {
  return s.meanErr <= ENGINE_TUNING.fitMeanOk && s.p90Err <= ENGINE_TUNING.fitP90Ok && s.badShare <= ENGINE_TUNING.fitBadShareMax;
}

/**
 * Drops inks that are only tints of another: an ink whose pixels sit mostly
 * in fades (not flat areas) goes when the remaining inks still reproduce the
 * art within the target, so a glow prints as halftoned tints of its colour
 * rather than as extra screens. Flat colours always keep their own ink.
 */
function reduceTints(bins: Bins, entries: PaletteEntry[], ctx: SetContext): { entries: PaletteEntry[]; score: PaletteScore } {
  let current = entries;
  const labels = new Int32Array(bins.n);
  let score = scorePalette(bins, current, ctx, labels);
  for (;;) {
    const count = new Float64Array(current.length);
    const flat = new Float64Array(current.length);
    for (let i = 0; i < bins.n; i++) {
      const l = labels[i];
      if (l < 0 || l >= current.length) continue;
      count[l] += bins.count[i];
      flat[l] += bins.flat[i];
    }
    const order = current.map((_, k) => k).sort((a, b) => count[a] - count[b] || a - b);
    let dropped = false;
    for (const k of order) {
      if (current.length <= 1 || current[k].kind === 'white') continue;
      if (count[k] > 0 && flat[k] / count[k] > 0.5) continue;
      const trial = current.filter((_, j) => j !== k);
      const trialLabels = new Int32Array(bins.n);
      const s = scorePalette(bins, trial, ctx, trialLabels);
      if (!meetsTarget(s)) continue;
      current = trial;
      score = s;
      labels.set(trialLabels);
      dropped = true;
      break;
    }
    if (!dropped) return { entries: current, score };
  }
}

/**
 * The palette for a set: the fewest inks that reproduce the art within the
 * target, if they fit the screens; otherwise the best palette that fits
 * (a draft) and how many colours the art would need.
 */
export function choosePalette(bins: Bins, ctx: SetContext, maxScreens: number, lockedInks?: Hex[]): PaletteChoice {
  if (lockedInks && lockedInks.length > 0) {
    const entries = lockedInks.map((hex) => finishEntry('ink', hex, 1 / lockedInks.length, ctx));
    const score = scorePalette(bins, entries, ctx);
    const screens = screensFor(entries, ctx);
    return { entries, score, screens, fits: screens <= maxScreens && meetsTarget(score), coloursNeeded: null };
  }
  if (bins.n === 0) return { entries: [], score: { meanErr: 0, p90Err: 0, badShare: 0 }, screens: 0, fits: true, coloursNeeded: 0 };
  const maxK = Math.min(16, Math.max(2, maxScreens + 4), bins.n);
  let bestFitting: PaletteChoice | null = null;
  let coloursNeeded: number | null = null;
  for (let K = 1; K <= maxK; K++) {
    let entries = entriesFromCentres(kmeans(bins, K, 0x9e3779b1 + K), ctx);
    let score = scorePalette(bins, entries, ctx);
    // fade colours become tints before the screens are counted
    if (meetsTarget(score)) ({ entries, score } = reduceTints(bins, entries, ctx));
    const screens = screensFor(entries, ctx);
    const good = meetsTarget(score);
    if (good && coloursNeeded === null) coloursNeeded = colourCount(entries, ctx);
    if (screens <= maxScreens) {
      if (good) return { entries, score, screens, fits: true, coloursNeeded: colourCount(entries, ctx) };
      // a draft keeps as much of the art as it can: least left unreproduced, then nearest
      const better =
        !bestFitting ||
        score.badShare < bestFitting.score.badShare - 1e-9 ||
        (Math.abs(score.badShare - bestFitting.score.badShare) <= 1e-9 && score.meanErr < bestFitting.score.meanErr);
      if (better) bestFitting = { entries, score, screens, fits: false, coloursNeeded: null };
    }
    if (coloursNeeded !== null && screens > maxScreens) break;
  }
  const draft = bestFitting ?? { entries: [], score: { meanErr: Infinity, p90Err: Infinity, badShare: 1 }, screens: 0, fits: false, coloursNeeded: null };
  return { ...draft, coloursNeeded };
}
