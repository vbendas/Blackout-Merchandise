// Reads a flatbed scan of the printed dot-gain chart into the points of the
// curve: for each film's wedge, the printed coverage at each 5% step.
//
//  1. Decode (png, jpeg or tiff) to 8-bit sRGB.
//  2. Find the chart. Corner marks are solid squares with clear space round
//     them, so they stand out from the garment whichever way round the ink is
//     (black on white, white on black). A coarse copy of the scan, averaged in
//     linear light, is compared with its own local average, the marks are the
//     isolated, square, high-contrast blobs, and the four that fit the chart's
//     known proportions (the top left one is the biggest, so the scan can be
//     any way up) are refined on the full-resolution pixels to a fraction of a
//     pixel. Four more marks, half way along each edge, are then looked for
//     where the corners say they should be: how far they are is how much the
//     garment has stretched or moved.
//  3. Fit the projective map from chart millimetres to scan pixels (least
//     squares over every mark found).
//  4. Measure each patch in a window that spans a whole number of dot cells in
//     both screen directions (chart-layout.ts says why), averaging in linear
//     light. The four quarters of the window are whole periods too; how far
//     they disagree is the patch's noise.
//  5. Murray-Davies per film, against that film's own bare-garment and solid
//     patches on the same scan (murray-davies.ts): where the colour of a patch
//     sits between the two.
//
// Everything after the decode works on a plain pixel array, so the tests can
// feed it pictures without going through a file format. Server only (sharp).
import sharp, { type OutputInfo } from 'sharp';
import {
  CHECK_MARKS,
  CHART_HEIGHT_MM,
  CHART_WIDTH_MM,
  CORNER_MARKS,
  INK_KINDS,
  INK_KIND_LABELS,
  chartPatches,
  cellsPerMm,
  chartPointOfLattice,
  latticeOf,
  windowCells,
  type ChartMark,
  type ChartPatch,
  type InkKind,
  type Point,
} from './chart-layout';
import { dotAreaFromColour, srgbToLinear, type Rgb } from './murray-davies';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanImage {
  width: number;
  height: number;
  /** 8-bit sRGB, three channels interleaved, row by row */
  rgb: Uint8Array;
}

export type ScanErrorCode = 'unreadable' | 'too_small' | 'no_marks' | 'bad_frame';

/** Why a scan could not be read, in words for the person who scanned it. */
export class ScanError extends Error {
  readonly code: ScanErrorCode;
  constructor(code: ScanErrorCode, message: string) {
    super(message);
    this.name = 'ScanError';
    this.code = code;
  }
}

export interface WedgePoint {
  /** the film's coverage at this step, 0..1 */
  input: number;
  /** the printed coverage by Murray-Davies, 0..1 (not clamped: noise can put 0% a hair below zero) */
  printed: number;
  /** how far the window's four quarters disagree, in coverage 0..1: the patch's noise */
  spread: number;
}

/** 'ok' reads; 'low_contrast' reads but is less certain; 'not_printed' has no ink to measure. */
export type FilmStatus = 'ok' | 'low_contrast' | 'not_printed';

export interface FilmReading {
  kind: InkKind;
  status: FilmStatus;
  /** colour difference (CIE ΔE76) between the bare garment and the solid ink on this scan */
  contrast: number;
  /** how far the bare garment and the solid at one end of the band are from those at the other, as a share of the distance from garment to solid: the light varying along the band, which the reading corrects for */
  shading: number;
  /** the 21 steps, 0 to 100% of the film; empty when nothing is printed */
  points: WedgePoint[];
}

export interface ReadingWarning {
  code: string;
  /** 'info' is worth knowing, 'review' needs a person to look before trusting the curve, 'block' means the reading can't be used */
  severity: 'info' | 'review' | 'block';
  message: string;
  film?: InkKind;
}

export interface ScanReading {
  lpi: number;
  angleDeg: number;
  geometry: {
    /** resolution of the scan, measured from the corner marks */
    dpi: number;
    /** how far the chart is turned in the scan, degrees (positive: clockwise on the screen) */
    rotationDeg: number;
    /** how far the edge marks sit from where the corner marks say, in mm: the largest of those found; null when none were found */
    checkErrorMm: number | null;
    marksFound: number;
    widthPx: number;
    heightPx: number;
  };
  films: FilmReading[];
  warnings: ReadingWarning[];
  /** good: nothing to say; check: look at the warnings; poor: not usable as it is */
  confidence: 'good' | 'check' | 'poor';
}

export interface ScanSettings {
  lpi: number;
  angleDeg: number;
}

/** What each check tests, in coverage 0..1 or mm. Written once so the tests and the page agree. */
export const SCAN_LIMITS = {
  /** colour difference between garment and solid under which a band counts as not printed, and under which it is only low contrast */
  notPrintedDeltaE: 6,
  lowContrastDeltaE: 15,
  /** a patch whose four quarters differ by more than this (range, coverage 0..1) is uneven */
  noisySpread: 0.08,
  /** the light may vary this much along a band, as a share of the garment-to-solid distance, before the scan is flagged; it is corrected for either way */
  shadingTolerance: 0.06,
  /** the far end's references are used only while they stay within this share of the near end's; beyond it is a seam or a wrinkle, not light */
  farReferenceLimit: 0.25,
  /** after the correction the wedge's 0% patch may read this far from 0 */
  zeroTolerance: 0.02,
  /** a reading may fall by this much from one step to the next before it is called not smooth */
  dipTolerance: 0.025,
  /** edge marks further than this from where the corners put them: review; further than blockCheckMm: unusable */
  reviewCheckMm: 0.5,
  blockCheckMm: 1.2,
  /** scans under this resolution are flagged */
  lowDpi: 200,
} as const;

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/** A bed of A4 at 1200 dpi is 139 megapixels; the reader needs only 300 to 600 dpi. Decoded, a scan takes 3 bytes a pixel on top
 * of the file itself, so a bigger image (or a small file that claims to be one) is refused before it is decoded. */
const MAX_INPUT_PIXELS = 160_000_000;

/** Decodes a scan to 8-bit sRGB (an embedded profile is applied, a grey or CMYK scan is converted, alpha dropped). */
export async function decodeScan(bytes: Buffer | Uint8Array): Promise<ScanImage> {
  let data: Buffer;
  let info: OutputInfo;
  try {
    ({ data, info } = await sharp(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), { autoOrient: true, limitInputPixels: MAX_INPUT_PIXELS })
      .toColourspace('srgb')
      .removeAlpha()
      .raw({ depth: 'uchar' })
      .toBuffer({ resolveWithObject: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    if (/pixel limit/i.test(message)) throw new ScanError('unreadable', 'That scan is too large to read. Scan the chart at 600 dpi or less: the reader needs 300 to 600 dpi.');
    throw new ScanError('unreadable', `That file can't be read as an image (${message}). Save the scan as TIFF, PNG or JPEG.`);
  }
  if (info.channels !== 3 || data.length !== info.width * info.height * 3) throw new ScanError('unreadable', 'That image could not be converted to colour. Save the scan as an RGB TIFF, PNG or JPEG.');
  return { width: info.width, height: info.height, rgb: new Uint8Array(data.buffer, data.byteOffset, data.length) };
}

// ---------------------------------------------------------------------------
// Pixels in linear light
// ---------------------------------------------------------------------------

const LIN = Float32Array.from({ length: 256 }, (_, i) => srgbToLinear(i));
const LUM_R = LIN.map((v) => 0.2126 * v);
const LUM_G = LIN.map((v) => 0.7152 * v);
const LUM_B = LIN.map((v) => 0.0722 * v);

function lumaAt(img: ScanImage, x: number, y: number): number {
  const i = (y * img.width + x) * 3;
  return LUM_R[img.rgb[i]] + LUM_G[img.rgb[i + 1]] + LUM_B[img.rgb[i + 2]];
}

// ---------------------------------------------------------------------------
// 2. Finding the chart
// ---------------------------------------------------------------------------

const COARSE_LONG_SIDE = 1600;

export interface Coarse {
  w: number;
  h: number;
  /** full-resolution pixels per coarse pixel */
  f: number;
  y: Float32Array;
}

/** A copy of the scan at about 1600 px on its long side, each pixel the linear-light luminance mean of a block. */
export function coarseOf(img: ScanImage): Coarse {
  const f = Math.max(1, Math.round(Math.max(img.width, img.height) / COARSE_LONG_SIDE));
  const w = Math.floor(img.width / f);
  const h = Math.floor(img.height / f);
  const y = new Float32Array(w * h);
  const stride = img.width * 3;
  const rgb = img.rgb;
  const inv = 1 / (f * f);
  for (let by = 0; by < h; by++) {
    const out = by * w;
    for (let dy = 0; dy < f; dy++) {
      let p = (by * f + dy) * stride;
      for (let bx = 0; bx < w; bx++) {
        let acc = 0;
        for (let dx = 0; dx < f; dx++, p += 3) acc += LUM_R[rgb[p]] + LUM_G[rgb[p + 1]] + LUM_B[rgb[p + 2]];
        y[out + bx] += acc;
      }
    }
    for (let bx = 0; bx < w; bx++) y[out + bx] *= inv;
  }
  return { w, h, f, y };
}

/** Mean over a (2r+1) square window, edges clamped, by running sums. */
export function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const prefix = new Float64Array(Math.max(w, h) + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) prefix[x + 1] = prefix[x] + src[row + x];
    for (let x = 0; x < w; x++) {
      const lo = Math.max(0, x - r);
      const hi = Math.min(w - 1, x + r);
      tmp[row + x] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) prefix[y + 1] = prefix[y] + tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      const lo = Math.max(0, y - r);
      const hi = Math.min(h - 1, y + r);
      out[y * w + x] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
    }
  }
  return out;
}

export interface Blob {
  /** centre, in coarse pixels */
  x: number;
  y: number;
  /** side of the square of the same area, coarse pixels */
  side: number;
}

/**
 * The isolated solid squares in a mask: connected blobs of a plausible size
 * whose second moments are those of a square (round in every direction, as
 * full as a square), with almost nothing in the ring round them. A blob inside
 * a grid of patches, a line of text, a ring or the garment's edge is none of
 * these.
 */
export function findSquares(mask: Uint8Array, w: number, h: number): Blob[] {
  // Summed-area table of the mask, for the isolation test.
  const stride = w + 1;
  const sat = new Uint32Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      run += mask[y * w + x] ? 1 : 0;
      sat[(y + 1) * stride + x + 1] = sat[y * stride + x + 1] + run;
    }
  }
  const count = (x0: number, y0: number, x1: number, y1: number): number => {
    const a = Math.max(0, Math.min(w, Math.round(x0)));
    const b = Math.max(0, Math.min(w, Math.round(x1)));
    const c = Math.max(0, Math.min(h, Math.round(y0)));
    const d = Math.max(0, Math.min(h, Math.round(y1)));
    return sat[d * stride + b] - sat[c * stride + b] - sat[d * stride + a] + sat[c * stride + a];
  };

  const minArea = 0.00015 * w * h;
  const maxArea = 0.02 * w * h;
  const stack = new Int32Array(w * h);
  const blobs: Blob[] = [];
  const work = Uint8Array.from(mask);
  for (let start = 0; start < work.length; start++) {
    if (work[start] !== 1) continue;
    let sp = 0;
    stack[sp++] = start;
    work[start] = 2;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    while (sp > 0) {
      const p = stack[--sp];
      const y = (p / w) | 0;
      const x = p - y * w;
      const fx = x + 0.5;
      const fy = y + 0.5;
      area++;
      sx += fx;
      sy += fy;
      sxx += fx * fx;
      syy += fy * fy;
      sxy += fx * fy;
      if (x > 0 && work[p - 1] === 1) {
        work[p - 1] = 2;
        stack[sp++] = p - 1;
      }
      if (x + 1 < w && work[p + 1] === 1) {
        work[p + 1] = 2;
        stack[sp++] = p + 1;
      }
      if (y > 0 && work[p - w] === 1) {
        work[p - w] = 2;
        stack[sp++] = p - w;
      }
      if (y + 1 < h && work[p + w] === 1) {
        work[p + w] = 2;
        stack[sp++] = p + w;
      }
    }
    if (area < minArea || area > maxArea) continue;
    const cx = sx / area;
    const cy = sy / area;
    const m20 = sxx / area - cx * cx;
    const m02 = syy / area - cy * cy;
    const m11 = sxy / area - cx * cy;
    const mean = (m20 + m02) / 2;
    const diff = Math.sqrt(((m20 - m02) / 2) ** 2 + m11 * m11);
    const compact = (12 * mean) / area;
    const elongation = (mean + diff) / Math.max(1e-9, mean - diff);
    // A solid square has compactness 1 and the same spread in every direction.
    if (compact < 0.85 || compact > 1.2 || elongation > 1.4) continue;
    const side = Math.sqrt(area);
    // Isolation: next to nothing in the ring from 0.8 to 1.6 sides out.
    const outer = 1.6 * side;
    const inner = 0.8 * side;
    const ringArea = (2 * outer) ** 2 - (2 * inner) ** 2;
    const ring = count(cx - outer, cy - outer, cx + outer, cy + outer) - count(cx - inner, cy - inner, cx + inner, cy + inner);
    if (ring > 0.06 * ringArea) continue;
    blobs.push({ x: cx, y: cy, side });
  }
  return blobs;
}

export interface Frame {
  /** the four corner marks in coarse pixels: top left, top right, bottom left, bottom right */
  corners: Blob[];
  /** coarse pixels per millimetre */
  scale: number;
}

const [TL, TR, BL, BR] = ['tl', 'tr', 'bl', 'br'].map((id) => CORNER_MARKS.find((m) => m.id === id) as ChartMark);

/**
 * The four blobs that are the chart's corners: with the top left one as the
 * biggest, take each other blob as the top right, which fixes the scale and the
 * turn; the bottom marks then have to be where the chart's proportions put
 * them, and each mark has to be its own size. The best fit wins.
 */
export function pickFrame(blobs: Blob[]): Frame | null {
  const byArea = [...blobs].sort((a, b) => b.side - a.side);
  const across = TR.centre.x - TL.centre.x;
  const down = BL.centre.y - TL.centre.y;
  let best: { frame: Frame; score: number } | null = null;
  for (const a of byArea.slice(0, 6)) {
    for (const b of blobs) {
      if (b === a) continue;
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const dist = Math.hypot(vx, vy);
      if (dist < 40) continue;
      const scale = dist / across;
      const cos = vx / dist;
      const sin = vy / dist;
      const predict = (dx: number, dy: number): Point => ({ x: a.x + scale * (dx * cos - dy * sin), y: a.y + scale * (dx * sin + dy * cos) });
      const nearest = (p: Point, skip: Blob[]): { blob: Blob; d: number } | null => {
        let found: { blob: Blob; d: number } | null = null;
        for (const c of blobs) {
          if (skip.includes(c)) continue;
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (!found || d < found.d) found = { blob: c, d };
        }
        return found;
      };
      const bl = nearest(predict(0, down), [a, b]);
      if (!bl) continue;
      const br = nearest(predict(across, down), [a, b, bl.blob]);
      if (!br) continue;
      // A garment that is stretched or rippled moves the marks by several mm; the sizes below keep the choice honest, and whether
      // it moved them too far is judged later, by the edge marks.
      const tolerance = 10 * scale;
      if (bl.d > tolerance || br.d > tolerance) continue;
      // Each mark has to be its own size (a corner is 8 mm and an edge mark 6, so a fifth apart is already told apart).
      const sizes: [Blob, number][] = [
        [a, TL.sizeMm],
        [b, TR.sizeMm],
        [bl.blob, BL.sizeMm],
        [br.blob, BR.sizeMm],
      ];
      let sizeError = 0;
      for (const [blob, mm] of sizes) sizeError = Math.max(sizeError, Math.abs(blob.side / scale / mm - 1));
      if (sizeError > 0.22) continue;
      const score = (bl.d + br.d) / scale + 10 * sizeError;
      if (!best || score < best.score) best = { frame: { corners: [a, b, bl.blob, br.blob], scale }, score };
    }
  }
  return best?.frame ?? null;
}

// ---------------------------------------------------------------------------
// Refining a mark on the full-resolution pixels
// ---------------------------------------------------------------------------

function median(values: Float32Array, n: number): number {
  const part = values.subarray(0, n);
  part.sort();
  return part[n >> 1];
}

/**
 * The centre of a solid square near (cx, cy), in full-resolution pixels, as
 * the centroid of how much each pixel is ink (0 at the garment's level, 1 at
 * the mark's) inside a disc just wider than the square. Pixels between ink
 * and garment count in proportion, so the answer is a fraction of a pixel and
 * the blur of the scan or of dot gain, being symmetric, does not move it.
 * Null when the mark doesn't stand out from the garment.
 */
function refineMark(img: ScanImage, cx: number, cy: number, sidePx: number): { x: number; y: number; contrast: number } | null {
  let x = cx;
  let y = cy;
  let contrast = 0;
  for (let pass = 0; pass < 2; pass++) {
    const reach = Math.ceil(1.5 * sidePx);
    const x0 = Math.max(0, Math.floor(x - reach));
    const x1 = Math.min(img.width - 1, Math.ceil(x + reach));
    const y0 = Math.max(0, Math.floor(y - reach));
    const y1 = Math.min(img.height - 1, Math.ceil(y + reach));
    if (x1 - x0 < sidePx || y1 - y0 < sidePx) return null;
    const ring = new Float32Array((x1 - x0 + 1) * (y1 - y0 + 1));
    const core = new Float32Array(ring.length);
    let rings = 0;
    let cores = 0;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px + 0.5 - x, py + 0.5 - y);
        if (d >= 1.0 * sidePx && d <= 1.5 * sidePx && (px + py) % 2 === 0) ring[rings++] = lumaAt(img, px, py);
        else if (d <= 0.3 * sidePx) core[cores++] = lumaAt(img, px, py);
      }
    }
    if (rings < 16 || cores < 4) return null;
    const garment = median(ring, rings);
    const solid = median(core, cores);
    const span = solid - garment;
    contrast = Math.abs(span);
    if (contrast < 0.02) return null;
    let sw = 0;
    let sx = 0;
    let sy = 0;
    const disc = 0.8 * sidePx;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        if (Math.hypot(px + 0.5 - x, py + 0.5 - y) > disc) continue;
        const w = Math.min(1, Math.max(0, (lumaAt(img, px, py) - garment) / span));
        sw += w;
        sx += w * (px + 0.5);
        sy += w * (py + 0.5);
      }
    }
    if (!(sw > 0.1 * Math.PI * disc * disc)) return null;
    x = sx / sw;
    y = sy / sw;
  }
  return { x, y, contrast };
}

// ---------------------------------------------------------------------------
// The map from chart millimetres to scan pixels
// ---------------------------------------------------------------------------

type Mat3 = [number, number, number, number, number, number, number, number, number];

function applyH(h: Mat3, p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

function invertH(h: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, hh, i] = h;
  const A = e * i - f * hh;
  const B = -(d * i - f * g);
  const C = d * hh - e * g;
  const det = a * A + b * B + c * C;
  if (!(Math.abs(det) > 1e-18)) return null;
  const inv = 1 / det;
  return [A * inv, -(b * i - c * hh) * inv, (b * f - c * e) * inv, B * inv, (a * i - c * g) * inv, -(a * f - c * d) * inv, C * inv, -(a * hh - b * g) * inv, (a * e - b * d) * inv];
}

function mul3(p: Mat3, q: Mat3): Mat3 {
  const out = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) out[r * 3 + c] += p[r * 3 + k] * q[k * 3 + c];
  return out as Mat3;
}

/** Gaussian elimination with partial pivoting; null for a singular system. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = col + 1; r < n; r++) {
      const k = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= k * m[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let c = r + 1; c < n; c++) s -= m[r][c] * x[c];
    x[r] = s / m[r][r];
  }
  return x;
}

function normaliser(points: Point[]): Mat3 {
  const n = points.length;
  const cx = points.reduce((s, p) => s + p.x, 0) / n;
  const cy = points.reduce((s, p) => s + p.y, 0) / n;
  const mean = points.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / n || 1;
  const s = Math.SQRT2 / mean;
  return [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1];
}

/** The projective map taking `from` to `to` (four or more pairs: least squares, with the points scaled first so the normal equations stay well-conditioned). */
export function fitHomography(from: Point[], to: Point[]): Mat3 | null {
  if (from.length < 4 || from.length !== to.length) return null;
  const tf = normaliser(from);
  const tt = normaliser(to);
  const src = from.map((p) => applyH(tf, p));
  const dst = to.map((p) => applyH(tt, p));
  const ata = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  const atb = new Array<number>(8).fill(0);
  const add = (row: number[], value: number): void => {
    for (let i = 0; i < 8; i++) {
      atb[i] += row[i] * value;
      for (let j = 0; j < 8; j++) ata[i][j] += row[i] * row[j];
    }
  };
  src.forEach((p, i) => {
    const q = dst[i];
    add([p.x, p.y, 1, 0, 0, 0, -q.x * p.x, -q.x * p.y], q.x);
    add([0, 0, 0, p.x, p.y, 1, -q.y * p.x, -q.y * p.y], q.y);
  });
  const h = solve(ata, atb);
  if (!h) return null;
  const inner: Mat3 = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  const back = invertH(tt);
  if (!back) return null;
  const full = mul3(mul3(back, inner), tf);
  const scale = full[8] || 1;
  return full.map((v) => v / scale) as Mat3;
}

export { applyH, invertH };

// ---------------------------------------------------------------------------
// 4. Measuring a patch
// ---------------------------------------------------------------------------

interface Accumulator {
  r: number;
  g: number;
  b: number;
  n: number;
}

interface WindowReading {
  mean: Rgb;
  /** the four quarters of the window, each a whole number of dots */
  quarters: Rgb[];
  /** pixels inside the window, against the number the window should hold */
  filled: number;
}

/**
 * The mean colour, in linear light, of one patch's window on the scan: every
 * pixel whose chart position, in dot-lattice coordinates, lies within the
 * window's whole-cell square round the patch centre.
 */
function readWindow(img: ScanImage, h: Mat3, hInv: Mat3, patch: ChartPatch, settings: ScanSettings): WindowReading | null {
  const centre = patch.centre;
  const n = windowCells(settings.lpi, settings.angleDeg);
  const half = n / 2;
  const middle = latticeOf(centre, settings.lpi, settings.angleDeg);
  const cs = middle.s;
  const ct = middle.t;
  const rad = (settings.angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const k = cellsPerMm(settings.lpi);

  const corners = [
    chartPointOfLattice(cs - half, ct - half, settings.lpi, settings.angleDeg),
    chartPointOfLattice(cs + half, ct - half, settings.lpi, settings.angleDeg),
    chartPointOfLattice(cs + half, ct + half, settings.lpi, settings.angleDeg),
    chartPointOfLattice(cs - half, ct + half, settings.lpi, settings.angleDeg),
  ].map((p) => applyH(h, p));
  const x0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.x))));
  const x1 = Math.min(img.width - 1, Math.ceil(Math.max(...corners.map((p) => p.x))));
  const y0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.y))));
  const y1 = Math.min(img.height - 1, Math.ceil(Math.max(...corners.map((p) => p.y))));
  if (x1 <= x0 || y1 <= y0) return null;

  const sums: Accumulator[] = [0, 1, 2, 3].map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
  const rgb = img.rgb;
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const wz = hInv[6] * (px + 0.5) + hInv[7] * (py + 0.5) + hInv[8];
      const u = (hInv[0] * (px + 0.5) + hInv[1] * (py + 0.5) + hInv[2]) / wz;
      const v = (hInv[3] * (px + 0.5) + hInv[4] * (py + 0.5) + hInv[5]) / wz;
      const ds = (u * cos - v * sin) * k - cs;
      const dt = (u * sin + v * cos) * k - ct;
      if (ds < -half || ds >= half || dt < -half || dt >= half) continue;
      const q = sums[(ds < 0 ? 0 : 1) + (dt < 0 ? 0 : 2)];
      const i = (py * img.width + px) * 3;
      q.r += LIN[rgb[i]];
      q.g += LIN[rgb[i + 1]];
      q.b += LIN[rgb[i + 2]];
      q.n++;
    }
  }
  const total = sums.reduce((s, q) => s + q.n, 0);
  // The window's area in scan pixels: n x n cells, a cell being 1/k mm across, over the map's scale at the patch.
  const centrePx = applyH(h, centre);
  const step = applyH(h, { x: centre.x + 1, y: centre.y });
  const stepY = applyH(h, { x: centre.x, y: centre.y + 1 });
  const pxPerMm2 = Math.abs((step.x - centrePx.x) * (stepY.y - centrePx.y) - (step.y - centrePx.y) * (stepY.x - centrePx.x));
  const expected = (n / k) ** 2 * pxPerMm2;
  if (total < 16 || sums.some((q) => q.n === 0)) return null;
  const mean = (q: Accumulator): Rgb => [q.r / q.n, q.g / q.n, q.b / q.n];
  const whole: Rgb = [sums.reduce((s, q) => s + q.r, 0) / total, sums.reduce((s, q) => s + q.g, 0) / total, sums.reduce((s, q) => s + q.b, 0) / total];
  return { mean: whole, quarters: sums.map(mean), filled: total / Math.max(1, expected) };
}

/** CIE ΔE76 between two linear sRGB colours (D65), for how different the garment and the solid look. */
function deltaE(a: Rgb, b: Rgb): number {
  const lab = (c: Rgb): [number, number, number] => {
    const x = 0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2];
    const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const z = 0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2];
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 / 116) * t + 16 / 116);
    const fx = f(x / 0.95047);
    const fy = f(y);
    const fz = f(z / 1.08883);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

const pointText = (value: number): string => `${Math.round(value * 1000) / 10}`;

// ---------------------------------------------------------------------------
// The whole reading
// ---------------------------------------------------------------------------

/** The strongest 0.1% of a scan's local contrast (solid ink is about 0.5% of a scan of the chart) sets the scale for the marks. */
function strongContrast(deviation: Float32Array, top: number): number {
  const histogram = new Uint32Array(2048);
  for (const d of deviation) histogram[Math.min(2047, Math.floor((d / top) * 2047))]++;
  let seen = 0;
  let level = 2047;
  for (; level > 0; level--) {
    seen += histogram[level];
    if (seen >= deviation.length * 0.001) break;
  }
  return ((level + 0.5) / 2047) * top;
}

/** The coarse scan's four corner marks, or a ScanError in words. */
function findFrame(coarse: Coarse): Frame {
  const radius = Math.max(30, Math.min(150, Math.round(0.06 * Math.max(coarse.w, coarse.h))));
  const background = boxMean(coarse.y, coarse.w, coarse.h, radius);
  const deviation = new Float32Array(coarse.y.length);
  let top = 0;
  for (let i = 0; i < deviation.length; i++) {
    deviation[i] = Math.abs(coarse.y[i] - background[i]);
    if (deviation[i] > top) top = deviation[i];
  }
  if (!(top > 0.02)) throw new ScanError('no_marks', 'There is nothing printed on this scan that stands out from the garment. Check that the printed side faces the glass and that the print is on the scan.');
  // The marks are as strong as the ink they were printed in, so half of the strongest finds them on a scan of one film; when
  // another ink on the same garment is stronger (a white film beside a black one on grey), they sit lower, so the threshold
  // comes down in steps until the four corners are found. Lower thresholds join more of the chart into blobs, which the
  // squareness and isolation tests then throw out.
  const strong = strongContrast(deviation, top);
  for (const share of [0.5, 0.3, 0.18, 0.1]) {
    const mask = new Uint8Array(deviation.length);
    const threshold = share * strong;
    for (let i = 0; i < mask.length; i++) mask[i] = deviation[i] > threshold ? 1 : 0;
    const frame = pickFrame(findSquares(mask, coarse.w, coarse.h));
    if (frame) return frame;
  }
  throw new ScanError(
    'no_marks',
    'Could not find the four corner squares of the chart in this scan. Scan the whole chart, flat, printed side down, with the four large squares at its corners on the glass and clear of the edge, and print them in an ink that shows against the garment.',
  );
}

/** The chart found in a scan: the map from chart millimetres to scan pixels (and back), how the chart sits, and what the edge marks say. */
interface Located {
  h: Mat3;
  hInv: Mat3;
  dpi: number;
  rotationDeg: number;
  checkErrorMm: number | null;
  marksFound: number;
  warnings: ReadingWarning[];
}

/** Steps 2 and 3: finds the chart and maps it. Throws ScanError when it can't. */
function locateChart(img: ScanImage, settings: ScanSettings): Located {
  const coarse = coarseOf(img);
  const frame = findFrame(coarse);

  // Corner marks on the full-resolution pixels. A coarse pixel (i, j) covers full pixels [i f, (i + 1) f), so a coarse coordinate times f is a full-resolution one.
  const scalePx = frame.scale * coarse.f;
  const refinedCorners: Point[] = [];
  for (const [i, mark] of CORNER_MARKS.entries()) {
    const blob = frame.corners[i];
    const found = refineMark(img, blob.x * coarse.f, blob.y * coarse.f, mark.sizeMm * scalePx);
    if (!found) throw new ScanError('no_marks', `The ${['top left', 'top right', 'bottom left', 'bottom right'][i]} corner square is not clear enough on this scan to measure from.`);
    refinedCorners.push({ x: found.x, y: found.y });
  }
  const corner = fitHomography(
    CORNER_MARKS.map((m) => m.centre),
    refinedCorners,
  );
  if (!corner) throw new ScanError('bad_frame', 'The corner squares don’t form a usable frame. Scan the chart again, flat.');

  // The edge marks: where the corners say, and where they are.
  const markPairs: { chart: Point; scan: Point }[] = CORNER_MARKS.map((m, i) => ({ chart: m.centre, scan: refinedCorners[i] }));
  const checkErrors: number[] = [];
  const mmPerPxAt = (p: Point): number => {
    const a = applyH(corner, p);
    const b = applyH(corner, { x: p.x + 1, y: p.y });
    return 1 / Math.max(1e-9, Math.hypot(b.x - a.x, b.y - a.y));
  };
  for (const mark of CHECK_MARKS) {
    const predicted = applyH(corner, mark.centre);
    const found = refineMark(img, predicted.x, predicted.y, mark.sizeMm / mmPerPxAt(mark.centre));
    if (!found) continue;
    const error = Math.hypot(found.x - predicted.x, found.y - predicted.y) * mmPerPxAt(mark.centre);
    // A mark that isn't near where it should be is something else (a wrinkle, a stray speck).
    if (error > 4) continue;
    checkErrors.push(error);
    markPairs.push({ chart: mark.centre, scan: { x: found.x, y: found.y } });
  }
  const h = fitHomography(
    markPairs.map((p) => p.chart),
    markPairs.map((p) => p.scan),
  );
  const hInv = h ? invertH(h) : null;
  if (!h || !hInv) throw new ScanError('bad_frame', 'The marks on this scan don’t form a usable frame. Scan the chart again, flat.');

  const middle = { x: CHART_WIDTH_MM / 2, y: CHART_HEIGHT_MM / 2 };
  const c0 = applyH(h, middle);
  const c1 = applyH(h, { x: middle.x + 10, y: middle.y });
  const dpi = (Math.hypot(c1.x - c0.x, c1.y - c0.y) / 10) * 25.4;
  const rotationDeg = (Math.atan2(c1.y - c0.y, c1.x - c0.x) * 180) / Math.PI;

  const warnings: ReadingWarning[] = [];
  const checkErrorMm = checkErrors.length > 0 ? Math.max(...checkErrors) : null;
  if (checkErrorMm !== null && checkErrorMm > SCAN_LIMITS.blockCheckMm) {
    warnings.push({
      code: 'misaligned',
      severity: 'block',
      message: `The marks half way along the edges are ${checkErrorMm.toFixed(1)} mm from where the corners put them: the garment has stretched or moved, and the patches are not where they should be. Flatten the garment and scan again.`,
    });
  } else if (checkErrorMm !== null && checkErrorMm > SCAN_LIMITS.reviewCheckMm) {
    warnings.push({
      code: 'misaligned',
      severity: 'review',
      message: `The marks half way along the edges are ${checkErrorMm.toFixed(1)} mm from where the corners put them: the garment is a little stretched or wrinkled. The readings may be slightly off.`,
    });
  }
  if (dpi < SCAN_LIMITS.lowDpi) {
    warnings.push({
      code: 'low_resolution',
      severity: 'review',
      message: `The scan is about ${Math.round(dpi)} dpi. Scan at 600 dpi: at this resolution a dot is only ${(dpi / settings.lpi).toFixed(1)} pixels across.`,
    });
  }
  return { h, hInv, dpi, rotationDeg, checkErrorMm, marksFound: markPairs.length, warnings };
}

/** Steps 4 and 5 for one film's band: the patches measured, the wedge by Murray-Davies, and what the band says about itself. */
function readBand(img: ScanImage, chart: Located, settings: ScanSettings, kind: InkKind): { film: FilmReading; warnings: ReadingWarning[] } {
  const { h, hInv } = chart;
  const label = INK_KIND_LABELS[kind];
  const warnings: ReadingWarning[] = [];
  const band = chartPatches().filter((p) => p.film === kind);
  const read = new Map<ChartPatch, WindowReading>();
  for (const patch of band) {
    const window = readWindow(img, h, hInv, patch, settings);
    if (!window || window.filled < 0.5) throw new ScanError('bad_frame', `The ${label.toLowerCase()} band falls outside this scan. Scan the whole chart.`);
    read.set(patch, window);
  }
  const patchOf = (kindOf: ChartPatch['kind'], step?: number): ChartPatch => band.find((p) => p.kind === kindOf && (step === undefined || p.step === step)) as ChartPatch;
  const colourOf = (patch: ChartPatch): Rgb => (read.get(patch) as WindowReading).mean;
  const garmentPatch = patchOf('garment');
  const solidPatch = patchOf('solid');
  const garmentFarPatch = patchOf('garment2');
  const solidFarPatch = patchOf('step', 100);
  const garment = colourOf(garmentPatch);
  const solid = colourOf(solidPatch);
  const garmentFar = colourOf(garmentFarPatch);
  const solidFar = colourOf(solidFarPatch);
  const contrast = deltaE(garment, solid);

  if (contrast < SCAN_LIMITS.notPrintedDeltaE) {
    warnings.push({ code: 'not_printed', severity: 'info', film: kind, message: `${label}: no ink to read here (the solid patch looks the same as the bare garment), so this film is left out.` });
    return { film: { kind, status: 'not_printed', contrast, shading: 0, points: [] }, warnings };
  }
  const status: FilmStatus = contrast < SCAN_LIMITS.lowContrastDeltaE ? 'low_contrast' : 'ok';
  if (status === 'low_contrast') {
    warnings.push({
      code: 'low_contrast',
      severity: 'review',
      film: kind,
      message: `${label}: the ink hardly shows against the garment (colour difference ${contrast.toFixed(0)}), so this wedge is less certain. Print it on a blank that contrasts more.`,
    });
  }

  // Murray-Davies against the references at the patch's own place along the band: the bare garment and the
  // solid at each end, joined by a line, so a gradient of light across the scan cancels out. The far end is
  // used only while it stays near the near end's (a seam or a wrinkle is not a gradient).
  const distance = (a: Rgb, b: Rgb): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const span = distance(garment, solid);
  const garmentShift = distance(garmentFar, garment) / span;
  const solidShift = distance(solidFar, solid) / span;
  const useGarmentFar = garmentShift <= SCAN_LIMITS.farReferenceLimit;
  const useSolidFar = solidShift <= SCAN_LIMITS.farReferenceLimit;
  const along = (x: number, from: number, to: number): number => (to === from ? 0 : (x - from) / (to - from));
  const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const areaAt = (rgb: Rgb, x: number): number => {
    const g = useGarmentFar ? mix(garment, garmentFar, along(x, garmentPatch.centre.x, garmentFarPatch.centre.x)) : garment;
    const sol = useSolidFar ? mix(solid, solidFar, along(x, solidPatch.centre.x, solidFarPatch.centre.x)) : solid;
    return dotAreaFromColour(g, sol, rgb) ?? 0;
  };

  const wedge = band.filter((p) => p.kind === 'step');
  const points: WedgePoint[] = wedge.map((patch) => {
    const window = read.get(patch) as WindowReading;
    const quarters = window.quarters.map((q) => areaAt(q, patch.centre.x));
    return {
      input: patch.coverage,
      printed: Math.round(areaAt(window.mean, patch.centre.x) * 10000) / 10000,
      spread: Math.round((Math.max(...quarters) - Math.min(...quarters)) * 10000) / 10000,
    };
  });
  const shading = Math.max(garmentShift, solidShift);

  const noisy = wedge.filter((_, i) => points[i].spread > SCAN_LIMITS.noisySpread);
  if (noisy.length > 0) {
    warnings.push({
      code: 'noisy',
      severity: 'review',
      film: kind,
      message: `${label}: the ${noisy.map((p) => `${p.step}%`).join(', ')} patch${noisy.length > 1 ? 'es are' : ' is'} uneven (the four quarters differ by more than ${Math.round(SCAN_LIMITS.noisySpread * 100)} points). A wrinkle, a streak or a soft scan can do this.`,
    });
  }
  if (!useGarmentFar || !useSolidFar) {
    warnings.push({
      code: 'uneven_garment',
      severity: 'review',
      film: kind,
      message: `${label}: the ${!useGarmentFar ? 'bare garment' : 'solid'} patches at the two ends of the band differ by ${pointText(Math.max(garmentShift, solidShift))}% of the garment-to-solid distance. That is more than light: a seam, a wrinkle or an uneven print crosses the chart. Only the near end was used.`,
    });
  } else if (shading > SCAN_LIMITS.shadingTolerance) {
    warnings.push({
      code: 'shading',
      severity: 'review',
      film: kind,
      message: `${label}: the light varies by about ${pointText(shading)}% of the garment-to-solid distance along the band. It was corrected for, but a flatter scan is better.`,
    });
  }
  if (Math.abs(points[0].printed) > SCAN_LIMITS.zeroTolerance) {
    warnings.push({
      code: 'zero_off',
      severity: 'review',
      film: kind,
      message: `${label}: the 0% patch reads ${pointText(points[0].printed)}% when it should read nothing. Something is on the garment there, or the patch is not where the corner marks put it.`,
    });
  }
  const dips: string[] = [];
  for (let i = 1; i < points.length; i++) if (points[i].printed < points[i - 1].printed - SCAN_LIMITS.dipTolerance) dips.push(`from ${wedge[i - 1].step}% to ${wedge[i].step}%`);
  if (dips.length > 0) {
    warnings.push({
      code: 'not_monotone',
      severity: 'review',
      film: kind,
      message: `${label}: the readings fall ${dips.join(' and ')} on the film, which a press doesn't do. The curve smooths them, but look at those patches.`,
    });
  }
  return { film: { kind, status, contrast, shading: Math.round(shading * 10000) / 10000, points }, warnings };
}

/** Reads the chart in a decoded scan. Throws ScanError when the chart can't be found. */
export function readChartImage(img: ScanImage, settings: ScanSettings): ScanReading {
  if (Math.min(img.width, img.height) < 400) throw new ScanError('too_small', 'That scan is too small to read the chart from. Scan the whole chart at 300 dpi or more.');

  const chart = locateChart(img, settings);
  const films: FilmReading[] = [];
  const warnings: ReadingWarning[] = [...chart.warnings];
  for (const kind of INK_KINDS) {
    const band = readBand(img, chart, settings, kind);
    films.push(band.film);
    warnings.push(...band.warnings);
  }
  if (films.every((f) => f.status === 'not_printed')) {
    warnings.push({ code: 'nothing_to_read', severity: 'block', message: 'None of the three bands has ink that shows against the garment. Print at least one film on a blank that contrasts with it.' });
  }
  const confidence = warnings.some((w) => w.severity === 'block') ? 'poor' : warnings.some((w) => w.severity === 'review') ? 'check' : 'good';
  return {
    lpi: settings.lpi,
    angleDeg: settings.angleDeg,
    geometry: { dpi: chart.dpi, rotationDeg: chart.rotationDeg, checkErrorMm: chart.checkErrorMm, marksFound: chart.marksFound, widthPx: img.width, heightPx: img.height },
    films,
    warnings,
    confidence,
  };
}

/** Decodes a scan file and reads the chart in it. */
export async function readChartScan(bytes: Buffer | Uint8Array, settings: ScanSettings): Promise<ScanReading> {
  return readChartImage(await decodeScan(bytes), settings);
}

/** The reading's wedge for one film as curve points, or null when that film wasn't read. */
export function filmPoints(reading: ScanReading, kind: InkKind): { input: number; printed: number }[] | null {
  const film = reading.films.find((f) => f.kind === kind);
  if (!film || film.status === 'not_printed' || film.points.length === 0) return null;
  return film.points.map((p) => ({ input: p.input, printed: p.printed }));
}
