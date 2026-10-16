// Dot-gain compensation from a measured chart (Phase 2, plan section 4.3 step 7).
//
// A halftone dot prints larger than it is on the film: ink spreads, the mesh
// holds back some of the emulsion edge, and the scanner or eye sees the shadow
// round it. The gain is nearly zero at 0% and 100% and largest in the mid
// tones, so a film imaged with linear coverage prints too dark. The test chart
// (chart.ts) is imaged with linear coverage on purpose; reading it gives
// points (film coverage, printed coverage), and this module turns them into
//
//   gain(film)           what the press does: film coverage -> printed coverage
//   compensate(wanted)   what the engine images: wanted printed coverage -> film coverage
//
// The engine calls dotGainFor(inks) once per plate and feeds the result to
// makeTransfer (engine/halftone.ts), which samples it 4097 times. A proof is
// drawn from the film's coverage, so it asks printedToneFor(inks) what that
// coverage will print as (the same fitted curve, the other way round).
//
// The maths, in order:
//  1. Clean the points: clamp to 0..1, sort, average duplicates, pin the two
//     ends at (0,0) and (1,1) (the chart's own references are by definition 0%
//     and 100%, so any reading there is noise), then make the printed values
//     non-decreasing with pool-adjacent-violators (isotonic regression), the
//     least-squares monotone fit, so noise can't make the curve fold back.
//  2. Interpolate with a monotone cubic Hermite spline (PCHIP, Fritsch and
//     Carlson 1980; slopes by Fritsch and Butland's weighted harmonic mean, the
//     ends by the shape-preserving three-point rule). It passes through every
//     cleaned point, is C1, and never overshoots or dips between them.
//  3. Invert it: compensate(p) = the smallest film coverage c with gain(c) >= p,
//     found by bisection inside the one segment that holds p. That is the exact
//     inverse wherever the gain is strictly rising, and where it is flat (dots
//     under the mesh's smallest printable size, or ink that has gone solid) the
//     nearest honest answer: no film coverage prints less than the plateau, so
//     the inverse jumps across it instead of inventing values.
//  4. Fix the ends: compensate(0) = 0 and compensate(1) = 1, inputs and outputs
//     clamped to 0..1. The result is non-decreasing by construction.
//
// Pure and client-safe (the admin page previews with it); no server imports.
import type { DotGainProfile, InkSystemProfile } from '@/lib/print/types';
import { LINEAR_DOT_GAIN, type DotGainCurve } from '@/lib/print/engine/halftone';

/** One reading: coverage on the film and coverage measured on the print, both 0..1. */
export interface CurvePoint {
  input: number;
  printed: number;
}

export interface DotGainCurves {
  /** film coverage to printed coverage: what the press does */
  gain: (film: number) => number;
  /** wanted printed coverage to film coverage: what the engine should image */
  compensate: (wanted: number) => number;
  /** the cleaned, monotone points both curves pass through, the pinned ends included */
  points: CurvePoint[];
}

export interface CleanedPoints {
  points: CurvePoint[];
  /** how much the monotone fit had to move the readings (coverage 0..1): none when the readings already rose */
  moved: { count: number; max: number };
}

const EPS = 1e-9;

/** 0..1, with anything that is not a number as 0. */
const clamp01 = (v: number): number => (!(v > 0) ? 0 : v >= 1 ? 1 : v);

// ---------------------------------------------------------------------------
// 1. Cleaning
// ---------------------------------------------------------------------------

/** Pool-adjacent-violators: the non-decreasing sequence closest to `values` in least squares. */
function isotonic(values: number[], weights: number[]): number[] {
  const blocks: { sum: number; weight: number; count: number }[] = [];
  values.forEach((value, i) => {
    blocks.push({ sum: value * weights[i], weight: weights[i], count: 1 });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1];
      const prev = blocks[blocks.length - 2];
      if (prev.sum / prev.weight <= last.sum / last.weight) break;
      blocks.splice(blocks.length - 2, 2, { sum: prev.sum + last.sum, weight: prev.weight + last.weight, count: prev.count + last.count });
    }
  });
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.count; k++) out.push(b.sum / b.weight);
  return out;
}

/** Readings made usable: see the header. Never throws: points that are not numbers are dropped, and anything that is not a list of points is no points. */
export function cleanPoints(raw: readonly CurvePoint[]): CleanedPoints {
  const kept = (Array.isArray(raw) ? raw : [])
    .filter((p) => p && Number.isFinite(p.input) && Number.isFinite(p.printed))
    .map((p) => ({ input: clamp01(p.input), printed: clamp01(p.printed) }))
    // The ends are fixed; whatever was read there is noise or the reference itself.
    .filter((p) => p.input > EPS && p.input < 1 - EPS)
    .sort((a, b) => a.input - b.input);

  // Equal film coverages (a value typed twice) become their average.
  const merged: { input: number; printed: number; weight: number }[] = [{ input: 0, printed: 0, weight: 1 }];
  for (const p of kept) {
    const last = merged[merged.length - 1];
    if (Math.abs(p.input - last.input) <= EPS) {
      last.printed = (last.printed * last.weight + p.printed) / (last.weight + 1);
      last.weight += 1;
    } else merged.push({ input: p.input, printed: p.printed, weight: 1 });
  }
  merged.push({ input: 1, printed: 1, weight: 1 });

  const fitted = isotonic(
    merged.map((m) => m.printed),
    merged.map((m) => m.weight),
  );
  let count = 0;
  let max = 0;
  const points = merged.map((m, i) => {
    const shift = Math.abs(fitted[i] - m.printed);
    if (shift > 1e-9) count += 1;
    max = Math.max(max, shift);
    return { input: m.input, printed: clamp01(fitted[i]) };
  });
  return { points, moved: { count, max } };
}

// ---------------------------------------------------------------------------
// 2. Monotone cubic interpolation (PCHIP)
// ---------------------------------------------------------------------------

/** The shape-preserving slope at an end of the data (Moler, Numerical Computing with MATLAB, 3.6). */
function endSlope(h0: number, h1: number, d0: number, d1: number): number {
  let slope = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(slope) !== Math.sign(d0)) slope = 0;
  else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(slope) > 3 * Math.abs(d0)) slope = 3 * d0;
  return slope;
}

/** Slopes at the knots of a non-decreasing data set that keep the Hermite spline monotone. */
export function pchipSlopes(xs: readonly number[], ys: readonly number[]): number[] {
  const n = xs.length;
  if (n < 2) return new Array<number>(n).fill(0);
  const h: number[] = [];
  const d: number[] = [];
  for (let k = 0; k + 1 < n; k++) {
    h.push(xs[k + 1] - xs[k]);
    d.push((ys[k + 1] - ys[k]) / h[k]);
  }
  if (n === 2) return [d[0], d[0]];
  const m = new Array<number>(n).fill(0);
  for (let k = 1; k + 1 < n; k++) {
    // A flat side (or a change of direction) pins the slope to zero: that is what stops overshoot.
    if (d[k - 1] * d[k] > 0) {
      const w1 = 2 * h[k] + h[k - 1];
      const w2 = h[k] + 2 * h[k - 1];
      m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    }
  }
  m[0] = endSlope(h[0], h[1], d[0], d[1]);
  m[n - 1] = endSlope(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  return m;
}

/** Cubic Hermite on [x0, x1] at t in 0..1. */
function hermite(t: number, h: number, y0: number, y1: number, m0: number, m1: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1;
}

/** The index k of the segment [xs[k], xs[k+1]] that holds x (clamped to the first and last). */
function segmentOf(xs: readonly number[], x: number): number {
  let lo = 0;
  let hi = xs.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

interface Spline {
  xs: readonly number[];
  ys: readonly number[];
  slopes: number[];
  /** the spline at x, flat outside the data */
  at: (x: number) => number;
  /** the spline inside segment k at t in 0..1 */
  inSegment: (k: number, t: number) => number;
}

function makeSpline(xs: readonly number[], ys: readonly number[]): Spline {
  const slopes = pchipSlopes(xs, ys);
  const last = xs.length - 1;
  const inSegment = (k: number, t: number): number => hermite(t, xs[k + 1] - xs[k], ys[k], ys[k + 1], slopes[k], slopes[k + 1]);
  const at = (x: number): number => {
    if (!(x > xs[0])) return ys[0];
    if (x >= xs[last]) return ys[last];
    const k = segmentOf(xs, x);
    return inSegment(k, (x - xs[k]) / (xs[k + 1] - xs[k]));
  };
  return { xs, ys, slopes, at, inSegment };
}

/** The monotone spline through (xs, ys) as a function of x, flat outside the data. */
export function monotoneSpline(xs: readonly number[], ys: readonly number[]): (x: number) => number {
  return makeSpline(xs, ys).at;
}

// ---------------------------------------------------------------------------
// 3 and 4. The curves
// ---------------------------------------------------------------------------

/** The gain and its inverse from readings. Needs the points cleanPoints returns (ends included). */
export function curvesFromCleaned(points: readonly CurvePoint[]): DotGainCurves {
  const xs = points.map((p) => p.input);
  const ys = points.map((p) => p.printed);
  const spline = makeSpline(xs, ys);
  const last = xs.length - 1;

  const gain = (film: number): number => {
    const x = clamp01(film);
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return clamp01(spline.at(x));
  };

  const compensate = (wanted: number): number => {
    const p = clamp01(wanted);
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    // The first knot whose printed value reaches p; the segment before it holds p. A hair of slack (far below anything a
    // reading means) keeps a tone that is a plateau's own level, give or take rounding, at the plateau's start instead of
    // letting it skip to the knot after.
    let lo = 1;
    let hi = last;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] >= p - 1e-12) hi = mid;
      else lo = mid + 1;
    }
    const k = lo - 1;
    // The spline is non-decreasing on the segment, so bisection finds where it first reaches p.
    let a = 0;
    let b = 1;
    for (let i = 0; i < 52; i++) {
      const t = (a + b) / 2;
      if (spline.inSegment(k, t) < p) a = t;
      else b = t;
    }
    return clamp01(xs[k] + (xs[k + 1] - xs[k]) * b);
  };

  return { gain, compensate, points: points.map((p) => ({ ...p })) };
}

/** Curves from readings, or null when there is nothing to fit (fewer than one usable reading between the ends). */
export function buildDotGainCurves(raw: readonly CurvePoint[]): (DotGainCurves & { moved: CleanedPoints['moved'] }) | null {
  const cleaned = cleanPoints(raw);
  if (cleaned.points.length < 3) return null;
  return { ...curvesFromCleaned(cleaned.points), moved: cleaned.moved };
}

const built = new WeakMap<DotGainProfile, DotGainCurves | null>();

function curvesOf(profile: DotGainProfile | undefined): DotGainCurves | null {
  if (!profile || !Array.isArray(profile.points)) return null;
  if (built.has(profile)) return built.get(profile) ?? null;
  const curves = buildDotGainCurves(profile.points);
  built.set(profile, curves);
  return curves;
}

/** What the press does to film coverage, from a saved profile; null without one. */
export function printedCoverageFor(profile: DotGainProfile | undefined): ((film: number) => number) | null {
  return curvesOf(profile)?.gain ?? null;
}

/** The compensation of a saved profile; null without a usable one. */
export function compensationFor(profile: DotGainProfile | undefined): DotGainCurve | null {
  return curvesOf(profile)?.compensate ?? null;
}

/**
 * The compensation curve for an ink system: film coverage to put on the film
 * for a wanted printed coverage. Linear when the ink system has no measured
 * dot gain, and also when the saved readings can't be fitted: the engine never
 * fails a job over a calibration.
 */
export function dotGainFor(inks: Pick<InkSystemProfile, 'dotGain'>): DotGainCurve {
  return compensationFor(inks.dotGain) ?? LINEAR_DOT_GAIN;
}

/**
 * What the press does with film coverage: printed coverage for a coverage on
 * the film, from the measured points through the monotone curve (0 and 1
 * fixed) that dotGainFor inverts, so printedToneFor(inks)(dotGainFor(inks)(p))
 * is p. A proof drawn from the film's coverage would look lighter than the
 * print once the press has gain; drawn through this it looks like the print.
 * Linear, as dotGainFor is, without a usable calibration.
 */
export function printedToneFor(inks: Pick<InkSystemProfile, 'dotGain'>): DotGainCurve {
  return printedCoverageFor(inks.dotGain) ?? LINEAR_DOT_GAIN;
}

// ---------------------------------------------------------------------------
// For the page and the job sheet
// ---------------------------------------------------------------------------

/** Dot gain in points of coverage at one film coverage: printed minus film. */
export function gainPointsAt(curves: Pick<DotGainCurves, 'gain'>, film: number): number {
  return curves.gain(film) - clamp01(film);
}

/** True when the readings leave every tone within `tolerance` (coverage 0..1) of linear. */
export function isNearLinear(raw: readonly CurvePoint[], tolerance = 0.005): boolean {
  const curves = buildDotGainCurves(raw);
  if (!curves) return true;
  for (let i = 0; i <= 100; i++) if (Math.abs(curves.gain(i / 100) - i / 100) > tolerance) return false;
  return true;
}

/** The curve sampled at n+1 evenly spaced film coverages, for drawing. */
export function sampleCurve(fn: (x: number) => number, steps = 100): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) out.push({ x: i / steps, y: fn(i / steps) });
  return out;
}
