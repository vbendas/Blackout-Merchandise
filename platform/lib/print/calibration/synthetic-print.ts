// A stand-in for the press and the scanner, for the tests: it "prints" the
// chart's films with a known amount of dot gain and "scans" the result, so the
// reader (scan.ts) and the whole calibration can be checked against what is
// true. Not used outside tests.
//
// The press: the film is blurred and then thresholded below one half, which
// grows every dot by the same distance. The gain that follows is the S-curve of
// a real press (nothing at 0 and 100%, most in the mid tones) and, because it
// is computed from the printed pixels themselves, it is exactly known.
//
// The scanner: the inks go on the garment in press order, in linear light, and
// the scan samples the print with area integration at its own resolution,
// turned and shifted, blurs it a little, and adds the things that make scans of
// garments hard: shading, the weave, sensor noise and, if asked, a warp that
// no projective map can undo.
import { halftoneField, makeScreen, makeTransfer } from '@/lib/print/engine/halftone';
import { mulberry32 } from '@/lib/print/engine/rng';
import type { CanvasSpec } from '@/lib/print/types';
import { renderChartFilms } from './chart';
import {
  CHART_HEIGHT_MM,
  CHART_WIDTH_MM,
  latticeOf,
  mmToPx,
  windowCells,
  wedgeOf,
  type ChartSettings,
  type InkKind,
} from './chart-layout';
import { linearToSrgb, srgbToLinear } from './murray-davies';
import type { ScanImage } from './scan';

export interface PressModel {
  /** Gaussian spread of the ink, in film pixels */
  sigmaPx: number;
  /** the blurred film prints where it is above this; 0.5 is no gain, lower grows the dots */
  threshold: number;
}

/** A press that adds roughly 15 to 20 points at 50%: about what screen print does on a coarse mesh. */
export const TYPICAL_PRESS: PressModel = { sigmaPx: 1.1, threshold: 0.36 };

type Rgb8 = readonly [number, number, number];

export interface SyntheticOptions {
  settings: ChartSettings;
  press?: PressModel;
  scanDpi?: number;
  /** garment seen all round the chart, mm */
  marginMm?: number;
  /** degrees, clockwise on the screen */
  rotationDeg?: number;
  offsetMm?: { x: number; y: number };
  garment?: Rgb8;
  inks?: Partial<Record<InkKind, Rgb8>>;
  scannerBlurPx?: number;
  /** sensor noise, in 8-bit code values */
  noiseCodes?: number;
  /** fibre noise: a fraction of the light, per pixel */
  weave?: number;
  /** slow shading across the scan: a fraction of the light */
  shading?: number;
  /** a steady fall-off of light along the scan's width: a fraction of the light per 100 mm */
  tilt?: number;
  /** a ripple in the garment of this size, mm, that no projective map can undo */
  warpMm?: number;
  /** spots on the garment that change the light by `strength` (0.5 halves it; negative brightens) at their middle, fading to nothing at radius `r`; chart mm */
  stains?: { x: number; y: number; r: number; strength: number }[];
  /** area-integration samples per scan pixel, along each side (default 2) */
  subsamples?: number;
  seed?: number;
}

export interface SyntheticScan {
  image: ScanImage;
  /** the printed coverage of every wedge step (21 values, 0..1) of each film printed, from the printed pixels */
  truth: Partial<Record<InkKind, number[]>>;
  press: PressModel;
}

function gaussianKernel(sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const k = new Float32Array(2 * radius + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    k[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
    sum += k[i + radius];
  }
  return k.map((v) => v / sum);
}

/** Separable Gaussian blur of an interleaved float image, edges clamped. */
function blur(src: Float32Array, w: number, h: number, channels: number, sigma: number): Float32Array {
  if (!(sigma > 0.05)) return src;
  const kernel = gaussianKernel(sigma);
  const r = (kernel.length - 1) / 2;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < channels; c++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += kernel[i + r] * src[(y * w + Math.min(w - 1, Math.max(0, x + i))) * channels + c];
        tmp[(y * w + x) * channels + c] = acc;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < channels; c++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += kernel[i + r] * tmp[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * channels + c];
        out[(y * w + x) * channels + c] = acc;
      }
    }
  }
  return out;
}

/** What the press prints from a binary film (0 or 255 per pixel): 1 where there is ink, 0 where there is not. */
export function pressBinary(film: Uint8Array, w: number, h: number, model: PressModel = TYPICAL_PRESS): Uint8Array {
  const field = new Float32Array(w * h);
  for (let i = 0; i < field.length; i++) field[i] = film[i] ? 1 : 0;
  const blurred = blur(field, w, h, 1, model.sigmaPx);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = blurred[i] > model.threshold ? 1 : 0;
  return out;
}

/** The chart area of a film, cut out of the canvas: 255 where there is ink. */
function artOf(data: Uint8Array, canvas: CanvasSpec): Uint8Array {
  const { art, widthPx } = canvas;
  const out = new Uint8Array(art.width * art.height);
  for (let y = 0; y < art.height; y++) out.set(data.subarray((art.y + y) * widthPx + art.x, (art.y + y) * widthPx + art.x + art.width), y * art.width);
  return out;
}

/** Share of a printed patch's window that carries ink, the window being the same whole-cell square the reader uses (here on the film's pixels). */
export function printedShare(printed: Uint8Array, width: number, ppi: number, centreMm: { x: number; y: number }, settings: Pick<ChartSettings, 'lpi' | 'angleDeg'>): number {
  const n = windowCells(settings.lpi, settings.angleDeg);
  const centre = latticeOf(centreMm, settings.lpi, settings.angleDeg);
  const rad = (settings.angleDeg * Math.PI) / 180;
  const k = settings.lpi / 25.4;
  const reach = ((n / k) * (Math.cos(rad) + Math.sin(rad))) / 2 + 0.3;
  const pxPerMm = ppi / 25.4;
  const x0 = Math.floor((centreMm.x - reach) * pxPerMm);
  const x1 = Math.ceil((centreMm.x + reach) * pxPerMm);
  const y0 = Math.floor((centreMm.y - reach) * pxPerMm);
  const y1 = Math.ceil((centreMm.y + reach) * pxPerMm);
  let on = 0;
  let total = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5) / pxPerMm;
      const v = (y + 0.5) / pxPerMm;
      const ds = (u * Math.cos(rad) - v * Math.sin(rad)) * k - centre.s;
      const dt = (u * Math.sin(rad) + v * Math.cos(rad)) * k - centre.t;
      if (ds < -n / 2 || ds >= n / 2 || dt < -n / 2 || dt >= n / 2) continue;
      total++;
      on += printed[y * width + x];
    }
  }
  return on / total;
}

function gaussian(rng: () => number): number {
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** A smooth random field in -1..1, bilinear between random values on a coarse grid. */
function smoothField(rng: () => number, w: number, h: number, cell: number): (x: number, y: number) => number {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = Float32Array.from({ length: gw * gh }, () => rng() * 2 - 1);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const g = (a: number, b: number) => grid[Math.min(gh - 1, b) * gw + Math.min(gw - 1, a)];
    return (g(ix, iy) * (1 - tx) + g(ix + 1, iy) * tx) * (1 - ty) + (g(ix, iy + 1) * (1 - tx) + g(ix + 1, iy + 1) * tx) * ty;
  };
}

/** Prints the chart's films and scans the result. */
export function renderSyntheticScan(options: SyntheticOptions): SyntheticScan {
  const { settings } = options;
  const press = options.press ?? TYPICAL_PRESS;
  const dpi = options.scanDpi ?? 300;
  const marginMm = options.marginMm ?? 20;
  const rotation = ((options.rotationDeg ?? 0) * Math.PI) / 180;
  const offset = options.offsetMm ?? { x: 0, y: 0 };
  const garment = options.garment ?? [236, 234, 228];
  const inkColour: Record<InkKind, Rgb8> = { underbase: [244, 244, 240], base: [22, 22, 24], highlight: [244, 244, 240], ...(options.inks ?? {}) };
  const rng = mulberry32(options.seed ?? 1);

  // Films, as printed, in press order, composited on the garment in linear light at film resolution.
  const { canvas, films } = renderChartFilms(settings);
  const fw = canvas.art.width;
  const fh = canvas.art.height;
  const garmentLin = garment.map(srgbToLinear);
  const lin = new Float32Array(fw * fh * 3);
  for (let i = 0; i < fw * fh; i++) {
    lin[i * 3] = garmentLin[0];
    lin[i * 3 + 1] = garmentLin[1];
    lin[i * 3 + 2] = garmentLin[2];
  }
  const truth: SyntheticScan['truth'] = {};
  for (const film of films) {
    const printed = pressBinary(artOf(film.plate.data, canvas), fw, fh, press);
    const ink = inkColour[film.kind].map(srgbToLinear);
    for (let i = 0; i < printed.length; i++) {
      if (!printed[i]) continue;
      lin[i * 3] = ink[0];
      lin[i * 3 + 1] = ink[1];
      lin[i * 3 + 2] = ink[2];
    }
    truth[film.kind] = wedgeOf(film.kind).map((patch) => printedShare(printed, fw, canvas.ppi, patch.centre, settings));
  }

  // The scan: chart plus margin, the chart turned about its centre and shifted.
  const widthMm = CHART_WIDTH_MM + 2 * marginMm;
  const heightMm = CHART_HEIGHT_MM + 2 * marginMm;
  const sw = Math.round(mmToPx(widthMm, dpi));
  const sh = Math.round(mmToPx(heightMm, dpi));
  const filmPxPerMm = canvas.ppi / 25.4;
  const scanPxPerMm = dpi / 25.4;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const centreMm = { x: CHART_WIDTH_MM / 2, y: CHART_HEIGHT_MM / 2 };
  const warp = options.warpMm ?? 0;
  const stains = options.stains ?? [];

  // Each scan pixel looks at a few points inside itself (area integration) and averages what the print gives there.
  const SUB = Math.max(1, Math.round(options.subsamples ?? 2));
  const scan = new Float32Array(sw * sh * 3);
  const sample = (fx: number, fy: number, out: number[]): void => {
    if (fx < 0 || fy < 0 || fx > fw - 1 || fy > fh - 1) {
      out[0] = garmentLin[0];
      out[1] = garmentLin[1];
      out[2] = garmentLin[2];
      return;
    }
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(fw - 1, x0 + 1);
    const y1 = Math.min(fh - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    for (let c = 0; c < 3; c++) {
      out[c] =
        (lin[(y0 * fw + x0) * 3 + c] * (1 - tx) + lin[(y0 * fw + x1) * 3 + c] * tx) * (1 - ty) + (lin[(y1 * fw + x0) * 3 + c] * (1 - tx) + lin[(y1 * fw + x1) * 3 + c] * tx) * ty;
    }
  };
  const tmp = [0, 0, 0];
  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < SUB; j++) {
        for (let i = 0; i < SUB; i++) {
          // scan pixel -> mm on the bed -> back through the shift and the turn -> chart mm -> film pixel
          const bedX = (px + (i + 0.5) / SUB) / scanPxPerMm - widthMm / 2 - offset.x;
          const bedY = (py + (j + 0.5) / SUB) / scanPxPerMm - heightMm / 2 - offset.y;
          let u = centreMm.x + bedX * cosR + bedY * sinR;
          let v = centreMm.y - bedX * sinR + bedY * cosR;
          if (warp > 0) {
            const du = warp * Math.sin((2 * Math.PI * v) / 90);
            const dv = warp * Math.sin((2 * Math.PI * u) / 110 + 1);
            u += du;
            v += dv;
          }
          sample(u * filmPxPerMm - 0.5, v * filmPxPerMm - 0.5, tmp);
          let light = 1;
          for (const stain of stains) {
            const d = Math.hypot(u - stain.x, v - stain.y);
            if (d < stain.r) light *= 1 - stain.strength * (1 - d / stain.r);
          }
          r += tmp[0] * light;
          g += tmp[1] * light;
          b += tmp[2] * light;
        }
      }
      const o = (py * sw + px) * 3;
      scan[o] = r / (SUB * SUB);
      scan[o + 1] = g / (SUB * SUB);
      scan[o + 2] = b / (SUB * SUB);
    }
  }

  // Scanner optics, then light: shading and weave multiply the light, noise is added in the 8-bit code.
  const optics = blur(scan, sw, sh, 3, options.scannerBlurPx ?? 0.8);
  const shade = smoothField(rng, sw, sh, Math.max(32, Math.round(scanPxPerMm * 45)));
  const shading = options.shading ?? 0.02;
  const tilt = options.tilt ?? 0;
  const weave = options.weave ?? 0.015;
  const noise = options.noiseCodes ?? 0.8;
  const rgb = new Uint8Array(sw * sh * 3);
  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      const gain = 1 + shading * shade(px, py) + weave * gaussian(rng) + tilt * (px / scanPxPerMm / 100 - widthMm / 200);
      const o = (py * sw + px) * 3;
      for (let c = 0; c < 3; c++) {
        const code = linearToSrgb(Math.min(1, Math.max(0, optics[o + c] * gain))) + noise * gaussian(rng);
        rgb[o + c] = Math.max(0, Math.min(255, Math.round(code)));
      }
    }
  }
  return { image: { width: sw, height: sh, rgb }, truth, press };
}

/**
 * Prints flat tints through a dot-gain curve and reports what the press gives:
 * for each wanted coverage, the share of ink on the print. This is the closed
 * loop of the whole calibration: a curve made from a scan of the chart should
 * bring each of these to the tone that was asked for.
 */
export function printFlatTints(
  wanted: number[],
  settings: Pick<ChartSettings, 'lpi' | 'angleDeg' | 'ppi' | 'dot'>,
  compensate: ((c: number) => number) | undefined,
  press: PressModel = TYPICAL_PRESS,
): number[] {
  const size = Math.round(mmToPx(24, settings.ppi));
  const spec = { lpi: settings.lpi, angleDeg: settings.angleDeg, dot: settings.dot, minDot: 0, maxDot: 1 };
  const lut = makeTransfer(spec, compensate);
  const screen = makeScreen(spec, settings.ppi);
  const inset = Math.round(size * 0.2);
  return wanted.map((c) => {
    const field = new Uint8Array(size * size).fill(Math.round(c * 255));
    const film = halftoneField(field, size, size, screen, lut);
    const printed = pressBinary(film, size, size, press);
    let on = 0;
    let total = 0;
    for (let y = inset; y < size - inset; y++) {
      for (let x = inset; x < size - inset; x++) {
        on += printed[y * size + x];
        total++;
      }
    }
    return on / total;
  });
}

