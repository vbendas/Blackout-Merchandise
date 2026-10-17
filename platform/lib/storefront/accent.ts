// The colour a shop paints its primary button and selected options with.
// Monochrome (white on black) unless the artist set an accent of their own.
// The artist's value is free text, so it is parsed into plain RGB and written
// back as a hex string: nothing the artist typed reaches the page's CSS as
// typed. Pure, no imports.

export interface ShopAccent {
  /** Fill for the primary button and selected options; also their border. */
  accent: string;
  /** Text on that fill: black or white, whichever has the higher WCAG contrast. */
  onAccent: string;
}

const MONOCHROME: ShopAccent = { accent: '#f2efe9', onAccent: '#000000' };

// An accent also draws borders and text on the black ground, so it has to
// stand out from black (WCAG 1.4.11, 3:1). One that doesn't falls back to
// monochrome rather than disappearing.
const MIN_CONTRAST_ON_BLACK = 3;

type Rgb = [number, number, number];

const NAMED_COLOURS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  lime: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  aqua: '#00ffff',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  maroon: '#800000',
  olive: '#808000',
  green: '#008000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  orange: '#ffa500',
  gold: '#ffd700',
  crimson: '#dc143c',
  coral: '#ff7f50',
  salmon: '#fa8072',
  tomato: '#ff6347',
  orangered: '#ff4500',
  firebrick: '#b22222',
  darkred: '#8b0000',
  hotpink: '#ff69b4',
  deeppink: '#ff1493',
  pink: '#ffc0cb',
  violet: '#ee82ee',
  orchid: '#da70d6',
  plum: '#dda0dd',
  indigo: '#4b0082',
  royalblue: '#4169e1',
  dodgerblue: '#1e90ff',
  deepskyblue: '#00bfff',
  skyblue: '#87ceeb',
  turquoise: '#40e0d0',
  limegreen: '#32cd32',
  springgreen: '#00ff7f',
  seagreen: '#2e8b57',
  forestgreen: '#228b22',
  khaki: '#f0e68c',
  tan: '#d2b48c',
  beige: '#f5f5dc',
  ivory: '#fffff0',
  lavender: '#e6e6fa',
  brown: '#a52a2a',
  chocolate: '#d2691e',
  sienna: '#a0522d',
  goldenrod: '#daa520',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** '50%' as 0.5, '0.5' as 0.5. */
function parseFraction(token: string | undefined): number {
  if (token === undefined) return 1;
  const value = token.endsWith('%') ? parseFloat(token) / 100 : parseFloat(token);
  return Number.isFinite(value) ? clamp(value, 0, 1) : 1;
}

/** A colour with some transparency is judged as it looks on the black ground. */
function overBlack(rgb: Rgb, alpha: number): Rgb {
  return [Math.round(rgb[0] * alpha), Math.round(rgb[1] * alpha), Math.round(rgb[2] * alpha)];
}

function parseHex(input: string): Rgb | null {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(input);
  if (!match) return null;
  let digits = match[1];
  if (digits.length <= 4) digits = [...digits].map((c) => c + c).join('');
  const value = parseInt(digits.slice(0, 6), 16);
  const alpha = digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1;
  return overBlack([(value >> 16) & 255, (value >> 8) & 255, value & 255], alpha);
}

function parseRgbFunction(input: string): Rgb | null {
  const match = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(input);
  if (!match) return null;
  const channel = (token: string) => {
    const value = token.endsWith('%') ? (parseFloat(token) / 100) * 255 : parseFloat(token);
    return Number.isFinite(value) ? Math.round(clamp(value, 0, 255)) : 0;
  };
  return overBlack([channel(match[1]), channel(match[2]), channel(match[3])], parseFraction(match[4]));
}

function parseHslFunction(input: string): Rgb | null {
  const match = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(input);
  if (!match) return null;
  const hue = (((parseFloat(match[1]) % 360) + 360) % 360) / 60;
  const saturation = clamp(parseFloat(match[2]), 0, 100) / 100;
  const lightness = clamp(parseFloat(match[3]), 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const base: Rgb =
    hue < 1 ? [chroma, x, 0] : hue < 2 ? [x, chroma, 0] : hue < 3 ? [0, chroma, x] : hue < 4 ? [0, x, chroma] : hue < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const shift = lightness - chroma / 2;
  const rgb = base.map((c) => Math.round((c + shift) * 255)) as Rgb;
  return overBlack(rgb, parseFraction(match[4]));
}

function parseColour(input: string): Rgb | null {
  const value = input.trim().toLowerCase();
  if (Object.hasOwn(NAMED_COLOURS, value)) return parseHex(NAMED_COLOURS[value]);
  return parseHex(value) ?? parseRgbFunction(value) ?? parseHslFunction(value);
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Accent for a shop: the artist's colour when it can be read and shows on
 * black, white otherwise. The text on it is whichever of black and white has
 * the higher contrast, so white never lands on a light accent. */
export function resolveAccent(raw: string | null | undefined): ShopAccent {
  const rgb = raw ? parseColour(raw) : null;
  if (!rgb) return MONOCHROME;

  const lum = luminance(rgb);
  const contrastOnBlack = (lum + 0.05) / 0.05;
  const contrastOnWhite = 1.05 / (lum + 0.05);
  if (contrastOnBlack < MIN_CONTRAST_ON_BLACK) return MONOCHROME;

  return {
    accent: toHex(rgb),
    onAccent: contrastOnBlack >= contrastOnWhite ? '#000000' : '#f2efe9',
  };
}
