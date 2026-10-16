// Index separations: the best small mix of inks for a colour. Cells mix by
// area in linear light, so two inks make the colours on the line between
// them, three the triangle, four the tetrahedron. For a colour this finds the
// mix of one to four of its nearest inks (the garment counts as one) that
// comes nearest it in OKLab, with a charge for grain (how far apart the mixed
// colours are) and a smaller one per extra ink, so a flat colour prints as
// one ink when one is near enough, else as two, and only rarely as more.
// The dither quantises each cell among its colour's mix only (as minimum
// brightness variation halftoning does with its quadruples): no stray cells
// of far-off inks, and a colour the inks cannot reach aims for its nearest
// mix, so the error never runs away. The palette is scored the same way.
import { linearToOklab } from './colour';

/** Grain charge per unit of RMS OKLab spread of the mixed colours. */
export const GRAIN = 0.1;
/** Charge per ink beyond the first (OKLab). */
export const EXTRA_INK = 0.002;
/** Inks considered for a colour's mix: its nearest few. */
const NEAREST = 7;
/** Four-ink mixes come from the nearest five. */
const NEAREST_QUAD = 5;

export interface Mix {
  /** inks in the mix, 1..4 */
  n: number;
  /** point indices */
  idx: Int32Array;
  /** area shares, summing to 1 */
  w: Float64Array;
  /** the mixed colour, linear */
  lin: Float64Array;
  /** OKLab distance from the colour to the mix */
  dist: number;
  /** dist plus the grain and extra-ink charges */
  cost: number;
}

export function newMix(): Mix {
  return { n: 0, idx: new Int32Array(4), w: new Float64Array(4), lin: new Float64Array(3), dist: Infinity, cost: Infinity };
}

export class MixFinder {
  readonly P: number;
  private readonly order: Int32Array;
  private readonly dist: Float64Array;
  private readonly ok = new Float64Array(3);

  /** lin, ok: P points x 3 (linear RGB and OKLab), interleaved */
  constructor(
    readonly lin: Float64Array,
    readonly okp: Float64Array,
  ) {
    this.P = lin.length / 3;
    this.order = new Int32Array(this.P);
    this.dist = new Float64Array(this.P);
  }

  /**
   * The best mix for the colour x (linear x0..x2, OKLab o0..o2), written to
   * out. `grain` scales the grain charge: 0 where a mix is only an edge's
   * anti-aliasing, not an area the eye sees as grain.
   */
  best(x0: number, x1: number, x2: number, o0: number, o1: number, o2: number, out: Mix, grain = 1): Mix {
    const G = GRAIN * grain;
    const { P, lin: L, okp: K, order, dist } = this;
    for (let p = 0; p < P; p++) {
      dist[p] = Math.hypot(K[p * 3] - o0, K[p * 3 + 1] - o1, K[p * 3 + 2] - o2);
      order[p] = p;
    }
    // the nearest few, by insertion (P is small)
    const N = Math.min(NEAREST, P);
    for (let i = 1; i < P; i++) {
      const v = order[i];
      let j = i - 1;
      while (j >= 0 && (dist[order[j]] > dist[v] || (dist[order[j]] === dist[v] && order[j] > v))) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = v;
    }
    const a0 = order[0];
    out.n = 1;
    out.idx[0] = a0;
    out.w[0] = 1;
    out.lin[0] = L[a0 * 3];
    out.lin[1] = L[a0 * 3 + 1];
    out.lin[2] = L[a0 * 3 + 2];
    out.dist = dist[a0];
    out.cost = dist[a0];
    const ok = this.ok;
    // pairs
    for (let i = 0; i < N; i++) {
      const p = order[i];
      for (let j = i + 1; j < N; j++) {
        const q = order[j];
        const e0 = L[q * 3] - L[p * 3];
        const e1 = L[q * 3 + 1] - L[p * 3 + 1];
        const e2 = L[q * 3 + 2] - L[p * 3 + 2];
        const len2 = e0 * e0 + e1 * e1 + e2 * e2;
        if (len2 <= 0) continue;
        const t = ((x0 - L[p * 3]) * e0 + (x1 - L[p * 3 + 1]) * e1 + (x2 - L[p * 3 + 2]) * e2) / len2;
        if (!(t > 1e-6 && t < 1 - 1e-6)) continue;
        const m0 = L[p * 3] + t * e0;
        const m1 = L[p * 3 + 1] + t * e1;
        const m2 = L[p * 3 + 2] + t * e2;
        linearToOklab(m0, m1, m2, ok);
        const d = Math.hypot(ok[0] - o0, ok[1] - o1, ok[2] - o2);
        const spread = Math.sqrt(t * (1 - t)) * Math.hypot(K[q * 3] - K[p * 3], K[q * 3 + 1] - K[p * 3 + 1], K[q * 3 + 2] - K[p * 3 + 2]);
        const cost = d + G * spread + EXTRA_INK;
        if (cost < out.cost) {
          out.n = 2;
          out.idx[0] = p;
          out.idx[1] = q;
          out.w[0] = 1 - t;
          out.w[1] = t;
          out.lin[0] = m0;
          out.lin[1] = m1;
          out.lin[2] = m2;
          out.dist = d;
          out.cost = cost;
        }
      }
    }
    // triples: the nearest point inside the triangle (edges are pairs, already scored)
    const w3 = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        for (let k = j + 1; k < N; k++) {
          const a = order[i];
          const b = order[j];
          const c = order[k];
          if (!insideTriangle(L, a, b, c, x0, x1, x2, w3)) continue;
          const m0 = w3[0] * L[a * 3] + w3[1] * L[b * 3] + w3[2] * L[c * 3];
          const m1 = w3[0] * L[a * 3 + 1] + w3[1] * L[b * 3 + 1] + w3[2] * L[c * 3 + 1];
          const m2 = w3[0] * L[a * 3 + 2] + w3[1] * L[b * 3 + 2] + w3[2] * L[c * 3 + 2];
          linearToOklab(m0, m1, m2, ok);
          const d = Math.hypot(ok[0] - o0, ok[1] - o1, ok[2] - o2);
          if (d + 2 * EXTRA_INK >= out.cost) continue;
          const cost = d + G * spreadOf(K, [a, b, c], w3, 3) + 2 * EXTRA_INK;
          if (cost < out.cost) {
            out.n = 3;
            out.idx[0] = a;
            out.idx[1] = b;
            out.idx[2] = c;
            out.w[0] = w3[0];
            out.w[1] = w3[1];
            out.w[2] = w3[2];
            out.lin[0] = m0;
            out.lin[1] = m1;
            out.lin[2] = m2;
            out.dist = d;
            out.cost = cost;
          }
        }
      }
    }
    // four inks: only a colour inside the tetrahedron (its faces are triples)
    const NQ = Math.min(NEAREST_QUAD, P);
    const w4 = [0, 0, 0, 0];
    if (out.cost > 3 * EXTRA_INK) {
      for (let i = 0; i < NQ; i++) {
        for (let j = i + 1; j < NQ; j++) {
          for (let k = j + 1; k < NQ; k++) {
            for (let l = k + 1; l < NQ; l++) {
              const ids = [order[i], order[j], order[k], order[l]];
              if (!insideTetrahedron(L, ids, x0, x1, x2, w4)) continue;
              const cost = G * spreadOf(K, ids, w4, 4) + 3 * EXTRA_INK;
              if (cost < out.cost) {
                out.n = 4;
                for (let s = 0; s < 4; s++) {
                  out.idx[s] = ids[s];
                  out.w[s] = w4[s];
                }
                out.lin[0] = x0;
                out.lin[1] = x1;
                out.lin[2] = x2;
                out.dist = 0;
                out.cost = cost;
              }
            }
          }
        }
      }
    }
    return out;
  }
}

/** RMS OKLab spread of the mixed colours about their mean. */
function spreadOf(K: Float64Array, ids: number[], w: number[], n: number): number {
  let m0 = 0;
  let m1 = 0;
  let m2 = 0;
  for (let s = 0; s < n; s++) {
    m0 += w[s] * K[ids[s] * 3];
    m1 += w[s] * K[ids[s] * 3 + 1];
    m2 += w[s] * K[ids[s] * 3 + 2];
  }
  let v = 0;
  for (let s = 0; s < n; s++) v += w[s] * ((K[ids[s] * 3] - m0) ** 2 + (K[ids[s] * 3 + 1] - m1) ** 2 + (K[ids[s] * 3 + 2] - m2) ** 2);
  return Math.sqrt(Math.max(0, v));
}

/**
 * Barycentric weights of the point of triangle abc nearest x (linear RGB),
 * when that point is strictly inside (all three inks used); false when the
 * nearest point is on an edge or corner, or the triangle is degenerate.
 */
function insideTriangle(L: Float64Array, a: number, b: number, c: number, x0: number, x1: number, x2: number, w: number[]): boolean {
  const ab0 = L[b * 3] - L[a * 3];
  const ab1 = L[b * 3 + 1] - L[a * 3 + 1];
  const ab2 = L[b * 3 + 2] - L[a * 3 + 2];
  const ac0 = L[c * 3] - L[a * 3];
  const ac1 = L[c * 3 + 1] - L[a * 3 + 1];
  const ac2 = L[c * 3 + 2] - L[a * 3 + 2];
  const ap0 = x0 - L[a * 3];
  const ap1 = x1 - L[a * 3 + 1];
  const ap2 = x2 - L[a * 3 + 2];
  const d00 = ab0 * ab0 + ab1 * ab1 + ab2 * ab2;
  const d01 = ab0 * ac0 + ab1 * ac1 + ab2 * ac2;
  const d11 = ac0 * ac0 + ac1 * ac1 + ac2 * ac2;
  const d20 = ap0 * ab0 + ap1 * ab1 + ap2 * ab2;
  const d21 = ap0 * ac0 + ap1 * ac1 + ap2 * ac2;
  const den = d00 * d11 - d01 * d01;
  if (!(den > 1e-14 * (d00 * d11 + 1e-30))) return false;
  // projection onto the triangle's plane, in barycentric terms
  const v = (d11 * d20 - d01 * d21) / den;
  const u = (d00 * d21 - d01 * d20) / den;
  const s = 1 - v - u;
  if (!(s > 1e-6 && v > 1e-6 && u > 1e-6)) return false;
  w[0] = s;
  w[1] = v;
  w[2] = u;
  return true;
}

/** Barycentric weights of x in the tetrahedron, when x is strictly inside it. */
function insideTetrahedron(L: Float64Array, ids: number[], x0: number, x1: number, x2: number, w: number[]): boolean {
  const [a, b, c, d] = ids;
  const m00 = L[b * 3] - L[a * 3];
  const m10 = L[b * 3 + 1] - L[a * 3 + 1];
  const m20 = L[b * 3 + 2] - L[a * 3 + 2];
  const m01 = L[c * 3] - L[a * 3];
  const m11 = L[c * 3 + 1] - L[a * 3 + 1];
  const m21 = L[c * 3 + 2] - L[a * 3 + 2];
  const m02 = L[d * 3] - L[a * 3];
  const m12 = L[d * 3 + 1] - L[a * 3 + 1];
  const m22 = L[d * 3 + 2] - L[a * 3 + 2];
  const r0 = x0 - L[a * 3];
  const r1 = x1 - L[a * 3 + 1];
  const r2 = x2 - L[a * 3 + 2];
  const det = m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20);
  if (Math.abs(det) < 1e-12) return false;
  const wb = (r0 * (m11 * m22 - m12 * m21) - m01 * (r1 * m22 - m12 * r2) + m02 * (r1 * m21 - m11 * r2)) / det;
  const wc = (m00 * (r1 * m22 - m12 * r2) - r0 * (m10 * m22 - m12 * m20) + m02 * (m10 * r2 - r1 * m20)) / det;
  const wd = (m00 * (m11 * r2 - r1 * m21) - m01 * (m10 * r2 - r1 * m20) + r0 * (m10 * m21 - m11 * m20)) / det;
  const wa = 1 - wb - wc - wd;
  if (!(wa > 1e-6 && wb > 1e-6 && wc > 1e-6 && wd > 1e-6)) return false;
  w[0] = wa;
  w[1] = wb;
  w[2] = wc;
  w[3] = wd;
  return true;
}
