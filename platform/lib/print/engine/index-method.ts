// Index separations (Phase 2, plan section 4.3): bright, many-colour art
// without large smooth gradients, printed as square cells, one ink per cell,
// no overlap. The dispatcher in index.ts (P2-B) calls renderIndexSet for sets
// whose method is 'index'.
//
// 1. Cells (index-cells.ts): a square grid on the film, default 200 per inch
//    (3 x 3 px at 600 ppi), with the art over the reference garment per cell;
//    anti-aliased edges fold into the side they mostly belong to.
// 2. Inks (index-palette.ts): at most the screen budget less the underbase on
//    darks (the highlight white counts as one of them when the art uses it),
//    chosen for the solids and mixes that come nearest the art; the garment
//    is a free colour.
// 3. Dither (index-dither.ts, index-mix.ts): serpentine Floyd-Steinberg, each
//    colour's cells among its own small mix of inks, picked in OKLab, error
//    carried in linear light: exactly one ink (or the bare garment) per cell.
// 4. Films: solid squares, no halftone, no traps (cells abut by design). On
//    darks the underbase sits under every ink cell, choked at the art's
//    outline by the recipe's choke rounded up to whole cells; the white is
//    the highlight white, printed last over its own underbase cells. Marks
//    and label strips are the spot films' own (render.ts, marks.ts).
// The proof needs no path of its own: proof.ts composites any films with the
// print model, and index films are just solid ink. indexJoinCheck predicts
// the print on another garment of the set, for the dispatcher's joins.
import type { GarmentColour, InkPlate, InkSystemProfile, PlateLabelInfo, PlateRole, ScreenSet, Warning } from '@/lib/print/types';
import { ABSOLUTE_MAX_SCREENS, ENGINE_TUNING, STANDARD_MAX_SCREENS, WHITE_INK_HEX } from '@/lib/print/defaults';
import { clientColourName } from '@/lib/print/colour-names';
import { SRGB8_TO_LINEAR, deltaE2000, hexToLab, hexToLinear, hexToRgb8, linearToHex, linearToLab, roundLab, type Vec3 } from './colour';
import { GARMENT } from './classify';
import { plannedPlates, type JoinCheck, type SetAnalysis, type WorkGrid } from './analyse';
import { finishEntry, type PaletteEntry } from './palette';
import { overlay, underbaseOn, type InkSystemModel } from './model';
import { drawLabelStrip, drawTargets, type LabelLines } from './marks';
import { erodeDisc, erodeSquare, fullView } from './morphology';
import { plateLabelLines, setTitle, type RenderInput } from './render';
import { canvasSpec, type PrintSize } from './units';
import { cellMm, foldEdges, indexCellPpi, indexCellPx, sampleCells, type CellGrid } from './index-cells';
import { chooseIndexPalette } from './index-palette';
import { ditherCells } from './index-dither';

export { INDEX_CELL_PPI, indexCellPpi, indexCellPx } from './index-cells';

/** An ink with fewer cells than this share of the art (or MIN_INK_CELLS) is dropped and the art dithered again: no screen for a few stray squares. */
const MIN_INK_SHARE = 2e-4;
const MIN_INK_CELLS = 9;
/** Index colour quality is judged on blocks this wide, about what the eye resolves at arm's length. */
const QUALITY_BLOCK_MM = 1;
/** Blocks further off than this (ΔE2000) are colours the inks miss... */
const QUALITY_OFF_DE = 6;
/** ... and a set with more than this share of its art in them gets a review warning. */
const QUALITY_OFF_SHARE = 0.01;

export interface IndexSeparation {
  cells: CellGrid;
  /** per cell: the entry index, or GARMENT */
  labels: Uint8Array;
  entries: PaletteEntry[];
  /** the art colour each entry stands for in the dither, linear (the white ink stands for the art's white) */
  art: Vec3[];
  /** the reference garment, linear */
  garment: Vec3;
  dark: boolean;
  /** dark sets with a highlight screen: the white prints as the highlight white over its underbase */
  highlight: boolean;
  /** dark sets: 1 for the ink cells the underbase prints under (inside the choked outline) */
  underbase: Uint8Array | null;
  /** cells of choke actually applied at the outline (whole cells, at least the recipe's choke) */
  chokeCells: number;
}

export interface IndexSeparationInput {
  grid: WorkGrid;
  analysis: Pick<SetAnalysis, 'reference' | 'dark' | 'ctx'>;
  size: PrintSize;
  recipe: RenderInput['recipe'];
}

/** Colour screens the inks may use: the budget less the underbase on darks. */
export function indexInkBudget(recipe: Pick<RenderInput['recipe'], 'maxScreens'>, dark: boolean): number {
  return Math.max(1, recipe.maxScreens - (dark ? 1 : 0));
}

/** The cells, inks and per-cell labels of an index separation, before any film is drawn. */
export function separateIndex(input: IndexSeparationInput): IndexSeparation {
  const { grid, analysis, size, recipe } = input;
  const { ctx, dark } = analysis;
  const cellPx = indexCellPx(size.ppi, indexCellPpi(recipe));
  const garment8 = hexToRgb8(analysis.reference.hex);
  const cells = sampleCells(grid, garment8, ctx.garmentLab, ctx.knockoutDeltaE, size, cellPx);
  foldEdges(cells, garment8);
  let inks = chooseIndexPalette(cells, ctx, indexInkBudget(recipe, dark), recipe.lockedInks).inks;
  let bodyCells = 0;
  for (let i = 0; i < cells.body.length; i++) bodyCells += cells.body[i];
  const minCells = Math.max(MIN_INK_CELLS, Math.ceil(MIN_INK_SHARE * bodyCells));
  const locked = !!recipe.lockedInks && recipe.lockedInks.length > 0;
  const counted = (l: Uint8Array): Float64Array => {
    const counts = new Float64Array(inks.length);
    for (let i = 0; i < l.length; i++) if (l[i] !== GARMENT) counts[l[i]]++;
    return counts;
  };
  let labels = ditherCells(
    cells,
    inks.map((k) => k.art),
    ctx.garment,
  );
  // an ink the dither hardly uses costs a screen for a few stray squares: drop it and dither again
  for (let pass = 0; pass < 4 && !locked; pass++) {
    const counts = counted(labels);
    const keep = inks.map((_, k) => counts[k] >= minCells);
    // all inks rare (a tiny print, or huge cells): dropping them all would print nothing, so keep them
    if (keep.every(Boolean) || !keep.some(Boolean)) break;
    inks = inks.filter((_, k) => keep[k]);
    labels = ditherCells(
      cells,
      inks.map((k) => k.art),
      ctx.garment,
    );
  }
  // never a film with nothing on it
  const counts = counted(labels);
  if (counts.some((c) => c === 0)) {
    const remap = new Uint8Array(256).fill(GARMENT);
    let next = 0;
    inks.forEach((_, k) => {
      if (counts[k] > 0) remap[k] = next++;
    });
    for (let i = 0; i < labels.length; i++) labels[i] = labels[i] === GARMENT ? GARMENT : remap[labels[i]];
    inks = inks.filter((_, k) => counts[k] > 0);
  }
  const entries = inks.map((k) => finishEntry(k.kind, k.hex, k.share, ctx));
  const chokeCells = dark ? chokeInCells(recipe.underbaseChokeMm, cellMm(cells)) : 0;
  const underbase = dark ? underbaseCells(cells, labels, recipe.underbaseChokeMm) : null;
  return {
    cells,
    labels,
    entries,
    art: inks.map((k) => k.art),
    garment: [ctx.garment[0], ctx.garment[1], ctx.garment[2]],
    dark,
    highlight: dark && ctx.highlightWhite,
    underbase,
    chokeCells,
  };
}

/** The choke as whole cells: the first cell boundary at or past the recipe's distance. */
function chokeInCells(chokeMm: number, cell: number): number {
  return chokeMm > 0 ? Math.ceil(chokeMm / cell - 1e-9) : 0;
}

/**
 * Ink cells the underbase prints under: every one whose square lies at least
 * the choke inside the art's outline (the edge of the bare garment around and
 * inside the art, and the print area's edge). Cells the dither left bare
 * inside the art are holes in the underbase, not outline: choking around each
 * of them would strip the base from every dithered colour.
 */
function underbaseCells(cells: CellGrid, labels: Uint8Array, chokeMm: number): Uint8Array {
  const { cw, ch, body } = cells;
  let keep: Uint8Array;
  if (chokeMm > 0) {
    // squares at least chokeMm apart edge to edge: erode by the 3 x 3 square, then by the disc of the remaining distance
    const r = chokeMm / cellMm(cells);
    const sq = erodeSquare(body, cw, ch, 1);
    keep = new Uint8Array(cw * ch);
    erodeDisc(fullView(sq, cw, ch), Math.max(0, r - 1e-6), fullView(keep, cw, ch));
  } else {
    keep = body;
  }
  const out = new Uint8Array(cw * ch);
  for (let i = 0; i < out.length; i++) out[i] = keep[i] !== 0 && labels[i] !== GARMENT ? 1 : 0;
  return out;
}

function formatNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

/** The screen line on an index film. */
export function indexScreenText(cellPpi: number): string {
  return `Index ${formatNumber(cellPpi)} ppi`;
}

/**
 * The label strip of an index film: the spot strip (render.ts), with the
 * screen replaced by the cell grid (an index film has no halftone screen).
 * Index plates carry their grid in `halftone` (lpi = cells per inch, 0°), so
 * a relabel (index.ts relabelPlate) can rebuild the same strip from the plate.
 */
export function indexPlateLabelLines(
  label: PlateLabelInfo,
  setName: string,
  plate: Pick<InkPlate, 'index' | 'role' | 'base' | 'target' | 'halftone'>,
  total: number,
  inks: InkSystemProfile,
  inkName?: string,
): LabelLines {
  const lines = plateLabelLines(label, setName, plate, total, inks, inkName);
  const cut = lines.right.lastIndexOf(' · ');
  const what = cut >= 0 ? lines.right.slice(0, cut) : lines.right;
  return { ...lines, right: `${what} · ${indexScreenText(plate.halftone.lpi)}` };
}

function safeClientName(hex: string): string | undefined {
  try {
    return clientColourName(hex);
  } catch {
    // WP6 owns the names; a missing table must not stop a separation
    return undefined;
  }
}

/** All films of one index screen set, with marks, labels and warnings. */
export function renderIndexSet(input: RenderInput & { grid: WorkGrid; separation?: IndexSeparation }): ScreenSet {
  const { analysis: a, size, recipe, inks, label } = input;
  // The joins may have separated the set already (index.ts): the same inputs, so the same cells and inks.
  const sep = input.separation ?? separateIndex({ grid: input.grid, analysis: a, size, recipe });
  const { cells, labels, entries, underbase } = sep;
  const canvas = canvasSpec(size, recipe.marks.marginMm);
  const W = canvas.widthPx;
  const H = canvas.heightPx;
  const art = canvas.art;
  const plan = plannedPlates({ entries, dark: a.dark, ctx: a.ctx });
  const total = plan.length;
  const datas = plan.map(() => new Uint8Array(W * H));
  const on = new Float64Array(plan.length);
  // the colour plate each label prints on (-1: none, e.g. the white on darks without a highlight screen)
  const plateOf = new Int16Array(256).fill(-1);
  plan.forEach((p, i) => {
    if (p.key.role !== 'underbase') plateOf[p.key.entry] = i;
  });
  const ub = plan.findIndex((p) => p.key.role === 'underbase');

  const { cw, ch, cellPx } = cells;
  const touched = new Uint8Array(plan.length);
  for (let cy = 0; cy < ch; cy++) {
    const y0 = cy * cellPx;
    const rows = Math.min(cellPx, cells.heightPx - y0);
    const first = (art.y + y0) * W + art.x;
    touched.fill(0);
    for (let cx = 0; cx < cw; cx++) {
      const i = cy * cw + cx;
      const L = labels[i];
      if (L === GARMENT) continue;
      const x0 = cx * cellPx;
      const x1 = Math.min(x0 + cellPx, cells.widthPx);
      const pi = plateOf[L];
      if (pi >= 0) {
        datas[pi].fill(255, first + x0, first + x1);
        touched[pi] = 1;
        on[pi] += (x1 - x0) * rows;
      }
      if (ub >= 0 && underbase && underbase[i]) {
        datas[ub].fill(255, first + x0, first + x1);
        touched[ub] = 1;
        on[ub] += (x1 - x0) * rows;
      }
    }
    for (let pi = 0; pi < plan.length; pi++) {
      if (!touched[pi]) continue;
      const d = datas[pi];
      for (let r = 1; r < rows; r++) d.copyWithin(first + r * W, first, first + cells.widthPx);
    }
  }

  const setName = setTitle(input.key, input.garmentNames);
  const whiteLab = roundLab(hexToLab(WHITE_INK_HEX));
  const area = art.width * art.height;
  const halftone = { ...recipe.halftone, lpi: cells.cellPpi, angleDeg: 0 };
  const plates: InkPlate[] = plan.map((p, i) => {
    const entry = p.key.role === 'underbase' ? null : entries[p.key.entry];
    const role: PlateRole = p.key.role;
    const colourInk = role === 'ink' && entry !== null;
    const hex = colourInk ? entry.hex : WHITE_INK_HEX;
    const base = role === 'underbase' ? inks.underbase.ink : role === 'highlight' ? inks.highlightWhite.ink : (entry?.base ?? inks.bases.light);
    const plate: InkPlate = {
      index: i + 1,
      role,
      target: { hex, lab: colourInk ? roundLab(entry.lab) : whiteLab },
      base,
      pantone: null,
      clientName: role === 'underbase' ? 'White underbase' : role === 'highlight' ? 'Highlight white' : safeClientName(hex),
      plate: { width: W, height: H, ppi: size.ppi, data: datas[i] },
      coverage: area > 0 ? on[i] / area : 0,
      halftone: { ...halftone },
      // index squares need the finer mesh to hold; the underbase is the usual one
      meshSuggestion: role === 'underbase' ? inks.mesh.underbase : inks.mesh.halftone,
    };
    drawTargets(plate.plate.data, canvas, recipe.marks.targetOffsetMm);
    drawLabelStrip(plate.plate.data, canvas, recipe.marks.targetOffsetMm, indexPlateLabelLines(label, setName, plate, total, inks));
    return plate;
  });

  return {
    key: input.key,
    garmentCodes: input.garmentCodes,
    needsUnderbase: a.dark,
    method: 'index',
    canvas,
    plates,
    warnings: indexWarnings(input, sep, plates),
  };
}

// ---------------------------------------------------------------------------
// Quality: how close the dither comes to the art, block by block
// ---------------------------------------------------------------------------

export interface IndexQuality {
  /** ΔE2000 between the art and the print, averaged over blocks of about 1 mm */
  meanDeltaE: number;
  p95DeltaE: number;
  maxDeltaE: number;
  /** share of the blocks more than QUALITY_OFF_DE off */
  offShare: number;
  /** the art colour of the worst block wholly inside the art, when one is off */
  worstHex: string | null;
  blocks: number;
}

/**
 * Per cell colour as printed. 'art': each ink as the art colour it stands
 * for (the separation's own accuracy). 'print': the print model on the
 * reference garment (opaque or neutral base, the underbase where it is, the
 * highlight white), which is what the proof shows.
 */
function cellColours(sep: IndexSeparation, mode: 'art' | 'print', sys: InkSystemModel | null, g: Vec3 = sep.garment): { withBase: Vec3[]; bare: Vec3[] } {
  if (mode === 'art' || !sys) return { withBase: sep.art, bare: sep.art };
  const ub = underbaseOn(sys, g);
  const withBase: Vec3[] = [];
  const bare: Vec3[] = [];
  for (const e of sep.entries) {
    if (e.kind === 'white' && sep.dark) {
      // the underbase, then the highlight white when there is one
      withBase.push(sep.highlight ? overlay(ub, sys.white, sys.highlightOpacity, [0, 0, 0]) : ub);
      bare.push(sep.highlight ? overlay(g, sys.white, sys.highlightOpacity, [0, 0, 0]) : g);
      continue;
    }
    withBase.push(overlay(sep.dark ? ub : g, e.lin, e.opacity, [0, 0, 0]));
    bare.push(overlay(g, e.lin, e.opacity, [0, 0, 0]));
  }
  return { withBase, bare };
}

export function indexQuality(sep: IndexSeparation, mode: 'art' | 'print' = 'art', sys: InkSystemModel | null = null, blockMm = QUALITY_BLOCK_MM): IndexQuality {
  const { cells, labels } = sep;
  const { cw, ch, rgb, body } = cells;
  const bs = Math.max(1, Math.round(blockMm / cellMm(cells)));
  const { withBase, bare } = cellColours(sep, mode, sys);
  const g = sep.garment;
  const des: number[] = [];
  let worst = QUALITY_OFF_DE;
  let worstHex: string | null = null;
  for (let by = 0; by < ch; by += bs) {
    for (let bx = 0; bx < cw; bx += bs) {
      let n = 0;
      let inside = 0;
      const t = [0, 0, 0];
      const p = [0, 0, 0];
      for (let y = by; y < Math.min(ch, by + bs); y++) {
        for (let x = bx; x < Math.min(cw, bx + bs); x++) {
          const i = y * cw + x;
          n++;
          inside += body[i];
          t[0] += SRGB8_TO_LINEAR[rgb[i * 3]];
          t[1] += SRGB8_TO_LINEAR[rgb[i * 3 + 1]];
          t[2] += SRGB8_TO_LINEAR[rgb[i * 3 + 2]];
          const L = labels[i];
          const c = L === GARMENT ? g : sep.underbase && !sep.underbase[i] ? bare[L] : withBase[L];
          p[0] += c[0];
          p[1] += c[1];
          p[2] += c[2];
        }
      }
      if (inside * 2 < n) continue;
      const de = deltaE2000(linearToLab(t[0] / n, t[1] / n, t[2] / n), linearToLab(p[0] / n, p[1] / n, p[2] / n));
      des.push(de);
      if (inside === n && de > worst) {
        worst = de;
        worstHex = linearToHex(t[0] / n, t[1] / n, t[2] / n);
      }
    }
  }
  if (des.length === 0) return { meanDeltaE: 0, p95DeltaE: 0, maxDeltaE: 0, offShare: 0, worstHex: null, blocks: 0 };
  des.sort((x, y) => x - y);
  let off = 0;
  for (const de of des) if (de > QUALITY_OFF_DE) off++;
  return {
    meanDeltaE: des.reduce((s, v) => s + v, 0) / des.length,
    p95DeltaE: des[Math.min(des.length - 1, Math.floor(des.length * 0.95))],
    maxDeltaE: des[des.length - 1],
    offShare: off / des.length,
    worstHex,
    blocks: des.length,
  };
}

/**
 * Would garment g print well from these index films? The films print on g
 * as they are, and the dither shows g wherever it chose the reference
 * garment, so the dithered shades shift with the shirt. Predicts the print on
 * g with the print model and compares it with the art over g in blocks of
 * about 1 mm: the index counterpart of analyse.ts joinCheck, for the
 * dispatcher's set joins (index.ts, with joins()).
 */
export function indexJoinCheck(sep: IndexSeparation, grid: WorkGrid, size: PrintSize, garment: GarmentColour, sys: InkSystemModel, knockoutDeltaE: number): JoinCheck {
  const g = hexToLinear(garment.hex);
  const gLab = linearToLab(g[0], g[1], g[2]);
  // the art over g as the artist would see it, on the same cell grid
  const target = sampleCells(grid, hexToRgb8(garment.hex), gLab, knockoutDeltaE, size, sep.cells.cellPx);
  const { cw, ch } = sep.cells;
  const bs = Math.max(1, Math.round(QUALITY_BLOCK_MM / cellMm(sep.cells)));
  const { withBase, bare } = cellColours(sep, 'print', sys, g);
  const des: number[] = [];
  for (let by = 0; by < ch; by += bs) {
    for (let bx = 0; bx < cw; bx += bs) {
      let n = 0;
      let live = 0;
      const t = [0, 0, 0];
      const p = [0, 0, 0];
      for (let y = by; y < Math.min(ch, by + bs); y++) {
        for (let x = bx; x < Math.min(cw, bx + bs); x++) {
          const i = y * cw + x;
          n++;
          const L = sep.labels[i];
          if (L !== GARMENT || target.body[i]) live++;
          t[0] += SRGB8_TO_LINEAR[target.rgb[i * 3]];
          t[1] += SRGB8_TO_LINEAR[target.rgb[i * 3 + 1]];
          t[2] += SRGB8_TO_LINEAR[target.rgb[i * 3 + 2]];
          const c = L === GARMENT ? g : sep.underbase && !sep.underbase[i] ? bare[L] : withBase[L];
          p[0] += c[0];
          p[1] += c[1];
          p[2] += c[2];
        }
      }
      if (live === 0) continue;
      des.push(deltaE2000(linearToLab(t[0] / n, t[1] / n, t[2] / n), linearToLab(p[0] / n, p[1] / n, p[2] / n)));
    }
  }
  if (des.length === 0) return { meanDeltaE: 0, p95DeltaE: 0 };
  des.sort((x, y) => x - y);
  return { meanDeltaE: des.reduce((s, v) => s + v, 0) / des.length, p95DeltaE: des[Math.min(des.length - 1, Math.floor(des.length * 0.95))] };
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

/** Printing cells in art one cell wide: bare garment on both sides, across or down. */
function thinCells(cells: CellGrid): number {
  const { cw, ch, body } = cells;
  const bare = (x: number, y: number): boolean => x < 0 || y < 0 || x >= cw || y >= ch || body[y * cw + x] === 0;
  let thin = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!body[y * cw + x]) continue;
      if ((bare(x - 1, y) && bare(x + 1, y)) || (bare(x, y - 1) && bare(x, y + 1))) thin++;
    }
  }
  return thin;
}

function indexWarnings(input: RenderInput, sep: IndexSeparation, plates: InkPlate[]): Warning[] {
  const { analysis: a, recipe, inks, garmentNames } = input;
  const out: Warning[] = [];
  const setName = setTitle(input.key, garmentNames);
  const screens = plates.length;
  if (screens > inks.pressHeads) {
    out.push({ code: 'press_heads', severity: 'review', message: `${setName}: ${screens} screens, more than the ${inks.pressHeads} heads on the press. Plan the run for it.` });
  }
  if (screens > STANDARD_MAX_SCREENS) {
    const extra = screens - STANDARD_MAX_SCREENS;
    out.push({ code: 'extra_screens', severity: 'info', message: `${setName}: ${screens} screens, ${extra} above the standard ${STANDARD_MAX_SCREENS}. A screen-printed run pays €${extra} per piece more.` });
  }
  for (const e of sep.entries) {
    if (e.kind !== 'ink') continue;
    const de = deltaE2000(linearToLab(e.appearance[0], e.appearance[1], e.appearance[2]), a.ctx.garmentLab);
    if (de < ENGINE_TUNING.lowContrastDeltaE) {
      const garment = garmentNames[a.reference.code] ?? a.reference.name;
      out.push({ code: 'low_contrast_ink', severity: 'review', message: `${safeClientName(e.hex) ?? 'An ink'} (${e.hex}) barely shows on ${garment} (ΔE ${de.toFixed(1)}).` });
    }
  }
  const garments = input.garmentCodes.map((c) => garmentNames[c] ?? c).join(', ');
  if (plates.length === 0) {
    out.push({ code: 'empty_print', severity: 'block', message: `Screen print: nothing prints on ${garments}. The art is the same colour as the shirt.` });
    return out;
  }
  const thinMm2 = thinCells(sep.cells) * cellMm(sep.cells) ** 2;
  if (thinMm2 >= ENGINE_TUNING.thinLineMinAreaMm2) {
    out.push({
      code: 'thin_lines',
      severity: 'review',
      message: `${setName}: ${formatNumber(Math.round(thinMm2 * 10) / 10)} mm² of the art is lines one index cell (${formatNumber(Math.round(cellMm(sep.cells) * 100) / 100)} mm) wide or finer. They print broken and may not hold in the screen: thicken them, or print this as spot.`,
    });
  }
  if (a.stats.knockedOut >= 0.01) {
    out.push({
      code: 'knocked_out',
      severity: 'info',
      message: `On ${garmentNames[a.reference.code] ?? a.reference.name}, ${Math.round(a.stats.knockedOut * 100)}% of the art is within ΔE ${formatNumber(recipe.knockoutDeltaE)} of the shirt colour, so the shirt shows there instead of ink.`,
    });
  }
  const q = indexQuality(sep);
  if (q.offShare > QUALITY_OFF_SHARE) {
    const colours = sep.entries.filter((e) => e.kind === 'ink').length;
    const which = q.worstHex ? ` (the worst is ${safeClientName(q.worstHex) ?? 'a colour'}, ${q.worstHex}, ΔE ${q.maxDeltaE.toFixed(1)} off)` : '';
    const more = recipe.maxScreens < ABSOLUTE_MAX_SCREENS ? ' More screens would hold it.' : '';
    out.push({
      code: 'index_colour_loss',
      severity: 'review',
      message: `${setName}: ${Math.round(q.offShare * 100)}% of the art is more than ΔE ${QUALITY_OFF_DE} off with ${colours} index inks${which}: no mix of them reaches it.${more}`,
    });
  }
  return out;
}
