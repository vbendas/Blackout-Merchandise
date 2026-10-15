// Colour helpers for the pack, on top of the engine's colour maths (CIE Lab
// D50 with Bradford adaptation, CIEDE2000), so the checks judge knockout with
// exactly the rule the engine used.
import { deltaE2000, hexToLab, hexToRgb8, rgb8ToLab } from '@/lib/print/engine';
import type { Hex, Lab } from '@/lib/print/types';

export { deltaE2000, hexToLab };

export function hexToRgb(hex: Hex): [number, number, number] {
  const v = hexToRgb8(hex);
  return [v[0], v[1], v[2]];
}

/** 8-bit sRGB to CIELab D50. */
export function srgbToLab(r: number, g: number, b: number): Lab {
  return rgb8ToLab(r, g, b);
}

/** True for a garment the art's whites should not print on (Plan 4.4): near
 * paper white, as the DTG branch treats it when the engine gives no flag. */
export function isWhiteGarment(hex: Hex): boolean {
  const lab = hexToLab(hex);
  return lab.L >= 90 && Math.hypot(lab.a, lab.b) <= 8;
}
