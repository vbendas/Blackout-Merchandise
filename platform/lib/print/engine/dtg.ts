// DTG/DTF layers, one per garment colour (Plan 4.4): knock out the garment
// colour, make alpha strictly 0 or 255 (a thin edge band thresholded at 50%,
// wider partial alpha halftoned at the fade screen), drop specks and fill
// pinholes below the smallest printable feature, and handle whites the way
// Brother GTX Graphics Lab prints them: RGB 255 is white ink, so on white
// garments it becomes transparent. Output is cropped to the printed pixels.
import type { DtgInput, DtgLayer, DtgResult, GarmentColour, PrintRecipe, Raster, Warning } from '@/lib/print/types';
import { ENGINE_TUNING } from '@/lib/print/defaults';
import { SRGB8_TO_LINEAR, deltaE2000, hexToRgb8, linearToLab, linearToSrgb8, rgb8ToLab, srgbToLinear, type Vec3 } from './colour';
import { makeScreen, screenRow } from './halftone';
import { dilateSquare, erodeSquare, removeSmallComponents } from './morphology';
import { denoiseRgba, resizeRgba, toRgba } from './raster';
import { mmToPx, printSize, type PrintSize } from './units';

/** The art at the DTG resolution, denoised at whichever grid is smaller. */
export async function dtgArt(art: Raster, size: PrintSize): Promise<Uint8Array> {
  const src = toRgba(art);
  if (size.sourcePpi <= size.ppi) {
    const clean = denoiseRgba(src.data, src.width, src.height);
    return resizeRgba(clean, src.width, src.height, size.widthPx, size.heightPx);
  }
  const resized = await resizeRgba(src.data, src.width, src.height, size.widthPx, size.heightPx);
  return denoiseRgba(resized, size.widthPx, size.heightPx);
}

const WHITE_LAB = rgb8ToLab(255, 255, 255);
const BIN_TO_LINEAR: Float64Array = (() => {
  const t = new Float64Array(128);
  for (let i = 0; i < 128; i++) t[i] = srgbToLinear((2 * i + 0.5) / 255);
  return t;
})();

/** True when RGB 255 on this garment should print nothing (a white garment). */
export function whitesTransparentOn(garment: GarmentColour): boolean {
  return deltaE2000(rgb8ToLab(...hexToRgb8(garment.hex)), WHITE_LAB) <= ENGINE_TUNING.whiteGarmentDeltaE;
}

const ALPHA_SNAP = 3;
const FADE = 128;

/** One garment's layer from the art at the DTG resolution. */
export function dtgLayer(rgba: Uint8Array, size: PrintSize, garment: GarmentColour, recipe: PrintRecipe): { layer: DtgLayer; warnings: Warning[] } {
  const W = size.widthPx;
  const H = size.heightPx;
  const n = W * H;
  const [gr, gg, gb] = hexToRgb8(garment.hex);
  const G: Vec3 = [SRGB8_TO_LINEAR[gr], SRGB8_TO_LINEAR[gg], SRGB8_TO_LINEAR[gb]];
  const garmentLab = linearToLab(G[0], G[1], G[2]);
  const whitesTransparent = whitesTransparentOn(garment);
  const tol = recipe.knockoutDeltaE;
  const band = Math.max(4, tol / 2);

  // knockout factor per 7-bit colour: 0 at or under the tolerance, ramping to 1
  const cache = new Uint16Array(1 << 21);
  const keep = (r: number, g: number, b: number): number => {
    const key = ((r >> 1) << 14) | ((g >> 1) << 7) | (b >> 1);
    const hit = cache[key];
    if (hit !== 0) return hit - 1;
    const de = deltaE2000(linearToLab(BIN_TO_LINEAR[r >> 1], BIN_TO_LINEAR[g >> 1], BIN_TO_LINEAR[b >> 1]), garmentLab);
    const k = de <= tol ? 0 : de >= tol + band ? 255 : Math.round(((de - tol) / band) * 255);
    cache[key] = k + 1;
    return k;
  };

  const out = new Uint8Array(n * 4);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = rgba[i * 4 + 3];
    if (a === 0) continue;
    let r = rgba[i * 4];
    let g = rgba[i * 4 + 1];
    let b = rgba[i * 4 + 2];
    const k = keep(r, g, b);
    if (k === 0) continue;
    if (k < 255) {
      // the colour that, at coverage k over the garment, averages to this pixel
      const kf = k / 255;
      r = linearToSrgb8((SRGB8_TO_LINEAR[r] - (1 - kf) * G[0]) / kf);
      g = linearToSrgb8((SRGB8_TO_LINEAR[g] - (1 - kf) * G[1]) / kf);
      b = linearToSrgb8((SRGB8_TO_LINEAR[b] - (1 - kf) * G[2]) / kf);
    }
    if (whitesTransparent && r === 255 && g === 255 && b === 255) continue;
    let ak = Math.round((a * k) / 255);
    if (ak <= ALPHA_SNAP) continue;
    if (ak >= 255 - ALPHA_SNAP) ak = 255;
    alpha[i] = ak;
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
  }

  // partial alpha wider than the edge band is a fade: halftone it; the rest is
  // an edge: threshold it at 50%
  const partial = new Uint8Array(n);
  for (let i = 0; i < n; i++) partial[i] = alpha[i] > 0 && alpha[i] < 255 ? 1 : 0;
  const r = Math.max(1, Math.ceil(recipe.dtg.edgeBandPx / 2));
  const fade = dilateSquare(erodeSquare(partial, W, H, r), W, H, r);
  const screen = makeScreen({ lpi: recipe.dtg.fadeLpi, angleDeg: recipe.dtg.fadeAngleDeg, dot: 'round' }, size.ppi);
  const th = new Float32Array(W);
  const labels = new Uint8Array(n);
  let fadeOn = 0;
  for (let y = 0; y < H; y++) {
    let thReady = false;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = alpha[i];
      if (a === 0) continue;
      let on: boolean;
      if (a < 255 && fade[i] && partial[i]) {
        if (!thReady) {
          screenRow(screen, y, 0, W, th);
          thReady = true;
        }
        on = a / 255 > th[x];
        labels[i] = FADE;
        if (on) fadeOn++;
      } else {
        on = a >= 128;
        if (on) labels[i] = 255;
      }
      alpha[i] = on ? 255 : 0;
    }
  }

  // specks and pinholes below the smallest feature, away from fades
  const minSide = mmToPx(recipe.minFeatureMm, size.ppi);
  const minArea = (Math.PI / 4) * minSide * minSide;
  removeSmallComponents(labels, W, H, minArea, {
    isProtected: (l) => l === FADE,
    relabel: (i, l) => {
      if (l === 0) {
        alpha[i] = 0;
        return;
      }
      // a filled pinhole takes the mean colour of its printed neighbours
      const y = (i / W) | 0;
      const x = i - y * W;
      let c = 0;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (alpha[j] !== 255) continue;
          sr += out[j * 4];
          sg += out[j * 4 + 1];
          sb += out[j * 4 + 2];
          c++;
        }
      }
      if (c === 0) return;
      alpha[i] = 255;
      out[i * 4] = Math.round(sr / c);
      out[i * 4 + 1] = Math.round(sg / c);
      out[i * 4 + 2] = Math.round(sb / c);
    },
  });

  // crop to the printed pixels; transparent pixels carry no colour
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  let printed = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (alpha[i] !== 255) {
        out[i * 4] = 0;
        out[i * 4 + 1] = 0;
        out[i * 4 + 2] = 0;
        out[i * 4 + 3] = 0;
        continue;
      }
      out[i * 4 + 3] = 255;
      printed++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const warnings: Warning[] = [];
  if (printed === 0) {
    warnings.push({ code: 'empty_print', severity: 'block', message: `DTG/DTF: nothing prints on ${garment.name}. The art is the same colour as the shirt.` });
    return {
      layer: {
        garmentCode: garment.code,
        raster: { width: 1, height: 1, channels: 4, data: new Uint8Array(4), ppi: size.ppi },
        offsetPx: { x: 0, y: 0 },
        printAreaPx: { width: W, height: H },
        fadeShare: 0,
        whitesTransparent,
      },
      warnings,
    };
  }
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const crop = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) crop.set(out.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + cw) * 4), y * cw * 4);
  return {
    layer: {
      garmentCode: garment.code,
      raster: { width: cw, height: ch, channels: 4, data: crop, ppi: size.ppi },
      offsetPx: { x: x0, y: y0 },
      printAreaPx: { width: W, height: H },
      fadeShare: printed > 0 ? Math.min(1, fadeOn / printed) : 0,
      whitesTransparent,
    },
    warnings,
  };
}

export async function prepareDtgLayers(input: DtgInput): Promise<DtgResult> {
  const { art, placement, garments, recipe } = input;
  const src = toRgba(art);
  const size = printSize(placement, src.width, src.height, recipe.dtg.ppi);
  const rgba = await dtgArt(src, size);
  const layers: DtgLayer[] = [];
  const warnings: Warning[] = [];
  for (const g of garments) {
    const { layer, warnings: w } = dtgLayer(rgba, size, g, recipe);
    layers.push(layer);
    warnings.push(...w);
  }
  return { layers, warnings };
}
