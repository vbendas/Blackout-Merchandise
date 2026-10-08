// DEV ONLY (WP3, Round 9 plan 4.4 / gate G1). Not shipped: this module is
// reachable only from app/dev/**, which is a route only when the `dev.tsx`
// page extension is registered (next.config.ts).
//
// Every candidate face is loaded under a SCOPED variable (`--sp-*`) so the
// specimen never touches the production `--ff-*` variables. A board then
// points `--ff-display` / `--ff-mono` at one of them (see specimen.css and
// boardVars below).
//
// Docs read for this file (Next 16.3.0):
//   node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md
// Big Shoulders is loaded as `Big_Shoulders` (Big_Shoulders_Display is not in
// Next 16's font data; it is the opsz 72 end of this variable font).
import {
  Anton,
  Barlow,
  Barlow_Condensed,
  Big_Shoulders,
  IBM_Plex_Mono,
  JetBrains_Mono,
  Martian_Mono,
  Space_Mono,
} from 'next/font/google';
import localFont from 'next/font/local';
import type { CSSProperties } from 'react';

// ── Display candidates ──────────────────────────────────────────────────
const anton = Anton({ weight: '400', subsets: ['latin', 'latin-ext'], variable: '--sp-anton', display: 'swap' });

// Variable (wght 100-900, opsz 10-72). Optical sizing is automatic, so the
// big sizes use the opsz 72 "Display" cut.
const bigShoulders = Big_Shoulders({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz'],
  variable: '--sp-bigshoulders',
  display: 'swap',
});

// GC Grind: licence UNCONFIRMED (decision 4). The TTF is read-only input in
// app/fonts/; it is referenced here only, so a production build (which never
// compiles app/dev/**) cannot emit it.
const gcGrind = localFont({
  src: '../../fonts/GCGrind.ttf',
  weight: '400',
  style: 'normal',
  variable: '--sp-grind',
  display: 'swap',
  adjustFontFallback: false,
});

// Control: the interim face (type.css metric block).
const barlowCondensed = Barlow_Condensed({
  weight: ['700'],
  subsets: ['latin', 'latin-ext'],
  variable: '--sp-barlowcond',
  display: 'swap',
});

// ── Mono candidates ─────────────────────────────────────────────────────
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--sp-jetbrains', display: 'swap' });
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin', 'latin-ext'],
  variable: '--sp-spacemono',
  display: 'swap',
});
const martian = Martian_Mono({ subsets: ['latin', 'latin-ext'], variable: '--sp-martian', display: 'swap' });
const plexMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin', 'latin-ext'],
  variable: '--sp-plexmono',
  display: 'swap',
});

// ── Body (unchanged candidate; Barlow 400/500, no 300) ──────────────────
const barlow = Barlow({
  weight: ['400', '500'],
  subsets: ['latin', 'latin-ext'],
  variable: '--sp-barlow',
  display: 'swap',
});

// ── Stamp layer: dev-only WOFF2 derived from Assets/Fonts/Mornsey-PUA.ttf
// (ttf2woff2). Production uses app/fonts/Mornsey.woff2 (WP6b). ───────────
const mornsey = localFont({
  src: './Mornsey-specimen.woff2',
  weight: '400',
  style: 'normal',
  variable: '--sp-mornsey',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

/** Classes that define every `--sp-*` variable. Applied by dev/layout.tsx. */
export const FONT_VARIABLE_CLASSES = [
  anton,
  bigShoulders,
  gcGrind,
  barlowCondensed,
  jetbrains,
  spaceMono,
  martian,
  plexMono,
  barlow,
  mornsey,
]
  .map((f) => f.variable)
  .join(' ');

/** First family of a next/font stack: the real face without its metric-adjusted fallback. */
const first = (f: { style: { fontFamily: string } }) => f.style.fontFamily.split(',')[0].trim();

export type DisplayId = 'anton' | 'bigshoulders' | 'grind' | 'barlowcond';
export type MonoId = 'jetbrains' | 'spacemono' | 'martian' | 'plexmono';
export type Ground = 'ink' | 'paper' | 'both';
export type LangCode = 'en' | 'pt' | 'es' | 'fr' | 'nl' | 'de';

export interface DisplayFace {
  id: DisplayId;
  label: string;
  /** CSS var holding the next/font stack. */
  cssVar: string;
  /** Real family name (no fallback) for canvas measurement. */
  family: string;
  weight: number;
  tracking: string;
  lh: number;
  /** em per char seed for --display-fit until measured values are adopted. */
  fit: number;
  licence: string;
  flag?: string;
}

export const DISPLAY_FACES: Record<DisplayId, DisplayFace> = {
  anton: {
    id: 'anton',
    label: 'Anton',
    cssVar: '--sp-anton',
    family: first(anton),
    weight: 400,
    tracking: '-0.01em',
    lh: 0.9,
    fit: 0.52,
    licence: 'OFL 1.1',
  },
  bigshoulders: {
    id: 'bigshoulders',
    label: 'Big Shoulders Display',
    cssVar: '--sp-bigshoulders',
    family: first(bigShoulders),
    weight: 800,
    tracking: '-0.005em',
    lh: 0.9,
    fit: 0.5,
    licence: 'OFL 1.1',
  },
  grind: {
    id: 'grind',
    label: 'GC Grind',
    cssVar: '--sp-grind',
    family: first(gcGrind),
    weight: 400,
    tracking: '0em',
    lh: 0.88,
    fit: 0.41,
    licence: 'UNCONFIRMED',
    flag: 'licence unconfirmed',
  },
  barlowcond: {
    id: 'barlowcond',
    label: 'Barlow Condensed 700',
    cssVar: '--sp-barlowcond',
    family: first(barlowCondensed),
    weight: 700,
    tracking: '-0.01em',
    lh: 0.9,
    fit: 0.48,
    licence: 'OFL 1.1',
    flag: 'interim (current)',
  },
};

export interface MonoFace {
  id: MonoId;
  label: string;
  cssVar: string;
  family: string;
  track: string;
  control?: boolean;
}

export const MONO_FACES: Record<MonoId, MonoFace> = {
  jetbrains: { id: 'jetbrains', label: 'JetBrains Mono', cssVar: '--sp-jetbrains', family: first(jetbrains), track: '0.05em' },
  spacemono: { id: 'spacemono', label: 'Space Mono', cssVar: '--sp-spacemono', family: first(spaceMono), track: '0.04em' },
  martian: { id: 'martian', label: 'Martian Mono', cssVar: '--sp-martian', family: first(martian), track: '0.03em' },
  plexmono: { id: 'plexmono', label: 'IBM Plex Mono', cssVar: '--sp-plexmono', family: first(plexMono), track: '0.05em', control: true },
};

export const MORNSEY_FAMILY = first(mornsey);

export const DISPLAY_IDS = Object.keys(DISPLAY_FACES) as DisplayId[];
export const MONO_IDS = Object.keys(MONO_FACES) as MonoId[];
export const LANG_CODES: LangCode[] = ['en', 'pt', 'de', 'es', 'fr', 'nl'];

// ── URL state: ?d=&m=&g=&l= (+ w=800|900 Big Shoulders weight, c=1 compare,
// only=<treatment ids>). `theme=` is accepted as an alias of `g` (the
// harness appends it). ────────────────────────────────────────────────────
export interface SpecimenState {
  d: DisplayId;
  m: MonoId;
  g: Ground;
  l: LangCode | null;
  w: 800 | 900;
  c: boolean;
  only: string[];
  /** Compare only these display faces (empty = all). */
  f: DisplayId[];
}

export const DEFAULT_STATE: SpecimenState = {
  d: 'anton',
  m: 'jetbrains',
  g: 'ink',
  l: null,
  w: 800,
  c: false,
  only: [],
  f: [],
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseState(raw: Raw): SpecimenState {
  const d = one(raw.d);
  const m = one(raw.m);
  const g = one(raw.g) ?? one(raw.theme);
  const l = one(raw.l);
  const w = one(raw.w);
  const c = one(raw.c);
  const only = one(raw.only);
  const faces = one(raw.f);
  return {
    d: d && d in DISPLAY_FACES ? (d as DisplayId) : DEFAULT_STATE.d,
    m: m && m in MONO_FACES ? (m as MonoId) : DEFAULT_STATE.m,
    g: g === 'paper' || g === 'both' || g === 'ink' ? g : DEFAULT_STATE.g,
    l: l && (LANG_CODES as string[]).includes(l) ? (l as LangCode) : null,
    w: w === '900' ? 900 : 800,
    c: c === '1' || c === 'true' || d === 'all',
    only: only ? only.split(',').filter(Boolean) : [],
    f: faces ? (faces.split(',').filter((x) => x in DISPLAY_FACES) as DisplayId[]) : [],
  };
}

export function stateToQuery(s: SpecimenState): string {
  const p = new URLSearchParams();
  p.set('d', s.d);
  p.set('m', s.m);
  p.set('g', s.g);
  if (s.l) p.set('l', s.l);
  if (s.d === 'bigshoulders' || s.c) p.set('w', String(s.w));
  if (s.c) p.set('c', '1');
  if (s.only.length) p.set('only', s.only.join(','));
  if (s.f.length) p.set('f', s.f.join(','));
  return p.toString();
}

/**
 * Custom properties a board sets on its wrapper: ONLY the two `--ff-*`
 * variables and the per-face metric block. The semantic/type tokens
 * (`--type-*`, `--font-*`) are declared on :root and resolve their var()
 * chain THERE, so specimen.css re-declares that chain on `.sp-board`; the
 * production swap needs none of this because the app sets `--ff-*` on <html>.
 */
export function boardVars(display: DisplayId, mono: MonoId, bsWeight: 800 | 900): CSSProperties {
  const d = DISPLAY_FACES[display];
  const m = MONO_FACES[mono];
  const weight = display === 'bigshoulders' ? bsWeight : d.weight;
  return {
    '--ff-display': `var(${d.cssVar})`,
    '--ff-mono': `var(${m.cssVar})`,
    '--ff-body': 'var(--sp-barlow)',
    '--display-weight': weight,
    '--display-tracking': d.tracking,
    '--display-lh': d.lh,
    '--display-fit': d.fit,
    '--mono-track': m.track,
  } as CSSProperties;
}

export function displayWeight(display: DisplayId, bsWeight: 800 | 900): number {
  return display === 'bigshoulders' ? bsWeight : DISPLAY_FACES[display].weight;
}
