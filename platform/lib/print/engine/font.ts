// A small stroke font for film labels. Built in so labels render the same
// bytes on every machine (no system fonts, no text shaping). Glyphs are
// polylines on a grid 4 units wide and 6 high (baseline y = 0, cap height
// y = 6); a single point is a dot. Lower case is drawn as upper case.

export type Stroke = number[];

export interface Glyph {
  /** advance width in grid units, before the 1-unit letter gap */
  width: number;
  strokes: Stroke[];
}

const O = [1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 1, 3, 0, 1, 0];
const P = [0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3];

const G: Record<string, Glyph> = {
  A: { width: 4, strokes: [[0, 0, 0, 4, 2, 6, 4, 4, 4, 0], [0, 3, 4, 3]] },
  B: { width: 4, strokes: [[0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3], [3, 3, 4, 2, 4, 1, 3, 0, 0, 0]] },
  C: { width: 4, strokes: [[4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0, 3, 0, 4, 1]] },
  D: { width: 4, strokes: [[0, 0, 0, 6, 2, 6, 4, 4, 4, 2, 2, 0, 0, 0]] },
  E: { width: 4, strokes: [[4, 6, 0, 6, 0, 0, 4, 0], [0, 3, 3, 3]] },
  F: { width: 4, strokes: [[4, 6, 0, 6, 0, 0], [0, 3, 3, 3]] },
  G: { width: 4, strokes: [[4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0, 3, 0, 4, 1, 4, 3, 2, 3]] },
  H: { width: 4, strokes: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]] },
  I: { width: 2, strokes: [[0, 6, 2, 6], [1, 6, 1, 0], [0, 0, 2, 0]] },
  J: { width: 4, strokes: [[4, 6, 4, 1, 3, 0, 1, 0, 0, 1]] },
  K: { width: 4, strokes: [[0, 0, 0, 6], [4, 6, 0, 2], [1, 3, 4, 0]] },
  L: { width: 4, strokes: [[0, 6, 0, 0, 4, 0]] },
  M: { width: 4, strokes: [[0, 0, 0, 6, 2, 3, 4, 6, 4, 0]] },
  N: { width: 4, strokes: [[0, 0, 0, 6, 4, 0, 4, 6]] },
  O: { width: 4, strokes: [O] },
  P: { width: 4, strokes: [P] },
  Q: { width: 4, strokes: [O, [2, 2, 4, 0]] },
  R: { width: 4, strokes: [P, [2, 3, 4, 0]] },
  S: { width: 4, strokes: [[4, 5, 3, 6, 1, 6, 0, 5, 0, 4, 1, 3, 3, 3, 4, 2, 4, 1, 3, 0, 1, 0, 0, 1]] },
  T: { width: 4, strokes: [[0, 6, 4, 6], [2, 6, 2, 0]] },
  U: { width: 4, strokes: [[0, 6, 0, 1, 1, 0, 3, 0, 4, 1, 4, 6]] },
  V: { width: 4, strokes: [[0, 6, 2, 0, 4, 6]] },
  W: { width: 4, strokes: [[0, 6, 1, 0, 2, 4, 3, 0, 4, 6]] },
  X: { width: 4, strokes: [[0, 6, 4, 0], [0, 0, 4, 6]] },
  Y: { width: 4, strokes: [[0, 6, 2, 3, 4, 6], [2, 3, 2, 0]] },
  Z: { width: 4, strokes: [[0, 6, 4, 6, 0, 0, 4, 0]] },
  '0': { width: 4, strokes: [O, [4, 5, 0, 1]] },
  '1': { width: 4, strokes: [[1, 5, 2, 6, 2, 0], [1, 0, 3, 0]] },
  '2': { width: 4, strokes: [[0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 0, 0, 4, 0]] },
  '3': { width: 4, strokes: [[0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3, 4, 2, 4, 1, 3, 0, 1, 0, 0, 1], [1, 3, 3, 3]] },
  '4': { width: 4, strokes: [[3, 0, 3, 6, 0, 2, 4, 2]] },
  '5': { width: 4, strokes: [[4, 6, 0, 6, 0, 3, 3, 3, 4, 2, 4, 1, 3, 0, 1, 0, 0, 1]] },
  '6': { width: 4, strokes: [[4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3]] },
  '7': { width: 4, strokes: [[0, 6, 4, 6, 1, 0]] },
  '8': { width: 4, strokes: [[1, 3, 0, 4, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3, 1, 3, 0, 2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3]] },
  '9': { width: 4, strokes: [[0, 1, 1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 4, 1, 3, 4, 3]] },
  ' ': { width: 3, strokes: [] },
  '.': { width: 1, strokes: [[0.5, 0]] },
  ',': { width: 1, strokes: [[0.6, 0.4, 0.2, -1]] },
  ':': { width: 1, strokes: [[0.5, 1], [0.5, 4.5]] },
  '·': { width: 1, strokes: [[0.5, 3]] },
  '•': { width: 1, strokes: [[0.5, 3]] },
  '…': { width: 4, strokes: [[0.5, 0], [2, 0], [3.5, 0]] },
  '-': { width: 3, strokes: [[0, 3, 3, 3]] },
  '–': { width: 4, strokes: [[0, 3, 4, 3]] },
  '_': { width: 4, strokes: [[0, -0.5, 4, -0.5]] },
  '+': { width: 4, strokes: [[2, 1, 2, 5], [0, 3, 4, 3]] },
  '=': { width: 4, strokes: [[0, 2, 4, 2], [0, 4, 4, 4]] },
  '/': { width: 4, strokes: [[0, 0, 4, 6]] },
  '#': { width: 4, strokes: [[1, 0.5, 1.5, 5.5], [2.5, 0.5, 3, 5.5], [0, 2, 4, 2], [0, 4, 4, 4]] },
  '%': { width: 4, strokes: [[0, 0, 4, 6], [0.5, 5, 1.5, 5, 1.5, 6, 0.5, 6, 0.5, 5], [2.5, 0, 3.5, 0, 3.5, 1, 2.5, 1, 2.5, 0]] },
  '°': { width: 2, strokes: [[0, 5, 1, 6, 2, 5, 1, 4, 0, 5]] },
  '(': { width: 2, strokes: [[2, 6, 0.8, 4.5, 0.8, 1.5, 2, 0]] },
  ')': { width: 2, strokes: [[0, 6, 1.2, 4.5, 1.2, 1.5, 0, 0]] },
  '×': { width: 4, strokes: [[0.5, 1, 3.5, 5], [0.5, 5, 3.5, 1]] },
  "'": { width: 1, strokes: [[0.5, 6, 0.5, 4.5]] },
  '’': { width: 1, strokes: [[0.6, 6, 0.4, 4.5]] },
  '&': { width: 4, strokes: [[4, 0, 0.5, 4.5, 0.5, 5.5, 1.5, 6, 2.5, 5.5, 2.5, 4.5, 0, 2, 0, 1, 1, 0, 2.5, 0, 4, 2]] },
  '?': { width: 4, strokes: [[0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 2, 2.5, 2, 1.5], [2, 0]] },
  '!': { width: 1, strokes: [[0.5, 6, 0.5, 1.5], [0.5, 0]] },
  '↑': { width: 4, strokes: [[2, 0, 2, 6], [0, 4, 2, 6, 4, 4]] },
};

const FALLBACK = G['?'];

export function glyphFor(ch: string): Glyph {
  return G[ch] ?? G[ch.toUpperCase()] ?? FALLBACK;
}

/** Text width in grid units (glyph widths plus 1-unit gaps, no trailing gap). */
export function textUnits(text: string): number {
  let w = 0;
  const chars = Array.from(text);
  chars.forEach((ch, i) => {
    w += glyphFor(ch).width + (i < chars.length - 1 ? 1 : 0);
  });
  return w;
}

/** Cap height in grid units. */
export const CAP_UNITS = 6;
