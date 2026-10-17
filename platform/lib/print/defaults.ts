// Code defaults for print prep. The owner set 600 ppi and 55 lpi for screen
// print, 45 lpi fades for DTG/DTF, and up to 8 screens as standard (whites
// included). The ink system comes from the MagnaPrint HB data sheet
// (Documentation/Dev/Print-Prep-Plan.md section 5). Opacities are estimates
// until the inks are measured.
import type { FilmLayout, InkSystemProfile, PrintRecipe, RecipeOverride } from '@/lib/print/types';

/** Part of every job's hash and manifest: a new engine makes new bytes, so its packs are new packs. 2.0.0 (Phase 2): index and
 * simulated-process films instead of spot drafts, and the dot-gain curve on every halftone. 3.0.0 (16 Oct 2026): A2
 * portrait films, 10 mm margins at the sides and 27 mm above and below, registration marks at the four corners, and
 * no design over 40 × 54 cm. */
export const ENGINE_VERSION = '3.0.0';

export const STANDARD_MAX_SCREENS = 8;
export const ABSOLUTE_MAX_SCREENS = 15;
/** €1 per piece for each screen above 8, screen-printed runs only. */
export const EXTRA_SCREEN_CENTS_PER_PIECE = 100;

/** Owner decision, 16 Oct 2026: films and screens are A2 portrait at most, and the A2 sheet holds the reg marks
 * and a margin for ink deposit around the design, so the design itself is at most 40 cm wide and 54 cm tall.
 * Reg marks sit at the four corners, top and bottom only. */
export const FILM_SHEET_CM = { widthCm: 42, heightCm: 59.4 } as const;
export const MAX_DESIGN_CM = { widthCm: 40, heightCm: 54 } as const;

/** Owner decision, 16 Oct 2026: the top of a front or back print sits 5 cm below the collar seam. */
export const COLLAR_DISTANCE_CM = 5;

export const DEFAULT_RECIPE: PrintRecipe = {
  method: 'auto',
  maxScreens: STANDARD_MAX_SCREENS,
  screenPpi: 600,
  halftone: { lpi: 55, angleDeg: 22.5, dot: 'round', minDot: 0.05, maxDot: 0.9 },
  underbaseChokeMm: 0.2,
  trapMm: 0.25,
  minFeatureMm: 0.25,
  minLineMm: 0.3,
  knockoutDeltaE: 10,
  highlightWhite: true,
  indexCellPpi: 200,
  dtg: { ppi: 300, fadeLpi: 45, fadeAngleDeg: 22.5, edgeBandPx: 2 },
  // 10 + 400 + 10 = 420 mm and 27 + 540 + 27 = 594 mm: a MAX_DESIGN_CM design fills FILM_SHEET_CM (A2) exactly
  marks: { sideMarginMm: 10, endMarginMm: 27, inkGapMm: 10 },
};

/** The film layout of a recipe's marks, with the defaults for anything a recipe stored before engine 3 lacks
 * (those carry only marginMm and targetOffsetMm, which films no longer use). */
export function filmLayout(marks?: Partial<PrintRecipe['marks']> | null): FilmLayout {
  const d = DEFAULT_RECIPE.marks;
  const mm = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
  return { sideMarginMm: mm(marks?.sideMarginMm, d.sideMarginMm), endMarginMm: mm(marks?.endMarginMm, d.endMarginMm), inkGapMm: mm(marks?.inkGapMm, d.inkGapMm) };
}

export const DEFAULT_INK_SYSTEM: InkSystemProfile = {
  name: 'MagnaPrint HB',
  bases: { light: 'HB Neutral', dark: 'HB Opaque' },
  opacity: { 'HB Neutral': 0.55, 'HB Opaque': 0.85, 'Aquaflex V2 White': 0.92 },
  underbase: { ink: 'Aquaflex V2 White', flash: { seconds: 4, celsius: 230 } },
  highlightWhite: { ink: 'Aquaflex V2 White' },
  mesh: { min: 158, max: 305, halftone: 230, solid: 200, underbase: 200 },
  cure: { minutesMin: 2, minutesMax: 2.5, celsius: 165 },
  pigmentMaxPct: 9,
  offContactMm: [3, 4],
  squeegee: '60/90/60 shore, rectangle edge, 15°',
  pressHeads: 8,
  measured: false,
};

/** The white ink's colour (Aquaflex V2 White) for proofs and labels, until it is measured. */
export const WHITE_INK_HEX = '#F2F2F0';

/** Opacity when the ink system profile has no entry for a base. Guesses, like the profile's. */
export const FALLBACK_OPACITY = { lightBase: 0.55, darkBase: 0.85, white: 0.92 } as const;

/**
 * Engine tuning that is not part of a recipe. Colour distances are ΔE2000
 * unless named `Ok` (OKLab distance, 0.01 is roughly one ΔE). Shares are
 * 0..1 of the art's printed pixels.
 */
export const ENGINE_TUNING = {
  /** colour analysis runs at the art's resolution, capped here (the plates are always recipe.screenPpi) */
  workPpiMax: 200,
  /** palette colours closer than this are one ink */
  paletteMergeDeltaE: 4,
  /** a palette colour this close to the white ink prints as white */
  whiteDeltaE: 8,
  /** spot fits when the inks reproduce the art within this on average (flat areas weigh most) */
  fitMeanOk: 0.025,
  /** ... and 90% of it within this */
  fitP90Ok: 0.07,
  /** ... and no more than this share reproduced worse than explainedOk (a small flat colour is still an ink) */
  fitBadShareMax: 0.005,
  /** a pixel the spot inks reproduce within this is explained */
  explainedOk: 0.045,
  /** spot needs this share or less of the art unexplained */
  unexplainedMax: 0.12,
  /** spot needs this share or less of the art in soft shading the inks miss */
  gradientMax: 0.12,
  /** index separation suits art with at least this share of flat colour */
  indexFlatMin: 0.5,
  /** the underbase under an ink is the smallest weight that brings it within this of its target */
  underbaseOkDeltaE: 1,
  /** a garment shares a set's screens when its proof is within this on average, or within
   * setJoinSlackDeltaE of how well the screens proof their own garment (a spot draft of
   * painted art is never exact, on any garment) */
  setJoinMeanDeltaE: 3.5,
  setJoinSlackDeltaE: 1.5,
  /** ... and 95% of the print within this, or within setJoinP95SlackDeltaE of the reference */
  setJoinP95DeltaE: 12,
  setJoinP95SlackDeltaE: 4,
  /** an ink this close to the garment barely shows */
  lowContrastDeltaE: 8,
  /** DTG: a garment this close to pure white leaves RGB 255 unprinted */
  whiteGarmentDeltaE: 6,
  /** art below this at its print size gets a review warning; below lowResolutionBlockPpi, a block */
  lowResolutionPpi: 150,
  lowResolutionBlockPpi: 50,
  /** thin-line warnings need at least this much thin area on a film */
  thinLineMinAreaMm2: 1,
  /** default loupe size */
  loupeMm: 25,
  /** proof images are this wide */
  proofWidthPx: 1000,
  /** simulated process: colour inks and highlight white printed wet on wet over one spot, summed
   * (2.5 = 250%, the usual total for wet layers); the flashed underbase is not counted */
  simInkLimit: 2.5,
  /** simulated process: the proof is compared with the art over squares this size, several halftone
   * cells across, so the dots average out as they do to the eye */
  simAccuracyBlockMm: 3,
} as const;

/** A recipe with overrides applied in order (later wins); nested groups merge. The marks come out as the
 * film layout alone: a stored recipe's engine 2 fields are dropped and the defaults fill what it lacks. */
export function mergeRecipe(base: PrintRecipe, ...overrides: (RecipeOverride | null | undefined)[]): PrintRecipe {
  let out: PrintRecipe = { ...base, halftone: { ...base.halftone }, dtg: { ...base.dtg }, marks: { ...base.marks } };
  for (const o of overrides) {
    if (!o) continue;
    out = {
      ...out,
      ...o,
      halftone: { ...out.halftone, ...(o.halftone ?? {}) },
      dtg: { ...out.dtg, ...(o.dtg ?? {}) },
      marks: { ...out.marks, ...(o.marks ?? {}) },
    };
  }
  out.maxScreens = Math.max(1, Math.min(ABSOLUTE_MAX_SCREENS, Math.round(out.maxScreens)));
  out.marks = filmLayout(out.marks);
  return out;
}
