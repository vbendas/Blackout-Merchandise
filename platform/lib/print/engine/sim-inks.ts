// Inks for simulated process: chosen from the art to span its colours within
// the screen budget. Halftone dots mix by area in linear light, so what a set
// of inks can print is about the convex hull of their solid colours, the
// garment (free) and, on darks, the bare underbase and the highlight white.
// The art's colours are binned; inks are added one at a time, each time the
// art colour whose ink most shrinks the art's distance to that hull (ΔE2000-
// like, OK_WEIGHT), until the art is covered or the screens run out. Each ink
// is the colour that prints that art colour exactly at full strength over its
// base. An ink that would barely show on the shirt is never chosen.
import type { Hex, Lab } from '@/lib/print/types';
import { ENGINE_TUNING, WHITE_INK_HEX } from '@/lib/print/defaults';
import { SRGB8_TO_LINEAR, deltaE2000, hexToRgb8, linearToLab, linearToSrgb8, rgb8ToHex, type Vec3 } from './colour';
import { overlay, underbaseOn, type InkSystemModel } from './model';
import { keepShare } from './sim-lut';
import { OK_WEIGHT, nnls, okDistance, oklabWithJacobian } from './sim-model';

/** The art's colours over the set's garment: bin means (linear, after the knockout pull) and weights. */
export interface ArtColours {
  n: number;
  lin: Float64Array;
  ok: Float64Array;
  weight: Float64Array;
  total: number;
}

const BIN_BITS = 4;

/** Bins the composite (8-bit sRGB, 3 per pixel) of the art over the garment. */
export function artColours(comp: Uint8Array, pixels: number, garment: Vec3, garmentLab: Lab, knockoutDeltaE: number): ArtColours {
  const shift = 8 - BIN_BITS;
  const bins = 1 << (3 * BIN_BITS);
  const count = new Float64Array(bins);
  const sum = new Float64Array(bins * 3);
  for (let i = 0; i < pixels; i++) {
    const r = comp[i * 3];
    const g = comp[i * 3 + 1];
    const b = comp[i * 3 + 2];
    const k = ((r >> shift) << (2 * BIN_BITS)) | ((g >> shift) << BIN_BITS) | (b >> shift);
    count[k]++;
    sum[k * 3] += SRGB8_TO_LINEAR[r];
    sum[k * 3 + 1] += SRGB8_TO_LINEAR[g];
    sum[k * 3 + 2] += SRGB8_TO_LINEAR[b];
  }
  const lin: number[] = [];
  const weight: number[] = [];
  const m: Vec3 = [0, 0, 0];
  for (let k = 0; k < bins; k++) {
    if (count[k] === 0) continue;
    m[0] = sum[k * 3] / count[k];
    m[1] = sum[k * 3 + 1] / count[k];
    m[2] = sum[k * 3 + 2] / count[k];
    const keep = keepShare(m, garmentLab, knockoutDeltaE);
    if (keep <= 0) continue;
    lin.push(garment[0] + (m[0] - garment[0]) * keep, garment[1] + (m[1] - garment[1]) * keep, garment[2] + (m[2] - garment[2]) * keep);
    weight.push(count[k] * keep);
  }
  const n = weight.length;
  const ok = new Float64Array(n * 3);
  const tmp = new Float64Array(3);
  for (let i = 0; i < n; i++) {
    oklabWithJacobian(lin[i * 3], lin[i * 3 + 1], lin[i * 3 + 2], tmp);
    ok.set(tmp, i * 3);
  }
  return { n, lin: Float64Array.from(lin), ok, weight: Float64Array.from(weight), total: weight.reduce((s, v) => s + v, 0) };
}

// ---------------------------------------------------------------------------
// Distance to the hull of a set of printable colours
// ---------------------------------------------------------------------------

/** OKLab distance from colour i of `art` to the hull of `verts` (linear, m x 3). */
class HullMeter {
  private readonly jac = new Float64Array(9);
  private readonly ok = new Float64Array(3);
  private readonly q = new Float64Array(3);
  private A = new Float64Array(0);
  private readonly b = new Float64Array(4);
  private w = new Float64Array(0);
  /** sum-to-one row weight, against the ΔE-scaled colour rows */
  private static readonly ONE = 60;

  distance(art: ArtColours, i: number, verts: Float64Array, m: number): number {
    if (this.A.length < 4 * m) {
      this.A = new Float64Array(4 * m);
      this.w = new Float64Array(m);
    }
    const x0 = art.lin[i * 3];
    const x1 = art.lin[i * 3 + 1];
    const x2 = art.lin[i * 3 + 2];
    oklabWithJacobian(x0, x1, x2, this.ok, this.jac);
    const J = this.jac;
    const A = this.A;
    for (let j = 0; j < m; j++) {
      const v0 = verts[j * 3];
      const v1 = verts[j * 3 + 1];
      const v2 = verts[j * 3 + 2];
      for (let r = 0; r < 3; r++) A[r * m + j] = (J[r * 3] * v0 + J[r * 3 + 1] * v1 + J[r * 3 + 2] * v2) * OK_WEIGHT[r];
      A[3 * m + j] = HullMeter.ONE;
    }
    for (let r = 0; r < 3; r++) this.b[r] = (J[r * 3] * x0 + J[r * 3 + 1] * x1 + J[r * 3 + 2] * x2) * OK_WEIGHT[r];
    this.b[3] = HullMeter.ONE;
    const w = this.w.subarray(0, m);
    nnls(A.subarray(0, 4 * m), 4, m, this.b, w);
    let s = 0;
    let p0 = 0;
    let p1 = 0;
    let p2 = 0;
    for (let j = 0; j < m; j++) {
      s += w[j];
      p0 += w[j] * verts[j * 3];
      p1 += w[j] * verts[j * 3 + 1];
      p2 += w[j] * verts[j * 3 + 2];
    }
    if (s > 0) {
      p0 /= s;
      p1 /= s;
      p2 /= s;
    }
    oklabWithJacobian(p0, p1, p2, this.q);
    return okDistance(this.q, 0, art.ok, i * 3);
  }
}

// ---------------------------------------------------------------------------
// Choosing the inks
// ---------------------------------------------------------------------------

export interface SimInkContext {
  dark: boolean;
  sys: InkSystemModel;
  /** garment, linear */
  garment: Vec3;
  garmentLab: Lab;
  /** the recipe allows a highlight white (darks) */
  highlightAllowed: boolean;
  maxScreens: number;
  lockedInks?: Hex[];
}

export interface ChosenInk {
  kind: 'ink' | 'white';
  hex: Hex;
  lin: Vec3;
  base: string;
  opacity: number;
  /** sits on the underbase (darks) */
  supported: boolean;
}

export interface SimInkChoice {
  /** colour inks, press order (light to dark) */
  inks: ChosenInk[];
  highlight: boolean;
  /** how far (ΔE2000-like) the art is from what the inks can print, weighted mean and 95th percentile */
  hullMean: number;
  hullP95: number;
}

/** The hull is good enough when the art is this close to it (ΔE2000-like): on average, and for 95% of it.
 * Tighter than the print needs, because the screens and the table add their own error on top. */
const GOAL_MEAN = 0.6;
const GOAL_P95 = 2;
/** An ink whose solid barely differs from the garment (less than this ΔE2000) is not worth a screen. */
const MIN_INK_CONTRAST = 12;
/** an added screen must cut the squared error by at least this share to be worth it */
const MIN_GAIN = 0.04;
const CANDIDATES = 40;

function inkFor(kind: 'ink' | 'white', lin: Vec3, ctx: SimInkContext): ChosenInk {
  const { sys, dark } = ctx;
  if (kind === 'white') {
    const [r, g, b] = hexToRgb8(WHITE_INK_HEX);
    return { kind, hex: WHITE_INK_HEX, lin: [SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]], base: sys.underbaseInk, opacity: sys.underbaseOpacity, supported: dark };
  }
  const base = dark ? sys.darkBase : sys.lightBase;
  const opacity = sys.opacityOf(base);
  const under = dark ? underbaseOn(sys, ctx.garment) : ctx.garment;
  // the ink that prints `lin` at full strength over what is under it
  const ink: Vec3 = [0, 0, 0];
  for (let ch = 0; ch < 3; ch++) ink[ch] = Math.min(1, Math.max(0, lin[ch] / (opacity + (1 - opacity) * under[ch])));
  const hex = rgb8ToHex(linearToSrgb8(ink[0]), linearToSrgb8(ink[1]), linearToSrgb8(ink[2]));
  const [r, g, b] = hexToRgb8(hex);
  return { kind, hex, lin: [SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]], base, opacity, supported: dark };
}

/** The solid colour an ink prints on the set's garment. */
export function solidOf(ink: ChosenInk, ctx: SimInkContext): Vec3 {
  const under = ink.supported ? underbaseOn(ctx.sys, ctx.garment) : ctx.garment;
  return overlay(under, ink.lin, ink.opacity, [0, 0, 0]);
}

function inkFromHex(hex: Hex, ctx: SimInkContext): ChosenInk {
  const [r, g, b] = hexToRgb8(hex);
  const lin: Vec3 = [SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]];
  const base = ctx.dark ? ctx.sys.darkBase : ctx.sys.lightBase;
  return { kind: 'ink', hex: rgb8ToHex(r, g, b), lin, base, opacity: ctx.sys.opacityOf(base), supported: ctx.dark };
}

interface Candidate {
  ink: ChosenInk | null;
  /** the highlight white */
  highlight: boolean;
  vertex: Vec3;
}

/** Inks for a set: locked ones when the recipe locks them, else chosen to cover the art. */
export function chooseSimInks(art: ArtColours, ctx: SimInkContext): SimInkChoice {
  const { dark, sys, garment } = ctx;
  const meter = new HullMeter();
  const free: Vec3[] = [garment];
  const ub = dark ? underbaseOn(sys, garment) : null;
  if (ub) free.push(ub);
  const highlightVertex = ub ? overlay(ub, sys.white, sys.highlightOpacity, [0, 0, 0]) : null;
  const fixedScreens = dark ? 1 : 0;

  const errs = new Float64Array(art.n);
  const measure = (verts: Vec3[], out: Float64Array, only?: Float64Array): number => {
    const flat = new Float64Array(verts.length * 3);
    verts.forEach((v, j) => flat.set(v, j * 3));
    let total = 0;
    for (let i = 0; i < art.n; i++) {
      // a colour already on the hull stays there when a vertex is added
      if (only && only[i] < 0.01) {
        out[i] = only[i];
      } else {
        out[i] = meter.distance(art, i, flat, verts.length);
      }
      total += art.weight[i] * out[i] * out[i];
    }
    return total;
  };
  const summary = (e: Float64Array): { mean: number; p95: number } => {
    if (art.n === 0 || art.total <= 0) return { mean: 0, p95: 0 };
    let s = 0;
    const order = Array.from({ length: art.n }, (_, i) => i).sort((a, b) => e[a] - e[b] || a - b);
    for (let i = 0; i < art.n; i++) s += art.weight[i] * e[i];
    let acc = 0;
    let p95 = e[order[order.length - 1]];
    for (const i of order) {
      acc += art.weight[i];
      if (acc >= 0.95 * art.total) {
        p95 = e[i];
        break;
      }
    }
    return { mean: s / art.total, p95 };
  };

  // locked inks: the auditor's colours, plus the highlight if it helps
  if (ctx.lockedInks && ctx.lockedInks.length > 0) {
    // never more films than the screens allow (pre-press refuses a re-run whose inks don't fit; this keeps the engine to it)
    const inks = ctx.lockedInks.slice(0, Math.max(0, ctx.maxScreens - fixedScreens)).map((h) => inkFromHex(h, ctx));
    const verts = [...free, ...inks.map((k) => solidOf(k, ctx))];
    const base = measure(verts, errs);
    let highlight = false;
    if (highlightVertex && ctx.highlightAllowed && fixedScreens + inks.length + 1 <= ctx.maxScreens) {
      const withHw = new Float64Array(art.n);
      const t = measure([...verts, highlightVertex], withHw);
      if (t < base * (1 - MIN_GAIN)) {
        highlight = true;
        errs.set(withHw);
      }
    }
    const s = summary(errs);
    return { inks: pressOrder(inks), highlight, hullMean: s.mean, hullP95: s.p95 };
  }

  const verts: Vec3[] = [...free];
  const chosen: ChosenInk[] = [];
  let highlight = false;
  let total = measure(verts, errs);
  const whiteLab = linearToLab(sys.white[0], sys.white[1], sys.white[2]);
  const whiteUseful = !dark && deltaE2000(ctx.garmentLab, whiteLab) > ENGINE_TUNING.whiteDeltaE;
  const trial = new Float64Array(art.n);
  for (;;) {
    const screens = fixedScreens + chosen.length + (highlight ? 1 : 0);
    if (screens >= ctx.maxScreens || art.n === 0) break;
    const s = summary(errs);
    if (s.mean <= GOAL_MEAN && s.p95 <= GOAL_P95) break;
    // candidates: the art colours that weigh most in the error, then the whites
    const ranked = Array.from({ length: art.n }, (_, i) => i)
      .filter((i) => errs[i] > 0.01)
      .sort((a, b) => art.weight[b] * errs[b] * errs[b] - art.weight[a] * errs[a] * errs[a] || a - b)
      .slice(0, CANDIDATES);
    const cands: Candidate[] = [];
    for (const i of ranked) {
      const ink = inkFor('ink', [art.lin[i * 3], art.lin[i * 3 + 1], art.lin[i * 3 + 2]], ctx);
      // the art's whites print with the white ink (the highlight on darks), never a mixed white
      if (deltaE2000(linearToLab(ink.lin[0], ink.lin[1], ink.lin[2]), whiteLab) <= ENGINE_TUNING.whiteDeltaE) continue;
      const vertex = solidOf(ink, ctx);
      if (deltaE2000(linearToLab(vertex[0], vertex[1], vertex[2]), ctx.garmentLab) < MIN_INK_CONTRAST) continue;
      cands.push({ ink, highlight: false, vertex });
    }
    if (highlightVertex && ctx.highlightAllowed && !highlight) cands.push({ ink: null, highlight: true, vertex: highlightVertex });
    if (whiteUseful && !chosen.some((k) => k.kind === 'white')) {
      const ink = inkFor('white', [1, 1, 1], ctx);
      cands.push({ ink, highlight: false, vertex: solidOf(ink, ctx) });
    }
    let bestTotal = total;
    let best: Candidate | null = null;
    let bestErrs: Float64Array | null = null;
    for (const c of cands) {
      const t = measure([...verts, c.vertex], trial, errs);
      if (t < bestTotal - 1e-15) {
        bestTotal = t;
        best = c;
        bestErrs = Float64Array.from(trial);
      }
    }
    if (!best || !bestErrs || bestTotal > total * (1 - MIN_GAIN)) break;
    verts.push(best.vertex);
    if (best.highlight) highlight = true;
    else if (best.ink) chosen.push(best.ink);
    errs.set(bestErrs);
    total = bestTotal;
  }
  const s = summary(errs);
  return { inks: pressOrder(chosen), highlight, hullMean: s.mean, hullP95: s.p95 };
}

function pressOrder(inks: ChosenInk[]): ChosenInk[] {
  return inks
    .map((k) => ({ k, L: linearToLab(k.lin[0], k.lin[1], k.lin[2]).L }))
    .sort((a, b) => b.L - a.L || (a.k.hex < b.k.hex ? -1 : a.k.hex > b.k.hex ? 1 : 0))
    .map((v) => v.k);
}
