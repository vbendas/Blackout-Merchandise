// Binary morphology for plates and masks. Disc operations (traps, the
// underbase choke, the thin-line opening) run on row runs: each row's set or
// clear runs are widened by the disc's chord at that row offset and merged
// with a difference array, so a full-front plate costs a few passes over its
// rows, with no distance-transform buffers. Connected components use a span
// flood fill whose stack holds runs, not pixels.

/** A rectangular window into a row-major 1-byte buffer; nonzero is set. */
export interface MaskView {
  data: Uint8Array;
  stride: number;
  offset: number;
  width: number;
  height: number;
}

export function fullView(data: Uint8Array, width: number, height: number): MaskView {
  if (data.length < width * height) throw new Error(`mask too small: ${data.length} < ${width}x${height}`);
  return { data, stride: width, offset: 0, width, height };
}

/** Half chord widths of a disc of radius r (pixel centres), for dy = -R..R. */
export function discHalfWidths(r: number): Int32Array {
  const R = Math.floor(r);
  const out = new Int32Array(2 * R + 1);
  for (let dy = -R; dy <= R; dy++) out[dy + R] = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 1e-9);
  return out;
}

type RunKind = 'set' | 'clear';

/** Writes [start, end) pairs of set (or clear) runs of one row; returns the int count. */
function rowRuns(data: Uint8Array, offset: number, width: number, kind: RunKind, out: Int32Array): number {
  let n = 0;
  let x = 0;
  const want = kind === 'set';
  while (x < width) {
    while (x < width && (data[offset + x] !== 0) !== want) x++;
    if (x >= width) break;
    const s = x;
    while (x < width && (data[offset + x] !== 0) === want) x++;
    out[n++] = s;
    out[n++] = x;
  }
  return n;
}

/**
 * For each row y, calls onRow(y, cover, any): cover[x] > 0 when a pixel of
 * the given kind lies within distance r of (x, y). Outside the view counts as
 * clear, so 'clear' covers reach in from the edges. Rows of src are read
 * lazily, R rows ahead of y, so onRow may modify rows <= y of src.
 */
function discCover(src: MaskView, r: number, kind: RunKind, onRow: (y: number, cover: Int32Array, any: boolean) => void): void {
  const { width: w, height: h } = src;
  const R = Math.max(0, Math.floor(r));
  const hw = discHalfWidths(Math.max(0, r));
  const size = 2 * R + 1;
  const runs = Array.from({ length: size }, () => new Int32Array(w + 2));
  const counts = new Int32Array(size);
  const cover = new Int32Array(w + 1);
  const load = (j: number): void => {
    const slot = j % size;
    counts[slot] = rowRuns(src.data, src.offset + j * src.stride, w, kind, runs[slot]);
  };
  for (let j = 0; j < Math.min(R, h); j++) load(j);
  for (let y = 0; y < h; y++) {
    if (y + R < h) load(y + R);
    cover.fill(0);
    let any = false;
    for (let dy = -R; dy <= R; dy++) {
      const j = y + dy;
      const half = hw[dy + R];
      if (j < 0 || j >= h) {
        if (kind === 'clear') {
          cover[0] += 1;
          cover[w] -= 1;
          any = true;
        }
        continue;
      }
      if (kind === 'clear') {
        // virtual clear pixels just outside the left and right edges
        if (half > 0) {
          cover[0] += 1;
          cover[Math.min(w, half)] -= 1;
          cover[Math.max(0, w - half)] += 1;
          cover[w] -= 1;
          any = true;
        }
      }
      const slot = j % size;
      const list = runs[slot];
      const n = counts[slot];
      for (let k = 0; k < n; k += 2) {
        const s = list[k] - half;
        const e = list[k + 1] + half;
        cover[s < 0 ? 0 : s] += 1;
        cover[e > w ? w : e] -= 1;
        any = true;
      }
    }
    if (any) {
      let run = 0;
      for (let x = 0; x < w; x++) {
        run += cover[x];
        cover[x] = run;
      }
    }
    onRow(y, cover, any);
  }
}

/**
 * Trap: sets pixels of `a` that lie inside `region` and within r of a set
 * pixel of `a` (as it was before this call). Returns the pixels added.
 */
export function spreadInto(a: MaskView, region: MaskView, r: number): number {
  if (!(r > 0)) return 0;
  sameSize(a, region);
  let added = 0;
  const w = a.width;
  discCover(a, r, 'set', (y, cover, any) => {
    if (!any) return;
    const ra = a.offset + y * a.stride;
    const rr = region.offset + y * region.stride;
    for (let x = 0; x < w; x++) {
      if (cover[x] > 0 && region.data[rr + x] !== 0 && a.data[ra + x] === 0) {
        a.data[ra + x] = 255;
        added++;
      }
    }
  });
  return added;
}

/**
 * Choke: clears pixels of `a` that lie within r of a clear pixel of
 * `footprint` (or of the view's edge). Returns the pixels removed.
 */
export function chokeBy(a: MaskView, footprint: MaskView, r: number): number {
  if (!(r > 0)) return 0;
  sameSize(a, footprint);
  let removed = 0;
  const w = a.width;
  discCover(footprint, r, 'clear', (y, cover, any) => {
    if (!any) return;
    const ra = a.offset + y * a.stride;
    for (let x = 0; x < w; x++) {
      if (cover[x] > 0 && a.data[ra + x] !== 0) {
        a.data[ra + x] = 0;
        removed++;
      }
    }
  });
  return removed;
}

/** Disc erosion of `src` into `out` (same size; 255 where the whole disc is set). */
export function erodeDisc(src: MaskView, r: number, out: MaskView): void {
  sameSize(src, out);
  const w = src.width;
  discCover(src, r, 'clear', (y, cover, any) => {
    const rs = src.offset + y * src.stride;
    const ro = out.offset + y * out.stride;
    for (let x = 0; x < w; x++) out.data[ro + x] = src.data[rs + x] !== 0 && (!any || cover[x] === 0) ? 255 : 0;
  });
}

/**
 * Line-like pixels of `f` that a disc of radius r cannot reach while staying
 * inside `f` (f minus its opening): lines thinner than 2r. Only pixels with
 * at least two such neighbours count, so the odd corner pixel on a jagged or
 * sharp edge does not read as a line. `scratch` (same size) is overwritten.
 */
export function thinPixels(f: MaskView, r: number, scratch: MaskView): { thin: number; area: number } {
  erodeDisc(f, r, scratch);
  const w = f.width;
  const h = f.height;
  const rows = [new Uint8Array(w + 2), new Uint8Array(w + 2), new Uint8Array(w + 2)];
  const none = new Uint8Array(w + 2);
  let thin = 0;
  let area = 0;
  // counts row y's line-like pixels once rows y - 1, y and y + 1 are known
  const countRow = (y: number): void => {
    const prev = y > 0 ? rows[(y - 1) % 3] : none;
    const cur = rows[y % 3];
    const next = y + 1 < h ? rows[(y + 1) % 3] : none;
    for (let x = 1; x <= w; x++) {
      if (!cur[x]) continue;
      const n = prev[x - 1] + prev[x] + prev[x + 1] + cur[x - 1] + cur[x + 1] + next[x - 1] + next[x] + next[x + 1];
      if (n >= 2) thin++;
    }
  };
  discCover(scratch, r, 'set', (y, cover, any) => {
    const row = rows[y % 3];
    row.fill(0);
    const rf = f.offset + y * f.stride;
    for (let x = 0; x < w; x++) {
      if (f.data[rf + x] === 0) continue;
      area++;
      if (!any || cover[x] === 0) row[x + 1] = 1;
    }
    if (y > 0) countRow(y - 1);
  });
  if (h > 0) countRow(h - 1);
  return { thin, area };
}

function sameSize(a: MaskView, b: MaskView): void {
  if (a.width !== b.width || a.height !== b.height) throw new Error(`mask size mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
}

// ---------------------------------------------------------------------------
// Square erosion and dilation (small radii, whole buffers)
// ---------------------------------------------------------------------------

/** Square (2r+1) erosion of a 0/nonzero mask; outside counts as clear. Returns 0/1. */
export function erodeSquare(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return squareFilter(mask, w, h, r, true);
}

/** Square (2r+1) dilation of a 0/nonzero mask. Returns 0/1. */
export function dilateSquare(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  return squareFilter(mask, w, h, r, false);
}

function squareFilter(mask: Uint8Array, w: number, h: number, r: number, erode: boolean): Uint8Array {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  const full = 2 * r + 1;
  // horizontal: running count of set pixels in [x - r, x + r]
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let count = 0;
    for (let x = 0; x < Math.min(r, w); x++) if (mask[row + x] !== 0) count++;
    for (let x = 0; x < w; x++) {
      const add = x + r;
      if (add < w && mask[row + add] !== 0) count++;
      const drop = x - r - 1;
      if (drop >= 0 && mask[row + drop] !== 0) count--;
      tmp[row + x] = erode ? (count === full ? 1 : 0) : count > 0 ? 1 : 0;
    }
  }
  // vertical, row by row (running counts per column keep the reads in order)
  const col = new Int32Array(w);
  for (let y = 0; y < Math.min(r, h); y++) for (let x = 0; x < w; x++) col[x] += tmp[y * w + x];
  for (let y = 0; y < h; y++) {
    const add = y + r;
    if (add < h) for (let x = 0; x < w; x++) col[x] += tmp[add * w + x];
    const drop = y - r - 1;
    if (drop >= 0) for (let x = 0; x < w; x++) col[x] -= tmp[drop * w + x];
    const row = y * w;
    if (erode) for (let x = 0; x < w; x++) out[row + x] = col[x] === full ? 1 : 0;
    else for (let x = 0; x < w; x++) out[row + x] = col[x] > 0 ? 1 : 0;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Connected components
// ---------------------------------------------------------------------------

export interface Component {
  label: number;
  area: number;
  /** (y, x0, x1) triples, inclusive; null when the component is larger than the recording limit */
  spans: Int32Array | null;
}

/**
 * Visits each 8-connected component of equal labels. Spans are recorded for
 * components up to `maxRecord` pixels; larger ones report only their area.
 */
export function forEachComponent(labels: Uint8Array, w: number, h: number, maxRecord: number, visit: (c: Component) => void): void {
  const seen = new Uint8Array(w * h);
  let stack = new Int32Array(3 * 1024);
  let rec = new Int32Array(3 * 64);
  let sp = 0;
  let nrec = 0;
  let area = 0;
  let recording = true;
  const pushSpan = (y: number, x0: number, x1: number): void => {
    if (sp + 3 > stack.length) {
      const next = new Int32Array(stack.length * 2);
      next.set(stack);
      stack = next;
    }
    stack[sp++] = y;
    stack[sp++] = x0;
    stack[sp++] = x1;
    area += x1 - x0 + 1;
    if (!recording) return;
    if (area > maxRecord) {
      recording = false;
      return;
    }
    if (nrec + 3 > rec.length) {
      const next = new Int32Array(rec.length * 2);
      next.set(rec);
      rec = next;
    }
    rec[nrec++] = y;
    rec[nrec++] = x0;
    rec[nrec++] = x1;
  };
  for (let start = 0; start < w * h; start++) {
    if (seen[start]) continue;
    const L = labels[start];
    sp = 0;
    nrec = 0;
    area = 0;
    recording = true;
    const sy = (start / w) | 0;
    const row0 = sy * w;
    const x0 = start - row0;
    let x1 = x0;
    while (x1 < w - 1 && !seen[row0 + x1 + 1] && labels[row0 + x1 + 1] === L) x1++;
    // nothing left of `start` is unseen with this label: the scan reached it first
    seen.fill(1, row0 + x0, row0 + x1 + 1);
    pushSpan(sy, x0, x1);
    while (sp > 0) {
      const b1 = stack[--sp];
      const b0 = stack[--sp];
      const y = stack[--sp];
      for (let ny = y - 1; ny <= y + 1; ny += 2) {
        if (ny < 0 || ny >= h) continue;
        const row = ny * w;
        let x = b0 > 0 ? b0 - 1 : 0;
        const xe = b1 < w - 1 ? b1 + 1 : w - 1;
        while (x <= xe) {
          if (seen[row + x] || labels[row + x] !== L) {
            x++;
            continue;
          }
          let s = x;
          let e = x;
          while (s > 0 && !seen[row + s - 1] && labels[row + s - 1] === L) s--;
          while (e < w - 1 && !seen[row + e + 1] && labels[row + e + 1] === L) e++;
          seen.fill(1, row + s, row + e + 1);
          pushSpan(ny, s, e);
          x = e + 2;
        }
      }
    }
    visit({ label: L, area, spans: recording ? rec.slice(0, nrec) : null });
  }
}

export interface IslandRemoval {
  /** components merged into a neighbour */
  components: number;
  pixels: number;
}

/**
 * Merges every component smaller than minArea into the label most of its
 * outside neighbours carry. Components touching a protected label are kept.
 * `relabel(index, label)` is called for each changed pixel after all
 * decisions are made, so one merge never changes another's decision.
 */
export function removeSmallComponents(
  labels: Uint8Array,
  w: number,
  h: number,
  minArea: number,
  options: { isProtected?: (label: number) => boolean; relabel?: (index: number, label: number) => void } = {},
): IslandRemoval {
  const out: IslandRemoval = { components: 0, pixels: 0 };
  if (!(minArea > 1)) return out;
  const isProtected = options.isProtected ?? (() => false);
  const merges: { spans: Int32Array; to: number }[] = [];
  const votes = new Int32Array(256);
  const around = new Int32Array(4);
  forEachComponent(labels, w, h, Math.ceil(minArea) - 1, (c) => {
    if (!c.spans || c.area >= minArea || isProtected(c.label)) return;
    votes.fill(0);
    let blocked = false;
    const s = c.spans;
    for (let k = 0; k < s.length && !blocked; k += 3) {
      const y = s[k];
      for (let x = s[k + 1]; x <= s[k + 2] && !blocked; x++) {
        const i = y * w + x;
        around[0] = x > 0 ? i - 1 : -1;
        around[1] = x < w - 1 ? i + 1 : -1;
        around[2] = y > 0 ? i - w : -1;
        around[3] = y < h - 1 ? i + w : -1;
        for (let a = 0; a < 4; a++) {
          const q = around[a];
          if (q < 0) continue;
          const l = labels[q];
          if (l === c.label) continue;
          if (isProtected(l)) {
            blocked = true;
            break;
          }
          votes[l]++;
        }
      }
    }
    if (blocked) return;
    let best = -1;
    for (let l = 0; l < 256; l++) if (votes[l] > 0 && (best < 0 || votes[l] > votes[best])) best = l;
    if (best < 0) return;
    merges.push({ spans: s, to: best });
  });
  for (const m of merges) {
    out.components++;
    for (let k = 0; k < m.spans.length; k += 3) {
      const y = m.spans[k];
      for (let x = m.spans[k + 1]; x <= m.spans[k + 2]; x++) {
        const i = y * w + x;
        labels[i] = m.to;
        options.relabel?.(i, m.to);
        out.pixels++;
      }
    }
  }
  return out;
}
