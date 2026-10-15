// AM halftone: a threshold screen at any lpi, angle and ppi. The threshold
// matrix is the rank order of a spot function over one cell, so the share of
// a cell below any threshold c is exactly c: coverage is linear by
// construction, and the dot-gain curve stays a separate, explicit step.
// Screens are anchored in physical units (inches from an origin), so every
// plate of a set, and any crop of it, shares one dot lattice.
import type { HalftoneSpec } from '@/lib/print/types';

export type DotShape = HalftoneSpec['dot'];

/** Maps wanted coverage to the coverage to image (dot-gain compensation).
 * Linear until the press is calibrated (Phase 2). */
export type DotGainCurve = (coverage: number) => number;
export const LINEAR_DOT_GAIN: DotGainCurve = (c) => c;

const MATRIX_SIZE = 256;
const matrices = new Map<DotShape, Float32Array>();

/** PostScript Euclidean dot: round dots that join at 50% in a checkerboard. */
function euclidSpot(x: number, y: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  return ax + ay > 1 ? (ay - 1) ** 2 + (ax - 1) ** 2 - 1 : 1 - (x * x + y * y);
}

/** Adobe's elliptical dot: chains that touch along one axis first, which
 * softens the 50% jump of round dots in skin tones and gradients. */
function ellipseSpot(x: number, y: number): number {
  const X = Math.abs(x);
  const Y = Math.abs(y);
  const w = 3 * X + 4 * Y - 3;
  if (w < 0) return 1 - (X * X + (Y / 0.75) ** 2) / 4;
  if (w > 1) return ((1 - X) ** 2 + ((1 - Y) / 0.75) ** 2) / 4 - 1;
  return 0.5 - w;
}

/** n x n thresholds in [0, 1): a pixel prints when its coverage is above its threshold. */
export function thresholdMatrix(dot: DotShape): Float32Array {
  const hit = matrices.get(dot);
  if (hit) return hit;
  const n = MATRIX_SIZE;
  const spot = new Float64Array(n * n);
  const fn = dot === 'ellipse' ? ellipseSpot : euclidSpot;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) spot[j * n + i] = fn(((i + 0.5) / n) * 2 - 1, ((j + 0.5) / n) * 2 - 1);
  }
  // Highest spot value turns on first. The index tie-break keeps the order
  // (and so every output byte) independent of the sort implementation.
  const order = Array.from({ length: n * n }, (_, i) => i);
  order.sort((p, q) => spot[q] - spot[p] || p - q);
  const out = new Float32Array(n * n);
  for (let r = 0; r < order.length; r++) out[order[r]] = r / (n * n);
  matrices.set(dot, out);
  return out;
}

export interface Screen {
  lpi: number;
  angleDeg: number;
  dot: DotShape;
  ppi: number;
  matrix: Float32Array;
  n: number;
  /** change in the two lattice coordinates per output pixel along x */
  dsx: number;
  dtx: number;
  cos: number;
  sin: number;
  /** where pixel (0, 0) sits on the shared lattice, in inches */
  originXIn: number;
  originYIn: number;
}

/**
 * A screen at `ppi`. Angles follow the press convention: counter-clockwise
 * from horizontal as seen on the film. `originPx` is the position of pixel
 * (0, 0) on the shared lattice, so crops line up with the full plate.
 */
export function makeScreen(spec: Pick<HalftoneSpec, 'lpi' | 'angleDeg' | 'dot'>, ppi: number, originPx = { x: 0, y: 0 }): Screen {
  if (!(spec.lpi > 0) || !(ppi > 0)) throw new Error(`bad screen: ${spec.lpi} lpi at ${ppi} ppi`);
  const rad = (spec.angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const matrix = thresholdMatrix(spec.dot);
  return {
    lpi: spec.lpi,
    angleDeg: spec.angleDeg,
    dot: spec.dot,
    ppi,
    matrix,
    n: Math.round(Math.sqrt(matrix.length)),
    // Image y points down; the lattice axis e1 = (cos, -sin) rises to the right.
    dsx: (cos * spec.lpi) / ppi,
    dtx: (sin * spec.lpi) / ppi,
    cos,
    sin,
    originXIn: originPx.x / ppi,
    originYIn: originPx.y / ppi,
  };
}

/** Thresholds for pixels x0..x0+count-1 of row y, written to out[0..count). */
export function screenRow(screen: Screen, y: number, x0: number, count: number, out: Float32Array): void {
  const { lpi, ppi, cos, sin, dsx, dtx, matrix, n } = screen;
  const X = (x0 + 0.5) / ppi + screen.originXIn;
  const Y = (y + 0.5) / ppi + screen.originYIn;
  let s = (X * cos - Y * sin) * lpi;
  let t = (X * sin + Y * cos) * lpi;
  for (let i = 0; i < count; i++, s += dsx, t += dtx) {
    const fs = s - Math.floor(s);
    const ft = t - Math.floor(t);
    out[i] = matrix[((ft * n) | 0) * n + ((fs * n) | 0)];
  }
}

const TRANSFER_STEPS = 4096;

/**
 * Coverage the screen should image for a wanted coverage: the dot-gain
 * curve, then the mesh limits. Tones under half the minimum dot drop out and
 * the rest round up to it; tones past the maximum dot round to solid or down
 * to it, whichever is nearer, so the average tone survives the clamp.
 */
export function makeTransfer(spec: Pick<HalftoneSpec, 'minDot' | 'maxDot'>, gain: DotGainCurve = LINEAR_DOT_GAIN): Float32Array {
  const lut = new Float32Array(TRANSFER_STEPS + 1);
  const minDot = Math.max(0, Math.min(0.5, spec.minDot));
  const maxDot = Math.max(0.5, Math.min(1, spec.maxDot));
  for (let i = 0; i <= TRANSFER_STEPS; i++) {
    let c = gain(i / TRANSFER_STEPS);
    c = c <= 0 ? 0 : c >= 1 ? 1 : c;
    if (c > 0 && c < minDot) c = c < minDot / 2 ? 0 : minDot;
    if (c > maxDot && c < 1) c = c > (1 + maxDot) / 2 ? 1 : maxDot;
    lut[i] = c;
  }
  return lut;
}

/** Looks up a transfer table built by makeTransfer. */
export function transfer(lut: Float32Array, c: number): number {
  if (!(c > 0)) return 0;
  if (c >= 1) return lut[TRANSFER_STEPS];
  return lut[(c * TRANSFER_STEPS + 0.5) | 0];
}

/** An identity transfer: no dot-gain curve and no mesh limits (DTG fades). */
export const IDENTITY_TRANSFER: Float32Array = makeTransfer({ minDot: 0, maxDot: 1 });

/**
 * Halftones a whole coverage field (0..255) to 0/255: the reference the tests
 * check the streaming path in render.ts (plates) against.
 */
export function halftoneField(
  coverage: Uint8Array,
  width: number,
  height: number,
  screen: Screen,
  lut: Float32Array = IDENTITY_TRANSFER,
): Uint8Array {
  if (coverage.length !== width * height) throw new Error(`halftoneField: ${coverage.length} != ${width}x${height}`);
  const out = new Uint8Array(width * height);
  const th = new Float32Array(width);
  for (let y = 0; y < height; y++) {
    screenRow(screen, y, 0, width, th);
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const c = transfer(lut, coverage[row + x] / 255);
      if (c > th[x]) out[row + x] = 255;
    }
  }
  return out;
}
