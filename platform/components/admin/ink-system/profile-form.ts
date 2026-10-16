// The ink system profile as a form: the profile to text boxes and back, with
// every number checked. One schema, used twice: the page checks while someone
// types, and the server action checks again on what arrives (a browser can send
// anything). Pure and client-safe. Documentation/Dev/Print-Prep-Plan.md section 5.
import { z } from 'zod';
import { dotGainProfileSchema } from '@/lib/print/calibration/profile';
import type { InkSystemProfile } from '@/lib/print/types';

// ---------------------------------------------------------------------------
// The schema
// ---------------------------------------------------------------------------

const NAME_MAX = 60;

function name(label: string) {
  return z
    .string({ error: `${label} needs a name.` })
    .trim()
    .min(1, `${label} needs a name.`)
    .max(NAME_MAX, `${label} is too long.`);
}

function range(label: string, min: number, max: number, unit = '') {
  const words = `${label} goes from ${min} to ${max}${unit}.`;
  return z.number({ error: `${label} needs a number.` }).min(min, words).max(max, words);
}

function whole(label: string, min: number, max: number) {
  return range(label, min, max).int(`${label} is a whole number.`);
}

const finite = (value: number): boolean => Number.isFinite(value);

export const inkSystemProfileSchema = z
  .object({
    name: name('The ink system'),
    bases: z.object({
      light: name('The base for light garments'),
      dark: name('The base for dark garments'),
    }),
    opacity: z.record(z.string().trim().min(1).max(NAME_MAX), range('Opacity', 0, 1)),
    underbase: z.object({
      ink: name('The underbase ink'),
      flash: z.object({
        seconds: range('Flash time', 0.5, 60, ' seconds'),
        celsius: range('Flash temperature', 100, 400, ' °C'),
      }),
    }),
    highlightWhite: z.object({ ink: name('The highlight white ink') }),
    mesh: z.object({
      min: whole('The finest mesh', 20, 500),
      max: whole('The coarsest mesh', 20, 500),
      halftone: whole('The mesh for halftones', 20, 500),
      solid: whole('The mesh for solid colour', 20, 500),
      underbase: whole('The mesh for the underbase', 20, 500),
    }),
    cure: z.object({
      minutesMin: range('The shortest cure', 0.5, 10, ' minutes'),
      minutesMax: range('The longest cure', 0.5, 10, ' minutes'),
      celsius: range('Cure temperature', 100, 250, ' °C'),
    }),
    pigmentMaxPct: range('The pigment limit', 0, 20, ' %'),
    offContactMm: z.tuple([range('Off-contact', 0, 10, ' mm'), range('Off-contact', 0, 10, ' mm')]),
    squeegee: z.string({ error: 'The squeegee needs a description.' }).trim().max(120, 'The squeegee description is too long.'),
    pressHeads: whole('Press heads', 1, 15),
    measured: z.boolean(),
    // Not edited here (the calibration page owns it), but the profile keeps it: a schema that dropped it would erase it on every save.
    dotGain: dotGainProfileSchema.optional(),
  })
  .superRefine((profile, ctx) => {
    const { mesh, cure, offContactMm } = profile;
    if (finite(mesh.min) && finite(mesh.max) && mesh.min > mesh.max) {
      ctx.addIssue({ code: 'custom', path: ['mesh', 'max'], message: 'The coarsest mesh can’t be below the finest.' });
    }
    // With the range itself reversed, "between 158 and 120" would only repeat the one real problem.
    if (finite(mesh.min) && finite(mesh.max) && mesh.min <= mesh.max) {
      for (const key of ['halftone', 'solid', 'underbase'] as const) {
        const value = mesh[key];
        if (finite(value) && (value < mesh.min || value > mesh.max)) {
          ctx.addIssue({ code: 'custom', path: ['mesh', key], message: `Pick a mesh between ${mesh.min} and ${mesh.max}.` });
        }
      }
    }
    if (finite(cure.minutesMin) && finite(cure.minutesMax) && cure.minutesMin > cure.minutesMax) {
      ctx.addIssue({ code: 'custom', path: ['cure', 'minutesMax'], message: 'The longest cure can’t be shorter than the shortest.' });
    }
    if (finite(offContactMm[0]) && finite(offContactMm[1]) && offContactMm[0] > offContactMm[1]) {
      ctx.addIssue({ code: 'custom', path: ['offContactMm', 1], message: 'The larger off-contact can’t be below the smaller.' });
    }
    // Every ink the profile names needs an opacity: the proofs draw each base and white from it.
    const inks = [profile.bases.light, profile.bases.dark, profile.underbase.ink, profile.highlightWhite.ink].map((ink) => ink.trim());
    for (const ink of new Set(inks)) {
      if (!Object.hasOwn(profile.opacity, ink)) {
        ctx.addIssue({ code: 'custom', path: ['opacity', ink], message: `Opacity is needed for ${ink}.` });
      }
    }
  });

/** What a browser sent, as a checked profile, or the first thing wrong with it in words. */
export function checkInkSystemProfile(raw: unknown): { ok: true; profile: InkSystemProfile } | { ok: false; error: string } {
  const parsed = inkSystemProfileSchema.safeParse(raw);
  if (parsed.success) return { ok: true, profile: parsed.data };
  return { ok: false, error: parsed.error.issues[0]?.message ?? 'Those settings can’t be saved.' };
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

export interface InkFormValues {
  name: string;
  baseLight: string;
  baseDark: string;
  underbaseInk: string;
  flashSeconds: string;
  flashCelsius: string;
  highlightInk: string;
  meshMin: string;
  meshMax: string;
  meshHalftone: string;
  meshSolid: string;
  meshUnderbase: string;
  cureMin: string;
  cureMax: string;
  cureCelsius: string;
  pressHeads: string;
  pigmentMaxPct: string;
  offContactMin: string;
  offContactMax: string;
  squeegee: string;
  /** opacity as a percentage, by ink name */
  opacity: Record<string, string>;
}

/** A box on the form: a plain key, or `opacity:<ink name>`. */
export type InkFieldKey = Exclude<keyof InkFormValues, 'opacity'> | `opacity:${string}`;

/** 0.85 to '85', 0.555 to '55.5'. */
function percent(fraction: number): string {
  return String(Math.round(fraction * 1000) / 10);
}

export function formFromProfile(profile: InkSystemProfile): InkFormValues {
  return {
    name: profile.name,
    baseLight: profile.bases.light,
    baseDark: profile.bases.dark,
    underbaseInk: profile.underbase.ink,
    flashSeconds: String(profile.underbase.flash.seconds),
    flashCelsius: String(profile.underbase.flash.celsius),
    highlightInk: profile.highlightWhite.ink,
    meshMin: String(profile.mesh.min),
    meshMax: String(profile.mesh.max),
    meshHalftone: String(profile.mesh.halftone),
    meshSolid: String(profile.mesh.solid),
    meshUnderbase: String(profile.mesh.underbase),
    cureMin: String(profile.cure.minutesMin),
    cureMax: String(profile.cure.minutesMax),
    cureCelsius: String(profile.cure.celsius),
    pressHeads: String(profile.pressHeads),
    pigmentMaxPct: String(profile.pigmentMaxPct),
    offContactMin: String(profile.offContactMm[0]),
    offContactMax: String(profile.offContactMm[1]),
    squeegee: profile.squeegee,
    opacity: Object.fromEntries(Object.entries(profile.opacity).map(([ink, value]) => [ink, percent(value)])),
  };
}

/** The inks the form needs an opacity for: the four it names, each once, trimmed. */
export function opacityInks(values: InkFormValues): string[] {
  const inks = [values.baseLight, values.baseDark, values.underbaseInk, values.highlightInk].map((ink) => ink.trim()).filter(Boolean);
  return [...new Set(inks)];
}

function parseNumber(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? Number.NaN : Number(trimmed);
}

const FIELD_OF_PATH: Record<string, Exclude<keyof InkFormValues, 'opacity'>> = {
  name: 'name',
  'bases.light': 'baseLight',
  'bases.dark': 'baseDark',
  'underbase.ink': 'underbaseInk',
  'underbase.flash.seconds': 'flashSeconds',
  'underbase.flash.celsius': 'flashCelsius',
  'highlightWhite.ink': 'highlightInk',
  'mesh.min': 'meshMin',
  'mesh.max': 'meshMax',
  'mesh.halftone': 'meshHalftone',
  'mesh.solid': 'meshSolid',
  'mesh.underbase': 'meshUnderbase',
  'cure.minutesMin': 'cureMin',
  'cure.minutesMax': 'cureMax',
  'cure.celsius': 'cureCelsius',
  pressHeads: 'pressHeads',
  pigmentMaxPct: 'pigmentMaxPct',
  'offContactMm.0': 'offContactMin',
  'offContactMm.1': 'offContactMax',
  squeegee: 'squeegee',
};

function fieldOfPath(path: PropertyKey[]): InkFieldKey | null {
  if (path[0] === 'opacity' && typeof path[1] === 'string') return `opacity:${path[1]}`;
  return FIELD_OF_PATH[path.map(String).join('.')] ?? null;
}

/** The form back to a profile, built on the saved one so what the form doesn't
 * show (whether the inks were measured, the dot-gain calibration, an opacity for
 * an ink no longer named) is kept. Each problem is attached to its box. */
export function profileFromForm(
  values: InkFormValues,
  saved: InkSystemProfile,
): { ok: true; profile: InkSystemProfile } | { ok: false; errors: Partial<Record<InkFieldKey, string>> } {
  const light = values.baseLight.trim();
  const dark = values.baseDark.trim();
  const underbaseInk = values.underbaseInk.trim();
  const highlightInk = values.highlightInk.trim();

  const opacity: Record<string, number> = { ...saved.opacity };
  for (const ink of opacityInks(values)) {
    const text = values.opacity[ink];
    opacity[ink] = text === undefined ? Number.NaN : parseNumber(text) / 100;
  }

  const candidate = {
    name: values.name,
    bases: { light, dark },
    opacity,
    underbase: { ink: underbaseInk, flash: { seconds: parseNumber(values.flashSeconds), celsius: parseNumber(values.flashCelsius) } },
    highlightWhite: { ink: highlightInk },
    mesh: {
      min: parseNumber(values.meshMin),
      max: parseNumber(values.meshMax),
      halftone: parseNumber(values.meshHalftone),
      solid: parseNumber(values.meshSolid),
      underbase: parseNumber(values.meshUnderbase),
    },
    cure: { minutesMin: parseNumber(values.cureMin), minutesMax: parseNumber(values.cureMax), celsius: parseNumber(values.cureCelsius) },
    pigmentMaxPct: parseNumber(values.pigmentMaxPct),
    offContactMm: [parseNumber(values.offContactMin), parseNumber(values.offContactMax)],
    squeegee: values.squeegee,
    pressHeads: parseNumber(values.pressHeads),
    measured: saved.measured,
    ...(saved.dotGain ? { dotGain: saved.dotGain } : {}),
  };

  const parsed = inkSystemProfileSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, profile: parsed.data };

  const errors: Partial<Record<InkFieldKey, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = fieldOfPath(issue.path);
    if (!key || errors[key]) continue;
    // The form's opacity is a percentage; the schema's is a fraction.
    errors[key] = key.startsWith('opacity:') && issue.message.includes('goes from') ? 'Opacity goes from 0 to 100 %.' : issue.message;
  }
  // A problem with no box to show it on still blocks the save; say it somewhere.
  if (Object.keys(errors).length === 0) errors.name = parsed.error.issues[0]?.message ?? 'Those settings can’t be saved.';
  return { ok: false, errors };
}
