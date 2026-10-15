// Colour maths for the print engine: sRGB and linear light, OKLab (palette
// work and fast distances), CIE Lab D50 and CIEDE2000 (knockout tolerance,
// ink matching, proof checks). Pure functions; the hot paths write into
// caller-owned arrays instead of allocating.
import type { Hex, Lab } from '@/lib/print/types';

export type Vec3 = [number, number, number];

/** 8-bit sRGB to linear light, exact. */
export const SRGB8_TO_LINEAR: Float64Array = (() => {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i++) t[i] = srgbToLinear(i / 255);
  return t;
})();

/** sRGB transfer, 0..1 in and out. */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Inverse sRGB transfer, clamped to 0..1. */
export function linearToSrgb(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

const L2S_STEPS = 65536;
const LINEAR_TO_SRGB8_LUT: Uint8Array = (() => {
  const t = new Uint8Array(L2S_STEPS + 1);
  for (let i = 0; i <= L2S_STEPS; i++) t[i] = Math.round(linearToSrgb(i / L2S_STEPS) * 255);
  return t;
})();

/** Linear light to 8-bit sRGB through a 64k table (exact to well under one level). */
export function linearToSrgb8(v: number): number {
  if (!(v > 0)) return 0;
  if (v >= 1) return 255;
  return LINEAR_TO_SRGB8_LUT[Math.round(v * L2S_STEPS)];
}

// ---------------------------------------------------------------------------
// OKLab (Björn Ottosson, 2020), from linear sRGB
// ---------------------------------------------------------------------------

/** Linear sRGB to OKLab; writes [L, a, b] into out. */
export function linearToOklab(r: number, g: number, b: number, out: Vec3 | Float64Array | Float32Array): void {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  out[0] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}

/** OKLab to linear sRGB (unclamped: out-of-gamut colours give values outside 0..1). */
export function oklabToLinear(L: number, a: number, b: number, out: Vec3 | Float64Array | Float32Array): void {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  out[0] = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  out[1] = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  out[2] = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
}

/** CIE XYZ (D65) to OKLab, Ottosson's M1 and M2. Used to check the sRGB path. */
export function xyzD65ToOklab(x: number, y: number, z: number): Vec3 {
  const l = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.633851707 * z);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Linear sRGB to CIE XYZ (D65). */
export function linearToXyzD65(r: number, g: number, b: number): Vec3 {
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    0.0193339 * r + 0.119192 * g + 0.9503041 * b,
  ];
}

// ---------------------------------------------------------------------------
// CIE Lab D50 (sRGB adapted with Bradford, the ICC convention) and CIEDE2000
// ---------------------------------------------------------------------------

const XN = 0.96422;
const YN = 1;
const ZN = 0.82521;
const LAB_E = 216 / 24389;
const LAB_K = 24389 / 27;

function labF(t: number): number {
  return t > LAB_E ? Math.cbrt(t) : (LAB_K * t + 16) / 116;
}

/** Linear sRGB to CIE Lab D50. */
export function linearToLab(r: number, g: number, b: number): Lab {
  const x = 0.4360747 * r + 0.3850649 * g + 0.1430804 * b;
  const y = 0.2225045 * r + 0.7168786 * g + 0.0606169 * b;
  const z = 0.0139322 * r + 0.0971045 * g + 0.7141733 * b;
  const fx = labF(x / XN);
  const fy = labF(y / YN);
  const fz = labF(z / ZN);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIE Lab D50 to linear sRGB (unclamped). */
export function labToLinear(lab: Lab): Vec3 {
  const fy = (lab.L + 16) / 116;
  const fx = fy + lab.a / 500;
  const fz = fy - lab.b / 200;
  const inv = (f: number): number => (f ** 3 > LAB_E ? f ** 3 : (116 * f - 16) / LAB_K);
  const x = inv(fx) * XN;
  const y = (lab.L > LAB_K * LAB_E ? fy ** 3 : lab.L / LAB_K) * YN;
  const z = inv(fz) * ZN;
  return [
    3.1338561 * x - 1.6168667 * y - 0.4906146 * z,
    -0.9787684 * x + 1.9161415 * y + 0.033454 * z,
    0.0719453 * x - 0.2289914 * y + 1.4052427 * z,
  ];
}

export function rgb8ToLab(r: number, g: number, b: number): Lab {
  return linearToLab(SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]);
}

const DEG = Math.PI / 180;
const POW25_7 = 25 ** 7;

/** CIEDE2000 colour difference (Sharma, Wu and Dalal 2005), kL = kC = kH = 1. */
export function deltaE2000(x: Lab, y: Lab): number {
  const C1 = Math.hypot(x.a, x.b);
  const C2 = Math.hypot(y.a, y.b);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)));
  const a1 = (1 + G) * x.a;
  const a2 = (1 + G) * y.a;
  const C1p = Math.hypot(a1, x.b);
  const C2p = Math.hypot(a2, y.b);
  const h1 = C1p === 0 ? 0 : hueDeg(x.b, a1);
  const h2 = C2p === 0 ? 0 : hueDeg(y.b, a2);

  const dL = y.L - x.L;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * DEG);

  const Lbar = (x.L + y.L) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbar: number;
  if (C1p * C2p === 0) hbar = h1 + h2;
  else if (Math.abs(h1 - h2) <= 180) hbar = (h1 + h2) / 2;
  else if (h1 + h2 < 360) hbar = (h1 + h2 + 360) / 2;
  else hbar = (h1 + h2 - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos((hbar - 30) * DEG) +
    0.24 * Math.cos(2 * hbar * DEG) +
    0.32 * Math.cos((3 * hbar + 6) * DEG) -
    0.2 * Math.cos((4 * hbar - 63) * DEG);
  const dTheta = 30 * Math.exp(-(((hbar - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + POW25_7));
  const l50 = (Lbar - 50) ** 2;
  const SL = 1 + (0.015 * l50) / Math.sqrt(20 + l50);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(2 * dTheta * DEG) * RC;
  const tL = dL / SL;
  const tC = dC / SC;
  const tH = dH / SH;
  return Math.sqrt(tL * tL + tC * tC + tH * tH + RT * tC * tH);
}

function hueDeg(b: number, a: number): number {
  const h = Math.atan2(b, a) / DEG;
  return h < 0 ? h + 360 : h;
}

// ---------------------------------------------------------------------------
// Hex
// ---------------------------------------------------------------------------

/** '#RRGGBB' (or 'RRGGBB', or '#RGB') to 8-bit channels. Throws on anything else. */
export function hexToRgb8(hex: Hex): Vec3 {
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not a hex colour: ${hex}`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgb8ToHex(r: number, g: number, b: number): Hex {
  const p = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

export function hexToLinear(hex: Hex): Vec3 {
  const [r, g, b] = hexToRgb8(hex);
  return [SRGB8_TO_LINEAR[r], SRGB8_TO_LINEAR[g], SRGB8_TO_LINEAR[b]];
}

export function hexToLab(hex: Hex): Lab {
  const [r, g, b] = hexToRgb8(hex);
  return rgb8ToLab(r, g, b);
}

/** Linear sRGB (clamped to the gamut) to '#RRGGBB'. */
export function linearToHex(r: number, g: number, b: number): Hex {
  return rgb8ToHex(linearToSrgb8(r), linearToSrgb8(g), linearToSrgb8(b));
}

/** Rounds a Lab value for output (two decimals keep JSON small and stable). */
export function roundLab(lab: Lab): Lab {
  const r = (v: number): number => Math.round(v * 100) / 100;
  return { L: r(lab.L), a: r(lab.a), b: r(lab.b) };
}

/** CIE L* (D50 and D65 agree on lightness) of linear sRGB. */
export function lightness(r: number, g: number, b: number): number {
  return 116 * labF(0.2225045 * r + 0.7168786 * g + 0.0606169 * b) - 16;
}
