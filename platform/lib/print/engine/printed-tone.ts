// Printed tone (Phase 2 dot-gain calibration, lib/print/calibration). Once the
// press is calibrated a film carries compensated coverage (dotGainFor): dots
// smaller than the tone wanted, because the press prints every halftone dot
// bigger. Composited from the film's pixels alone, a proof or an accuracy
// figure would show the film, lighter than the print. This module adds the
// gain back where the films are averaged anyway (a proof pixel, an accuracy
// block): each plate's film coverage f there prints as printedToneFor(inks)
// of f, and the colour moves by what that change does in the nested print
// model (one screen, so the dots of every plate nest: model.ts, the model the
// simulated-process separation inverts).
//
// Gain grows a dot's edge, so it scales with how much edge there is. A
// halftone at coverage f gets the whole measured gain; a solid shape's outline
// covering the same f of a proof pixel has far less edge, and gets only its
// share (the plate's edge density there against that of the set's own screen
// at f, at most all of it). Index films have no dots and are left as they are,
// and so is every film while the press is uncalibrated: the callers then skip
// all of this, so the output is what it was before calibration existed.
import type { HalftoneSpec, InkSystemProfile, ScreenSet } from '@/lib/print/types';
import { printedCoverageFor } from '@/lib/print/calibration/curve';
import type { Vec3 } from './colour';
import { makeScreen, screenRow } from './halftone';
import { nestedCoverageColour, type ModelLayer } from './model';

export interface PrintedTone {
  /** film coverage to printed coverage: the measured gain */
  tone: (film: number) => number;
  /** per plate (press order): edges per pixel of the plate's own halftone at a film coverage */
  edgeDensity: ((film: number) => number)[];
}

/**
 * The printed tone of a set's films, or null when they print as they are on
 * the film: an uncalibrated press (or a curve that can't be fitted, which the
 * engine treats as linear too), an index set (square cells, no dots), no films.
 */
export function printedToneOf(set: Pick<ScreenSet, 'method' | 'plates' | 'canvas'>, inks: Pick<InkSystemProfile, 'dotGain'>): PrintedTone | null {
  if (set.method === 'index' || set.plates.length === 0) return null;
  const tone = printedCoverageFor(inks.dotGain);
  if (!tone) return null;
  return { tone, edgeDensity: set.plates.map((p) => halftoneEdgeDensity(p.halftone, set.canvas.ppi)) };
}

const PATCH = 128;
const STEPS = 32;
const densities = new Map<string, Float64Array>();

/** Edges per pixel (left and upper neighbour that differ) of a flat tint on this screen, by coverage; sampled once per screen. */
export function halftoneEdgeDensity(spec: Pick<HalftoneSpec, 'lpi' | 'angleDeg' | 'dot'>, ppi: number): (film: number) => number {
  const key = `${spec.lpi}|${spec.angleDeg}|${spec.dot}|${ppi}`;
  let table = densities.get(key);
  if (!table) {
    table = new Float64Array(STEPS + 1);
    const screen = makeScreen(spec, ppi);
    const th = new Float32Array(PATCH * PATCH);
    const row = new Float32Array(PATCH);
    for (let y = 0; y < PATCH; y++) {
      screenRow(screen, y, 0, PATCH, row);
      th.set(row, y * PATCH);
    }
    const comparisons = 2 * PATCH * (PATCH - 1);
    for (let s = 1; s < STEPS; s++) {
      const f = s / STEPS;
      let edges = 0;
      for (let y = 0; y < PATCH; y++) {
        for (let x = 0; x < PATCH; x++) {
          const on = f > th[y * PATCH + x];
          if (x > 0 && on !== f > th[y * PATCH + x - 1]) edges++;
          if (y > 0 && on !== f > th[(y - 1) * PATCH + x]) edges++;
        }
      }
      // per pixel, counting both of its two comparisons
      table[s] = (2 * edges) / comparisons;
    }
    densities.set(key, table);
  }
  const t = table;
  return (film) => {
    if (!(film > 0) || film >= 1) return 0;
    const x = film * STEPS;
    const i = Math.min(STEPS - 1, Math.floor(x));
    return t[i] + (t[i + 1] - t[i]) * (x - i);
  };
}

/** Film pixels counted per region (a proof pixel, an accuracy block) and plate: how many are on, and how many edges they have. */
export class ToneTally {
  readonly on: Uint32Array;
  readonly edges: Uint32Array;
  readonly total: Uint32Array;
  constructor(
    readonly regions: number,
    readonly plates: number,
  ) {
    this.on = new Uint32Array(regions * plates);
    this.edges = new Uint32Array(regions * plates);
    this.total = new Uint32Array(regions);
  }

  /** One film pixel of region k: the plates on there (`mask`), and those that differ from the pixel to its left and above it. */
  add(k: number, mask: number, left: number, up: number): void {
    this.total[k]++;
    const dh = mask ^ left;
    const dv = mask ^ up;
    let any = mask | dh | dv;
    if (any === 0) return;
    const base = k * this.plates;
    while (any !== 0) {
      const bit = any & -any;
      const p = 31 - Math.clz32(bit);
      if (mask & bit) this.on[base + p]++;
      if (dh & bit) this.edges[base + p]++;
      if (dv & bit) this.edges[base + p]++;
      any ^= bit;
    }
  }
}

/** Reusable buffers for toneShift. */
export interface ToneScratch {
  film: Float64Array;
  printed: Float64Array;
  a: Vec3;
  b: Vec3;
}

export function toneScratch(plates: number): ToneScratch {
  return { film: new Float64Array(plates), printed: new Float64Array(plates), a: [0, 0, 0], b: [0, 0, 0] };
}

/**
 * What the gain does to region k: the change in its mean colour (linear, into
 * `delta`) and in the share of it that has ink, from the nested model on the
 * garment. Null when nothing changes there (no halftone, all solid or bare).
 */
export function toneShift(pt: PrintedTone, tally: ToneTally, k: number, layers: ModelLayer[], garment: Vec3, scratch: ToneScratch, delta: Vec3): number | null {
  const n = tally.plates;
  const total = tally.total[k];
  if (total === 0) return null;
  const { film, printed } = scratch;
  let moved = false;
  let unionFilm = 0;
  let unionPrinted = 0;
  for (let p = 0; p < n; p++) {
    const f = tally.on[k * n + p] / total;
    let g = f;
    if (f > 0 && f < 1) {
      const reference = pt.edgeDensity[p](f);
      const share = reference > 0 ? Math.min(1, tally.edges[k * n + p] / total / reference) : 1;
      g = Math.min(1, Math.max(f, f + share * (pt.tone(f) - f)));
      if (g !== f) moved = true;
    }
    film[p] = f;
    printed[p] = g;
    if (f > unionFilm) unionFilm = f;
    if (g > unionPrinted) unionPrinted = g;
  }
  if (!moved) return null;
  nestedCoverageColour(garment, layers, film, scratch.a);
  nestedCoverageColour(garment, layers, printed, scratch.b);
  delta[0] = scratch.b[0] - scratch.a[0];
  delta[1] = scratch.b[1] - scratch.a[1];
  delta[2] = scratch.b[2] - scratch.a[2];
  return unionPrinted - unionFilm;
}
