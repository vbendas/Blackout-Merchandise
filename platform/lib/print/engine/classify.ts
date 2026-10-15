// Spot classification: which ink, or the garment, reproduces a colour best,
// and at what tint. An ink's tints run from the bare garment (t = 0) to the
// ink's target colour (t = 1), mixed by area in linear light (that is what a
// halftone does); the nearest point is found in OKLab. Coverage is decided in
// the art's own terms, so a pixel of exactly the ink's colour prints solid;
// how the ink then really looks on the shirt (base opacity, underbase) is the
// proof's business. Colours within the knockout tolerance of the garment are
// the garment: it is a free ink. Results are cached per 7-bit colour, so a
// work grid classifies each distinct colour once.
import type { Lab } from '@/lib/print/types';
import { deltaE2000, linearToLab, linearToOklab, srgbToLinear, type Vec3 } from './colour';

export const GARMENT = 255;

const SAMPLES = 33;
/** Tints this close to solid print solid; this close to nothing print nothing. */
const SNAP = 0.03;
/** ... and so does a tint that looks within this (OKLab, about 2 ΔE) of solid or
 * of the bare shirt: a 94% tint of a dark ink on black is just the ink. */
const SNAP_OK = 0.02;
/** A tint must beat solid ink (or bare garment) by about half a ΔE, so a flat
 * colour a level off its ink prints solid, not as a halftone. */
const FRACTION_BIAS = 0.005;
const ERR_SCALE = 500;
const VALID = 1 << 24;
const KNOCKED_OUT = 1 << 25;

/** 7-bit bin centre (two 8-bit levels) to linear light. */
const BIN_TO_LINEAR: Float64Array = (() => {
  const t = new Float64Array(128);
  for (let i = 0; i < 128; i++) t[i] = srgbToLinear((2 * i + 0.5) / 255);
  return t;
})();

export interface Classified {
  label: number;
  /** tint, 0..1 (1 for solid, 0 for garment) */
  t: number;
  /** OKLab distance between the colour and its reproduction */
  err: number;
  /** within the knockout tolerance of the garment: the shirt shows, by design */
  knockedOut: boolean;
}

export function unpackLabel(p: number): number {
  return p & 255;
}

/** Tint as 0..255. */
export function unpackTint(p: number): number {
  return (p >>> 8) & 255;
}

export function unpackErr(p: number): number {
  return ((p >>> 16) & 255) / ERR_SCALE;
}

export function unpackKnockedOut(p: number): boolean {
  return (p & KNOCKED_OUT) !== 0;
}

export class SpotClassifier {
  private readonly lines: Float64Array;
  private readonly n: number;
  private readonly cache: Uint32Array;
  private readonly garmentOk: Vec3 = [0, 0, 0];
  private readonly q: Vec3 = [0, 0, 0];
  private readonly lin: Vec3 = [0, 0, 0];
  private readonly scratch: Classified = { label: GARMENT, t: 0, err: 0, knockedOut: false };

  /**
   * @param targets each palette entry's target colour, linear
   * @param knockoutDeltaE colours within this ΔE2000 of the garment print nothing
   */
  constructor(
    private readonly garment: Vec3,
    private readonly garmentLab: Lab,
    targets: Vec3[],
    private readonly knockoutDeltaE: number,
  ) {
    this.n = targets.length;
    if (this.n > 254) throw new Error('too many palette entries');
    this.lines = new Float64Array(this.n * SAMPLES * 3);
    const p: Vec3 = [0, 0, 0];
    for (let k = 0; k < this.n; k++) {
      const a = targets[k];
      for (let i = 0; i < SAMPLES; i++) {
        const t = i / (SAMPLES - 1);
        linearToOklab(garment[0] + (a[0] - garment[0]) * t, garment[1] + (a[1] - garment[1]) * t, garment[2] + (a[2] - garment[2]) * t, p);
        const o = (k * SAMPLES + i) * 3;
        this.lines[o] = p[0];
        this.lines[o + 1] = p[1];
        this.lines[o + 2] = p[2];
      }
    }
    linearToOklab(garment[0], garment[1], garment[2], this.garmentOk);
    this.cache = new Uint32Array(1 << 21);
  }

  /** Classifies a linear colour (no cache). */
  classifyLinear(lin: Vec3, out: Classified): Classified {
    const q = this.q;
    linearToOklab(lin[0], lin[1], lin[2], q);
    const g = this.garmentOk;
    const dg = Math.hypot(q[0] - g[0], q[1] - g[1], q[2] - g[2]);
    out.label = GARMENT;
    out.t = 0;
    out.err = dg;
    out.knockedOut = deltaE2000(linearToLab(lin[0], lin[1], lin[2]), this.garmentLab) <= this.knockoutDeltaE;
    if (out.knockedOut || this.n === 0) return out;
    let bestScore = dg;
    const L = this.lines;
    for (let k = 0; k < this.n; k++) {
      const base = k * SAMPLES * 3;
      let bi = 1;
      let bd = Infinity;
      for (let i = 1; i < SAMPLES; i++) {
        const o = base + i * 3;
        const d0 = q[0] - L[o];
        const d1 = q[1] - L[o + 1];
        const d2 = q[2] - L[o + 2];
        const d = d0 * d0 + d1 * d1 + d2 * d2;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      }
      // refine on the two segments around the best sample
      let bestT = bi / (SAMPLES - 1);
      let bestD = Math.sqrt(bd);
      for (let side = -1; side <= 1; side += 2) {
        const j = bi + side;
        if (j < 0 || j >= SAMPLES) continue;
        const oa = base + bi * 3;
        const ob = base + j * 3;
        const ex = L[ob] - L[oa];
        const ey = L[ob + 1] - L[oa + 1];
        const ez = L[ob + 2] - L[oa + 2];
        const len2 = ex * ex + ey * ey + ez * ez;
        if (len2 <= 0) continue;
        let u = ((q[0] - L[oa]) * ex + (q[1] - L[oa + 1]) * ey + (q[2] - L[oa + 2]) * ez) / len2;
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const px = L[oa] + u * ex - q[0];
        const py = L[oa + 1] + u * ey - q[1];
        const pz = L[oa + 2] + u * ez - q[2];
        const d = Math.sqrt(px * px + py * py + pz * pz);
        if (d < bestD) {
          bestD = d;
          bestT = (bi + side * u) / (SAMPLES - 1);
        }
      }
      let t = bestT;
      if (t >= 1 - SNAP) t = 1;
      if (t <= SNAP) continue; // that is the garment, already scored
      if (t < 1) {
        // where the tint sits on the line, against the solid ink and the bare shirt
        const f = t * (SAMPLES - 1);
        const i0 = Math.min(SAMPLES - 2, Math.floor(f));
        const u = f - i0;
        const oa = base + i0 * 3;
        const ob = oa + 3;
        const os = base + (SAMPLES - 1) * 3;
        const px = L[oa] + u * (L[ob] - L[oa]);
        const py = L[oa + 1] + u * (L[ob + 1] - L[oa + 1]);
        const pz = L[oa + 2] + u * (L[ob + 2] - L[oa + 2]);
        if (Math.hypot(px - L[base], py - L[base + 1], pz - L[base + 2]) < SNAP_OK) continue;
        if (Math.hypot(px - L[os], py - L[os + 1], pz - L[os + 2]) < SNAP_OK) {
          t = 1;
          bestD = Math.hypot(q[0] - L[os], q[1] - L[os + 1], q[2] - L[os + 2]);
        }
      }
      const score = bestD + (t < 1 ? FRACTION_BIAS : 0);
      if (score < bestScore) {
        bestScore = score;
        out.label = k;
        out.t = t;
        out.err = bestD;
      }
    }
    return out;
  }

  /** Classifies an 8-bit sRGB colour through the 7-bit cache. Returns a packed result. */
  classify8(r: number, g: number, b: number): number {
    const key = ((r >> 1) << 14) | ((g >> 1) << 7) | (b >> 1);
    const hit = this.cache[key];
    if (hit !== 0) return hit;
    const lin = this.lin;
    lin[0] = BIN_TO_LINEAR[r >> 1];
    lin[1] = BIN_TO_LINEAR[g >> 1];
    lin[2] = BIN_TO_LINEAR[b >> 1];
    const c = this.classifyLinear(lin, this.scratch);
    const t8 = c.label === GARMENT ? 0 : Math.round(c.t * 255);
    const e8 = Math.min(254, Math.round(c.err * ERR_SCALE));
    const packed = (VALID | (c.knockedOut ? KNOCKED_OUT : 0) | (e8 << 16) | (t8 << 8) | c.label) >>> 0;
    this.cache[key] = packed;
    return packed;
  }
}
