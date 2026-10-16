// The print model of a simulated-process set, made fast enough to invert:
// every plate shares one screen, so the dots of all plates nest and a spot's
// colour is the area-weighted sum of a few stacks (model.ts,
// nestedCoverageColour). Sorting the coverages once gives the colour and its
// exact derivative per plate: raising plate j's coverage moves area from the
// stack of the plates above j to that stack with j added.
//
// AreaSolver finds what prints a target colour. Its unknowns are the areas
// each plate shows on top (and the bare garment), not the coverages: nest()
// turns areas into coverages with one fixed nesting (later plates inside
// earlier ones), so the ordering of the dots never flips inside the solve and
// the error is close to convex in the areas. Levenberg-Marquardt on the
// error in ΔE2000-like units (OK_WEIGHT), with a linear cost per area (it
// prefers solids near the target), a small ridge, the areas summing to one,
// and the wet ink limit as a penalty.
import type { Vec3 } from './colour';
import type { ModelLayer } from './model';

const M1 = [0.4122214708, 0.5363325363, 0.0514459929, 0.2119034982, 0.6806995451, 0.1073969566, 0.0883024619, 0.2817188376, 0.6299787005];
const M2 = [0.2104542553, 0.793617785, -0.0040720468, 1.9779984951, -2.428592205, 0.4505937099, 0.0259040371, 0.7827717662, -0.808675766];

/** OKLab of linear sRGB into out; with jac, d(OKLab)/d(rgb) row-major. Matches colour.ts linearToOklab. */
export function oklabWithJacobian(r: number, g: number, b: number, out: Float64Array, jac?: Float64Array): void {
  const l = Math.max(1e-10, M1[0] * r + M1[1] * g + M1[2] * b);
  const m = Math.max(1e-10, M1[3] * r + M1[4] * g + M1[5] * b);
  const s = Math.max(1e-10, M1[6] * r + M1[7] * g + M1[8] * b);
  const lc = Math.cbrt(l);
  const mc = Math.cbrt(m);
  const sc = Math.cbrt(s);
  out[0] = M2[0] * lc + M2[1] * mc + M2[2] * sc;
  out[1] = M2[3] * lc + M2[4] * mc + M2[5] * sc;
  out[2] = M2[6] * lc + M2[7] * mc + M2[8] * sc;
  if (!jac) return;
  const dl = 1 / (3 * lc * lc);
  const dm = 1 / (3 * mc * mc);
  const ds = 1 / (3 * sc * sc);
  for (let row = 0; row < 3; row++) {
    const a = M2[row * 3] * dl;
    const bb = M2[row * 3 + 1] * dm;
    const cc = M2[row * 3 + 2] * ds;
    for (let col = 0; col < 3; col++) jac[row * 3 + col] = a * M1[col] + bb * M1[3 + col] + cc * M1[6 + col];
  }
}

/** Nested halftone model of one set on one garment: plates in press order. */
export class NestedModel {
  readonly n: number;
  private readonly col: Float64Array;
  private readonly op: Float64Array;
  private readonly g: Float64Array;
  private readonly order: Int32Array;
  private readonly rank: Int32Array;
  /** stacks[k]: colour of the first k plates by coverage, printed in press order */
  private readonly stacks: Float64Array;
  private readonly cc: Float64Array;
  private readonly tmp3 = new Float64Array(3);

  constructor(garment: Vec3, layers: ModelLayer[]) {
    const n = layers.length;
    this.n = n;
    this.col = new Float64Array(n * 3);
    this.op = new Float64Array(n);
    layers.forEach((l, i) => {
      this.col[i * 3] = l.colour[0];
      this.col[i * 3 + 1] = l.colour[1];
      this.col[i * 3 + 2] = l.colour[2];
      this.op[i] = l.opacity;
    });
    this.g = Float64Array.from(garment);
    this.order = new Int32Array(n);
    this.rank = new Int32Array(n);
    this.stacks = new Float64Array((n + 1) * 3);
    this.cc = new Float64Array(n);
  }

  /** Stack colour of the plates whose rank is below k, plus `extra` (or -1), into out at o. */
  private stack(k: number, extra: number, out: Float64Array, o: number): void {
    let r = this.g[0];
    let gg = this.g[1];
    let b = this.g[2];
    const { col, op, rank } = this;
    for (let j = 0; j < this.n; j++) {
      if (rank[j] >= k && j !== extra) continue;
      const a = op[j];
      const t = 1 - a;
      r = col[j * 3] * (a + t * r);
      gg = col[j * 3 + 1] * (a + t * gg);
      b = col[j * 3 + 2] * (a + t * b);
    }
    out[o] = r;
    out[o + 1] = gg;
    out[o + 2] = b;
  }

  /**
   * The colour printed at coverages c (linear) into out. With grad, the
   * derivative of the colour by each coverage (for raising it) into
   * grad[j * 3 .. j * 3 + 2].
   */
  eval(c: ArrayLike<number>, out: Float64Array, grad?: Float64Array): void {
    const { n, order, rank, stacks, cc, g } = this;
    for (let i = 0; i < n; i++) {
      const v = c[i];
      cc[i] = v > 0 ? (v < 1 ? v : 1) : 0;
      order[i] = i;
    }
    // descending coverage, ties by press order
    for (let i = 1; i < n; i++) {
      const x = order[i];
      let j = i - 1;
      while (j >= 0 && (cc[order[j]] < cc[x] || (cc[order[j]] === cc[x] && order[j] > x))) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = x;
    }
    for (let k = 0; k < n; k++) rank[order[k]] = k;
    stacks[0] = g[0];
    stacks[1] = g[1];
    stacks[2] = g[2];
    for (let k = 1; k <= n; k++) this.stack(k, -1, stacks, k * 3);
    const top = n > 0 ? cc[order[0]] : 0;
    let r = (1 - top) * g[0];
    let gg = (1 - top) * g[1];
    let b = (1 - top) * g[2];
    for (let k = 1; k <= n; k++) {
      const span = cc[order[k - 1]] - (k < n ? cc[order[k]] : 0);
      if (span <= 0) continue;
      r += span * stacks[k * 3];
      gg += span * stacks[k * 3 + 1];
      b += span * stacks[k * 3 + 2];
    }
    out[0] = r;
    out[1] = gg;
    out[2] = b;
    if (!grad) return;
    const tmp = this.tmp3;
    for (let j = 0; j < n; j++) {
      // plates strictly above j, then the same with j added
      let kj = rank[j];
      while (kj > 0 && cc[order[kj - 1]] === cc[j]) kj--;
      const o = kj * 3;
      if (order[kj] === j) {
        grad[j * 3] = stacks[o + 3] - stacks[o];
        grad[j * 3 + 1] = stacks[o + 4] - stacks[o + 1];
        grad[j * 3 + 2] = stacks[o + 5] - stacks[o + 2];
      } else {
        this.stack(kj, j, tmp, 0);
        grad[j * 3] = tmp[0] - stacks[o];
        grad[j * 3 + 1] = tmp[1] - stacks[o + 1];
        grad[j * 3 + 2] = tmp[2] - stacks[o + 2];
      }
    }
  }
}

/** The press's limits on a set's coverages. */
export interface SimConstraints {
  /** the underbase plate, or -1 */
  underbase: number;
  /** plates printed wet on wet (colour inks and highlight), summed under inkLimit */
  wet: number[];
  inkLimit: number;
}

/**
 * Per-channel weights that turn an OKLab difference into ΔE2000-like units:
 * 0.01 of OKLab lightness is about 0.85 ΔE2000, 0.01 of a or b about 2
 * (medians over the sRGB gamut). The solvers weigh hue and chroma errors as
 * the reports do.
 */
export const OK_WEIGHT = [0.85 / 0.01, 2 / 0.01, 2 / 0.01] as const;

/** ΔE2000-like distance between two OKLab colours (arrays at offsets). */
export function okDistance(a: ArrayLike<number>, ao: number, b: ArrayLike<number>, bo: number): number {
  const d0 = (a[ao] - b[bo]) * OK_WEIGHT[0];
  const d1 = (a[ao + 1] - b[bo + 1]) * OK_WEIGHT[1];
  const d2 = (a[ao + 2] - b[bo + 2]) * OK_WEIGHT[2];
  return Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2);
}

export type SimPlateKind = 'ink' | 'underbase' | 'highlight';

/**
 * A plate's visible ring smaller than this share of a cell fades out,
 * smoothly, together with its hidden part under the plates printed after it:
 * a ring that small is a sliver of a pixel or two around each dot, below
 * what the mesh holds, and on press the ink beside it spreads over it (bare
 * underbase slivers would read as white sparkle on the proof). Only rings
 * fade: a dot with nothing inside it keeps its area (the screen meets the
 * smallest dot), and the fade switches on as the dot inside grows to RING_CORE.
 */
export const RING_MIN = 0.03;
const RING_CORE = 0.05;
/** Cost of wet coverage (ΔE² per unit): a ring is worth its hidden disc only when it pays for it. */
const WET_COST = 0.4;
/** Weight of the areas-sum-to-one row and of the wet ink limit penalty. */
const ONE_WEIGHT = 60;
const LIMIT_WEIGHT = 40;
/** Small quadratic term on the areas: the fit is strictly convex in its linear approximation. */
export const AREA_RIDGE = 1;

/**
 * Areas to coverages, and the fit of areas to a colour. Areas are indexed
 * garment first, then the plates in press order. Reusable: no allocation per call.
 */
export class AreaSolver {
  readonly n: number;
  readonly m: number;
  private readonly lin = new Float64Array(3);
  private readonly ok = new Float64Array(3);
  private readonly jok = new Float64Array(9);
  private readonly dlin: Float64Array;
  private readonly c: Float64Array;
  private readonly dc: Float64Array;
  private readonly innerGrad: Float64Array;
  private readonly rowGrad: Float64Array;
  private readonly wetGrad: Float64Array;
  /** residuals: three colour rows, the sum row, the ink limit row */
  private readonly R = new Float64Array(5);
  private readonly JR: Float64Array;
  private readonly h: Float64Array;
  private readonly step: Float64Array;
  private readonly trial: Float64Array;
  private readonly free: Uint8Array;
  private readonly M = new Float64Array(25);
  private readonly v = new Float64Array(5);

  constructor(
    readonly model: NestedModel,
    readonly kinds: SimPlateKind[],
    readonly wet: number[],
    readonly inkLimit: number,
  ) {
    const n = model.n;
    this.n = n;
    this.m = n + 1;
    const m = this.m;
    this.dlin = new Float64Array(n * 3);
    this.c = new Float64Array(n);
    this.dc = new Float64Array(n * m);
    this.innerGrad = new Float64Array(m);
    this.rowGrad = new Float64Array(m);
    this.wetGrad = new Float64Array(m);
    this.JR = new Float64Array(5 * m);
    this.h = new Float64Array(m);
    this.step = new Float64Array(m);
    this.trial = new Float64Array(m);
    this.free = new Uint8Array(m);
  }

  /**
   * Nested coverages for areas w: each plate prints its visible ring plus the
   * plates printed after it (they sit inside its dots); a ring under `width`
   * of a cell (RING_MIN) fades with its hidden part. The underbase is the
   * outermost: the plates on it plus its own bare ring. The garment's area is
   * what is left. With jac, dc/dw (n x m).
   */
  nest(w: ArrayLike<number>, out: Float64Array, jac?: Float64Array, width = RING_MIN): void {
    const { n, m, kinds, innerGrad } = this;
    let inner = 0;
    if (jac) {
      jac.fill(0);
      innerGrad.fill(0);
    }
    let ub = -1;
    for (let j = n - 1; j >= 0; j--) {
      if (kinds[j] === 'underbase') {
        ub = j;
        continue;
      }
      const a = w[j + 1] > 0 ? w[j + 1] : 0;
      ringFactor(a, inner, width, this.rf);
      const raw = (a + inner) * this.rf[0];
      out[j] = raw < 1 ? raw : 1;
      if (jac && raw < 1) {
        const dcda = this.rf[0] + (a + inner) * this.rf[1];
        const dcdi = this.rf[0] + (a + inner) * this.rf[2];
        const o = j * m;
        for (let v = 0; v < m; v++) jac[o + v] = dcdi * innerGrad[v];
        jac[o + j + 1] += dcda;
      }
      if (out[j] > inner) {
        inner = out[j];
        if (jac) for (let v = 0; v < m; v++) innerGrad[v] = jac[j * m + v];
      }
    }
    if (ub >= 0) {
      const a = w[ub + 1] > 0 ? w[ub + 1] : 0;
      ringFactor(a, inner, width, this.rf);
      // the plates on the underbase are never thinned by its own ring
      const raw = inner + a * this.rf[0];
      out[ub] = raw < 1 ? raw : 1;
      if (jac && raw < 1) {
        const dcda = this.rf[0] + a * this.rf[1];
        const dcdi = 1 + a * this.rf[2];
        const o = ub * m;
        for (let v = 0; v < m; v++) jac[o + v] = dcdi * innerGrad[v];
        jac[o + ub + 1] += dcda;
      }
    }
  }

  private readonly rf = new Float64Array(3);
  /** the pull toward a prior (relaxation toward the neighbours), set per solve */
  private prior: Float64Array | null = null;
  private mu = 0;
  private limitWeight = LIMIT_WEIGHT;

  /** Wet coverage (colour inks and highlight) of nested coverages c. */
  wetSum(c: Float64Array): number {
    let s = 0;
    for (const j of this.wet) s += c[j];
    return s;
  }

  /**
   * Holds nested coverages to the wet ink limit: every plate's dots shrink
   * by one factor, so the nesting stays as it was. Continuous; a no-op under
   * the limit. Blends of neighbouring recipes are what reach it (each recipe
   * on its own is fitted under it).
   */
  limitCoverage(c: Float64Array): void {
    const wet = this.wetSum(c);
    if (wet <= this.inkLimit) return;
    const s = this.inkLimit / wet;
    for (let j = 0; j < this.n; j++) c[j] *= s;
  }

  /** nest() then limitCoverage(): what a recipe prints. */
  nestWithinLimit(w: ArrayLike<number>, out: Float64Array): void {
    this.nest(w, out);
    this.limitCoverage(out);
  }

  /** Energy of areas w; with jacobian, also fills R and JR. */
  private energy(w: Float64Array, target: Float64Array, cost: Float64Array, jacobian: boolean): number {
    const { n, m, c, R, JR } = this;
    this.nest(w, c, jacobian ? this.dc : undefined);
    this.model.eval(c, this.lin, jacobian ? this.dlin : undefined);
    oklabWithJacobian(this.lin[0], this.lin[1], this.lin[2], this.ok, jacobian ? this.jok : undefined);
    for (let r = 0; r < 3; r++) R[r] = (this.ok[r] - target[r]) * OK_WEIGHT[r];
    let sum = 0;
    for (let v = 0; v < m; v++) sum += w[v];
    R[3] = ONE_WEIGHT * (sum - 1);
    const wetSum = this.wetSum(c);
    R[4] = wetSum > this.inkLimit ? this.limitWeight * (wetSum - this.inkLimit) : 0;
    let e = R[0] * R[0] + R[1] * R[1] + R[2] * R[2] + R[3] * R[3] + R[4] * R[4] + WET_COST * wetSum;
    for (let v = 0; v < m; v++) e += cost[v] * w[v] + AREA_RIDGE * w[v] * w[v];
    const prior = this.prior;
    if (prior && this.mu > 0) for (let v = 0; v < m; v++) e += this.mu * (w[v] - prior[v]) ** 2;
    if (!jacobian) return e;
    // colour rows: W * Jok * dlin/dc * dc/dw
    const jk = this.jok;
    const dl = this.dlin;
    const dc = this.dc;
    for (let r = 0; r < 3; r++) {
      const rowGrad = this.rowGrad;
      // d(OK_r)/dc_j
      for (let v = 0; v < m; v++) rowGrad[v] = 0;
      for (let j = 0; j < n; j++) {
        const d = jk[r * 3] * dl[j * 3] + jk[r * 3 + 1] * dl[j * 3 + 1] + jk[r * 3 + 2] * dl[j * 3 + 2];
        if (d === 0) continue;
        const o = j * m;
        for (let v = 0; v < m; v++) rowGrad[v] += d * dc[o + v];
      }
      for (let v = 0; v < m; v++) JR[r * m + v] = rowGrad[v] * OK_WEIGHT[r];
    }
    for (let v = 0; v < m; v++) JR[3 * m + v] = ONE_WEIGHT;
    for (let v = 0; v < m; v++) {
      let sw = 0;
      for (const j of this.wet) sw += dc[j * m + v];
      this.wetGrad[v] = sw;
    }
    if (R[4] > 0) {
      for (let v = 0; v < m; v++) {
        let s = 0;
        for (const j of this.wet) s += dc[j * m + v];
        JR[4 * m + v] = this.limitWeight * s;
      }
    } else {
      for (let v = 0; v < m; v++) JR[4 * m + v] = 0;
    }
    return e;
  }

  /** Colour error (ΔE2000-like) of coverages c against target (OKLab). */
  coverageError(c: Float64Array, target: Float64Array): number {
    this.model.eval(c, this.lin);
    oklabWithJacobian(this.lin[0], this.lin[1], this.lin[2], this.ok);
    return okDistance(this.ok, 0, target, 0);
  }

  /** Colour error (ΔE2000-like) of areas w against target (OKLab). */
  colourError(w: Float64Array, target: Float64Array): number {
    this.nest(w, this.c);
    this.model.eval(this.c, this.lin);
    oklabWithJacobian(this.lin[0], this.lin[1], this.lin[2], this.ok);
    return okDistance(this.ok, 0, target, 0);
  }

  /** Minimises the energy from areas w (in place), optionally pulled toward `prior` by mu. Returns the energy. */
  solve(w: Float64Array, target: Float64Array, cost: Float64Array, maxIter = 40, prior: Float64Array | null = null, mu = 0, limitWeight = LIMIT_WEIGHT): number {
    const { m, R, JR, h, step, trial, free, M, v } = this;
    this.prior = prior;
    this.mu = prior ? mu : 0;
    this.limitWeight = limitWeight;
    const pm = this.mu;
    for (let i = 0; i < m; i++) if (!(w[i] > 0)) w[i] = 0;
    let e = this.energy(w, target, cost, true);
    let lambda = -1;
    for (let iter = 0; iter < maxIter; iter++) {
      let nf = 0;
      let diag = 0;
      for (let i = 0; i < m; i++) {
        let jr = 0;
        for (let r = 0; r < 5; r++) jr += JR[r * m + i] * R[r];
        h[i] = jr + cost[i] / 2 + AREA_RIDGE * w[i] + (WET_COST / 2) * this.wetGrad[i] + (prior ? pm * (w[i] - prior[i]) : 0);
        free[i] = w[i] <= 0 && h[i] > 0 ? 0 : 1;
        if (free[i]) {
          nf++;
          let d = 0;
          for (let r = 0; r < 5; r++) d += JR[r * m + i] * JR[r * m + i];
          if (d > diag) diag = d;
        }
      }
      if (nf === 0) break;
      if (lambda < 0) lambda = Math.max(1e-6, 1e-3 * diag);
      let accepted = false;
      let eNew = e;
      for (let tries = 0; tries < 10; tries++) {
        const d = AREA_RIDGE + pm + lambda;
        // (J_F^T J_F + d I) step = -h_F, by Woodbury on the 5 residual rows
        for (let a = 0; a < 5; a++) {
          let sv = 0;
          for (let i = 0; i < m; i++) if (free[i]) sv += JR[a * m + i] * h[i];
          v[a] = sv;
          for (let b = a; b < 5; b++) {
            let s = a === b ? d : 0;
            for (let i = 0; i < m; i++) if (free[i]) s += JR[a * m + i] * JR[b * m + i];
            M[a * 5 + b] = s;
            M[b * 5 + a] = s;
          }
        }
        solve5(M, v);
        let big = 0;
        for (let i = 0; i < m; i++) {
          if (!free[i]) {
            step[i] = 0;
            continue;
          }
          let jy = 0;
          for (let a = 0; a < 5; a++) jy += JR[a * m + i] * v[a];
          step[i] = -(h[i] - jy) / d;
          big = Math.max(big, Math.abs(step[i]));
        }
        if (big < 1e-8) break;
        for (let i = 0; i < m; i++) {
          const x = w[i] + step[i];
          trial[i] = x > 0 ? x : 0;
        }
        eNew = this.energy(trial, target, cost, false);
        if (eNew < e - 1e-12) {
          accepted = true;
          break;
        }
        lambda *= 6;
      }
      if (!accepted) break;
      w.set(trial);
      const gain = e - eNew;
      e = this.energy(w, target, cost, true);
      lambda = Math.max(1e-9, lambda / 4);
      if (gain < 1e-9 * (1 + e)) break;
    }
    return e;
  }
}

/**
 * How much of a ring shows: 1 for a ring of at least `min` of a cell, fading
 * to 0 below it (smoothstep), and only as far as there is a dot inside it
 * (none: a plain dot keeps its area). Writes [factor, d/da, d/dinner] into out.
 */
function ringFactor(a: number, inner: number, min: number, out: Float64Array): void {
  if (a <= 0) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return;
  }
  const x = a / min;
  const s = x >= 1 ? 1 : x * x * (3 - 2 * x);
  const ds = x >= 1 ? 0 : (6 * x * (1 - x)) / min;
  const y = inner / RING_CORE;
  const g = y >= 1 ? 1 : y * y * (3 - 2 * y);
  const dg = y >= 1 ? 0 : (6 * y * (1 - y)) / RING_CORE;
  out[0] = 1 - (1 - s) * g;
  out[1] = ds * g;
  out[2] = -(1 - s) * dg;
}

/** Solves the 5x5 system M x = v in place (v becomes x); Gaussian elimination with partial pivoting. */
function solve5(M: Float64Array, v: Float64Array): void {
  const N = 5;
  for (let col = 0; col < N; col++) {
    let piv = col;
    for (let r = col + 1; r < N; r++) if (Math.abs(M[r * N + col]) > Math.abs(M[piv * N + col])) piv = r;
    if (piv !== col) {
      for (let c2 = 0; c2 < N; c2++) {
        const t = M[col * N + c2];
        M[col * N + c2] = M[piv * N + c2];
        M[piv * N + c2] = t;
      }
      const t = v[col];
      v[col] = v[piv];
      v[piv] = t;
    }
    const d = M[col * N + col] || 1e-18;
    for (let r = col + 1; r < N; r++) {
      const f = M[r * N + col] / d;
      if (f === 0) continue;
      for (let c2 = col; c2 < N; c2++) M[r * N + c2] -= f * M[col * N + c2];
      v[r] -= f * v[col];
    }
  }
  for (let r = N - 1; r >= 0; r--) {
    let s = v[r];
    for (let c2 = r + 1; c2 < N; c2++) s -= M[r * N + c2] * v[c2];
    v[r] = s / (M[r * N + r] || 1e-18);
  }
}

/** Non-negative least squares (Lawson-Hanson) for a small dense system A (rows x m, row-major). */
export function nnls(A: Float64Array, rows: number, m: number, b: Float64Array, w: Float64Array): void {
  w.fill(0);
  const passive = new Uint8Array(m);
  const z = new Float64Array(m);
  const grad = new Float64Array(m);
  const res = new Float64Array(rows);
  const idx: number[] = [];
  for (let outer = 0; outer < 3 * m + 6; outer++) {
    for (let r = 0; r < rows; r++) {
      let s = b[r];
      for (let j = 0; j < m; j++) s -= A[r * m + j] * w[j];
      res[r] = s;
    }
    let t = -1;
    let gmax = 1e-12;
    for (let j = 0; j < m; j++) {
      if (passive[j]) continue;
      let s = 0;
      for (let r = 0; r < rows; r++) s += A[r * m + j] * res[r];
      grad[j] = s;
      if (s > gmax) {
        gmax = s;
        t = j;
      }
    }
    if (t < 0) return;
    passive[t] = 1;
    for (let inner = 0; inner < 3 * m + 6; inner++) {
      idx.length = 0;
      for (let j = 0; j < m; j++) if (passive[j]) idx.push(j);
      solvePassive(A, rows, m, b, idx, z);
      let ok = true;
      for (const j of idx) if (z[j] <= 1e-14) ok = false;
      if (ok) {
        for (let j = 0; j < m; j++) w[j] = passive[j] ? z[j] : 0;
        break;
      }
      let alpha = Infinity;
      for (const j of idx) {
        if (z[j] <= 1e-14) {
          const a = w[j] / (w[j] - z[j]);
          if (a < alpha) alpha = a;
        }
      }
      if (!Number.isFinite(alpha)) alpha = 0;
      for (const j of idx) w[j] += alpha * (z[j] - w[j]);
      for (const j of idx) {
        if (w[j] <= 1e-12) {
          w[j] = 0;
          passive[j] = 0;
        }
      }
    }
  }
}

/** Least squares on the passive columns (normal equations, Gaussian elimination with a tiny ridge). */
function solvePassive(A: Float64Array, rows: number, m: number, b: Float64Array, idx: number[], z: Float64Array): void {
  const p = idx.length;
  const N = new Float64Array(p * (p + 1));
  for (let a = 0; a < p; a++) {
    for (let c = 0; c < p; c++) {
      let s = a === c ? 1e-12 : 0;
      for (let r = 0; r < rows; r++) s += A[r * m + idx[a]] * A[r * m + idx[c]];
      N[a * (p + 1) + c] = s;
    }
    let s = 0;
    for (let r = 0; r < rows; r++) s += A[r * m + idx[a]] * b[r];
    N[a * (p + 1) + p] = s;
  }
  for (let col = 0; col < p; col++) {
    let piv = col;
    for (let r = col + 1; r < p; r++) if (Math.abs(N[r * (p + 1) + col]) > Math.abs(N[piv * (p + 1) + col])) piv = r;
    if (piv !== col) {
      for (let c = 0; c <= p; c++) {
        const tmp = N[col * (p + 1) + c];
        N[col * (p + 1) + c] = N[piv * (p + 1) + c];
        N[piv * (p + 1) + c] = tmp;
      }
    }
    const d = N[col * (p + 1) + col] || 1e-18;
    for (let r = col + 1; r < p; r++) {
      const f = N[r * (p + 1) + col] / d;
      if (f === 0) continue;
      for (let c = col; c <= p; c++) N[r * (p + 1) + c] -= f * N[col * (p + 1) + c];
    }
  }
  z.fill(0);
  for (let r = p - 1; r >= 0; r--) {
    let s = N[r * (p + 1) + p];
    for (let c = r + 1; c < p; c++) s -= N[r * (p + 1) + c] * z[idx[c]];
    z[idx[r]] = s / (N[r * (p + 1) + r] || 1e-18);
  }
}
