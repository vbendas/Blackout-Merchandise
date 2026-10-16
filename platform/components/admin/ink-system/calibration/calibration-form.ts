// What the calibration page does with what staff give it: typed readings and
// the points of a scanned chart become the points of one curve, with the
// problems in words. Pure and client-safe; the page previews with it and the
// server action checks again on what it is sent.
import type { CurvePoint } from '@/lib/print/calibration/curve';
import type { DotGainInput } from '@/lib/print/calibration/profile';
import { coverageFromReadings, type ReadingUnit } from '@/lib/print/calibration/murray-davies';
import { INK_KIND_LABELS, type InkKind } from '@/lib/print/calibration/chart-layout';
import type { ScanReading } from '@/lib/print/calibration/scan';

/** The wedge steps staff type: 5 to 95 %. The two ends are the garment and the solid, which are fixed. */
export const ENTRY_STEPS: readonly number[] = Array.from({ length: 19 }, (_, i) => (i + 1) * 5);

/** 0.456 to '45.6'. */
export function percentText(fraction: number): string {
  return String(Math.round(fraction * 1000) / 10);
}

/** What was typed in a box: a number (a comma works as a decimal point, a trailing % is ignored), null for a blank box, NaN for anything else. */
export function parseTyped(text: string): number | null {
  const cleaned = text.trim().replace(/%$/, '').trim().replace(',', '.');
  if (cleaned === '') return null;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

export interface TypedEntries {
  unit: ReadingUnit;
  /** the bare garment's reading, for every unit but dot area */
  garment: string;
  /** the solid's reading, for every unit but dot area */
  solid: string;
  /** the reading at each step, keyed by the step in percent ('45') */
  values: Record<string, string>;
}

export function emptyEntries(unit: ReadingUnit = 'dot_area'): TypedEntries {
  return { unit, garment: '', solid: '', values: {} };
}

export interface FromEntries {
  /** film coverage and measured coverage, 0..1, one for each box filled in */
  points: CurvePoint[];
  /** what is wrong, in words; with any of these the points can't be used */
  problems: string[];
  /** how many boxes were filled in */
  filled: number;
}

/** The typed readings as points of the curve, converted to dot area when they are densities, L* or reflectances. */
export function pointsFromEntries(entries: TypedEntries): FromEntries {
  const problems: string[] = [];
  const typed = ENTRY_STEPS.map((step) => ({ step, value: parseTyped(entries.values[String(step)] ?? '') }));
  for (const { step, value } of typed) if (value !== null && Number.isNaN(value)) problems.push(`The ${step}% box doesn’t hold a number.`);

  let paper: number | null = null;
  let solid: number | null = null;
  if (entries.unit !== 'dot_area') {
    paper = parseTyped(entries.garment);
    solid = parseTyped(entries.solid);
    if (paper === null || solid === null || Number.isNaN(paper) || Number.isNaN(solid)) {
      problems.push('Type the reading of the bare garment and of the solid first: the others are measured against them.');
      paper = null;
      solid = null;
    }
  }
  const filled = typed.filter((t) => t.value !== null && !Number.isNaN(t.value));
  if (problems.length > 0) return { points: [], problems, filled: filled.length };

  const areas = coverageFromReadings(
    entries.unit,
    paper,
    solid,
    typed.map((t) => (t.value === null || Number.isNaN(t.value) ? null : t.value)),
  );
  if (!areas) {
    problems.push('The bare garment and the solid read the same, so there is nothing to measure the steps against.');
    return { points: [], problems, filled: filled.length };
  }
  const points: CurvePoint[] = [];
  typed.forEach((t, i) => {
    const area = areas[i];
    if (area === null) return;
    // A dot area is a percentage of the way from the garment to the solid: well outside 0..100 is a slip.
    if (area < -0.03 || area > 1.03) problems.push(`The ${t.step}% box reads ${percentText(area)}% of the way to the solid, which is outside 0 to 100.`);
    points.push({ input: t.step / 100, printed: area });
  });
  return { points: problems.length > 0 ? [] : points, problems, filled: points.length };
}

// ---------------------------------------------------------------------------
// A scan
// ---------------------------------------------------------------------------

/** The films of a reading that can go into the curve without a second thought: the ones with ink that shows. */
export function readableFilms(reading: ScanReading): InkKind[] {
  return reading.films.filter((f) => f.status === 'ok').map((f) => f.kind);
}

/** Every film of a reading that has a wedge, however sure. */
export function filmsWithWedge(reading: ScanReading): InkKind[] {
  return reading.films.filter((f) => f.points.length > 0).map((f) => f.kind);
}

export interface FromScan {
  points: CurvePoint[];
  /** the largest gap between the films chosen, in coverage 0..1, and the step it is at; null with fewer than two films */
  disagreement: { gap: number; step: number } | null;
}

/** The chosen films' wedges as one set of points: each step is the average of the films. */
export function pointsFromScan(reading: ScanReading, use: readonly InkKind[]): FromScan {
  const films = reading.films.filter((f) => use.includes(f.kind) && f.points.length > 0);
  if (films.length === 0) return { points: [], disagreement: null };
  const steps = films[0].points.length;
  const points: CurvePoint[] = [];
  let worst: { gap: number; step: number } | null = null;
  for (let i = 0; i < steps; i++) {
    const values = films.map((f) => f.points[i].printed);
    points.push({ input: films[0].points[i].input, printed: values.reduce((s, v) => s + v, 0) / values.length });
    if (films.length > 1) {
      const gap = Math.max(...values) - Math.min(...values);
      if (!worst || gap > worst.gap) worst = { gap, step: Math.round(films[0].points[i].input * 100) };
    }
  }
  return { points, disagreement: worst };
}

/** The films disagree by more than this and one curve may not suit them all. */
export const FILMS_DISAGREE = 0.05;

/** A line about the films' disagreement, or null when they agree (or there is only one). */
export function disagreementNote(from: FromScan, use: readonly InkKind[]): string | null {
  if (!from.disagreement || from.disagreement.gap <= FILMS_DISAGREE) return null;
  const names = use.map((k) => INK_KIND_LABELS[k].toLowerCase()).join(' and ');
  return `The ${names} differ by up to ${percentText(from.disagreement.gap)} points (at ${from.disagreement.step}%), so one curve may not suit all of them. Use the film that matters most, or check each film’s screen and ink.`;
}

/** 'Underbase white, colour base': the films named, for a sentence. */
export function filmNames(kinds: readonly InkKind[]): string {
  const names = kinds.map((k) => INK_KIND_LABELS[k].toLowerCase());
  if (names.length === 0) return 'no film';
  const text = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// What the browser sends to be saved
// ---------------------------------------------------------------------------

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const ALLOWED_KEYS = new Set(['method', 'lpi', 'angleDeg', 'mesh', 'points']);

/** The measurement a browser sent, in shape: only the known fields, each of the right type. The service then judges the values themselves in words (lib/print/calibration/profile.ts). */
export function checkDotGainInput(raw: unknown): Checked<DotGainInput> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, error: 'That measurement can’t be read.' };
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) return { ok: false, error: 'That measurement can’t be read.' };
  if (input.method !== 'manual' && input.method !== 'scan' && input.method !== 'spectro') return { ok: false, error: 'Say how the chart was read: typed in, scanned or measured.' };
  for (const key of ['lpi', 'angleDeg', 'mesh'] as const) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) return { ok: false, error: 'The screen needs its lines per inch, angle and mesh as numbers.' };
  }
  const list = input.points;
  if (!Array.isArray(list) || list.length > 64) return { ok: false, error: 'The readings can’t be read.' };
  const points: CurvePoint[] = [];
  for (const entry of list) {
    const p = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
    if (typeof p.input !== 'number' || typeof p.printed !== 'number' || !Number.isFinite(p.input) || !Number.isFinite(p.printed)) return { ok: false, error: 'A reading isn’t a number.' };
    points.push({ input: p.input, printed: p.printed });
  }
  return { ok: true, value: { method: input.method, lpi: input.lpi as number, angleDeg: input.angleDeg as number, mesh: input.mesh as number, points } };
}
