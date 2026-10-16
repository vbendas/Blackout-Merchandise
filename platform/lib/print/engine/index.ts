// Print engine entry points (WP1, Phase 2). Pure functions over rasters, in
// physical units; sharp only for decode, resample and encode. Never called
// from a request handler: the worker runs it (lib/print/pipeline.ts).
//
// Screen: the art is analysed once per reference garment on a work grid (its
// own resolution, capped at 200 ppi): palette, per-pixel inks and tints,
// edge folding, islands, and the method (analyse.ts: spot, index or
// simulated process, or the one the recipe forces). Garments that proof
// within the ΔE target on a set's screens join it, each method predicting its
// own print. Each set is then rendered at recipe.screenPpi by its method:
// spot (render.ts), index (index-method.ts) or simulated process
// (sim-process.ts). DTG: one layer per garment at recipe.dtg.ppi (dtg.ts).
// Proofs and loupes are drawn from the plates and layers themselves
// (proof.ts), so what the client approves is what prints.
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
import { analyseSet, joinCheck, joins, makeWorkGrid, type JoinCheck, type SetAnalysis, type WorkGrid } from './analyse';
import { prepareDtgLayers } from './dtg';
import { indexJoinCheck, indexPlateLabelLines, renderIndexSet, separateIndex, type IndexSeparation } from './index-method';
import { clearLabelStrip, drawLabelStrip } from './marks';
import { inkSystemModel, type InkSystemModel } from './model';
import { dtgLoupe, dtgProof, screenLoupe, screenProof } from './proof';
import { decodeToRaster, toRgba } from './raster';
import { plateLabelLines, renderSet, setTitle, type RenderInput } from './render';
import { planSimProcess, renderSimProcessSet, simJoinCheck, type SimProcessPlan, type SimRenderInput } from './sim-process';
import { printSize, type PrintSize } from './units';

export { ENGINE_VERSION } from '@/lib/print/defaults';
export { deltaE2000, hexToLab, hexToRgb8, linearToLab, rgb8ToHex, rgb8ToLab } from './colour';
export { targetBoxes } from './marks';

/** Decode artwork (png, jpeg, webp) to RGBA sRGB; ppi from metadata or 72. */
export async function decodeArt(bytes: Buffer): Promise<Raster> {
  return decodeToRaster(bytes);
}

const METHOD_RANK: Record<ScreenMethod, number> = { spot: 0, index: 1, sim_process: 2 };
const METHOD_NAME: Record<ScreenMethod, string> = { spot: 'spot colour', index: 'index', sim_process: 'simulated process' };

/** How each method renders a set. The defaults are the engine's; tests may swap one. */
export interface SetRenderers {
  spot: (input: RenderInput) => ScreenSet;
  index: (input: RenderInput & { grid: WorkGrid; separation?: IndexSeparation }) => ScreenSet;
  simProcess: (input: SimRenderInput) => ScreenSet;
}

export const SET_RENDERERS: SetRenderers = { spot: renderSet, index: renderIndexSet, simProcess: renderSimProcessSet };

/** A renderer that is a contract stub still says so; the set then gets a spot draft and the auditor is told. */
function notImplemented(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith('not implemented');
}

interface PlannedSet {
  analysis: SetAnalysis;
  key: string;
  garments: GarmentColour[];
  /** simulated process: the inks, table and coverages, made once for the joins and the films */
  sim: SimProcessPlan | null;
  /** index: the separation the joins made, reused for the films (null when no join needed one) */
  index: IndexSeparation | null;
}

/**
 * Predicts how a garment prints from a set's screens, by the set's method:
 * the simulated-process coverages, the index cells, or the spot records.
 * The index separation is made on first use, and the index renderer reuses
 * it (the same inputs give the same cells), so a set is separated once.
 */
class JoinPredictor {
  private index: IndexSeparation | null | undefined;
  constructor(
    private readonly grid: WorkGrid,
    private readonly size: PrintSize,
    private readonly recipe: SeparationInput['recipe'],
    private readonly sys: InkSystemModel,
    private readonly analysis: SetAnalysis,
    private readonly sim: SimProcessPlan | null,
  ) {}

  check(g: GarmentColour): JoinCheck {
    const { grid, analysis } = this;
    if (analysis.method === 'sim_process' && this.sim) return simJoinCheck(grid, this.sim, g);
    if (analysis.method === 'index') {
      if (this.index === undefined) {
        try {
          this.index = separateIndex({ grid, analysis, size: this.size, recipe: this.recipe });
        } catch (e) {
          if (!notImplemented(e)) throw e;
          this.index = null;
        }
      }
      if (this.index) return indexJoinCheck(this.index, grid, this.size, g, this.sys, this.recipe.knockoutDeltaE);
    }
    return joinCheck(grid, analysis, g);
  }

  /** The index separation the checks made, if they made one. */
  separation(): IndexSeparation | null {
    return this.index ?? null;
  }
}

/** Screen separations for every garment set the drop needs (section 4.3). */
export async function separateScreen(input: SeparationInput, renderers: SetRenderers = SET_RENDERERS): Promise<ScreenSeparationResult> {
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
  const planned: PlannedSet[] = [];
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
      const sim = analysis.method === 'sim_process' ? planSimProcess(grid, analysis, recipe) : null;
      const key = planned.some((p) => p.key === groupKey) ? reference.code : groupKey;
      const members = [reference];
      if (missed.has(reference.code)) {
        warnings.push({
          code: 'own_screen_set',
          severity: 'info',
          message: `${reference.name} gets its own screens: the shared ones would print it ΔE ${(missed.get(reference.code) ?? 0).toFixed(1)} off on average.`,
        });
      }
      let index: IndexSeparation | null = null;
      if (remaining.length > 0) {
        const predictor = new JoinPredictor(grid, size, recipe, sys, analysis, sim);
        const self = predictor.check(reference);
        for (const g of [...remaining]) {
          const check = predictor.check(g);
          if (joins(check, self)) {
            members.push(g);
            remaining.splice(remaining.indexOf(g), 1);
          } else if (!missed.has(g.code)) {
            missed.set(g.code, check.meanDeltaE);
          }
        }
        index = predictor.separation();
      }
      planned.push({ analysis, key, garments: members, sim, index });
    }
  }

  const sets: ScreenSet[] = [];
  const drafts: PlannedSet[] = [];
  for (const p of planned) {
    const base: RenderInput = {
      analysis: p.analysis,
      key: p.key,
      garmentCodes: p.garments.map((g) => g.code),
      size,
      recipe,
      inks,
      label,
      garmentNames: names,
    };
    let set: ScreenSet;
    if (p.analysis.method === 'sim_process') {
      set = renderers.simProcess({ ...base, grid, sim: p.sim ?? undefined });
    } else if (p.analysis.method === 'index') {
      try {
        set = renderers.index({ ...base, grid, ...(p.index ? { separation: p.index } : {}) });
      } catch (e) {
        if (!notImplemented(e)) throw e;
        set = renderers.spot(base);
        drafts.push(p);
      }
    } else {
      set = renderers.spot(base);
    }
    // the coverages and cells are in the films now
    p.sim = null;
    p.index = null;
    // Proof and loupe calls get a set, not its garments: the set carries them.
    sets.push({ ...set, garments: p.garments });
  }

  // The hardest method among the sets that print leads; sets where nothing
  // prints say nothing about the method.
  const printing = planned.filter((p) => p.analysis.stats.artPixels > 0);
  let lead = printing[0] ?? planned[0];
  for (const p of printing) if (METHOD_RANK[p.analysis.method] > METHOD_RANK[lead.analysis.method]) lead = p;
  const method = lead.analysis.method;
  let methodReason = lead.analysis.methodReason;
  const draftReasons = new Map<PlannedSet, string>();
  for (const p of drafts) {
    const message = `${setTitle(p.key, names)}: ${p.analysis.methodReason} ${capitalise(METHOD_NAME[p.analysis.method])} is finished by hand for now: these films are a spot draft with ${draftInks(p)}.`;
    warnings.push({ code: p.analysis.method === 'index' ? 'needs_index' : 'needs_sim_process', severity: 'review', message });
    draftReasons.set(p, message);
    if (p === lead || drafts.length === planned.length) methodReason = message;
  }
  // Each set says why it has its own method (one set may be simulated process, another spot).
  sets.forEach((set, i) => {
    set.methodReason = draftReasons.get(planned[i]) ?? planned[i].analysis.methodReason;
  });
  if (drafts.length > 0 && !drafts.includes(lead)) {
    const d = drafts[0];
    methodReason = `${methodReason} ${setTitle(d.key, names)} is a spot draft for ${METHOD_NAME[d.analysis.method]}, finished by hand.`;
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
  return { method, methodReason, needsManual: drafts.length > 0, sets, warnings };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function draftInks(p: PlannedSet): string {
  const k = p.analysis.entries.filter((e) => e.kind === 'ink' || !p.analysis.dark).length;
  return `${k} ink${k === 1 ? '' : 's'}`;
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
  // an index film names its cell grid, not a halftone screen
  const lines = set.method === 'index' ? indexPlateLabelLines : plateLabelLines;
  clearLabelStrip(plate.plate.data, set.canvas, targetOffsetMm);
  drawLabelStrip(plate.plate.data, set.canvas, targetOffsetMm, lines(label, setTitle(set.key, garmentNames), plate, set.plates.length, inks, inkName));
}
