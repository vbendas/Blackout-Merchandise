// Proofs and loupes, drawn from the print files themselves: the plates (or
// the DTG layer) are composited at print resolution with the print model,
// area-averaged in linear light down to the packshot's print box (no moiré),
// then laid on the garment photo with its folds and shading. Loupes are
// true-size crops of the same composite, showing the dots.
import sharp from 'sharp';
import type { DtgLayer, GarmentColour, InkSystemProfile, LoupeImage, PackshotInput, ProofImage, ScreenSet } from '@/lib/print/types';
import { ENGINE_TUNING } from '@/lib/print/defaults';
import { SRGB8_TO_LINEAR, hexToLinear, linearToSrgb8, type Vec3 } from './colour';
import { inkSystemModel, overlay, stackColour, type ModelLayer } from './model';
import { mulberry32 } from './rng';
import { resizeRgba, sharpFromPixels } from './raster';
import { whitesTransparentOn } from './dtg';
import { mmToPx } from './units';

interface Packshot {
  width: number;
  height: number;
  rgba: Uint8Array;
}

async function loadPackshot(input: PackshotInput, widthPx: number): Promise<Packshot> {
  const { data, info } = await sharp(input.image, { autoOrient: true }).toColourspace('srgb').ensureAlpha().raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
  if (info.channels !== 4 || data.length !== info.width * info.height * 4) throw new Error(`packshot: expected RGBA, got ${info.channels} channels`);
  const height = Math.max(1, Math.round((info.height * widthPx) / info.width));
  const rgba = await resizeRgba(new Uint8Array(data.buffer, data.byteOffset, data.length), info.width, info.height, widthPx, height);
  return { width: widthPx, height, rgba };
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where the print lands on the packshot (`rect`, clipped to the photo), how tall it is uncut, and the
 * share of its height that runs past the bottom of the print box. */
interface Placed {
  rect: Rect;
  fullHeight: number;
  overflow: number;
}

/**
 * Where the print area lands on the packshot: the print box's width spans
 * the placement width (the caller sizes the box for it); the art keeps its
 * aspect and its true size, sits centred and top aligned (prints are placed
 * from the collar). Art taller than the box runs past it, as the films would
 * print it, and is cut only at the photo's edge: a proof never shows a print
 * smaller than it is made.
 */
function printRect(shot: Packshot, box: PackshotInput['printBox'], areaW: number, areaH: number): Placed {
  const bw = box.w * shot.width;
  const bh = box.h * shot.height;
  const w = bw;
  const h = (w * areaH) / areaW;
  const left = Math.max(0, Math.min(shot.width - 1, Math.round(box.x * shot.width + (bw - w) / 2)));
  const top = Math.max(0, Math.min(shot.height - 1, Math.round(box.y * shot.height)));
  return {
    rect: {
      left,
      top,
      width: Math.max(1, Math.min(shot.width - left, Math.round(w))),
      height: Math.max(1, Math.min(shot.height - top, Math.round(h))),
    },
    fullHeight: Math.max(1, Math.round(h)),
    overflow: bh > 0 && h > bh ? (h - bh) / h : 0,
  };
}

/**
 * Area averaging of the print area onto the proof rect, in linear light.
 * Each print pixel lands in exactly one proof pixel, so nothing aliases.
 */
class PrintAverager {
  private readonly sum: Float64Array;
  private readonly total: Float64Array;
  private readonly printed: Float64Array;
  private readonly colOf: Int32Array;
  constructor(
    areaW: number,
    private readonly areaH: number,
    readonly rect: Rect,
    /** the print's uncut height on the photo; rows past the photo's edge are left out */
    private readonly fullHeight: number = rect.height,
  ) {
    const n = rect.width * rect.height;
    this.sum = new Float64Array(n * 3);
    this.total = new Float64Array(n);
    this.printed = new Float64Array(n);
    this.colOf = new Int32Array(areaW);
    for (let x = 0; x < areaW; x++) this.colOf[x] = Math.min(rect.width - 1, Math.floor((x * rect.width) / areaW));
  }
  /** The proof row a print row lands in, or -1 when it is past the photo's edge. */
  rowOf(y: number): number {
    const row = Math.min(this.fullHeight - 1, Math.floor((y * this.fullHeight) / this.areaH));
    return row < this.rect.height ? row : -1;
  }
  bare(x: number, oy: number): void {
    this.total[oy * this.rect.width + this.colOf[x]] += 1;
  }
  bareRun(x0: number, x1: number, oy: number): void {
    const base = oy * this.rect.width;
    for (let x = x0; x < x1; x++) this.total[base + this.colOf[x]] += 1;
  }
  printedAt(x: number, oy: number, c: Vec3): void {
    const k = oy * this.rect.width + this.colOf[x];
    this.sum[k * 3] += c[0];
    this.sum[k * 3 + 1] += c[1];
    this.sum[k * 3 + 2] += c[2];
    this.total[k] += 1;
    this.printed[k] += 1;
  }
  /** Mean printed colour and printed share per proof pixel. */
  finish(): { colour: Float64Array; share: Float64Array } {
    const n = this.total.length;
    const colour = new Float64Array(n * 3);
    const share = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const p = this.printed[k];
      if (p <= 0 || this.total[k] <= 0) continue;
      share[k] = p / this.total[k];
      colour[k * 3] = this.sum[k * 3] / p;
      colour[k * 3 + 1] = this.sum[k * 3 + 1] / p;
      colour[k * 3 + 2] = this.sum[k * 3 + 2] / p;
    }
    return { colour, share };
  }
}

/** Lays the averaged print (mean colour and printed share per pixel) on the packshot. */
async function compose(shot: Packshot, rect: Rect, colour: Float64Array, printedShare: Float64Array): Promise<Buffer> {
  const out = new Uint8Array(shot.rgba);
  const W = shot.width;
  // fabric shading: the packshot's own luminance in the box, lightly blurred
  const rw = rect.width;
  const rh = rect.height;
  const Y = new Float64Array(rw * rh);
  let sum = 0;
  let count = 0;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const o = ((rect.top + y) * W + rect.left + x) * 4;
      const v = 0.2126 * SRGB8_TO_LINEAR[out[o]] + 0.7152 * SRGB8_TO_LINEAR[out[o + 1]] + 0.0722 * SRGB8_TO_LINEAR[out[o + 2]];
      Y[y * rw + x] = v;
      if (out[o + 3] > 200) {
        sum += v;
        count++;
      }
    }
  }
  const mean = count > 0 ? sum / count : 0.2;
  const Yb = boxBlur(boxBlur(Y, rw, rh, 1), rw, rh, 1);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const k = y * rw + x;
      const a = printedShare[k];
      if (a <= 0) continue;
      const o = ((rect.top + y) * W + rect.left + x) * 4;
      if (out[o + 3] < 128) continue;
      let ratio = (Yb[k] + 0.03) / (mean + 0.03);
      ratio = Math.min(1.22, Math.max(0.8, ratio));
      const m = Math.pow(ratio, 0.8);
      for (let ch = 0; ch < 3; ch++) {
        const under = SRGB8_TO_LINEAR[out[o + ch]];
        out[o + ch] = linearToSrgb8(under * (1 - a) + colour[k * 3 + ch] * m * a);
      }
    }
  }
  return sharpFromPixels(out, shot.width, shot.height, 4).webp({ quality: 88, effort: 4 }).toBuffer();
}

function boxBlur(src: Float64Array, w: number, h: number, r: number): Float64Array {
  const t = new Float64Array(src.length);
  const o = new Float64Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) {
        s += src[y * w + k];
        n++;
      }
      t[y * w + x] = s / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) {
        s += t[k * w + x];
        n++;
      }
      o[y * w + x] = s / n;
    }
  }
  return o;
}

/** The plates' layers in press order, for the print model. */
export function screenLayers(set: ScreenSet, inks: InkSystemProfile): ModelLayer[] {
  const sys = inkSystemModel(inks);
  return set.plates.map((p) => {
    if (p.role === 'underbase') return { kind: 'underbase', colour: sys.white, opacity: sys.underbaseOpacity };
    if (p.role === 'highlight') return { kind: 'highlight', colour: sys.white, opacity: sys.highlightOpacity };
    return { kind: 'ink', colour: hexToLinear(p.target.hex), opacity: sys.opacityOf(p.base) };
  });
}

/** Colour of every combination of plates, computed once per combination seen. */
class ComboColours {
  private readonly cache = new Map<number, Vec3>();
  constructor(
    private readonly garment: Vec3,
    private readonly layers: ModelLayer[],
  ) {}
  get(mask: number): Vec3 {
    let c = this.cache.get(mask);
    if (!c) {
      c = stackColour(this.garment, this.layers, (i) => (mask & (1 << i)) !== 0, [0, 0, 0]);
      this.cache.set(mask, c);
    }
    return c;
  }
}

export async function screenProof(set: ScreenSet, garment: GarmentColour, packshot: PackshotInput, inks: InkSystemProfile): Promise<ProofImage> {
  const shot = await loadPackshot(packshot, ENGINE_TUNING.proofWidthPx);
  const { art, widthPx: W } = set.canvas;
  const { rect, fullHeight, overflow } = printRect(shot, packshot.printBox, art.width, art.height);
  const avg = new PrintAverager(art.width, art.height, rect, fullHeight);
  const combos = new ComboColours(hexToLinear(garment.hex), screenLayers(set, inks));
  const plates = set.plates.map((p) => p.plate.data);
  const np = plates.length;
  for (let y = 0; y < art.height; y++) {
    const oy = avg.rowOf(y);
    if (oy < 0) continue;
    const row = (art.y + y) * W + art.x;
    for (let x = 0; x < art.width; x++) {
      let mask = 0;
      for (let p = 0; p < np; p++) if (plates[p][row + x] !== 0) mask |= 1 << p;
      if (mask === 0) avg.bare(x, oy);
      else avg.printedAt(x, oy, combos.get(mask));
    }
  }
  const { colour, share } = avg.finish();
  const image = await compose(shot, rect, colour, share);
  return { garmentCode: garment.code, technique: 'screen', image, width: shot.width, height: shot.height, overflow };
}

/** How a DTG pixel prints: over a white base on dark garments, as translucent CMYK on light ones. */
export function dtgPixelColour(rgb: Vec3, garment: Vec3, dark: boolean, whiteInk: boolean, sys: ReturnType<typeof inkSystemModel>, out: Vec3): Vec3 {
  if (dark) {
    out[0] = rgb[0];
    out[1] = rgb[1];
    out[2] = rgb[2];
    return out;
  }
  if (whiteInk) return overlay(garment, sys.white, sys.underbaseOpacity, out);
  out[0] = rgb[0] * garment[0];
  out[1] = rgb[1] * garment[1];
  out[2] = rgb[2] * garment[2];
  return out;
}

export async function dtgProof(layer: DtgLayer, garment: GarmentColour, packshot: PackshotInput, inks: InkSystemProfile): Promise<ProofImage> {
  const shot = await loadPackshot(packshot, ENGINE_TUNING.proofWidthPx);
  const { width: AW, height: AH } = layer.printAreaPx;
  const { rect, fullHeight, overflow } = printRect(shot, packshot.printBox, AW, AH);
  const avg = new PrintAverager(AW, AH, rect, fullHeight);
  const g = hexToLinear(garment.hex);
  const sys = inkSystemModel(inks);
  const r = layer.raster;
  const c: Vec3 = [0, 0, 0];
  const px: Vec3 = [0, 0, 0];
  const whiteGarment = whitesTransparentOn(garment);
  for (let y = 0; y < AH; y++) {
    const oy = avg.rowOf(y);
    if (oy < 0) continue;
    const cy = y - layer.offsetPx.y;
    if (cy < 0 || cy >= r.height) {
      avg.bareRun(0, AW, oy);
      continue;
    }
    for (let x = 0; x < AW; x++) {
      const cx = x - layer.offsetPx.x;
      if (cx < 0 || cx >= r.width) {
        avg.bare(x, oy);
        continue;
      }
      const i = (cy * r.width + cx) * 4;
      if (r.data[i + 3] !== 255) {
        avg.bare(x, oy);
        continue;
      }
      px[0] = SRGB8_TO_LINEAR[r.data[i]];
      px[1] = SRGB8_TO_LINEAR[r.data[i + 1]];
      px[2] = SRGB8_TO_LINEAR[r.data[i + 2]];
      const white = !garment.isLight || whiteGarment ? false : r.data[i] === 255 && r.data[i + 1] === 255 && r.data[i + 2] === 255;
      avg.printedAt(x, oy, dtgPixelColour(px, g, !garment.isLight, white, sys, c));
    }
  }
  const { colour, share } = avg.finish();
  const image = await compose(shot, rect, colour, share);
  return { garmentCode: garment.code, technique: 'dtg_dtf', image, width: shot.width, height: shot.height, overflow };
}

// ---------------------------------------------------------------------------
// Loupes
// ---------------------------------------------------------------------------

/** The window (in a grid of `cell`-pixel cells) with the most on/off transitions. */
function busiestWindow(width: number, height: number, win: number, cell: number, transitions: (y: number, add: (x: number) => void) => void): { x: number; y: number } {
  const cw = Math.ceil(width / cell);
  const chh = Math.ceil(height / cell);
  const grid = new Float64Array(cw * chh);
  for (let y = 0; y < height; y += 2) {
    const cy = Math.floor(y / cell);
    transitions(y, (x) => {
      grid[cy * cw + Math.floor(x / cell)] += 1;
    });
  }
  const wc = Math.max(1, Math.min(cw, Math.round(win / cell)));
  const hc = Math.max(1, Math.min(chh, Math.round(win / cell)));
  // summed-area table over cells
  const sat = new Float64Array((cw + 1) * (chh + 1));
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cw; x++) {
      sat[(y + 1) * (cw + 1) + x + 1] = grid[y * cw + x] + sat[y * (cw + 1) + x + 1] + sat[(y + 1) * (cw + 1) + x] - sat[y * (cw + 1) + x];
    }
  }
  let best = -1;
  let bx = 0;
  let by = 0;
  for (let y = 0; y + hc <= chh; y++) {
    for (let x = 0; x + wc <= cw; x++) {
      const s = sat[(y + hc) * (cw + 1) + x + wc] - sat[y * (cw + 1) + x + wc] - sat[(y + hc) * (cw + 1) + x] + sat[y * (cw + 1) + x];
      if (s > best) {
        best = s;
        bx = x;
        by = y;
      }
    }
  }
  const px = Math.round(bx * cell + (wc * cell - win) / 2);
  const py = Math.round(by * cell + (hc * cell - win) / 2);
  return { x: Math.max(0, Math.min(width - win, px)), y: Math.max(0, Math.min(height - win, py)) };
}

async function encodeLoupe(rgb: Uint8Array, size: number, ppi: number, seed: number): Promise<Buffer> {
  // a little fabric grain, seeded, so the dots read as ink on cloth
  const rand = mulberry32(seed);
  for (let i = 0; i < size * size; i++) {
    const f = 1 + (rand() - 0.5) * 0.05;
    rgb[i * 3] = Math.min(255, Math.round(rgb[i * 3] * f));
    rgb[i * 3 + 1] = Math.min(255, Math.round(rgb[i * 3 + 1] * f));
    rgb[i * 3 + 2] = Math.min(255, Math.round(rgb[i * 3 + 2] * f));
  }
  return sharpFromPixels(rgb, size, size, 3).blur(0.5).withDensity(ppi).png({ compressionLevel: 9 }).toBuffer();
}

export async function screenLoupe(set: ScreenSet, garment: GarmentColour, inks: InkSystemProfile, sizeMm: number): Promise<LoupeImage> {
  const { art, widthPx: W, ppi } = set.canvas;
  const size = Math.max(16, Math.min(art.width, art.height, Math.round(mmToPx(sizeMm, ppi))));
  const plates = set.plates.map((p) => p.plate.data);
  const cell = Math.max(4, Math.round(mmToPx(1, ppi)));
  const pos = busiestWindow(art.width, art.height, size, cell, (y, add) => {
    const row = (art.y + y) * W + art.x;
    for (const d of plates) for (let x = 1; x < art.width; x++) if (d[row + x] !== d[row + x - 1]) add(x);
  });
  const combos = new ComboColours(hexToLinear(garment.hex), screenLayers(set, inks));
  const g = hexToLinear(garment.hex);
  const rgb = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    const row = (art.y + pos.y + y) * W + art.x + pos.x;
    for (let x = 0; x < size; x++) {
      let mask = 0;
      for (let p = 0; p < plates.length; p++) if (plates[p][row + x] !== 0) mask |= 1 << p;
      const c = mask === 0 ? g : combos.get(mask);
      const o = (y * size + x) * 3;
      rgb[o] = linearToSrgb8(c[0]);
      rgb[o + 1] = linearToSrgb8(c[1]);
      rgb[o + 2] = linearToSrgb8(c[2]);
    }
  }
  return { technique: 'screen', garmentCode: garment.code, image: await encodeLoupe(rgb, size, ppi, 0x51ed), ppi };
}

export async function dtgLoupe(layer: DtgLayer, garment: GarmentColour, inks: InkSystemProfile, sizeMm: number): Promise<LoupeImage> {
  const r = layer.raster;
  const ppi = r.ppi;
  const size = Math.max(8, Math.min(r.width, r.height, Math.round(mmToPx(sizeMm, ppi))));
  const cell = Math.max(2, Math.round(mmToPx(1, ppi)));
  const pos = busiestWindow(r.width, r.height, size, cell, (y, add) => {
    for (let x = 1; x < r.width; x++) {
      const i = (y * r.width + x) * 4;
      const j = i - 4;
      if (r.data[i + 3] !== r.data[j + 3] || Math.abs(r.data[i] - r.data[j]) + Math.abs(r.data[i + 1] - r.data[j + 1]) + Math.abs(r.data[i + 2] - r.data[j + 2]) > 60) add(x);
    }
  });
  const g = hexToLinear(garment.hex);
  const sys = inkSystemModel(inks);
  const whiteGarment = whitesTransparentOn(garment);
  const rgb = new Uint8Array(size * size * 3);
  const px: Vec3 = [0, 0, 0];
  const c: Vec3 = [0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = ((pos.y + y) * r.width + pos.x + x) * 4;
      let col: Vec3 = g;
      if (r.data[i + 3] === 255) {
        px[0] = SRGB8_TO_LINEAR[r.data[i]];
        px[1] = SRGB8_TO_LINEAR[r.data[i + 1]];
        px[2] = SRGB8_TO_LINEAR[r.data[i + 2]];
        const white = garment.isLight && !whiteGarment && r.data[i] === 255 && r.data[i + 1] === 255 && r.data[i + 2] === 255;
        col = dtgPixelColour(px, g, !garment.isLight, white, sys, c);
      }
      const o = (y * size + x) * 3;
      rgb[o] = linearToSrgb8(col[0]);
      rgb[o + 1] = linearToSrgb8(col[1]);
      rgb[o + 2] = linearToSrgb8(col[2]);
    }
  }
  return { technique: 'dtg_dtf', garmentCode: layer.garmentCode, image: await encodeLoupe(rgb, size, ppi, 0xd76), ppi };
}
