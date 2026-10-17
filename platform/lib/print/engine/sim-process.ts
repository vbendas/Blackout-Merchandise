// Simulated process separations (plan section 4.3): inks chosen from the art
// to span its colours within the screen budget (sim-inks.ts); continuous
// coverage per plate from inverting the same print model the proofs draw
// with (a 3D table of plate areas, fitted node by node and interpolated per
// pixel, sim-lut.ts); then AM halftones on one shared screen, so the dots of
// every plate nest as the model assumes (sim-screen.ts).
//
// On darks the underbase is a plate of the model like any other: it lies
// under every ink (the inks print wet on wet over the flashed base) and its
// own bare ring is whatever white the colour needs. It is choked at the edge
// of the print as the recipe says. The highlight white is the last plate,
// for the brightest colours. Each set reports how far its proof is from the
// art (ΔE2000 over small squares of the films, as an info warning), and the
// proof is drawn from the same films with the same model (proof.ts).
import type { GarmentColour, Hex, InkPlate, PlateRole, PrintRecipe, ScreenSet, Warning } from '@/lib/print/types';
import { ENGINE_TUNING, WHITE_INK_HEX, filmLayout } from '@/lib/print/defaults';
import { SRGB8_TO_LINEAR, deltaE2000, hexToLab, hexToRgb8, linearToLab, roundLab, type Vec3 } from './colour';
import { compositeOver, type JoinCheck, type SetAnalysis, type WorkGrid } from './analyse';
import type { DotGainCurve } from './halftone';
import { nestedCoverageColour, overlay, plateLayer, underbaseOn, type ModelLayer } from './model';
import { chokeBy, type MaskView } from './morphology';
import { drawLabelStrip, drawTargets } from './marks';
import { dotGainFor } from '@/lib/print/calibration/curve';
import { plateLabelLines, safeClientName, screenCountWarnings, setTitle, type RenderInput } from './render';
import { hardBits, renderSimFilms } from './sim-screen';
import { artColours, chooseSimInks, type ChosenInk } from './sim-inks';
import { LutApplier, buildSimLut, lutCell, LUT_SIZE, type SimLut } from './sim-lut';
import { AreaSolver, NestedModel, type SimConstraints } from './sim-model';
import { canvasSpec, mmToPx } from './units';
import { printedToneOf, toneScratch, toneShift, ToneTally, type PrintedTone } from './printed-tone';

export interface SimPlateSpec {
  role: PlateRole;
  hex: Hex;
  base: string;
  /** the colour ink; null for the underbase and the highlight white */
  ink: ChosenInk | null;
}

/** Everything a simulated-process set is rendered from, for one reference garment. */
export interface SimProcessPlan {
  reference: GarmentColour;
  dark: boolean;
  /** press order: underbase, colours light to dark, highlight white */
  plates: SimPlateSpec[];
  layers: ModelLayer[];
  limits: SimConstraints;
  lut: SimLut | null;
  /** visible area per plate on the work grid, 0..255; the films nest them into coverages */
  areas: Uint8Array[];
  /** nests areas into coverages within the ink limit (null when nothing prints) */
  nester: AreaSolver | null;
  /** how far the art is from what the inks can print at best (ΔE2000-like), mean and 95th percentile */
  hullMean: number;
  hullP95: number;
  timings: { inksMs: number; lutMs: number; applyMs: number };
  /** table nodes fitted; art colours looked up; blends over the ink limit folded, and those fitted again */
  counts: { nodes: number; colours: number; merges: number; repairs: number };
}

/** Inks, table and coverage for one reference garment. */
export function planSimProcess(grid: WorkGrid, a: Pick<SetAnalysis, 'reference' | 'dark' | 'ctx'>, recipe: PrintRecipe): SimProcessPlan {
  const { dark, ctx } = a;
  const sys = ctx.sys;
  const pixels = grid.width * grid.height;
  const garment = ctx.garment;
  const comp = compositeOver(grid.rgba, pixels, hexToRgb8(a.reference.hex));
  const t0 = performance.now();
  const art = artColours(comp, pixels, garment, ctx.garmentLab, recipe.knockoutDeltaE);
  const choice = chooseSimInks(art, {
    dark,
    sys,
    garment,
    garmentLab: ctx.garmentLab,
    highlightAllowed: recipe.highlightWhite,
    maxScreens: recipe.maxScreens,
    lockedInks: recipe.lockedInks,
  });
  const t1 = performance.now();

  const plates: SimPlateSpec[] = [];
  const nothing = art.n === 0 || (choice.inks.length === 0 && !dark);
  if (!nothing) {
    if (dark) plates.push({ role: 'underbase', hex: WHITE_INK_HEX, base: sys.underbaseInk, ink: null });
    // on darks every ink sits on the underbase: the nested dots put it under all of them
    for (const ink of choice.inks) plates.push({ role: 'ink', hex: ink.hex, base: ink.base, ink });
    if (dark && choice.highlight) plates.push({ role: 'highlight', hex: WHITE_INK_HEX, base: sys.highlightInk, ink: null });
  }
  const layers = plates.map((p) => plateLayer(p.role, p.hex, p.base, sys));
  const limits: SimConstraints = {
    underbase: plates.findIndex((p) => p.role === 'underbase'),
    wet: plates.flatMap((p, j) => (p.role === 'underbase' ? [] : [j])),
    inkLimit: ENGINE_TUNING.simInkLimit,
  };
  const plan: SimProcessPlan = {
    reference: a.reference,
    dark,
    plates,
    layers,
    limits,
    lut: null,
    areas: [],
    nester: null,
    hullMean: choice.hullMean,
    hullP95: choice.hullP95,
    timings: { inksMs: t1 - t0, lutMs: 0, applyMs: 0 },
    counts: { nodes: 0, colours: 0, merges: 0, repairs: 0 },
  };
  if (plates.length === 0) return plan;

  const model = new NestedModel(garment, layers);
  const kinds = plates.map((p) => p.role);
  // what each plate shows where it is on top
  const ub = underbaseOn(sys, garment);
  const solid: Vec3[] = plates.map((p, j) => {
    if (p.role === 'underbase') return ub;
    if (p.role === 'highlight') return overlay(ub, sys.white, sys.highlightOpacity, [0, 0, 0]);
    return overlay(dark ? ub : garment, layers[j].colour, layers[j].opacity, [0, 0, 0]);
  });
  // the table cells the art's colours fall in, with their pixel counts
  const cf = LUT_SIZE - 1;
  const cells = new Uint32Array(cf * cf * cf);
  for (let i = 0; i < pixels; i++) cells[(lutCell(comp[i * 3]) * cf + lutCell(comp[i * 3 + 1])) * cf + lutCell(comp[i * 3 + 2])]++;
  const spec = { model, limits, garment, garmentLab: ctx.garmentLab, knockoutDeltaE: recipe.knockoutDeltaE, kinds, solid };
  const lut = buildSimLut(cells, spec);
  const t2 = performance.now();
  plan.lut = lut;
  const applier = new LutApplier(lut, spec);
  plan.areas = applyLut(comp, grid.rgba, pixels, applier);
  plan.nester = new AreaSolver(model, kinds, limits.wet, limits.inkLimit);
  plan.counts = { nodes: lut.nodes, colours: applier.lookups, merges: applier.merges, repairs: applier.repairs };
  plan.timings.lutMs = t2 - t1;
  plan.timings.applyMs = performance.now() - t2;
  return plan;
}

/** Plate areas (0..255) for every work pixel, through the table (sim-lut.ts LutApplier). A transparent pixel prints
 * nothing, whatever the knockout tolerance. */
function applyLut(comp: Uint8Array, rgba: Uint8Array, pixels: number, applier: LutApplier): Uint8Array[] {
  const n = applier.n;
  const fields = Array.from({ length: n }, () => new Uint8Array(pixels));
  const q = new Uint8Array(n);
  let pr = -1;
  let pg = -1;
  let pb = -1;
  for (let i = 0; i < pixels; i++) {
    if (rgba[i * 4 + 3] === 0) continue;
    const r = comp[i * 3];
    const g = comp[i * 3 + 1];
    const b = comp[i * 3 + 2];
    if (r !== pr || g !== pg || b !== pb) {
      pr = r;
      pg = g;
      pb = b;
      applier.areas8(r, g, b, q);
    }
    for (let j = 0; j < n; j++) fields[j][i] = q[j];
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Films
// ---------------------------------------------------------------------------

/** Coverages a plan prints at work pixel i (nested from its areas, within the ink limit) into out.
 * `scratch` (plates + 1) saves an allocation per call. */
export function planCoverage(plan: SimProcessPlan, i: number, out: Float64Array, scratch?: Float64Array): void {
  const n = plan.areas.length;
  if (!plan.nester) {
    out.fill(0);
    return;
  }
  const w = scratch ?? new Float64Array(n + 1);
  for (let j = 0; j < n; j++) w[j + 1] = plan.areas[j][i] / 255;
  plan.nester.nestWithinLimit(w, out);
}

function view(data: Uint8Array, stride: number, x: number, y: number, width: number, height: number): MaskView {
  return { data, stride, offset: y * stride + x, width, height };
}

export type SimRenderInput = RenderInput & {
  grid: WorkGrid;
  /** the plan made while planning the screen sets; made here when absent */
  sim?: SimProcessPlan;
  /** tests only: a dot-gain curve instead of the ink system's */
  gain?: DotGainCurve;
};

/** All plates of one simulated-process set, with marks, labels, accuracy and warnings. */
export function renderSimProcessSet(input: SimRenderInput): ScreenSet {
  const { analysis: a, size, recipe, inks, label, grid } = input;
  const plan = input.sim ?? planSimProcess(grid, a, recipe);
  const canvas = canvasSpec(size, filmLayout(recipe.marks));
  const W = canvas.widthPx;
  const H = canvas.heightPx;
  const art = canvas.art;
  const area = art.width * art.height;
  const total = plan.plates.length;
  const gain = input.gain ?? dotGainFor(inks);
  const datas = plan.plates.map(() => new Uint8Array(W * H));
  const foot = new Uint8Array(area);
  const chokePx = Math.round(mmToPx(recipe.underbaseChokeMm, size.ppi));
  const ub = plan.plates.findIndex((p) => p.role === 'underbase');
  let halftonedShare: number[] = plan.plates.map(() => 0);
  if (plan.nester && plan.plates.length > 0) {
    const stats = renderSimFilms({
      areas: plan.areas,
      hard: hardBits(plan.areas, grid.width, grid.height, plan.nester),
      srcW: grid.width,
      srcH: grid.height,
      size,
      canvasWidth: W,
      artX: art.x,
      artY: art.y,
      halftone: recipe.halftone,
      gain,
      nester: plan.nester,
      underbase: ub,
      out: datas,
      foot,
    });
    halftonedShare = stats.map((st) => (st.on > 0 ? st.halftoned / st.on : 0));
    if (ub >= 0 && chokePx > 0) {
      chokeBy(view(datas[ub], W, art.x, art.y, art.width, art.height), view(foot, art.width, 0, 0, art.width, art.height), chokePx);
    }
  }

  const setName = setTitle(input.key, input.garmentNames);
  const whiteLab = roundLab(hexToLab(WHITE_INK_HEX));
  const plates: InkPlate[] = plan.plates.map((p, i) => {
    const data = datas[i];
    let on = 0;
    for (let y = 0; y < art.height; y++) {
      const row = (art.y + y) * W + art.x;
      for (let x = 0; x < art.width; x++) if (data[row + x] !== 0) on++;
    }
    const plate: InkPlate = {
      index: i + 1,
      role: p.role,
      target: { hex: p.hex, lab: p.role === 'ink' ? roundLab(hexToLab(p.hex)) : whiteLab },
      base: p.base,
      pantone: null,
      clientName: p.role === 'underbase' ? 'White underbase' : p.role === 'highlight' ? 'Highlight white' : safeClientName(p.hex),
      plate: { width: W, height: H, ppi: size.ppi, data },
      coverage: area > 0 ? on / area : 0,
      halftone: { ...recipe.halftone },
      meshSuggestion: p.role === 'underbase' ? inks.mesh.underbase : halftonedShare[i] > 0.05 ? inks.mesh.halftone : inks.mesh.solid,
    };
    drawTargets(data, canvas);
    drawLabelStrip(data, canvas, plateLabelLines(label, setName, plate, total, inks));
    return plate;
  });

  const warnings: Warning[] = [];
  const garmentName = input.garmentNames[a.reference.code] ?? a.reference.name;
  if (plates.length === 0) {
    const garments = input.garmentCodes.map((c) => input.garmentNames[c] ?? c).join(', ');
    warnings.push({ code: 'empty_print', severity: 'block', message: `Screen print: nothing prints on ${garments}. The art is the same colour as the shirt.` });
  } else {
    // with a calibrated press the films carry compensated dots: the figure is for the print, as the proof shows it
    const acc = simAccuracy(datas, plan.layers, a.reference, canvas, grid, recipe.knockoutDeltaE, printedToneOf({ method: 'sim_process', plates, canvas }, inks));
    const inkCount = plan.plates.filter((p) => p.role === 'ink').length;
    const whites = [plan.dark ? 'an underbase' : null, plan.plates.some((p) => p.role === 'highlight') ? 'a highlight white' : null].filter(Boolean);
    const what = `${inkCount} ink${inkCount === 1 ? '' : 's'}${whites.length ? ` plus ${whites.join(' and ')}` : ''}`;
    warnings.push({
      code: 'sim_process_accuracy',
      severity: 'info',
      message:
        acc.blocks > 0
          ? `${setName}: simulated process with ${what}. On ${garmentName} the proof is ΔE ${acc.mean.toFixed(1)} from the art on average, and 95% of it within ΔE ${acc.p95.toFixed(1)}.`
          : `${setName}: simulated process with ${what}.`,
    });
    warnings.push(...screenCountWarnings(setName, plates.length, inks));
    if (a.stats.knockedOut >= 0.01) {
      warnings.push({
        code: 'knocked_out',
        severity: 'info',
        message: `On ${garmentName}, ${Math.round(a.stats.knockedOut * 100)}% of the art is within ΔE ${formatNumber(recipe.knockoutDeltaE)} of the shirt colour, so the shirt shows there instead of ink.`,
      });
    }
  }
  return {
    key: input.key,
    garmentCodes: input.garmentCodes,
    needsUnderbase: plan.dark,
    method: 'sim_process',
    canvas,
    plates,
    warnings,
  };
}

function formatNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

// ---------------------------------------------------------------------------
// Accuracy and set joins
// ---------------------------------------------------------------------------

export interface SimAccuracy {
  mean: number;
  p95: number;
  /** squares compared */
  blocks: number;
}

/**
 * ΔE2000 between the art and the print the films make, over squares of
 * ENGINE_TUNING.simAccuracyBlockMm (several halftone cells, so the dots
 * average out as they do to the eye). The films are composited exactly as
 * the proof composites them; squares where neither the art nor the print
 * differs from the shirt by more than the knockout tolerance are left out.
 */
export function simAccuracy(
  plates: Uint8Array[],
  layers: ModelLayer[],
  garment: GarmentColour,
  canvas: { widthPx: number; art: { x: number; y: number; width: number; height: number } },
  grid: WorkGrid,
  knockoutDeltaE: number,
  /** the press's dot gain (printed-tone.ts), as the proof applies it; null for films that print as they are */
  tone: PrintedTone | null = null,
): SimAccuracy {
  const B = Math.max(2, Math.round(mmToPx(ENGINE_TUNING.simAccuracyBlockMm, grid.ppi)));
  const bw = Math.ceil(grid.width / B);
  const bh = Math.ceil(grid.height / B);
  const nb = bw * bh;
  const artSum = new Float64Array(nb * 3);
  const artCount = new Float64Array(nb);
  const [gr, gg, gb] = hexToRgb8(garment.hex);
  for (let y = 0; y < grid.height; y++) {
    const by = ((y / B) | 0) * bw;
    for (let x = 0; x < grid.width; x++) {
      const i = (y * grid.width + x) * 4;
      const f = grid.rgba[i + 3] / 255;
      const k = by + ((x / B) | 0);
      artSum[k * 3] += SRGB8_TO_LINEAR[Math.round(grid.rgba[i] * f + gr * (1 - f))];
      artSum[k * 3 + 1] += SRGB8_TO_LINEAR[Math.round(grid.rgba[i + 1] * f + gg * (1 - f))];
      artSum[k * 3 + 2] += SRGB8_TO_LINEAR[Math.round(grid.rgba[i + 2] * f + gb * (1 - f))];
      artCount[k]++;
    }
  }
  const g = [SRGB8_TO_LINEAR[gr], SRGB8_TO_LINEAR[gg], SRGB8_TO_LINEAR[gb]] as Vec3;
  const n = plates.length;
  const combos = new Float64Array((1 << n) * 3);
  const known = new Uint8Array(1 << n);
  const tmp: Vec3 = [0, 0, 0];
  const comboOf = (mask: number): number => {
    if (!known[mask]) {
      tmp[0] = g[0];
      tmp[1] = g[1];
      tmp[2] = g[2];
      for (let p = 0; p < n; p++) if (mask & (1 << p)) overlay(tmp, layers[p].colour, layers[p].opacity, tmp);
      combos[mask * 3] = tmp[0];
      combos[mask * 3 + 1] = tmp[1];
      combos[mask * 3 + 2] = tmp[2];
      known[mask] = 1;
    }
    return mask * 3;
  };
  const printSum = new Float64Array(nb * 3);
  const printCount = new Float64Array(nb);
  const { art, widthPx: W } = canvas;
  const colBlock = new Int32Array(art.width);
  for (let x = 0; x < art.width; x++) colBlock[x] = (Math.min(grid.width - 1, Math.floor(((x + 0.5) * grid.width) / art.width)) / B) | 0;
  const tally = tone ? new ToneTally(nb, n) : null;
  const above = tally ? new Int32Array(art.width) : null;
  for (let y = 0; y < art.height; y++) {
    const gy = Math.min(grid.height - 1, Math.floor(((y + 0.5) * grid.height) / art.height));
    const by = ((gy / B) | 0) * bw;
    const row = (art.y + y) * W + art.x;
    let left = 0;
    for (let x = 0; x < art.width; x++) {
      let mask = 0;
      for (let p = 0; p < n; p++) if (plates[p][row + x] !== 0) mask |= 1 << p;
      const k = by + colBlock[x];
      const o = comboOf(mask);
      printSum[k * 3] += combos[o];
      printSum[k * 3 + 1] += combos[o + 1];
      printSum[k * 3 + 2] += combos[o + 2];
      printCount[k]++;
      if (tally && above) {
        tally.add(k, mask, x > 0 ? left : mask, y > 0 ? above[x] : mask);
        above[x] = mask;
        left = mask;
      }
    }
  }
  const garmentLab = linearToLab(g[0], g[1], g[2]);
  const scratch = toneScratch(n);
  const delta: Vec3 = [0, 0, 0];
  const des: number[] = [];
  for (let k = 0; k < nb; k++) {
    if (artCount[k] === 0 || printCount[k] === 0) continue;
    const aLab = linearToLab(artSum[k * 3] / artCount[k], artSum[k * 3 + 1] / artCount[k], artSum[k * 3 + 2] / artCount[k]);
    let pr = printSum[k * 3] / printCount[k];
    let pg = printSum[k * 3 + 1] / printCount[k];
    let pb = printSum[k * 3 + 2] / printCount[k];
    if (tone && tally && toneShift(tone, tally, k, layers, g, scratch, delta) !== null) {
      pr = Math.max(0, pr + delta[0]);
      pg = Math.max(0, pg + delta[1]);
      pb = Math.max(0, pb + delta[2]);
    }
    const pLab = linearToLab(pr, pg, pb);
    if (deltaE2000(aLab, garmentLab) <= knockoutDeltaE && deltaE2000(pLab, garmentLab) <= knockoutDeltaE) continue;
    des.push(deltaE2000(aLab, pLab));
  }
  if (des.length === 0) return { mean: 0, p95: 0, blocks: 0 };
  des.sort((p, q) => p - q);
  return { mean: des.reduce((s, v) => s + v, 0) / des.length, p95: des[Math.min(des.length - 1, Math.floor(des.length * 0.95))], blocks: des.length };
}

/**
 * Would garment g print well from this set's screens? The work-grid
 * coverages (the films keep each tone's mean through the mesh limits),
 * printed on g with the proof's model, against the art over g. Samples about
 * 200k pixels, as joinCheck does.
 */
export function simJoinCheck(grid: WorkGrid, plan: SimProcessPlan, g: GarmentColour): JoinCheck {
  const { width: w, height: h } = grid;
  const n = w * h;
  const [gr, gg, gb] = hexToRgb8(g.hex);
  const garment: Vec3 = [SRGB8_TO_LINEAR[gr], SRGB8_TO_LINEAR[gg], SRGB8_TO_LINEAR[gb]];
  const garmentLab = linearToLab(garment[0], garment[1], garment[2]);
  const step = Math.max(1, Math.floor(Math.sqrt(n / 200000)));
  const np = plan.areas.length;
  const cov = new Float64Array(np);
  const scratch = new Float64Array(np + 1);
  const pred: Vec3 = [0, 0, 0];
  const des: number[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = y * w + x;
      let anyInk = false;
      planCoverage(plan, i, cov, scratch);
      for (let p = 0; p < np; p++) if (cov[p] > 0) anyInk = true;
      const alpha = grid.rgba[i * 4 + 3];
      if (!anyInk && alpha === 0) continue;
      const f = alpha / 255;
      const tr = SRGB8_TO_LINEAR[Math.round(grid.rgba[i * 4] * f + gr * (1 - f))];
      const tg = SRGB8_TO_LINEAR[Math.round(grid.rgba[i * 4 + 1] * f + gg * (1 - f))];
      const tb = SRGB8_TO_LINEAR[Math.round(grid.rgba[i * 4 + 2] * f + gb * (1 - f))];
      const target = linearToLab(tr, tg, tb);
      const predLab = anyInk ? (nestedCoverageColour(garment, plan.layers, cov, pred), linearToLab(pred[0], pred[1], pred[2])) : garmentLab;
      des.push(deltaE2000(target, predLab));
    }
  }
  if (des.length === 0) return { meanDeltaE: 0, p95DeltaE: 0 };
  des.sort((p, q) => p - q);
  return { meanDeltaE: des.reduce((s, v) => s + v, 0) / des.length, p95DeltaE: des[Math.min(des.length - 1, Math.floor(des.length * 0.95))] };
}
