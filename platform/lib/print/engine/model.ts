// The print model: how layers of ink sit on a garment. A layer of colour X
// (as printed on white) with opacity o over a background B shows
// X * (o + (1 - o) * B) per linear channel: opaque ink shows X whatever is
// under it, translucent ink filters what is under it. Halftone dots mix by
// area in linear light. The same model weights the underbase, picks tint
// coverage, checks screen sets and draws the proofs, so the separation and
// the proof cannot drift apart. Opacities are estimates until the inks are
// measured (InkSystemProfile.measured).
import type { InkSystemProfile } from '@/lib/print/types';
import { ENGINE_TUNING, FALLBACK_OPACITY, WHITE_INK_HEX } from '@/lib/print/defaults';
import { deltaE2000, hexToLinear, linearToLab, type Vec3 } from './colour';

/** A layer of ink over whatever is below, in linear light. */
export function overlay(under: Vec3, colour: Vec3, opacity: number, out: Vec3): Vec3 {
  out[0] = colour[0] * (opacity + (1 - opacity) * under[0]);
  out[1] = colour[1] * (opacity + (1 - opacity) * under[1]);
  out[2] = colour[2] * (opacity + (1 - opacity) * under[2]);
  return out;
}

export function mix(a: Vec3, b: Vec3, t: number, out: Vec3): Vec3 {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

export interface InkSystemModel {
  white: Vec3;
  underbaseInk: string;
  underbaseOpacity: number;
  highlightInk: string;
  highlightOpacity: number;
  lightBase: string;
  darkBase: string;
  opacityOf: (base: string) => number;
}

export function inkSystemModel(inks: InkSystemProfile): InkSystemModel {
  const opacityOf = (base: string): number => {
    const v = inks.opacity[base];
    if (typeof v === 'number' && v >= 0 && v <= 1) return v;
    if (base === inks.underbase.ink || base === inks.highlightWhite.ink) return FALLBACK_OPACITY.white;
    return base === inks.bases.light ? FALLBACK_OPACITY.lightBase : FALLBACK_OPACITY.darkBase;
  };
  return {
    white: hexToLinear(WHITE_INK_HEX),
    underbaseInk: inks.underbase.ink,
    underbaseOpacity: opacityOf(inks.underbase.ink),
    highlightInk: inks.highlightWhite.ink,
    highlightOpacity: opacityOf(inks.highlightWhite.ink),
    lightBase: inks.bases.light,
    darkBase: inks.bases.dark,
    opacityOf,
  };
}

/** The flashed underbase on garment g. */
export function underbaseOn(sys: InkSystemModel, garment: Vec3): Vec3 {
  return overlay(garment, sys.white, sys.underbaseOpacity, [0, 0, 0]);
}

/**
 * How much underbase an ink needs on a dark garment: the smallest weight (in
 * quarter steps, so a partial underbase is a deliberate choice, not a
 * mottle under every mid tone) that brings the printed ink within
 * ENGINE_TUNING's underbaseOkDeltaE of its target, else the weight that gets
 * closest. Near-black inks need little or none; the rest need all of it.
 */
export function underbaseWeight(sys: InkSystemModel, garment: Vec3, ink: Vec3, opacity: number): number {
  const target = linearToLab(ink[0], ink[1], ink[2]);
  const ub = underbaseOn(sys, garment);
  const under: Vec3 = [0, 0, 0];
  const printed: Vec3 = [0, 0, 0];
  let best = 1;
  let bestDe = Infinity;
  for (let step = 0; step <= 4; step++) {
    const u = step / 4;
    mix(garment, ub, u, under);
    overlay(under, ink, opacity, printed);
    const de = deltaE2000(linearToLab(printed[0], printed[1], printed[2]), target);
    if (de <= ENGINE_TUNING.underbaseOkDeltaE) return u;
    if (de < bestDe - 1e-9) {
      bestDe = de;
      best = u;
    }
  }
  return best;
}

export type PlateKind = 'underbase' | 'ink' | 'highlight';

export interface ModelLayer {
  kind: PlateKind;
  colour: Vec3;
  opacity: number;
}

/** The colour of one spot: garment, then each layer that prints there, in press order. */
export function stackColour(garment: Vec3, layers: ModelLayer[], on: (i: number) => boolean, out: Vec3): Vec3 {
  out[0] = garment[0];
  out[1] = garment[1];
  out[2] = garment[2];
  for (let i = 0; i < layers.length; i++) {
    if (!on(i)) continue;
    const l = layers[i];
    overlay(out, l.colour, l.opacity, out);
  }
  return out;
}

/**
 * Average colour of a spot where layer i covers coverage[i] of the area and
 * the dots of every layer nest (one screen, so smaller dots sit inside
 * larger ones). Used where the work grid predicts a proof without plates.
 */
export function nestedCoverageColour(garment: Vec3, layers: ModelLayer[], coverage: ArrayLike<number>, out: Vec3): Vec3 {
  // Sort the distinct coverage levels; between consecutive levels a fixed set
  // of layers prints, so the area-weighted sum is exact for nested dots.
  const n = layers.length;
  const levels: number[] = [0];
  for (let i = 0; i < n; i++) if (coverage[i] > 0) levels.push(Math.min(1, coverage[i]));
  levels.sort((a, b) => a - b);
  const tmp: Vec3 = [0, 0, 0];
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  let prev = 0;
  for (let k = 1; k <= levels.length; k++) {
    const level = k < levels.length ? levels[k] : 1;
    const span = level - prev;
    if (span > 0) {
      // a point in (prev, level]: layers whose coverage reaches above prev print here
      stackColour(garment, layers, (i) => coverage[i] > prev, tmp);
      out[0] += span * tmp[0];
      out[1] += span * tmp[1];
      out[2] += span * tmp[2];
    }
    prev = level;
  }
  return out;
}
