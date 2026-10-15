// Print engine entry points (WP1). Pure functions over rasters, in physical
// units; sharp only for decode, resample and encode. Never called from a
// request handler: the worker runs it (lib/print/pipeline.ts).
//
// Screen: the art is analysed once per reference garment on a work grid (its
// own resolution, capped at 200 ppi): palette, per-pixel inks and tints,
// edge folding, islands, method choice. Garments that proof within the ΔE
// target on a set's screens join it. Each set's plates are then rendered at
// recipe.screenPpi from those records (render.ts). DTG: one layer per garment
// at recipe.dtg.ppi (dtg.ts). Proofs and loupes are drawn from the plates and
// layers themselves (proof.ts), so what the client approves is what prints.
import type {
  DtgInput,
  DtgLayer,
  DtgResult,
  GarmentColour,
  InkSystemProfile,
  LoupeImage,
  PlateLabelInfo,
  ProofImage,
  ProofRequest,
  Raster,
  ScreenMethod,
  ScreenSeparationResult,
  ScreenSet,
  SeparationInput,
  Warning,
} from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, ENGINE_TUNING } from '@/lib/print/defaults';
import { hexToLab } from './colour';
import { analyseSet, joinCheck, joins, makeWorkGrid, type SetAnalysis } from './analyse';
import { prepareDtgLayers } from './dtg';
import { clearLabelStrip, drawLabelStrip } from './marks';
import { inkSystemModel } from './model';
import { dtgLoupe, dtgProof, screenLoupe, screenProof } from './proof';
import { decodeToRaster, toRgba } from './raster';
import { plateLabelLines, renderSet, setTitle } from './render';
import { printSize } from './units';

export { ENGINE_VERSION } from '@/lib/print/defaults';
export { deltaE2000, hexToLab, hexToRgb8, linearToLab, rgb8ToHex, rgb8ToLab } from './colour';
export { targetBoxes } from './marks';

/** Decode artwork (png, jpeg, webp) to RGBA sRGB; ppi from metadata or 72. */
export async function decodeArt(bytes: Buffer): Promise<Raster> {
  return decodeToRaster(bytes);
}

const METHOD_RANK: Record<ScreenMethod, number> = { spot: 0, index: 1, sim_process: 2 };

/** Screen separations for every garment set the drop needs (section 4.3). */
export async function separateScreen(input: SeparationInput): Promise<ScreenSeparationResult> {
  const { placement, garments, recipe, inks, label } = input;
  if (garments.length === 0) throw new Error('separateScreen: no garment colours');
  const art = toRgba(input.art);
  const size = printSize(placement, art.width, art.height, recipe.screenPpi);
  const grid = await makeWorkGrid(art, size);
  const sys = inkSystemModel(inks);
  const warnings: Warning[] = artWarnings(art, size.sourcePpi);
  const names: Record<string, string> = Object.fromEntries(garments.map((g) => [g.code, g.name]));

  // Darks with an underbase, lights without; each group's first set is keyed
  // 'darks' or 'lights', and a garment the shared screens miss gets its own.
  const planned: { analysis: SetAnalysis; key: string; garments: GarmentColour[] }[] = [];
  const byLightness = (a: GarmentColour, b: GarmentColour): number => hexToLab(a.hex).L - hexToLab(b.hex).L || (a.code < b.code ? -1 : 1);
  const groups: [GarmentColour[], boolean, string][] = [
    [garments.filter((g) => !g.isLight).sort(byLightness), true, 'darks'],
    [garments.filter((g) => g.isLight).sort((a, b) => byLightness(b, a)), false, 'lights'],
  ];
  for (const [group, dark, groupKey] of groups) {
    const remaining = [...group];
    const missed = new Map<string, number>();
    while (remaining.length > 0) {
      const reference = remaining.shift() as GarmentColour;
      const analysis = analyseSet(grid, reference, dark, recipe, sys);
      const key = planned.some((p) => p.key === groupKey) ? reference.code : groupKey;
      const members = [reference];
      if (missed.has(reference.code)) {
        warnings.push({
          code: 'own_screen_set',
          severity: 'info',
          message: `${reference.name} gets its own screens: the shared ones would print it ΔE ${(missed.get(reference.code) ?? 0).toFixed(1)} off on average.`,
        });
      }
      const self = remaining.length > 0 ? joinCheck(grid, analysis, reference) : null;
      for (const g of [...remaining]) {
        const check = joinCheck(grid, analysis, g);
        if (self && joins(check, self)) {
          members.push(g);
          remaining.splice(remaining.indexOf(g), 1);
        } else if (!missed.has(g.code)) {
          missed.set(g.code, check.meanDeltaE);
        }
      }
      planned.push({ analysis, key, garments: members });
    }
  }

  const sets: ScreenSet[] = [];
  for (const p of planned) {
    const set = renderSet({
      analysis: p.analysis,
      key: p.key,
      garmentCodes: p.garments.map((g) => g.code),
      size,
      recipe,
      inks,
      label,
      garmentNames: names,
    });
    // Proof and loupe calls get a set, not its garments: the set carries them.
    sets.push({ ...set, garments: p.garments });
  }

  // The hardest set decides: Phase 1 builds spot, and flags the rest. Sets
  // where nothing prints say nothing about the method.
  const printing = planned.filter((p) => p.analysis.stats.artPixels > 0);
  let lead = printing[0] ?? planned[0];
  for (const p of printing) if (METHOD_RANK[p.analysis.method] > METHOD_RANK[lead.analysis.method]) lead = p;
  const method = lead.analysis.method;
  const needsManual = method !== 'spot';
  if (needsManual) {
    warnings.push({
      code: method === 'index' ? 'needs_index' : 'needs_sim_process',
      severity: 'review',
      message: `${setTitle(lead.key, names)}: ${lead.analysis.methodReason}`,
    });
  }
  for (const p of planned) {
    if (!p.analysis.palette.fits && p.analysis.method === 'spot' && p.analysis.entries.length > 0) {
      warnings.push({
        code: 'over_budget',
        severity: 'review',
        message: `${setTitle(p.key, names)}: the art needs more colours than ${recipe.maxScreens} screens hold; the nearest colours were merged.`,
      });
    }
  }
  return { method, methodReason: lead.analysis.methodReason, needsManual, sets, warnings };
}

function artWarnings(art: Raster, sourcePpi: number): Warning[] {
  const out: Warning[] = [];
  const ppi = Math.round(sourcePpi);
  if (sourcePpi < ENGINE_TUNING.lowResolutionBlockPpi) {
    out.push({ code: 'low_resolution', severity: 'block', message: `The artwork is ${ppi} ppi at this size, too soft to print. It needs a larger file.` });
  } else if (sourcePpi < ENGINE_TUNING.lowResolutionPpi) {
    out.push({ code: 'low_resolution', severity: 'review', message: `The artwork is ${ppi} ppi at this size. It prints, but a sharper version would look crisper up close.` });
  }
  const bg = solidBackground(art);
  if (bg) {
    out.push({ code: 'solid_background', severity: 'review', message: `The artwork has a solid ${bg} background. It prints as a block wherever it is not knocked out.` });
  }
  return out;
}

/** The art's border colour when the art is opaque and its border one colour, else null. */
function solidBackground(art: Raster): string | null {
  const { width: w, height: h, data } = art;
  let n = 0;
  const sum = [0, 0, 0];
  const pts: number[] = [];
  const take = (x: number, y: number): void => {
    pts.push((y * w + x) * 4);
  };
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 64))) {
    take(x, 0);
    take(x, h - 1);
  }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 64))) {
    take(0, y);
    take(w - 1, y);
  }
  for (const i of pts) {
    if (data[i + 3] < 250) return null;
    sum[0] += data[i];
    sum[1] += data[i + 1];
    sum[2] += data[i + 2];
    n++;
  }
  if (n === 0) return null;
  const mean = sum.map((v) => v / n);
  for (const i of pts) {
    if (Math.abs(data[i] - mean[0]) + Math.abs(data[i + 1] - mean[1]) + Math.abs(data[i + 2] - mean[2]) > 24) return null;
  }
  const hex = `#${mean.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  return hex;
}

/** One DTG/DTF layer per garment colour (section 4.4). */
export async function prepareDtg(input: DtgInput): Promise<DtgResult> {
  const art = toRgba(input.art);
  const res = await prepareDtgLayers({ ...input, art });
  const warnings = [...artWarnings(art, art.width / (input.placement.widthMm / 25.4)), ...res.warnings];
  return { layers: res.layers, warnings };
}

/** The screen print simulated from the plates, on the garment photo. */
export async function renderScreenProof(set: ScreenSet, request: ProofRequest, inks: InkSystemProfile): Promise<ProofImage> {
  return screenProof(set, request.garment, request.packshot, inks);
}

/** The DTG/DTF layer on the garment photo. */
export async function renderDtgProof(layer: DtgLayer, request: ProofRequest, inks?: InkSystemProfile): Promise<ProofImage> {
  return dtgProof(layer, request.garment, request.packshot, inks ?? DEFAULT_INK_SYSTEM);
}

/**
 * A true-size crop of the busiest area, showing the dots. The garment comes
 * from the separation that made the set; pass it when the set was rebuilt
 * elsewhere (e.g. from an uploaded PSD).
 */
export async function renderScreenLoupe(set: ScreenSet, garmentCode: string, inks: InkSystemProfile, sizeMm?: number, garment?: GarmentColour): Promise<LoupeImage> {
  const g =
    garment ??
    set.garments?.find((x) => x.code === garmentCode) ??
    ({ code: garmentCode, name: garmentCode, hex: set.needsUnderbase ? '#1B1C1E' : '#F3F3F1', isLight: !set.needsUnderbase } satisfies GarmentColour);
  return screenLoupe(set, g, inks, sizeMm ?? ENGINE_TUNING.loupeMm);
}

export async function renderDtgLoupe(layer: DtgLayer, garmentHex: string, sizeMm?: number, isLight?: boolean): Promise<LoupeImage> {
  const light = isLight ?? hexToLab(garmentHex).L > 60;
  const garment: GarmentColour = { code: layer.garmentCode, name: layer.garmentCode, hex: garmentHex, isLight: light };
  return dtgLoupe(layer, garment, DEFAULT_INK_SYSTEM, sizeMm ?? ENGINE_TUNING.loupeMm);
}

/**
 * Redraws a plate's label strip, e.g. with its Pantone code once pre-press
 * names the ink. The targets are untouched.
 */
export function relabelPlate(set: ScreenSet, plateIndex: number, label: PlateLabelInfo, inks: InkSystemProfile, targetOffsetMm: number, inkName?: string, garmentNames: Record<string, string> = {}): void {
  const plate = set.plates.find((p) => p.index === plateIndex);
  if (!plate) throw new Error(`relabelPlate: no plate ${plateIndex} in set ${set.key}`);
  clearLabelStrip(plate.plate.data, set.canvas, targetOffsetMm);
  drawLabelStrip(plate.plate.data, set.canvas, targetOffsetMm, plateLabelLines(label, setTitle(set.key, garmentNames), plate, set.plates.length, inks, inkName));
}
