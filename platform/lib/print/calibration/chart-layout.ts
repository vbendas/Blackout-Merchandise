// Where everything is on the dot-gain test chart, in millimetres. The film
// generator (chart.ts) draws from this and the scan reader (scan.ts) reads
// from it, so the two can never disagree about where a patch is.
//
// The chart is a fixed plan with one band per ink kind, always in the same
// place (a film carries only its own band):
//
//   ┌ TL ──── title ────── top ───── subtitle ─── TR ┐   the chart area, 182 x 165 mm
//   │                                                 │   marks: 4 corner fiducials (the
//   │   band 1  UNDERBASE WHITE                       │   scan reader's frame; TL is bigger,
//   │   [blank][  0][  5][ 10] ... [ 50]              │   so a scan can't be read upside
//   │   [solid][ 55][ 60][ 65] ... [100][blank]       │   down) and 4 smaller check marks
//   │   band 2  COLOUR BASE ...                       │   at the middle of each edge (the
//   │   band 3  HIGHLIGHT WHITE ...                   │   reader compares where they are
//   │                                                 │   with where the corners say)
//   └ BL ──── label ─────  bottom ──── label ─── BR ┘
//
// Each band is 12 columns x 2 rows of 10 mm patches (12 mm across, 15 mm down:
// the 5 mm under each patch carries its label). Column 0 holds the two
// references, the bare garment (0%) above and the solid ink (100%) below; the
// 21 wedge steps 0, 5 ... 100% follow; the last cell is a second bare-garment
// patch, which tells the reader whether the garment itself is even.
//
// A halftone patch is only measured inside a window that spans a whole number
// of dot cells in both screen directions. Averaging a periodic pattern over
// whole periods gives the same answer wherever the window sits, so the reading
// does not depend on how the scan happens to cut the dots at the patch's edge,
// or on a fraction of a millimetre of misregistration.
//
// Pure and client-safe.
import type { CanvasSpec } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM, DEFAULT_RECIPE } from '@/lib/print/defaults';
import { DOT_GAIN_LIMITS } from './profile';

export const INK_KINDS = ['underbase', 'base', 'highlight'] as const;
export type InkKind = (typeof INK_KINDS)[number];

export const INK_KIND_LABELS: Record<InkKind, string> = {
  underbase: 'Underbase white',
  base: 'Colour base',
  highlight: 'Highlight white',
};

/** Wedge steps in percent of the film: 0, 5 ... 100. */
export const WEDGE_STEPS: readonly number[] = Array.from({ length: 21 }, (_, i) => i * 5);

export function isInkKind(value: unknown): value is InkKind {
  return (INK_KINDS as readonly unknown[]).includes(value);
}

export const CHART_GEOMETRY = {
  patchMm: 10,
  pitchXMm: 12,
  rowPitchMm: 15,
  columns: 12,
  rowsPerBand: 2,
  fieldLeftMm: 20,
  topZoneMm: 26,
  bandHeaderMm: 5,
  bandGapMm: 4,
  bottomZoneMm: 26,
  /** a measuring window stays this far inside its patch */
  windowInsetMm: 1.2,
  /** film margin round the chart area, and the registration targets' distance from it: the same as production films */
  marginMm: 25,
  targetOffsetMm: 15,
} as const;

const G = CHART_GEOMETRY;

/** The chart area: 182 mm wide. */
export const CHART_WIDTH_MM = 2 * G.fieldLeftMm + G.columns * G.pitchXMm - (G.pitchXMm - G.patchMm);
export const BAND_HEIGHT_MM = G.bandHeaderMm + G.rowsPerBand * G.rowPitchMm;
/** The chart area: 165 mm tall. */
export const CHART_HEIGHT_MM = G.topZoneMm + INK_KINDS.length * BAND_HEIGHT_MM + (INK_KINDS.length - 1) * G.bandGapMm + G.bottomZoneMm;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MarkId = 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom' | 'left' | 'right';

export interface ChartMark {
  id: MarkId;
  /** the four corners frame the chart for the reader; the others only check the frame */
  role: 'corner' | 'check';
  /** solid square, centre in mm from the chart area's top left */
  centre: Point;
  sizeMm: number;
}

const MARK_INSET = 10;

export const CHART_MARKS: readonly ChartMark[] = [
  { id: 'tl', role: 'corner', centre: { x: MARK_INSET, y: MARK_INSET }, sizeMm: 12 },
  { id: 'tr', role: 'corner', centre: { x: CHART_WIDTH_MM - MARK_INSET, y: MARK_INSET }, sizeMm: 8 },
  { id: 'bl', role: 'corner', centre: { x: MARK_INSET, y: CHART_HEIGHT_MM - MARK_INSET }, sizeMm: 8 },
  { id: 'br', role: 'corner', centre: { x: CHART_WIDTH_MM - MARK_INSET, y: CHART_HEIGHT_MM - MARK_INSET }, sizeMm: 8 },
  { id: 'top', role: 'check', centre: { x: CHART_WIDTH_MM / 2, y: MARK_INSET }, sizeMm: 6 },
  { id: 'bottom', role: 'check', centre: { x: CHART_WIDTH_MM / 2, y: CHART_HEIGHT_MM - MARK_INSET }, sizeMm: 6 },
  { id: 'left', role: 'check', centre: { x: MARK_INSET, y: CHART_HEIGHT_MM / 2 }, sizeMm: 6 },
  { id: 'right', role: 'check', centre: { x: CHART_WIDTH_MM - MARK_INSET, y: CHART_HEIGHT_MM / 2 }, sizeMm: 6 },
] as const;

export const CORNER_MARKS = CHART_MARKS.filter((m) => m.role === 'corner');
export const CHECK_MARKS = CHART_MARKS.filter((m) => m.role === 'check');

export type PatchKind = 'garment' | 'solid' | 'step' | 'garment2';

export interface ChartPatch {
  film: InkKind;
  kind: PatchKind;
  /** the wedge step in percent, for kind 'step'; otherwise null */
  step: number | null;
  /** coverage on the film, 0..1 */
  coverage: number;
  col: number;
  row: number;
  /** the patch, in mm from the chart area's top left */
  rect: Rect;
  centre: Point;
  /** what is printed under it */
  label: string;
}

/** Top of band i (0 = underbase, 1 = colour base, 2 = highlight), in mm from the chart area's top. */
export function bandTopMm(index: number): number {
  return G.topZoneMm + index * (BAND_HEIGHT_MM + G.bandGapMm);
}

function patchRect(film: InkKind, col: number, row: number): Rect {
  return {
    x: G.fieldLeftMm + col * G.pitchXMm,
    y: bandTopMm(INK_KINDS.indexOf(film)) + G.bandHeaderMm + row * G.rowPitchMm,
    w: G.patchMm,
    h: G.patchMm,
  };
}

let cached: ChartPatch[] | null = null;

/** Every patch of every band, in reading order within each band: the two references, then the wedge, then the second garment patch. */
export function chartPatches(): readonly ChartPatch[] {
  if (cached) return cached;
  const out: ChartPatch[] = [];
  for (const film of INK_KINDS) {
    const make = (kind: PatchKind, col: number, row: number, step: number | null, coverage: number, label: string): ChartPatch => {
      const rect = patchRect(film, col, row);
      return { film, kind, step, coverage, col, row, rect, centre: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }, label };
    };
    out.push(make('garment', 0, 0, null, 0, 'BLANK'));
    out.push(make('solid', 0, 1, null, 1, 'SOLID'));
    WEDGE_STEPS.forEach((step, k) => {
      // steps 0..50 fill row 0 from column 1; steps 55..100 fill row 1
      const row = k < 11 ? 0 : 1;
      const col = k < 11 ? 1 + k : 1 + (k - 11);
      out.push(make('step', col, row, step, step / 100, String(step)));
    });
    out.push(make('garment2', G.columns - 1, 1, null, 0, 'BLANK'));
  }
  cached = out;
  return out;
}

export function patchesOf(film: InkKind): ChartPatch[] {
  return chartPatches().filter((p) => p.film === film);
}

/** The wedge steps of a film, 0 to 100 in order. */
export function wedgeOf(film: InkKind): ChartPatch[] {
  return patchesOf(film).filter((p) => p.kind === 'step');
}

// ---------------------------------------------------------------------------
// The screen, and the measuring window
// ---------------------------------------------------------------------------

/** Cells per millimetre of a screen. */
export function cellsPerMm(lpi: number): number {
  return lpi / 25.4;
}

/**
 * Position on the dot lattice of a point of the chart (mm): the lattice
 * coordinates engine/halftone.ts screenRow() uses, so a whole number of
 * lattice units is a whole number of dots. Anchored at the chart's top left;
 * only differences matter.
 */
export function latticeOf(point: Point, lpi: number, angleDeg: number): { s: number; t: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const k = cellsPerMm(lpi);
  return { s: (point.x * Math.cos(rad) - point.y * Math.sin(rad)) * k, t: (point.x * Math.sin(rad) + point.y * Math.cos(rad)) * k };
}

/** The chart position (mm) of a lattice position: the inverse of latticeOf. */
export function chartPointOfLattice(s: number, t: number, lpi: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const k = cellsPerMm(lpi);
  return { x: (s * Math.cos(rad) + t * Math.sin(rad)) / k, y: (-s * Math.sin(rad) + t * Math.cos(rad)) / k };
}

/**
 * Cells along each side of a measuring window: the biggest whole, even number
 * of dots whose (tilted) square still fits inside the patch with its inset.
 * Even, so the window splits into four quarters that are whole periods too and
 * can be compared. Never fewer than four.
 */
export function windowCells(lpi: number, angleDeg: number): number {
  const usable = G.patchMm - 2 * G.windowInsetMm;
  const folded = ((angleDeg % 90) + 90) % 90;
  const a = ((Math.min(folded, 90 - folded) * Math.PI) / 180) || 0;
  const reach = Math.cos(a) + Math.sin(a);
  const fit = Math.floor(usable / ((25.4 / lpi) * reach));
  const even = fit - (fit % 2);
  return Math.max(4, even);
}

/** The four corners of a patch's window in chart mm, going round. */
export function windowCorners(centre: Point, lpi: number, angleDeg: number): Point[] {
  const n = windowCells(lpi, angleDeg);
  const c = latticeOf(centre, lpi, angleDeg);
  const h = n / 2;
  return [
    chartPointOfLattice(c.s - h, c.t - h, lpi, angleDeg),
    chartPointOfLattice(c.s + h, c.t - h, lpi, angleDeg),
    chartPointOfLattice(c.s + h, c.t + h, lpi, angleDeg),
    chartPointOfLattice(c.s - h, c.t + h, lpi, angleDeg),
  ];
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface ChartSettings {
  lpi: number;
  angleDeg: number;
  /** film resolution */
  ppi: number;
  /** mesh the chart is meant to be printed through; printed on the films and saved with the measurement */
  mesh: number;
  dot: 'round' | 'ellipse';
  /** the films to make, in press order; each one carries its band and nothing else of the wedges */
  films: InkKind[];
}

export const CHART_PPI_RANGE = { min: 300, max: 1200 } as const;
/** a dot cell needs this many film pixels across to be a dot */
export const MIN_PIXELS_PER_CELL = 5;

/** The house screen: the recipe's ruling, angle and film resolution, the ink system's halftone mesh. The colour base and the underbase are the films that matter first. */
export function defaultChartSettings(mesh: number = DEFAULT_INK_SYSTEM.mesh.halftone): ChartSettings {
  return {
    lpi: DEFAULT_RECIPE.halftone.lpi,
    angleDeg: DEFAULT_RECIPE.halftone.angleDeg,
    ppi: DEFAULT_RECIPE.screenPpi,
    mesh,
    dot: 'round',
    films: ['underbase', 'base'],
  };
}

export type SettingsCheck = { ok: true; value: ChartSettings } | { ok: false; error: string };

function numberIn(raw: unknown, label: string, min: number, max: number, whole = false): { ok: true; value: number } | { ok: false; error: string } {
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, error: `${label} needs a number.` };
  if (whole && !Number.isInteger(value)) return { ok: false, error: `${label} is a whole number.` };
  if (value < min || value > max) return { ok: false, error: `${label} goes from ${min} to ${max}.` };
  return { ok: true, value };
}

/** Chart settings from a form or a query string, checked in words. Missing fields take the house screen. */
export function checkChartSettings(raw: Record<string, unknown>, fallback: ChartSettings = defaultChartSettings()): SettingsCheck {
  const pick = <K extends keyof ChartSettings>(key: K) => (raw[key] === undefined || raw[key] === '' ? fallback[key] : raw[key]);

  const lpi = numberIn(pick('lpi'), 'Lines per inch', DOT_GAIN_LIMITS.lpi.min, DOT_GAIN_LIMITS.lpi.max);
  if (!lpi.ok) return lpi;
  const angleDeg = numberIn(pick('angleDeg'), 'The screen angle', DOT_GAIN_LIMITS.angleDeg.min, DOT_GAIN_LIMITS.angleDeg.max);
  if (!angleDeg.ok) return angleDeg;
  const ppi = numberIn(pick('ppi'), 'The film resolution', CHART_PPI_RANGE.min, CHART_PPI_RANGE.max, true);
  if (!ppi.ok) return ppi;
  const mesh = numberIn(pick('mesh'), 'The mesh', DOT_GAIN_LIMITS.mesh.min, DOT_GAIN_LIMITS.mesh.max, true);
  if (!mesh.ok) return mesh;
  if (ppi.value / lpi.value < MIN_PIXELS_PER_CELL) {
    return { ok: false, error: `${lpi.value} lines per inch is too fine to image at ${ppi.value} ppi: a dot needs at least ${MIN_PIXELS_PER_CELL} pixels across.` };
  }

  const dot = pick('dot');
  if (dot !== 'round' && dot !== 'ellipse') return { ok: false, error: 'The dot is round or elliptical.' };

  const filmsRaw = pick('films');
  const list = Array.isArray(filmsRaw) ? filmsRaw : typeof filmsRaw === 'string' ? filmsRaw.split(',').map((s) => s.trim()).filter(Boolean) : null;
  if (!list || !list.every(isInkKind)) return { ok: false, error: 'Pick the films from underbase, base and highlight.' };
  // Press order, each once.
  const films = INK_KINDS.filter((kind) => list.includes(kind));
  if (films.length === 0) return { ok: false, error: 'Pick at least one film to make.' };

  return { ok: true, value: { lpi: lpi.value, angleDeg: angleDeg.value, ppi: ppi.value, mesh: mesh.value, dot, films } };
}

// ---------------------------------------------------------------------------
// The film canvas
// ---------------------------------------------------------------------------

export function mmToPx(mm: number, ppi: number): number {
  return (mm / 25.4) * ppi;
}

/** The film: the chart area plus the production margin on every side, so the registration targets and the label strip sit where they do on any film. */
export function chartCanvas(ppi: number): CanvasSpec {
  const margin = Math.round(mmToPx(G.marginMm, ppi));
  const width = Math.round(mmToPx(CHART_WIDTH_MM, ppi));
  const height = Math.round(mmToPx(CHART_HEIGHT_MM, ppi));
  return { widthPx: width + 2 * margin, heightPx: height + 2 * margin, ppi, marginMm: G.marginMm, art: { x: margin, y: margin, width, height } };
}
