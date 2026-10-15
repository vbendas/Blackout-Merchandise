// Does a proof still match the one the client approved (Plan 6.4, Proof; Plan
// 8, re-approval rule)? Two measures, both on the proofs scaled to 400 px on
// the long side:
// - SSIM (Wang et al. 2004: 11 x 11 Gaussian window, sigma 1.5) on CIE L*,
//   for structure: shapes, edges, halftone texture.
// - The share of the print whose colour moved by more than ΔE2000 5 after a
//   one-pixel blur, because SSIM on lightness misses an ink swapped for one of
//   similar lightness, the case that most needs the client.
// Speck, trap and choke fixes are a fraction of a proof pixel at this scale
// (0.7 mm per pixel on a 28 cm print) and leave both measures where they were.
// The thresholds are a first calibration on synthetic proofs; tune them on real
// corrections as they come in.
import sharp from 'sharp';
import { deltaE2000, srgbToLab } from './colour';

export const PROOF_THRESHOLDS = {
  /** at or above: the same proof */
  sameSsim: 0.95,
  /** at or below: the same proof */
  sameChangedShare: 0.005,
  /** at or above (and changed share at or below the next): small visible changes */
  minorSsim: 0.85,
  minorChangedShare: 0.03,
  /** ΔE2000 above which a pixel's colour counts as changed */
  changedDeltaE: 5,
  /** long side the proofs are compared at */
  sizePx: 400,
};

export type ProofVerdict = 'same' | 'minor' | 'different';

export interface ProofComparison {
  ssim: number;
  /** share of pixels whose colour moved by more than changedDeltaE */
  changedShare: number;
  meanDeltaE: number;
  sameFraming: boolean;
  verdict: ProofVerdict;
}

function gaussianKernel(sigma: number, radius: number): Float32Array {
  const k = new Float32Array(2 * radius + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    k[i + radius] = Math.exp(-(i * i) / (2 * sigma * sigma));
    sum += k[i + radius];
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return k;
}

/** Separable blur with clamped edges. */
function blur(src: Float32Array, w: number, h: number, kernel: Float32Array): Float32Array {
  const r = (kernel.length - 1) / 2;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += kernel[k + r] * src[y * w + Math.min(w - 1, Math.max(0, x + k))];
      tmp[y * w + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += kernel[k + r] * tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      out[y * w + x] = s;
    }
  }
  return out;
}

function mul(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  return out;
}

/** Mean SSIM of two lightness planes (L* 0..100). */
export function ssim(x: Float32Array, y: Float32Array, w: number, h: number): number {
  const k = gaussianKernel(1.5, 5);
  const C1 = (0.01 * 100) ** 2;
  const C2 = (0.03 * 100) ** 2;
  const mx = blur(x, w, h, k);
  const my = blur(y, w, h, k);
  const sxx = blur(mul(x, x), w, h, k);
  const syy = blur(mul(y, y), w, h, k);
  const sxy = blur(mul(x, y), w, h, k);
  let total = 0;
  for (let i = 0; i < x.length; i++) {
    const vx = sxx[i] - mx[i] * mx[i];
    const vy = syy[i] - my[i] * my[i];
    const cxy = sxy[i] - mx[i] * my[i];
    total += ((2 * mx[i] * my[i] + C1) * (2 * cxy + C2)) / ((mx[i] * mx[i] + my[i] * my[i] + C1) * (vx + vy + C2));
  }
  return total / x.length;
}

async function labPlanes(image: Buffer, width: number, height: number): Promise<[Float32Array, Float32Array, Float32Array]> {
  const { data } = await sharp(image)
    .flatten({ background: '#ffffff' })
    .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const L = new Float32Array(width * height);
  const A = new Float32Array(width * height);
  const B = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const lab = srgbToLab(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
    L[i] = lab.L;
    A[i] = lab.a;
    B[i] = lab.b;
  }
  return [L, A, B];
}

export async function compareProofs(approved: Buffer, current: Buffer): Promise<ProofComparison> {
  const [ma, mb] = await Promise.all([sharp(approved).metadata(), sharp(current).metadata()]);
  if (!ma.width || !ma.height || !mb.width || !mb.height) throw new Error('a proof could not be read');
  const aspectA = ma.width / ma.height;
  const aspectB = mb.width / mb.height;
  if (Math.abs(aspectA - aspectB) / aspectA > 0.02) {
    return { ssim: 0, changedShare: 1, meanDeltaE: 100, sameFraming: false, verdict: 'different' };
  }
  const scale = PROOF_THRESHOLDS.sizePx / Math.max(ma.width, ma.height);
  const w = Math.max(16, Math.round(ma.width * scale));
  const h = Math.max(16, Math.round(ma.height * scale));
  const [a, b] = await Promise.all([labPlanes(approved, w, h), labPlanes(current, w, h)]);

  const score = ssim(a[0], b[0], w, h);
  const k = gaussianKernel(1, 2);
  const ab = a.map((p) => blur(p, w, h, k));
  const bb = b.map((p) => blur(p, w, h, k));
  let changed = 0;
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const d = deltaE2000({ L: ab[0][i], a: ab[1][i], b: ab[2][i] }, { L: bb[0][i], a: bb[1][i], b: bb[2][i] });
    sum += d;
    if (d > PROOF_THRESHOLDS.changedDeltaE) changed++;
  }
  const changedShare = changed / (w * h);
  const t = PROOF_THRESHOLDS;
  const verdict: ProofVerdict =
    score >= t.sameSsim && changedShare <= t.sameChangedShare ? 'same' : score >= t.minorSsim && changedShare <= t.minorChangedShare ? 'minor' : 'different';
  return { ssim: score, changedShare, meanDeltaE: sum / (w * h), sameFraming: true, verdict };
}
