// Synthetic artwork for engine tests: flat shapes with anti-aliased edges
// (4x4 supersampling, sRGB "normal" blending, as drawing tools do) and soft
// glows. Test support only; nothing in the engine imports it.
import { createHash } from 'node:crypto';
import type { GarmentColour, PlateLabelInfo, Raster } from '@/lib/print/types';

export type Rgb = [number, number, number];

export type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; colour: Rgb; alpha?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; colour: Rgb; alpha?: number }
  | { kind: 'ring'; cx: number; cy: number; r: number; width: number; colour: Rgb }
  /** alpha falls off linearly from the centre to r */
  | { kind: 'glow'; cx: number; cy: number; r: number; colour: Rgb };

const SS = 4;

function inside(s: Shape, x: number, y: number): number {
  switch (s.kind) {
    case 'rect':
      return x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h ? 1 : 0;
    case 'circle':
      return (x - s.cx) ** 2 + (y - s.cy) ** 2 <= s.r * s.r ? 1 : 0;
    case 'ring': {
      const d = Math.hypot(x - s.cx, y - s.cy);
      return Math.abs(d - s.r) <= s.width / 2 ? 1 : 0;
    }
    case 'glow': {
      const d = Math.hypot(x - s.cx, y - s.cy);
      return d >= s.r ? 0 : 1 - d / s.r;
    }
  }
}

/** Draws shapes in order over a background (straight-alpha RGBA, 72 ppi metadata). */
export function drawArt(width: number, height: number, shapes: Shape[], background: [number, number, number, number] = [0, 0, 0, 0]): Raster {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = background[0];
      let g = background[1];
      let b = background[2];
      let a = background[3] / 255;
      for (const s of shapes) {
        let cov = 0;
        if (s.kind === 'glow') {
          cov = inside(s, x + 0.5, y + 0.5);
        } else {
          for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) cov += inside(s, x + (i + 0.5) / SS, y + (j + 0.5) / SS);
          cov /= SS * SS;
        }
        const sa = cov * ('alpha' in s && s.alpha !== undefined ? s.alpha : 1);
        if (sa <= 0) continue;
        const outA = sa + a * (1 - sa);
        r = (s.colour[0] * sa + r * a * (1 - sa)) / outA;
        g = (s.colour[1] * sa + g * a * (1 - sa)) / outA;
        b = (s.colour[2] * sa + b * a * (1 - sa)) / outA;
        a = outA;
      }
      const o = (y * width + x) * 4;
      data[o] = Math.round(r);
      data[o + 1] = Math.round(g);
      data[o + 2] = Math.round(b);
      data[o + 3] = Math.round(a * 255);
    }
  }
  return { width, height, channels: 4, data, ppi: 72 };
}

export const BLACK: GarmentColour = { code: 'C002', name: 'Black', hex: '#1B1C1E', isLight: false };
export const NAVY: GarmentColour = { code: 'C727', name: 'French Navy', hex: '#222A3D', isLight: false };
export const WHITE: GarmentColour = { code: 'C001', name: 'White', hex: '#F3F3F1', isLight: true };

export const LABEL: PlateLabelInfo = { designCode: 'MF-TEST', version: 1, placementLabel: 'Front' };

export function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Values present in a buffer (for binary checks). */
export function distinctValues(data: Uint8Array, step = 1): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < data.length; i += step) out.add(data[i]);
  return out;
}
