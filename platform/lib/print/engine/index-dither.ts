// Index separations, step 3: one ink per cell, by error diffusion
// (serpentine Floyd-Steinberg).
//
// - Each colour first gets its mix (index-mix.ts): the one to four nearby
//   inks (or the garment) whose area mix comes nearest it. A cell picks among
//   its colour's mix only, the one nearest in OKLab to what the cell wants
//   (its colour's mix plus the error passed to it). No far-off ink is ever
//   sprinkled in, and a colour the inks cannot reach aims for its nearest
//   mix, so the error stays bounded.
// - The error is carried in linear light. Cells mix by area in linear light,
//   which is how the eye averages them and how the proof model mixes dots,
//   so the dither's average is the art's colour in the proof too. (Carried in
//   OKLab, the cells' OKLab average hits the art instead: a half-and-half mix
//   of an ink and the shirt gets about 72% ink on black and 34% on white,
//   6 to 9 ΔE off.)
// - Floyd-Steinberg, not Jarvis: the error stays within one cell, so the
//   edges of flat shapes stay crisp and a residue never bleeds across them;
//   flat art (the index use) has few of the long gradients where Jarvis's
//   wider kernel looks smoother; and it is 4 neighbours a cell, not 12.
//   Serpentine rows remove the drift a one-way scan leaves.
// - A colour within SNAP_OK of an ink (or the garment), or best matched by
//   one ink alone, prints that solid and passes no error on: flat colours
//   print as clean solids, not speckle.
// - The error only flows to neighbours that dither too and whose art colour
//   is within EDGE_OK: each flat colour dithers on its own, and no residue
//   crosses into the next shape or onto the shirt.
// No randomness here (the palette's k-means is seeded): the same cells and
// inks always give the same labels.
import { SRGB8_TO_LINEAR, linearToOklab, type Vec3 } from './colour';
import { GARMENT } from './classify';
import { BIN7_TO_LINEAR, key7, ok7Table, type CellGrid } from './index-cells';
import { MixFinder, newMix } from './index-mix';

/** A colour within this of an ink prints it solid (OKLab, about 2 ΔE). */
export const SNAP_OK = 0.02;
/** Error flows only between cells whose art colours are within this (OKLab). */
export const EDGE_OK = 0.05;

const FS_RIGHT = 7 / 16;
const FS_DOWN_BACK = 3 / 16;
const FS_DOWN = 5 / 16;
const FS_DOWN_FWD = 1 / 16;

/**
 * Labels every cell with one ink (its index in `inks`) or GARMENT. `inks`
 * are the art colours the inks stand for, linear; `garment` the garment's.
 * Cells outside the art body are garment.
 */
export function ditherCells(cells: CellGrid, inks: Vec3[], garment: Vec3): Uint8Array {
  const K = inks.length;
  if (K > 250) throw new Error('ditherCells: too many inks');
  const P = K + 1;
  const pl = new Float64Array(P * 3);
  const po = new Float64Array(P * 3);
  const q: Vec3 = [0, 0, 0];
  for (let p = 0; p < P; p++) {
    const c = p === K ? garment : inks[p];
    pl[p * 3] = c[0];
    pl[p * 3 + 1] = c[1];
    pl[p * 3 + 2] = c[2];
    linearToOklab(c[0], c[1], c[2], q);
    po[p * 3] = q[0];
    po[p * 3 + 1] = q[1];
    po[p * 3 + 2] = q[2];
  }
  const labelOf = (p: number): number => (p === K ? GARMENT : p);
  const OK = ok7Table();
  const finder = new MixFinder(pl, po);
  const mix = newMix();
  // per 7-bit colour: 0 unknown; s > 0 solid point s - 1; s < 0 mix record -s - 1
  const state = new Int32Array(1 << 21);
  let mixN = new Uint8Array(256);
  let mixIdx = new Uint8Array(256 * 4);
  let corr = new Float32Array(256 * 3);
  let records = 0;
  const snap2 = SNAP_OK * SNAP_OK;
  const edge2 = EDGE_OK * EDGE_OK;
  const classify = (key: number): number => {
    const o = key * 3;
    const x0 = OK[o];
    const x1 = OK[o + 1];
    const x2 = OK[o + 2];
    let bp = 0;
    let bd = Infinity;
    for (let p = 0; p < P; p++) {
      const d = (po[p * 3] - x0) ** 2 + (po[p * 3 + 1] - x1) ** 2 + (po[p * 3 + 2] - x2) ** 2;
      if (d < bd) {
        bd = d;
        bp = p;
      }
    }
    if (bd < snap2) return 1 + bp;
    const l0 = BIN7_TO_LINEAR[key >> 14];
    const l1 = BIN7_TO_LINEAR[(key >> 7) & 127];
    const l2 = BIN7_TO_LINEAR[key & 127];
    finder.best(l0, l1, l2, x0, x1, x2, mix);
    if (mix.n === 1) return 1 + mix.idx[0];
    if (records === mixN.length) {
      const n2 = mixN.length * 2;
      const a = new Uint8Array(n2);
      a.set(mixN);
      mixN = a;
      const b = new Uint8Array(n2 * 4);
      b.set(mixIdx);
      mixIdx = b;
      const c = new Float32Array(n2 * 3);
      c.set(corr);
      corr = c;
    }
    const r = records++;
    mixN[r] = mix.n;
    for (let s = 0; s < mix.n; s++) mixIdx[r * 4 + s] = mix.idx[s];
    corr[r * 3] = mix.lin[0] - l0;
    corr[r * 3 + 1] = mix.lin[1] - l1;
    corr[r * 3 + 2] = mix.lin[2] - l2;
    return -(r + 1);
  };

  const { cw, ch, rgb, body } = cells;
  const labels = new Uint8Array(cw * ch).fill(GARMENT);
  let errA = new Float64Array(cw * 3);
  let errB = new Float64Array(cw * 3);
  const wok: Vec3 = [0, 0, 0];
  // may cell j take error from a cell of 7-bit colour `key`? (it dithers too, and looks alike)
  const takes = (j: number, key: number): boolean => {
    if (!body[j]) return false;
    const kj = key7(rgb[j * 3], rgb[j * 3 + 1], rgb[j * 3 + 2]);
    let s = state[kj];
    if (s === 0) s = state[kj] = classify(kj);
    if (s > 0) return false;
    const a = kj * 3;
    const b = key * 3;
    return (OK[a] - OK[b]) ** 2 + (OK[a + 1] - OK[b + 1]) ** 2 + (OK[a + 2] - OK[b + 2]) ** 2 < edge2;
  };
  for (let y = 0; y < ch; y++) {
    const ltr = (y & 1) === 0;
    const dir = ltr ? 1 : -1;
    const below = y + 1 < ch;
    errB.fill(0);
    for (let s = 0; s < cw; s++) {
      const x = ltr ? s : cw - 1 - s;
      const i = y * cw + x;
      if (!body[i]) continue;
      const r = rgb[i * 3];
      const g = rgb[i * 3 + 1];
      const b = rgb[i * 3 + 2];
      const key = key7(r, g, b);
      let st = state[key];
      if (st === 0) st = state[key] = classify(key);
      if (st > 0) {
        labels[i] = labelOf(st - 1);
        continue;
      }
      const rec = -st - 1;
      const w0 = SRGB8_TO_LINEAR[r] + corr[rec * 3] + errA[x * 3];
      const w1 = SRGB8_TO_LINEAR[g] + corr[rec * 3 + 1] + errA[x * 3 + 1];
      const w2 = SRGB8_TO_LINEAR[b] + corr[rec * 3 + 2] + errA[x * 3 + 2];
      linearToOklab(w0, w1, w2, wok);
      let bp = mixIdx[rec * 4];
      let bd = Infinity;
      for (let m = 0; m < mixN[rec]; m++) {
        const p = mixIdx[rec * 4 + m];
        const d = (po[p * 3] - wok[0]) ** 2 + (po[p * 3 + 1] - wok[1]) ** 2 + (po[p * 3 + 2] - wok[2]) ** 2;
        if (d < bd) {
          bd = d;
          bp = p;
        }
      }
      labels[i] = labelOf(bp);
      const e0 = w0 - pl[bp * 3];
      const e1 = w1 - pl[bp * 3 + 1];
      const e2 = w2 - pl[bp * 3 + 2];
      // Floyd-Steinberg, renormalised over the neighbours that may take it
      const xr = x + dir;
      const xb = x - dir;
      const inR = xr >= 0 && xr < cw;
      const inB = xb >= 0 && xb < cw;
      const row = y * cw;
      const next = row + cw;
      const aR = inR && takes(row + xr, key) ? FS_RIGHT : 0;
      const aDB = below && inB && takes(next + xb, key) ? FS_DOWN_BACK : 0;
      const aD = below && takes(next + x, key) ? FS_DOWN : 0;
      const aDF = below && inR && takes(next + xr, key) ? FS_DOWN_FWD : 0;
      const sum = aR + aDB + aD + aDF;
      if (sum <= 0) continue;
      const f = 1 / sum;
      if (aR) {
        const k = aR * f;
        errA[xr * 3] += e0 * k;
        errA[xr * 3 + 1] += e1 * k;
        errA[xr * 3 + 2] += e2 * k;
      }
      if (aDB) {
        const k = aDB * f;
        errB[xb * 3] += e0 * k;
        errB[xb * 3 + 1] += e1 * k;
        errB[xb * 3 + 2] += e2 * k;
      }
      if (aD) {
        const k = aD * f;
        errB[x * 3] += e0 * k;
        errB[x * 3 + 1] += e1 * k;
        errB[x * 3 + 2] += e2 * k;
      }
      if (aDF) {
        const k = aDF * f;
        errB[xr * 3] += e0 * k;
        errB[xr * 3 + 1] += e1 * k;
        errB[xr * 3 + 2] += e2 * k;
      }
    }
    const t = errA;
    errA = errB;
    errB = t;
  }
  return labels;
}
