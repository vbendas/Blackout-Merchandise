// Raster plumbing: decode, RGBA normalisation, sharp resampling (always with
// channel and size assertions: sharp can return 3 channels from a 1-channel
// raw input), a light edge-preserving denoise, and a streaming Lanczos-3
// field resampler that renders plates row by row without full-size floats.
import sharp, { type Sharp } from 'sharp';
import type { Raster } from '@/lib/print/types';

/** Decodes png, jpeg or webp to 8-bit sRGB RGBA. ppi from metadata, else 72. */
export async function decodeToRaster(bytes: Buffer): Promise<Raster> {
  const img = sharp(bytes, { autoOrient: true });
  const meta = await img.metadata();
  const { data, info } = await img
    .toColourspace('srgb')
    .ensureAlpha()
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4 || data.length !== info.width * info.height * 4) {
    throw new Error(`decode: expected ${info.width}x${info.height}x4, got ${info.channels} channels and ${data.length} bytes`);
  }
  const ppi = meta.density && meta.density > 0 ? meta.density : 72;
  return { width: info.width, height: info.height, channels: 4, data: new Uint8Array(data.buffer, data.byteOffset, data.length), ppi };
}

/** Any 1, 3 or 4 channel raster as RGBA (a copy only when the channels change). */
export function toRgba(r: Raster): Raster {
  const n = r.width * r.height;
  if (r.data.length !== n * r.channels) throw new Error(`raster: ${r.width}x${r.height}x${r.channels} needs ${n * r.channels} bytes, got ${r.data.length}`);
  if (r.channels === 4) return r;
  const out = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    if (r.channels === 1) {
      const v = r.data[i];
      out[i * 4] = v;
      out[i * 4 + 1] = v;
      out[i * 4 + 2] = v;
    } else {
      out[i * 4] = r.data[i * 3];
      out[i * 4 + 1] = r.data[i * 3 + 1];
      out[i * 4 + 2] = r.data[i * 3 + 2];
    }
    out[i * 4 + 3] = 255;
  }
  return { width: r.width, height: r.height, channels: 4, data: out, ppi: r.ppi };
}

function asBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.length);
}

/** Lanczos-3 resize of straight-alpha RGBA (sharp premultiplies, so no dark fringes). */
export async function resizeRgba(data: Uint8Array, width: number, height: number, outWidth: number, outHeight: number): Promise<Uint8Array> {
  if (data.length !== width * height * 4) throw new Error(`resizeRgba: ${data.length} bytes for ${width}x${height}x4`);
  if (width === outWidth && height === outHeight) return new Uint8Array(data);
  const { data: out, info } = await sharp(asBuffer(data), { raw: { width, height, channels: 4 }, limitInputPixels: false })
    .resize(outWidth, outHeight, { kernel: 'lanczos3', fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4 || info.width !== outWidth || info.height !== outHeight || out.length !== outWidth * outHeight * 4) {
    throw new Error(`resizeRgba: wanted ${outWidth}x${outHeight}x4, got ${info.width}x${info.height}x${info.channels} (${out.length} bytes)`);
  }
  return new Uint8Array(out.buffer, out.byteOffset, out.length);
}

/** Encodes 8-bit pixels (1, 3 or 4 channels) through sharp. */
export function sharpFromPixels(data: Uint8Array, width: number, height: number, channels: 1 | 3 | 4): Sharp {
  if (data.length !== width * height * channels) throw new Error(`sharpFromPixels: ${data.length} bytes for ${width}x${height}x${channels}`);
  return sharp(asBuffer(data), { raw: { width, height, channels }, limitInputPixels: false });
}

// ---------------------------------------------------------------------------
// Light denoise
// ---------------------------------------------------------------------------

const DENOISE_SIGMA = 10;
const RANGE_STEPS = 4096;
const RANGE_MAX_D2 = 9 * DENOISE_SIGMA * DENOISE_SIGMA * 3 * 2;
const RANGE_WEIGHT: Float32Array = (() => {
  const t = new Float32Array(RANGE_STEPS + 1);
  for (let i = 0; i <= RANGE_STEPS; i++) {
    const d2 = (i / RANGE_STEPS) * RANGE_MAX_D2;
    t[i] = Math.exp(-d2 / (2 * 3 * DENOISE_SIGMA * DENOISE_SIGMA));
  }
  return t;
})();

/**
 * 3x3 bilateral filter on RGB: smooths the low-amplitude noise generated art
 * carries (it turns into speckle on films) and leaves edges, flat colours and
 * alpha alone. Transparent neighbours do not contribute.
 */
export function denoiseRgba(src: Uint8Array, w: number, h: number): Uint8Array {
  if (src.length !== w * h * 4) throw new Error(`denoise: ${src.length} bytes for ${w}x${h}x4`);
  const out = new Uint8Array(src);
  const scale = RANGE_STEPS / RANGE_MAX_D2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3];
      if (a === 0) continue;
      const r0 = src[i];
      const g0 = src[i + 1];
      const b0 = src[i + 2];
      let sw = 1;
      let sr = r0;
      let sg = g0;
      let sb = b0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = (yy * w + xx) * 4;
          const aj = src[j + 3];
          if (aj === 0) continue;
          const dr = src[j] - r0;
          const dg = src[j + 1] - g0;
          const db = src[j + 2] - b0;
          const d2 = dr * dr + dg * dg + db * db;
          if (d2 >= RANGE_MAX_D2) continue;
          const wgt = RANGE_WEIGHT[(d2 * scale) | 0] * (dx === 0 || dy === 0 ? 1 : 0.6) * (aj / 255);
          sw += wgt;
          sr += wgt * src[j];
          sg += wgt * src[j + 1];
          sb += wgt * src[j + 2];
        }
      }
      out[i] = Math.round(sr / sw);
      out[i + 1] = Math.round(sg / sw);
      out[i + 2] = Math.round(sb / sw);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lanczos-3 field resampling, streamed by rows
// ---------------------------------------------------------------------------

export interface Taps {
  /** source samples */
  n: number;
  /** output samples */
  m: number;
  /** taps per output sample */
  k: number;
  /** source index per tap (clamped to the edge) */
  idx: Int32Array;
  /** normalised weight per tap */
  w: Float32Array;
}

function sinc(x: number): number {
  if (x === 0) return 1;
  const p = Math.PI * x;
  return Math.sin(p) / p;
}

/** Lanczos taps mapping n source samples onto m output samples over the same extent. */
export function lanczosTaps(n: number, m: number, a = 3): Taps {
  const scale = n / m;
  const stretch = Math.max(1, scale);
  const radius = a * stretch;
  const k = 2 * Math.ceil(radius) + 1;
  const idx = new Int32Array(m * k);
  const w = new Float32Array(m * k);
  for (let o = 0; o < m; o++) {
    const centre = (o + 0.5) * scale - 0.5;
    const first = Math.floor(centre) - Math.ceil(radius) + 1;
    let sum = 0;
    for (let t = 0; t < k; t++) {
      const i = first + t;
      const d = (i - centre) / stretch;
      const v = Math.abs(d) < a ? sinc(d) * sinc(d / a) : 0;
      idx[o * k + t] = i < 0 ? 0 : i >= n ? n - 1 : i;
      w[o * k + t] = v;
      sum += v;
    }
    for (let t = 0; t < k; t++) w[o * k + t] /= sum;
  }
  return { n, m, k, idx, w };
}

/** Fills one source row of a field: values (0..1) and hard flags; writes the nonzero
 * range [x0, x1) to range and returns false when the row is all zero. */
export type FieldRowFill = (j: number, values: Float32Array, hard: Uint8Array, range: Int32Array) => boolean;

interface Slot {
  j: number;
  h: Float32Array;
  hard: Uint8Array;
  x0: number;
  x1: number;
  empty: boolean;
}

/**
 * Resamples a field given row by row to outW x outH, one output row at a
 * time. Horizontal passes are cached per source row, so each source row is
 * filtered once. Also exposes, per output pixel, the hard flags of the four
 * nearest source pixels (render.ts thresholds where all four are hard).
 */
export class FieldResampler {
  readonly cols: Taps;
  readonly rows: Taps;
  /** nearest-left and nearest-right source column per output column */
  readonly c0: Int32Array;
  readonly c1: Int32Array;
  /** source hard rows around the current output row */
  hard0: Uint8Array;
  hard1: Uint8Array;
  private readonly slots: Slot[];
  private readonly src: Float32Array;
  private readonly range = new Int32Array(2);
  private readonly firstIdx: Int32Array;
  private readonly lastIdx: Int32Array;
  private lastOut: [number, number] = [0, 0];

  constructor(
    readonly srcW: number,
    readonly srcH: number,
    readonly outW: number,
    readonly outH: number,
    private readonly fill: FieldRowFill,
  ) {
    this.cols = lanczosTaps(srcW, outW);
    this.rows = lanczosTaps(srcH, outH);
    this.src = new Float32Array(srcW);
    this.slots = Array.from({ length: this.rows.k + 1 }, () => ({
      j: -1,
      h: new Float32Array(outW),
      hard: new Uint8Array(srcW),
      x0: 0,
      x1: 0,
      empty: true,
    }));
    const sx = srcW / outW;
    this.c0 = new Int32Array(outW);
    this.c1 = new Int32Array(outW);
    this.firstIdx = new Int32Array(outW);
    this.lastIdx = new Int32Array(outW);
    const k = this.cols.k;
    for (let x = 0; x < outW; x++) {
      const c = Math.floor((x + 0.5) * sx - 0.5);
      this.c0[x] = c < 0 ? 0 : c >= srcW ? srcW - 1 : c;
      this.c1[x] = Math.min(srcW - 1, Math.max(0, c + 1));
      let lo = srcW;
      let hi = -1;
      for (let t = 0; t < k; t++) {
        if (this.cols.w[x * k + t] === 0) continue;
        const i = this.cols.idx[x * k + t];
        if (i < lo) lo = i;
        if (i > hi) hi = i;
      }
      this.firstIdx[x] = lo;
      this.lastIdx[x] = hi;
    }
    this.hard0 = this.slots[0].hard;
    this.hard1 = this.slots[0].hard;
  }

  private slotFor(j: number): Slot {
    const s = this.slots[j % this.slots.length];
    if (s.j === j) return s;
    s.j = j;
    const any = this.fill(j, this.src, s.hard, this.range);
    if (s.x1 > s.x0) s.h.fill(0, s.x0, s.x1);
    if (!any) {
      s.empty = true;
      s.x0 = 0;
      s.x1 = 0;
      return s;
    }
    // output columns whose taps touch the nonzero source range
    const sx0 = this.range[0];
    const sx1 = this.range[1];
    let lo = 0;
    let hi = this.outW;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.lastIdx[mid] < sx0) lo = mid + 1;
      else hi = mid;
    }
    const ox0 = lo;
    lo = ox0;
    hi = this.outW;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.firstIdx[mid] < sx1) lo = mid + 1;
      else hi = mid;
    }
    const ox1 = lo;
    const { k, idx, w } = this.cols;
    const src = this.src;
    const h = s.h;
    if (k === 6) {
      for (let x = ox0; x < ox1; x++) {
        const b = x * 6;
        h[x] =
          w[b] * src[idx[b]] +
          w[b + 1] * src[idx[b + 1]] +
          w[b + 2] * src[idx[b + 2]] +
          w[b + 3] * src[idx[b + 3]] +
          w[b + 4] * src[idx[b + 4]] +
          w[b + 5] * src[idx[b + 5]];
      }
    } else {
      for (let x = ox0; x < ox1; x++) {
        let v = 0;
        for (let t = 0; t < k; t++) v += w[x * k + t] * src[idx[x * k + t]];
        h[x] = v;
      }
    }
    s.empty = ox1 <= ox0;
    s.x0 = ox0;
    s.x1 = ox1;
    return s;
  }

  /**
   * Output row y into `out` (length outW). Values outside the returned
   * [x0, x1) are zero. Returns null when the whole row is zero.
   */
  row(y: number, out: Float32Array): [number, number] | null {
    const [p0, p1] = this.lastOut;
    if (p1 > p0) out.fill(0, p0, p1);
    this.lastOut = [0, 0];
    const { k, idx, w } = this.rows;
    const sy = (y + 0.5) * (this.srcH / this.outH) - 0.5;
    const j0 = Math.min(this.srcH - 1, Math.max(0, Math.floor(sy)));
    const j1 = Math.min(this.srcH - 1, j0 + 1);
    let x0 = this.outW;
    let x1 = 0;
    const live: Slot[] = [];
    const weights: number[] = [];
    for (let t = 0; t < k; t++) {
      const wt = w[y * k + t];
      const s = this.slotFor(idx[y * k + t]);
      if (wt === 0 || s.empty) continue;
      live.push(s);
      weights.push(wt);
      if (s.x0 < x0) x0 = s.x0;
      if (s.x1 > x1) x1 = s.x1;
    }
    this.hard0 = this.slotFor(j0).hard;
    this.hard1 = this.slotFor(j1).hard;
    if (live.length === 0 || x1 <= x0) return null;
    // slots are zero outside their ranges, so summing over the union is exact
    if (live.length === 6) {
      const [a, b, c, d, e, f] = live;
      const [wa, wb, wc, wd, we, wf] = weights;
      for (let x = x0; x < x1; x++) out[x] = wa * a.h[x] + wb * b.h[x] + wc * c.h[x] + wd * d.h[x] + we * e.h[x] + wf * f.h[x];
    } else {
      for (let x = x0; x < x1; x++) {
        let v = 0;
        for (let t = 0; t < live.length; t++) v += weights[t] * live[t].h[x];
        out[x] = v;
      }
    }
    this.lastOut = [x0, x1];
    return [x0, x1];
  }
}
