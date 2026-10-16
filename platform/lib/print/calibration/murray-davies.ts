// Murray-Davies: the apparent dot area of a halftone from how much light it
// reflects, against the bare substrate (0%) and the solid ink (100%) read on
// the same print. Light adds in linear reflectance, so the formula only holds
// there: a scan's gamma-coded pixel values and an instrument's L* are
// converted first, and densities are the same law written with logarithms.
//
//   a = (R_paper - R_tint) / (R_paper - R_solid)
//   a = (1 - 10^-(D_tint - D_paper)) / (1 - 10^-(D_solid - D_paper))     (the same, in density)
//
// The ratio keeps its sign, so a white ink on a dark shirt (the solid is
// brighter than the garment) reads the same way as a black ink on a white one.
// This is the dot gain the press prints and the eye sees together, which is
// what a densitometer's "dot area" reports; the Yule-Nielsen n factor, which
// separates the optical part, is not applied.
//
// Pure and client-safe: the scan reader, the page's typed readings and the
// tests all use these.

export type Rgb = readonly [number, number, number];

/** sRGB code value 0..255 to linear light 0..1. */
export function srgbToLinear(code: number): number {
  const c = code / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear light 0..1 to an sRGB code value 0..255 (not rounded). */
export function linearToSrgb(linear: number): number {
  const v = linear <= 0 ? 0 : linear >= 1 ? 1 : linear;
  return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
}

/** CIE lightness L* (0..100) of a relative luminance Y (0..1). */
export function lightnessOfLuminance(y: number): number {
  const v = y <= 0 ? 0 : y;
  return v > 216 / 24389 ? 116 * Math.cbrt(v) - 16 : (24389 / 27) * v;
}

/** Relative luminance Y (0..1) of a CIE lightness L*. */
export function luminanceOfLightness(lightness: number): number {
  const L = lightness <= 0 ? 0 : lightness;
  return L > 8 ? ((L + 16) / 116) ** 3 : L / (24389 / 27);
}

/** Relative luminance of linear sRGB. */
export function luminance(rgb: Rgb): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Apparent dot area from reflectances: null when paper and solid read the same (no contrast to measure by). */
export function dotAreaFromReflectance(paper: number, solid: number, tint: number): number | null {
  const span = paper - solid;
  if (!Number.isFinite(span) || Math.abs(span) < 1e-9 || !Number.isFinite(tint)) return null;
  return (paper - tint) / span;
}

/** The same from optical densities (any zero point: only differences count). */
export function dotAreaFromDensity(paper: number, solid: number, tint: number): number | null {
  if (![paper, solid, tint].every(Number.isFinite)) return null;
  const denominator = 1 - 10 ** -(solid - paper);
  if (Math.abs(denominator) < 1e-9) return null;
  return (1 - 10 ** -(tint - paper)) / denominator;
}

/** The same from CIE lightness, through luminance. */
export function dotAreaFromLightness(paper: number, solid: number, tint: number): number | null {
  if (![paper, solid, tint].every(Number.isFinite)) return null;
  return dotAreaFromReflectance(luminanceOfLightness(paper), luminanceOfLightness(solid), luminanceOfLightness(tint));
}

/**
 * Dot area from colour: where the tint sits on the line from the paper colour
 * to the solid colour, in linear RGB (the foot of the perpendicular). For grey
 * ink and garment it is the luminance formula; for a coloured ink it uses the
 * channels that show the ink best instead of a luminance that may hardly move
 * (yellow on white). Null when the paper and the solid are the same colour.
 */
export function dotAreaFromColour(paper: Rgb, solid: Rgb, tint: Rgb): number | null {
  const d0 = solid[0] - paper[0];
  const d1 = solid[1] - paper[1];
  const d2 = solid[2] - paper[2];
  const span = d0 * d0 + d1 * d1 + d2 * d2;
  if (!(span > 1e-12)) return null;
  return ((tint[0] - paper[0]) * d0 + (tint[1] - paper[1]) * d1 + (tint[2] - paper[2]) * d2) / span;
}

/** What a typed number means. */
export type ReadingUnit = 'dot_area' | 'density' | 'lightness' | 'reflectance';

export const READING_UNITS: { id: ReadingUnit; label: string; hint: string; unit: string }[] = [
  { id: 'dot_area', label: 'Dot area', hint: 'The instrument or a densitometer already shows the printed dot area (Murray-Davies).', unit: '%' },
  { id: 'density', label: 'Density', hint: 'Optical density of each patch. Type the bare garment and the solid too.', unit: 'D' },
  { id: 'lightness', label: 'Lightness (L*)', hint: 'CIE L* of each patch. Type the bare garment and the solid too.', unit: 'L*' },
  { id: 'reflectance', label: 'Reflectance', hint: 'Reflectance or Y of each patch, in percent. Type the bare garment and the solid too.', unit: '%' },
];

export function isReadingUnit(value: unknown): value is ReadingUnit {
  return READING_UNITS.some((u) => u.id === value);
}

/**
 * Dot areas (0..1) from typed readings. `values` hold a number, or null for a
 * patch left blank. Dot area is typed in percent; reflectance in percent; the
 * rest as the instrument shows them. Null overall when the paper and solid
 * readings can't be used (the same, or not numbers).
 */
export function coverageFromReadings(unit: ReadingUnit, paper: number | null, solid: number | null, values: readonly (number | null)[]): (number | null)[] | null {
  const usable = (v: number | null): v is number => v !== null && Number.isFinite(v);
  if (unit === 'dot_area') return values.map((v) => (usable(v) ? v / 100 : null));
  if (!usable(paper) || !usable(solid)) return null;
  if (unit === 'reflectance' && (paper < 0 || solid < 0)) return null;
  const area = (tint: number): number | null => {
    switch (unit) {
      case 'density':
        return dotAreaFromDensity(paper, solid, tint);
      case 'lightness':
        return dotAreaFromLightness(paper, solid, tint);
      case 'reflectance':
        return dotAreaFromReflectance(paper, solid, tint);
    }
  };
  // The solid reads as 100% unless the pair has no contrast: one answer for a bad pair, not one per patch.
  if (area(solid) === null) return null;
  return values.map((v) => (usable(v) ? area(v) : null));
}
