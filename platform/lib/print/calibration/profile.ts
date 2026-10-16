// The saved dot-gain measurement (InkSystemProfile.dotGain): what it must look
// like, what is refused and in which words, and how readings from a chart
// become one. One schema, used by the ink system service, the profile form and
// the calibration page, so a measurement is judged the same wherever it comes
// from. Pure and client-safe.
import { z } from 'zod';
import type { DotGainProfile } from '@/lib/print/types';
import { buildDotGainCurves, gainPointsAt, type CurvePoint } from './curve';

export const DOT_GAIN_LIMITS = {
  lpi: { min: 15, max: 150 },
  angleDeg: { min: 0, max: 180 },
  mesh: { min: 30, max: 500 },
  points: { min: 3, max: 41 },
  /** the most a press can move a tone (coverage 0..1); more is a typing error */
  maxGain: 0.45,
  /** a reading may fall this far below the one before it (noise); more is a typing error */
  maxDip: 0.05,
} as const;

const METHODS = ['manual', 'scan', 'spectro'] as const;

/** 0.456 to '45.6', 0.5 to '50'. */
export function percentText(fraction: number): string {
  return String(Math.round(fraction * 1000) / 10);
}

function isIsoTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && Number.isFinite(Date.parse(value));
}

const reading = z
  .object({
    input: z.number({ error: 'A film coverage needs a number.' }).min(0, 'Film coverage goes from 0 to 100 %.').max(1, 'Film coverage goes from 0 to 100 %.'),
    printed: z.number({ error: 'A measured coverage needs a number.' }).min(0, 'A measured coverage goes from 0 to 100 %.').max(1, 'A measured coverage goes from 0 to 100 %.'),
  })
  .strict();

export const dotGainProfileSchema = z
  .object({
    measuredAt: z
      .string({ error: 'The measurement needs a date.' })
      .refine(isIsoTime, 'The date of the measurement isn’t valid.')
      .refine((value) => Date.parse(value) <= Date.now() + 24 * 3600 * 1000, 'The date of the measurement is in the future.'),
    method: z.enum(METHODS, { error: 'Say how the chart was read: typed in, scanned or measured.' }),
    lpi: z
      .number({ error: 'Lines per inch needs a number.' })
      .min(DOT_GAIN_LIMITS.lpi.min, `Lines per inch goes from ${DOT_GAIN_LIMITS.lpi.min} to ${DOT_GAIN_LIMITS.lpi.max}.`)
      .max(DOT_GAIN_LIMITS.lpi.max, `Lines per inch goes from ${DOT_GAIN_LIMITS.lpi.min} to ${DOT_GAIN_LIMITS.lpi.max}.`),
    angleDeg: z
      .number({ error: 'The screen angle needs a number.' })
      .min(DOT_GAIN_LIMITS.angleDeg.min, `The screen angle goes from ${DOT_GAIN_LIMITS.angleDeg.min} to ${DOT_GAIN_LIMITS.angleDeg.max} degrees.`)
      .max(DOT_GAIN_LIMITS.angleDeg.max, `The screen angle goes from ${DOT_GAIN_LIMITS.angleDeg.min} to ${DOT_GAIN_LIMITS.angleDeg.max} degrees.`),
    mesh: z
      .number({ error: 'The mesh needs a number.' })
      .int('The mesh is a whole number.')
      .min(DOT_GAIN_LIMITS.mesh.min, `The mesh goes from ${DOT_GAIN_LIMITS.mesh.min} to ${DOT_GAIN_LIMITS.mesh.max}.`)
      .max(DOT_GAIN_LIMITS.mesh.max, `The mesh goes from ${DOT_GAIN_LIMITS.mesh.min} to ${DOT_GAIN_LIMITS.mesh.max}.`),
    points: z
      .array(reading, { error: 'The readings need a list of film coverage and measured coverage.' })
      .min(DOT_GAIN_LIMITS.points.min, `Enter at least ${DOT_GAIN_LIMITS.points.min} readings between 0 and 100 %.`)
      .max(DOT_GAIN_LIMITS.points.max, `Keep it to ${DOT_GAIN_LIMITS.points.max} readings or fewer.`),
  })
  .strict()
  .superRefine((profile, ctx) => {
    const { points } = profile;
    points.forEach((point, i) => {
      if (i > 0 && !(point.input > points[i - 1].input)) {
        ctx.addIssue({ code: 'custom', path: ['points', i, 'input'], message: `Film coverages must rise: ${percentText(point.input)} % comes after ${percentText(points[i - 1].input)} %.` });
      }
      if (Math.abs(point.printed - point.input) > DOT_GAIN_LIMITS.maxGain) {
        ctx.addIssue({
          code: 'custom',
          path: ['points', i, 'printed'],
          message: `${percentText(point.printed)} % measured at ${percentText(point.input)} % on the film is further than a press moves a tone. Check that value.`,
        });
      }
      if (i > 0 && point.printed < points[i - 1].printed - DOT_GAIN_LIMITS.maxDip) {
        const before = points[i - 1];
        ctx.addIssue({
          code: 'custom',
          path: ['points', i, 'printed'],
          message: `The measured coverage falls from ${percentText(before.printed)} % at ${percentText(before.input)} % to ${percentText(point.printed)} % at ${percentText(point.input)} %. Check those two values.`,
        });
      }
    });
    // The curve has to be fittable too (it is, once the readings pass the checks above; this keeps the two in step).
    if (points.length >= DOT_GAIN_LIMITS.points.min && !buildDotGainCurves(points)) {
      ctx.addIssue({ code: 'custom', path: ['points'], message: 'Those readings can’t be turned into a curve. Enter some between 0 and 100 %.' });
    }
  });

/** The first thing wrong with a measurement, in words, or null when it can be saved. */
export function dotGainProblem(raw: unknown): string | null {
  const parsed = dotGainProfileSchema.safeParse(raw);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? 'That measurement can’t be saved.');
}

/** A measurement from a browser, checked: a fresh DotGainProfile, or the first problem in words. */
export function checkDotGain(raw: unknown): { ok: true; value: DotGainProfile } | { ok: false; error: string } {
  const parsed = dotGainProfileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'That measurement can’t be saved.' };
  return { ok: true, value: parsed.data };
}

export interface DotGainInput {
  method: DotGainProfile['method'];
  lpi: number;
  angleDeg: number;
  mesh: number;
  /** readings in any order; the two ends, which are fixed, are left out */
  points: readonly CurvePoint[];
  /** defaults to now */
  measuredAt?: string;
}

const round4 = (v: number): number => Math.round(v * 10000) / 10000;

/** The readings as a DotGainProfile: between the ends only, in order, repeats averaged, rounded to a hundredth of a point. */
export function buildDotGainProfile(input: DotGainInput, now: Date = new Date()): DotGainProfile {
  const sorted = input.points
    .filter((p) => p && Number.isFinite(p.input) && Number.isFinite(p.printed) && p.input > 0 && p.input < 1)
    .map((p) => ({ input: round4(Math.min(1, Math.max(0, p.input))), printed: round4(Math.min(1, Math.max(0, p.printed))) }))
    .sort((a, b) => a.input - b.input);
  const points: { input: number; printed: number; n: number }[] = [];
  for (const p of sorted) {
    const last = points[points.length - 1];
    if (last && last.input === p.input) {
      last.printed = round4((last.printed * last.n + p.printed) / (last.n + 1));
      last.n += 1;
    } else points.push({ ...p, n: 1 });
  }
  return {
    measuredAt: input.measuredAt ?? now.toISOString(),
    method: input.method,
    lpi: input.lpi,
    angleDeg: input.angleDeg,
    mesh: input.mesh,
    points: points.map(({ input: x, printed }) => ({ input: x, printed })),
  };
}

export interface DotGainSummary {
  /** film 50% prints as this (0..1) */
  printedAt50: number;
  /** printed minus film at 50%, in points of coverage (0..1) */
  gainAt50: number;
  /** film coverage that prints as 50% */
  filmFor50: number;
  /** the largest gain over the whole range, and where it is */
  peak: { gain: number; at: number };
}

/** The numbers a person reads off a measurement; null when it can't be fitted. */
export function summariseDotGain(profile: Pick<DotGainProfile, 'points'>): DotGainSummary | null {
  const curves = buildDotGainCurves(profile.points);
  if (!curves) return null;
  let peak = { gain: 0, at: 0 };
  for (let i = 0; i <= 100; i++) {
    const g = gainPointsAt(curves, i / 100);
    if (Math.abs(g) > Math.abs(peak.gain)) peak = { gain: g, at: i / 100 };
  }
  return { printedAt50: curves.gain(0.5), gainAt50: gainPointsAt(curves, 0.5), filmFor50: curves.compensate(0.5), peak };
}
