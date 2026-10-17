// Synthetic films and DTG layers for the pack tests and the size benchmark,
// shaped like the engine's output (Print-Prep-Build.md, Engine): full-canvas
// binary plates on the engine's own film (engine/units.ts filmCanvas) with an
// AM halftone (round dot), the engine's registration targets at the four
// corners, and a label strip between the bottom ones that differs per film.
// Not used in production.
import sharp from 'sharp';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE, filmLayout } from '@/lib/print/defaults';
import type {
  CanvasSpec,
  DtgLayer,
  FilmLayout,
  GarmentColour,
  InkPlate,
  InkSystemProfile,
  OriginalArt,
  PlateLabelInfo,
  PlateRole,
  PrintPlacement,
  PrintRecipe,
  ScreenSet,
} from '@/lib/print/types';
import { drawTarget, drawTargets, labelBands, targetBoxes, targetGeometry, type MarkName } from '@/lib/print/engine/marks';
import { filmCanvas } from '@/lib/print/engine/units';
import { hexToLab } from './colour';

export const BLACK: GarmentColour = { code: 'C002', name: 'Black', hex: '#1B1C1E', isLight: false };
export const NAVY: GarmentColour = { code: 'C727', name: 'French Navy', hex: '#222A3D', isLight: false };
export const WHITE: GarmentColour = { code: 'C001', name: 'White', hex: '#F7F7F5', isLight: true };

export function mmToPx(mm: number, ppi: number): number {
  return Math.round((mm * ppi) / 25.4);
}

/** One registration target drawn exactly as the engine draws it, moved by
 * (dx, dy) px from where it belongs, for seeding mark faults. */
export function drawTargetAt(plate: Uint8Array, canvas: CanvasSpec, name: MarkName, dx = 0, dy = 0): void {
  const g = targetGeometry(canvas);
  const c = g.centres.find((p) => p.name === name);
  if (!c) throw new Error(`the canvas has no ${name} target`);
  drawTarget(plate, canvas, g, c.x + dx, c.y + dy);
}

/** Clears one target's box (the engine's targetBoxes) on a film. */
export function clearTarget(plate: Uint8Array, canvas: CanvasSpec, name: MarkName): void {
  const box = targetBoxes(canvas).find((b) => b.name === name);
  if (!box) throw new Error(`the canvas has no ${name} target`);
  for (let y = box.y; y < box.y + box.height; y++) plate.fill(0, y * canvas.widthPx + box.x, y * canvas.widthPx + box.x + box.width);
}

/** A barcode-like label strip in the engine's bottom label row, from the bottom
 * left target; different per film, and never past the row's ends. */
export function drawLabelStrip(plate: Uint8Array, canvas: CanvasSpec, seed: number): void {
  const { widthPx: W, heightPx: H, ppi } = canvas;
  const [row] = labelBands(canvas);
  const reach = Math.min(mmToPx(1.5, ppi), Math.floor(row.halfHeight));
  const y0 = Math.max(0, row.centreY - reach);
  const y1 = Math.min(H, row.centreY + reach);
  const bar = Math.max(1, mmToPx(0.4, ppi));
  let x = Math.ceil(row.x0);
  for (let i = 0; i < 24 && x + bar <= row.x1; i++) {
    const on = ((seed * 2654435761 + i * 40503) >>> 7) & 1 || i % 6 === 0;
    if (on) {
      for (let y = y0; y < y1; y++) for (let k = 0; k < bar && x + k < W; k++) plate[y * W + x + k] = 255;
    }
    x += bar * 2;
  }
}

/** AM round dot: true when (x, y) is ink at the given coverage (0..1). */
export function amDot(x: number, y: number, cellPx: number, cos: number, sin: number, coverage: number): boolean {
  if (coverage <= 0) return false;
  if (coverage >= 1) return true;
  const u = (x * cos + y * sin) / cellPx;
  const v = (-x * sin + y * cos) / cellPx;
  const fu = u - Math.floor(u) - 0.5;
  const fv = v - Math.floor(v) - 0.5;
  if (coverage <= 0.5) return fu * fu + fv * fv <= coverage / Math.PI;
  const gu = 0.5 - Math.abs(fu);
  const gv = 0.5 - Math.abs(fv);
  return gu * gu + gv * gv > (1 - coverage) / Math.PI;
}

export interface SyntheticSetOptions {
  widthMm?: number;
  heightMm?: number;
  ppi?: number;
  /** the film's margins and ink gap; the recipe's defaults for anything not given */
  marks?: Partial<FilmLayout>;
  /** total films including underbase and highlight (2..15) */
  plates?: number;
  garments?: GarmentColour[];
  lpi?: number;
  angleDeg?: number;
  setKey?: string;
  /** share of the art each ink's halftone ramp covers (default 0.18) */
  rampShare?: number;
}

export interface SyntheticSet {
  set: ScreenSet;
  garments: GarmentColour[];
  label: PlateLabelInfo;
  recipe: PrintRecipe;
  inks: InkSystemProfile;
  placement: PrintPlacement;
}

const INK_HEXES = ['#ED90DC', '#C363DA', '#5456AC', '#3E0E61', '#E8C547', '#2F9E6E', '#D9534F', '#4AA3DF', '#8C6D46', '#F28C38', '#6B4C9A', '#1F7A8C', '#B5179E'];

/** A screen set whose films look like the engine's: an underbase, inks with
 * solid shapes and a halftone ramp each, a highlight white, marks and labels. */
export function syntheticScreenSet(options: SyntheticSetOptions = {}): SyntheticSet {
  const ppi = options.ppi ?? 600;
  const widthMm = options.widthMm ?? 40;
  const heightMm = options.heightMm ?? 48;
  const layout = filmLayout(options.marks);
  const lpi = options.lpi ?? 55;
  const angleDeg = options.angleDeg ?? 22.5;
  const count = Math.max(2, Math.min(15, options.plates ?? 4));
  const garments = options.garments ?? [BLACK, NAVY];
  const rampShare = options.rampShare ?? 0.18;

  const canvas = filmCanvas({ widthMm, heightMm, widthPx: mmToPx(widthMm, ppi), heightPx: mmToPx(heightMm, ppi), ppi, sourcePpi: ppi }, layout);
  const { widthPx: W, heightPx: H, art } = canvas;
  const cell = ppi / lpi;
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  const sin = Math.sin((angleDeg * Math.PI) / 180);
  const recipe: PrintRecipe = {
    ...DEFAULT_RECIPE,
    screenPpi: ppi,
    halftone: { ...DEFAULT_RECIPE.halftone, lpi, angleDeg },
    marks: layout,
  };
  const { minDot, maxDot } = recipe.halftone;
  const inks = DEFAULT_INK_SYSTEM;

  const plates: InkPlate[] = [];
  for (let i = 0; i < count; i++) {
    const role: PlateRole = i === 0 ? 'underbase' : i === count - 1 ? 'highlight' : 'ink';
    const data = new Uint8Array(W * H);
    const ink = i - 1;
    // Each ink gets a horizontal band: a solid block, a halftone ramp, a disc.
    const bands = Math.max(1, count - 2);
    for (let y = 0; y < art.height; y++) {
      const row = (art.y + y) * W + art.x;
      for (let x = 0; x < art.width; x++) {
        const fx = x / art.width;
        const fy = y / art.height;
        let c = 0;
        if (role === 'underbase') {
          // under everything that isn't the clear frame
          c = fx > 0.06 && fx < 0.94 && fy > 0.06 && fy < 0.94 ? 1 : 0;
        } else if (role === 'highlight') {
          const d = Math.hypot(fx - 0.8, fy - 0.15);
          c = d < 0.05 ? 1 : 0;
        } else {
          const b0 = 0.08 + (0.84 * ink) / bands;
          const b1 = 0.08 + (0.84 * (ink + 1)) / bands;
          if (fy >= b0 && fy < b1) {
            if (fx > 0.1 && fx < 0.3) c = 1;
            else if (fx >= 0.35 && fx < 0.35 + rampShare * 3) {
              const t = (fx - 0.35) / (rampShare * 3);
              c = 0.02 + t * 0.96;
              if (c < minDot) c = 0;
              else if (c > maxDot) c = 1;
            }
          }
          const disc = Math.hypot(fx - 0.2, fy - (b0 + b1) / 2);
          if (disc < 0.02) c = 1;
        }
        if (c > 0 && amDot(art.x + x, art.y + y, cell, cos, sin, c)) data[row + x] = 255;
      }
    }
    drawTargets(data, canvas);
    drawLabelStrip(data, canvas, i + 1);

    let ink255 = 0;
    for (let y = art.y; y < art.y + art.height; y++) for (let x = art.x; x < art.x + art.width; x++) if (data[y * W + x]) ink255++;
    const hex = role === 'ink' ? INK_HEXES[ink % INK_HEXES.length] : '#F2F2F0';
    plates.push({
      index: i + 1,
      role,
      target: { hex, lab: hexToLab(hex) },
      base: role === 'ink' ? inks.bases.dark : inks.underbase.ink,
      pantone: role === 'ink' ? ['237 C', '2582 C', '2726 C', '2685 C'][ink] ?? null : null,
      clientName: role === 'underbase' ? 'White underbase' : role === 'highlight' ? 'Highlight white' : 'Ink',
      plate: { width: W, height: H, ppi, data },
      coverage: ink255 / (art.width * art.height),
      halftone: { ...recipe.halftone },
      meshSuggestion: role === 'ink' ? inks.mesh.halftone : inks.mesh.underbase,
    });
  }

  return {
    set: {
      key: options.setKey ?? 'darks',
      garmentCodes: garments.map((g) => g.code),
      needsUnderbase: true,
      method: 'spot',
      canvas,
      plates,
      warnings: [],
    },
    garments,
    label: { designCode: 'UNDERWRITER', version: 3, placementLabel: 'Front' },
    recipe,
    inks,
    placement: { position: 'front', widthMm, offsetYMm: 80 },
  };
}

/** Original art as a PNG: soft gradients and shapes on transparency. */
export async function syntheticOriginal(widthPx: number, heightPx: number): Promise<OriginalArt> {
  const data = Buffer.alloc(widthPx * heightPx * 4);
  for (let y = 0; y < heightPx; y++) {
    for (let x = 0; x < widthPx; x++) {
      const p = (y * widthPx + x) * 4;
      const fx = x / widthPx;
      const fy = y / heightPx;
      const inside = Math.hypot(fx - 0.5, fy - 0.5) < 0.45;
      data[p] = Math.round(120 + 120 * fx);
      data[p + 1] = Math.round(40 + 160 * fy);
      data[p + 2] = Math.round(200 - 120 * fx * fy);
      data[p + 3] = inside ? 255 : 0;
    }
  }
  const bytes = await sharp(data, { raw: { width: widthPx, height: heightPx, channels: 4 } }).png().toBuffer();
  return { bytes, filename: 'underwriter-v3.png', mime: 'image/png', widthPx, heightPx };
}

/** DTG/DTF layers: art cropped to its bounds, alpha 0/255, whites RGB 255 on
 * dark garments and transparent on white ones (Plan 4.4). */
export function syntheticDtgLayers(garments: GarmentColour[], printAreaPx: { width: number; height: number }, ppi = 300): DtgLayer[] {
  const pad = Math.round(printAreaPx.width * 0.1);
  const w = printAreaPx.width - 2 * pad;
  const h = printAreaPx.height - 2 * pad;
  const cell = ppi / 45;
  const cos = Math.cos((22.5 * Math.PI) / 180);
  const sin = Math.sin((22.5 * Math.PI) / 180);
  return garments.map((g) => {
    const whitesTransparent = !!g.isLight;
    const data = new Uint8Array(w * h * 4);
    let printed = 0;
    let fades = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const fx = x / w;
        const fy = y / h;
        let rgb: [number, number, number] | null = null;
        let fade = false;
        if (fy < 0.4 && Math.hypot(fx - 0.5, fy - 0.2) < 0.18) rgb = [228, 54, 110];
        else if (fy >= 0.45 && fy < 0.6 && fx > 0.1 && fx < 0.9) rgb = whitesTransparent ? null : [255, 255, 255];
        else if (fy >= 0.65 && fx > 0.05 && fx < 0.95) {
          fade = true;
          if (amDot(x, y, cell, cos, sin, 0.05 + 0.9 * fx)) rgb = [84, 86, 172];
        }
        if (rgb) {
          data[p] = rgb[0];
          data[p + 1] = rgb[1];
          data[p + 2] = rgb[2];
          data[p + 3] = 255;
          printed++;
          if (fade) fades++;
        }
      }
    }
    return {
      garmentCode: g.code,
      raster: { width: w, height: h, channels: 4 as const, data, ppi },
      offsetPx: { x: pad, y: pad },
      printAreaPx,
      fadeShare: printed ? fades / printed : 0,
      whitesTransparent,
    };
  });
}
