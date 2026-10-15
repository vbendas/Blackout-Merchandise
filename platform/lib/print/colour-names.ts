// Plain colour names clients see for each ink (WP6): our own short vocabulary,
// matched by OKLCh regions. Never Pantone codes or Pantone names; those stay in
// admin (Documentation/Dev/Print-Prep-Plan.md section 5). Client-safe.
import type { Hex, Lab } from '@/lib/print/types';

export interface ColourNameEntry {
  name: string;
  /** OKLCh lightness 0..1, chroma 0..0.4, hue 0..360 (ranges are inclusive; hue may wrap) */
  l: [number, number];
  c: [number, number];
  h?: [number, number];
}

interface Oklch {
  l: number;
  c: number;
  /** degrees, 0..360 */
  h: number;
}

// Order matters only for ties: where two regions are equally near, the earlier
// name wins. Cream and ecru come first, so a faint warm tint reads as ecru. The
// greys come before every colour, so a faint tint that is not warm stays grey.
export const COLOUR_NAMES: ColourNameEntry[] = [
  // Warm pale neutrals (undyed cotton, paper).
  { name: 'Cream', l: [0.92, 1], c: [0.025, 0.08], h: [85, 120] },
  { name: 'Ecru', l: [0.86, 0.95], c: [0.01, 0.03], h: [60, 95] },

  // Greys: chroma under about 0.03 reads as grey, and lightness picks the name.
  { name: 'Black', l: [0, 0.25], c: [0, 0.05] },
  { name: 'Charcoal', l: [0.25, 0.42], c: [0, 0.03] },
  { name: 'Grey', l: [0.42, 0.72], c: [0, 0.03] },
  // Silver stops at 0.02 chroma so warm pale greys go to ecru, not silver.
  { name: 'Silver', l: [0.72, 0.94], c: [0, 0.02] },
  // White needs almost no chroma, so a warm tint reads as ecru or cream instead.
  { name: 'White', l: [0.94, 1], c: [0, 0.012] },

  // Warm pales and earth tones.
  { name: 'Sand', l: [0.72, 0.9], c: [0.035, 0.085], h: [78, 105] },
  { name: 'Tan', l: [0.55, 0.78], c: [0.05, 0.12], h: [60, 82] },
  { name: 'Peach', l: [0.75, 0.95], c: [0.05, 0.12], h: [36, 66] },

  // Browns.
  { name: 'Brown', l: [0.36, 0.6], c: [0.04, 0.12], h: [38, 68] },
  { name: 'Chocolate', l: [0.2, 0.4], c: [0.025, 0.1], h: [30, 65] },

  // Reds.
  { name: 'Red', l: [0.5, 0.72], c: [0.19, 0.3], h: [22, 40] },
  { name: 'Cherry', l: [0.4, 0.62], c: [0.14, 0.26], h: [340, 12] },
  { name: 'Crimson', l: [0.42, 0.6], c: [0.17, 0.28], h: [14, 26] },
  { name: 'Burgundy', l: [0.18, 0.42], c: [0.08, 0.2], h: [330, 30] },
  { name: 'Coral', l: [0.66, 0.82], c: [0.12, 0.2], h: [30, 50] },
  { name: 'Rust', l: [0.38, 0.6], c: [0.12, 0.2], h: [28, 48] },

  // Oranges and yellows.
  { name: 'Orange', l: [0.62, 0.8], c: [0.15, 0.25], h: [48, 70] },
  { name: 'Mustard', l: [0.6, 0.82], c: [0.1, 0.18], h: [72, 98] },
  { name: 'Yellow', l: [0.85, 1], c: [0.18, 0.3], h: [92, 116] },
  { name: 'Lemon', l: [0.9, 1], c: [0.08, 0.18], h: [95, 112] },

  // Greens.
  { name: 'Olive', l: [0.4, 0.66], c: [0.05, 0.16], h: [92, 126] },
  { name: 'Lime', l: [0.82, 1], c: [0.17, 0.3], h: [116, 138] },
  { name: 'Green', l: [0.45, 0.7], c: [0.12, 0.25], h: [130, 160] },
  { name: 'Forest green', l: [0.25, 0.46], c: [0.05, 0.15], h: [135, 170] },
  { name: 'Sage', l: [0.62, 0.84], c: [0.03, 0.1], h: [120, 150] },
  { name: 'Mint', l: [0.66, 0.96], c: [0.06, 0.18], h: [138, 180] },

  // Blues and teals.
  { name: 'Teal', l: [0.36, 0.64], c: [0.05, 0.14], h: [178, 212] },
  { name: 'Turquoise', l: [0.7, 0.92], c: [0.08, 0.17], h: [178, 205] },
  { name: 'Sky blue', l: [0.7, 0.92], c: [0.04, 0.12], h: [208, 248] },
  { name: 'Blue', l: [0.36, 0.6], c: [0.2, 0.34], h: [245, 275] },
  { name: 'Royal blue', l: [0.44, 0.7], c: [0.12, 0.22], h: [240, 268] },
  { name: 'Navy', l: [0.15, 0.4], c: [0.03, 0.22], h: [235, 268] },

  // Purples.
  { name: 'Indigo', l: [0.4, 0.6], c: [0.09, 0.2], h: [268, 294] },
  { name: 'Violet', l: [0.6, 0.74], c: [0.14, 0.24], h: [305, 335] },
  { name: 'Purple', l: [0.4, 0.6], c: [0.14, 0.26], h: [288, 336] },
  { name: 'Deep purple', l: [0.18, 0.4], c: [0.08, 0.22], h: [288, 330] },
  { name: 'Lavender', l: [0.75, 0.97], c: [0.015, 0.11], h: [270, 320] },

  // Pinks.
  { name: 'Orchid pink', l: [0.7, 0.84], c: [0.1, 0.18], h: [322, 350] },
  { name: 'Pink', l: [0.84, 0.97], c: [0.03, 0.11], h: [340, 30] },
  { name: 'Hot pink', l: [0.62, 0.8], c: [0.17, 0.28], h: [340, 12] },
  { name: 'Magenta', l: [0.55, 0.78], c: [0.22, 0.36], h: [315, 345] },
];

/** The plain names alone, for the UI (sentence case, no codes). */
export const CLIENT_COLOUR_NAMES: readonly string[] = COLOUR_NAMES.map((entry) => entry.name);

// Distance units: a lightness gap of 0.1, a chroma gap of 0.04 or a hue gap of
// 30 degrees each count as one unit. Hue only matters once a colour has chroma,
// because a grey's hue is noise.
const L_UNIT = 0.1;
const C_UNIT = 0.04;
const H_UNIT = 30;
const HUE_CHROMA = 0.04;

/** e.g. '#ED90DC' -> 'Orchid pink', or a D50 Lab value. Always returns a name for a valid colour. */
export function clientColourName(input: Hex | Lab): string {
  const colour = typeof input === 'string' ? hexToOklch(input) : labToOklch(input);
  let best = COLOUR_NAMES[0];
  let bestDistance = Infinity;
  for (const entry of COLOUR_NAMES) {
    const distance = distanceToRegion(colour, entry);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return best.name;
}

function hexToOklch(hex: Hex): Oklch {
  const [r, g, b] = parseHex(hex).map(srgbToLinear);
  const x = 0.4123907993 * r + 0.3575843394 * g + 0.1804807884 * b;
  const y = 0.2126390059 * r + 0.7151686788 * g + 0.0721923154 * b;
  const z = 0.0193308187 * r + 0.1191947798 * g + 0.9505321522 * b;
  return xyzD65ToOklch(x, y, z);
}

/** CIE Lab D50 (the space of `Lab` in lib/print/types.ts) to OKLCh, via Bradford to D65. */
function labToOklch(lab: Lab): Oklch {
  const fy = (lab.L + 16) / 116;
  const fx = fy + lab.a / 500;
  const fz = fy - lab.b / 200;
  const x50 = 0.96422 * inverseLabF(fx);
  const y50 = 1.0 * inverseLabF(fy);
  const z50 = 0.82521 * inverseLabF(fz);
  const x = 0.9555766 * x50 - 0.0230393 * y50 + 0.0631636 * z50;
  const y = -0.0282895 * x50 + 1.0099416 * y50 + 0.0210077 * z50;
  const z = 0.0122982 * x50 - 0.020483 * y50 + 1.3299098 * z50;
  return xyzD65ToOklch(x, y, z);
}

function parseHex(hex: Hex): [number, number, number] {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`clientColourName: not a hex colour: ${hex}`);
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
  const value = parseInt(digits, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function inverseLabF(t: number): number {
  return t * t * t > 216 / 24389 ? t * t * t : (116 * t - 16) / (24389 / 27);
}

/** OKLab (Bjorn Ottosson's matrices) from CIE XYZ, D65. */
function xyzD65ToOklch(x: number, y: number, z: number): Oklch {
  const l = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.633851707 * z);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l: L, c: Math.hypot(a, b), h: (h + 360) % 360 };
}

function distanceToRegion(colour: Oklch, entry: ColourNameEntry): number {
  const dl = gap(colour.l, entry.l) / L_UNIT;
  const dc = gap(colour.c, entry.c) / C_UNIT;
  const dh = entry.h ? (hueGap(colour.h, entry.h) / H_UNIT) * Math.min(1, colour.c / HUE_CHROMA) : 0;
  return Math.hypot(dl, dc, dh);
}

function gap(value: number, [low, high]: [number, number]): number {
  if (value < low) return low - value;
  if (value > high) return value - high;
  return 0;
}

/** Degrees from a hue to the nearest edge of an arc; an arc with low > high wraps through 0. */
function hueGap(hue: number, [low, high]: [number, number]): number {
  const inside = low > high ? hue >= low || hue <= high : hue >= low && hue <= high;
  if (inside) return 0;
  return Math.min(circularDistance(hue, low), circularDistance(hue, high));
}

function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
