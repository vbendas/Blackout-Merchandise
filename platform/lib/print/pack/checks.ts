// The automatic checks on every pack and every re-upload (Plan 6.4). Every
// file is re-opened with a decoder independent of its writer: @webtoon/psd for
// the PSDs ag-psd wrote, pngjs for the PNGs png.ts wrote. AutoThresh shipped
// solid films, opaque "transparent" PNGs and black composites without noticing;
// these checks are what make "ready to print" true.
//
// Each check returns passed, review (a person should look) or failed (the file
// must not go to the press), with a plain sentence for the auditor.
import sharp from 'sharp';
import type {
  CheckResult,
  ChecksInput,
  DtgLayer,
  GarmentColour,
  InkPlate,
  PackFile,
  PixelRect,
  ScreenSet,
} from '@/lib/print/types';
import { deltaE2000, hexToLab, hexToRgb, isWhiteGarment, srgbToLab } from './colour';
import { analyseFeatures, type FeatureFindings } from './features';
import { sha256Hex } from './hash';
import { decodePngIndependently, parsePsdIndependently, type WebtoonLayer, type WebtoonPsd } from './independent';
import type { PackManifestDetail } from './manifest';
import { ORIGINAL_LAYER_NAME, dtgLayerName, formatNumber, garmentLayerName, garmentNameFromLayer, isOriginalLayerName, parsePlateLayerName, plateLayerName } from './names';
import { parseIccp, parsePhys, ppiToPixelsPerMetre, readPngChunks } from './png';
import { compareProofs } from './proof-compare';
import { FILM_SHEET_CM, MAX_DESIGN_CM } from '@/lib/print/defaults';
import { targetBoxes, type MarkName } from '@/lib/print/engine';

type State = CheckResult['state'];
interface Outcome {
  state: State;
  detail: string;
}

const STANDARD_SCREENS = 8;
const MAX_SCREENS = 15;

const TITLES: Record<string, string> = {
  size: 'Size',
  structure: 'File structure',
  plates: 'Films',
  marks: 'Marks',
  screens: 'Screens',
  features: 'Fine lines',
  inks_measured: 'Inks measured',
  dtg_alpha: 'Transparency',
  whites: 'Whites',
  proof: 'Proof',
};

const worst = (states: State[]): State => (states.includes('failed') ? 'failed' : states.includes('review') ? 'review' : 'passed');
const num = (n: number) => n.toLocaleString('en-GB');
const pct = (share: number) => {
  const v = share * 100;
  return `${v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2)}%`;
};
const mm = (px: number, ppi: number) => (px * 25.4) / ppi;
const cmText = (vMm: number) => formatNumber(Math.round(vMm) / 10);
const list = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

async function run(id: string, fn: () => Promise<Outcome> | Outcome, title?: string): Promise<CheckResult> {
  try {
    const { state, detail } = await fn();
    return { id, title: title ?? TITLES[id] ?? id, state, detail };
  } catch (e) {
    return { id, title: title ?? TITLES[id] ?? id, state: 'failed', detail: `This check could not run: ${e instanceof Error ? e.message : String(e)}.` };
  }
}

function integrity(entries: { file: PackFile; bytes: Buffer }[]): string[] {
  const problems: string[] = [];
  for (const { file, bytes } of entries) {
    if (file.sha256 && sha256Hex(bytes) !== file.sha256) problems.push(`${file.name} differs from the manifest (hash)`);
    else if (file.bytes && file.bytes !== bytes.length) problems.push(`${file.name} differs from the manifest (size)`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// @webtoon/psd helpers (descriptors and raw blocks)
// ---------------------------------------------------------------------------

type DescValue = { type: string; value?: unknown; descriptor?: { items: Map<string, DescValue> } };
type DescItems = Map<string, DescValue>;

function blockOf(layer: WebtoonLayer | WebtoonPsd, key: string): Record<string, unknown> | undefined {
  const props = ('additionalProperties' in layer ? layer.additionalProperties : layer.additionalLayerProperties) as unknown as Record<string, unknown>;
  return props?.[key] as Record<string, unknown> | undefined;
}

function descItems(block: Record<string, unknown> | undefined): DescItems | undefined {
  if (!block) return undefined;
  const direct = block.descriptor as { items?: DescItems } | undefined;
  if (direct?.items) return direct.items;
  const nested = (block.data as { descriptor?: { items?: DescItems } } | undefined)?.descriptor;
  return nested?.items;
}

function descBool(items: DescItems | undefined, key: string): boolean | undefined {
  const v = items?.get(key);
  return v && v.type === 'bool' ? (v.value as boolean) : undefined;
}

function descObject(items: DescItems | undefined, key: string): DescItems | undefined {
  return items?.get(key)?.descriptor?.items;
}

function descText(items: DescItems | undefined, key: string): string | undefined {
  const v = items?.get(key);
  return v && v.type === 'TEXT' ? String(v.value) : undefined;
}

function descNumber(items: DescItems | undefined, key: string): number | undefined {
  const v = items?.get(key);
  if (!v) return undefined;
  if (typeof v.value === 'number') return v.value;
  return undefined;
}

/** Whether a layer's colour overlay is switched on, and its colour. */
function overlayState(layer: WebtoonLayer): { present: boolean; on: boolean; rgb: [number, number, number] | null } {
  const items = descItems(blockOf(layer, 'lfx2'));
  if (!items) return { present: false, on: false, rgb: null };
  const master = descBool(items, 'masterFXSwitch') !== false;
  const sofi = descObject(items, 'SoFi');
  if (!sofi) return { present: false, on: false, rgb: null };
  const colour = descObject(sofi, 'Clr ');
  const rgb: [number, number, number] | null = colour
    ? [Math.round(descNumber(colour, 'Rd  ') ?? 0), Math.round(descNumber(colour, 'Grn ') ?? 0), Math.round(descNumber(colour, 'Bl  ') ?? 0)]
    : null;
  return { present: true, on: master && descBool(sofi, 'enab') === true, rgb };
}

/** Lock flags from the raw 'lspf' block (transparency, pixels, position). */
function lockFlags(layer: WebtoonLayer): number {
  const block = blockOf(layer, 'lspf');
  const data = block?.data as Uint8Array | undefined;
  if (!data || data.length < 4) return layer.isTransparencyLocked ? 1 : 0;
  return ((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0;
}

interface EmbeddedFile {
  id: string;
  name: string;
  contents: Uint8Array;
}

function linkedFiles(psd: WebtoonPsd): EmbeddedFile[] {
  const out: EmbeddedFile[] = [];
  for (const key of ['lnk2', 'lnkD', 'lnk3']) {
    const layers = (blockOf(psd, key)?.layers as { uniqueId: string; filename: string; contents: Uint8Array }[] | undefined) ?? [];
    for (const l of layers) out.push({ id: l.uniqueId, name: l.filename, contents: l.contents });
  }
  return out;
}

/** The ORIGINAL layer as a smart object: hidden, locked, its placed id pointing
 * at an embedded image that opens. Returns problems, worst first. */
async function checkOriginal(psd: WebtoonPsd): Promise<{ state: State; notes: string[] }> {
  const layer = psd.layers.find((l) => l.name === ORIGINAL_LAYER_NAME) ?? psd.layers.find((l) => isOriginalLayerName(l.name));
  if (!layer) return { state: 'failed', notes: [`no "${ORIGINAL_LAYER_NAME}" layer`] };
  const notes: string[] = [];
  let state: State = 'passed';
  if (!layer.isHidden) {
    notes.push('ORIGINAL is visible, so it would print with the films');
    state = 'failed';
  }
  if ((lockFlags(layer) & 0x7) !== 0x7) {
    notes.push('ORIGINAL is not locked');
    if (state === 'passed') state = 'review';
  }
  const placed = descItems(blockOf(layer, 'SoLd')) ?? descItems(blockOf(layer, 'SoLE'));
  const id = descText(placed, 'Idnt');
  const file = id ? linkedFiles(psd).find((f) => f.id === id) : undefined;
  if (!placed || !id) {
    notes.push('ORIGINAL is not a smart object');
    if (state === 'passed') state = 'review';
  } else if (!file || file.contents.length === 0) {
    notes.push('the ORIGINAL smart object has no embedded art');
    state = 'failed';
  } else {
    // Decoded to the last pixel, not just its header: a cut-off file has a header that reads fine.
    const opened = await sharp(Buffer.from(file.contents), { limitInputPixels: false, failOn: 'truncated' })
      .stats()
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      notes.push(`the art embedded in ORIGINAL (${file.name}) does not open`);
      state = 'failed';
    }
  }
  return { state, notes };
}

/** The merged image must exist and show something: not blank, not all black. */
async function checkMergedImage(psd: WebtoonPsd): Promise<string | null> {
  const px = await psd.composite();
  if (px.length < 4) return 'the merged image is missing';
  const step = Math.max(4, Math.floor(px.length / 4 / 200_000) * 4);
  let black = 0;
  let samples = 0;
  let distinct = false;
  const r0 = px[0];
  const g0 = px[1];
  const b0 = px[2];
  for (let i = 0; i < px.length; i += step) {
    samples++;
    if (px[i] < 8 && px[i + 1] < 8 && px[i + 2] < 8) black++;
    if (px[i] !== r0 || px[i + 1] !== g0 || px[i + 2] !== b0) distinct = true;
  }
  if (!distinct) return 'the merged image is a single flat colour';
  if (black / samples > 0.98) return 'the merged image is almost all black';
  return null;
}

function iccOk(profile: Uint8Array | undefined): boolean {
  return !!profile && profile.length >= 132 && Buffer.from(profile).toString('latin1', 36, 40) === 'acsp' && Buffer.from(profile).toString('latin1', 16, 20) === 'RGB ';
}

/** A layer's pixels placed on the canvas as a binary film, with counts of
 * anything that isn't black dots on transparency. */
interface FilmPixels {
  data: Uint8Array;
  soft: number;
  notBlack: number;
  offCanvas: number;
  totalInk: number;
  artInk: number;
  /** pixels that differ from the engine's plate, or null without one */
  mismatch: number | null;
}

async function filmFromLayer(layer: WebtoonLayer, W: number, H: number, art: PixelRect, expected: Uint8Array | null): Promise<FilmPixels> {
  const data = new Uint8Array(W * H);
  const lw = layer.width;
  const lh = layer.height;
  let soft = 0;
  let notBlack = 0;
  let offCanvas = 0;
  if (lw > 0 && lh > 0) {
    const px = await layer.composite(false);
    for (let y = 0; y < lh; y++) {
      const cy = layer.top + y;
      const src = y * lw * 4;
      const rowInside = cy >= 0 && cy < H;
      const dst = cy * W + layer.left;
      for (let x = 0; x < lw; x++) {
        const p = src + x * 4;
        const a = px[p + 3];
        if (a === 0) continue;
        if (a !== 255) soft++;
        else if (px[p] !== 0 || px[p + 1] !== 0 || px[p + 2] !== 0) notBlack++;
        const cx = layer.left + x;
        if (!rowInside || cx < 0 || cx >= W) offCanvas++;
        else if (a >= 128) data[dst + x] = 255;
      }
    }
  }
  let totalInk = 0;
  let artInk = 0;
  let mismatch: number | null = expected && expected.length === data.length ? 0 : null;
  const ax1 = art.x + art.width;
  const ay1 = art.y + art.height;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    const inArtRow = y >= art.y && y < ay1;
    for (let x = 0; x < W; x++) {
      const i = row + x;
      const ink = data[i] !== 0;
      if (ink) {
        totalInk++;
        if (inArtRow && x >= art.x && x < ax1) artInk++;
      }
      if (mismatch !== null && ink !== expected![i] >= 128) mismatch++;
    }
  }
  return { data, soft, notBlack, offCanvas, totalInk, artInk, mismatch };
}

// ---------------------------------------------------------------------------
// Registration marks
// ---------------------------------------------------------------------------

const NEIGHBOUR_X = [-1, 0, 1, -1, 1, -1, 0, 1];
const NEIGHBOUR_Y = [-1, -1, -1, 0, 0, 1, 1, 1];

interface MarkFound {
  name: MarkName;
  /** the mark's pixels in its window, as a key for comparison */
  pixels: Uint8Array;
  cx: number;
  cy: number;
  /** distance from the mark to the print area, mm */
  clearMm: number;
  /** the mark runs into the window edge: it touches other ink */
  touchesEdge: boolean;
}

/** The engine's own target boxes (top left, top right, bottom left, bottom
 * right; the side centres on a film made before engine 3), so the check looks
 * exactly where the targets are drawn, including when narrow margins shrink
 * them. Boxes squeezed off the canvas are left out. */
function markWindows(canvas: ScreenSet['canvas'], legacyTargetOffsetMm: number | undefined): (PixelRect & { name: MarkName })[] {
  return targetBoxes(canvas, legacyTargetOffsetMm).filter((box) => box.width > 2 && box.height > 2);
}

/** The target in its box: the ink connected to the pixels within 1 mm of the
 * box centre (circle and crosshair are one shape). Ink that joins it from
 * outside the box means the target runs into something else. */
function findMark(plate: Uint8Array, W: number, H: number, box: PixelRect & { name: MarkName }, art: PixelRect, ppi: number): MarkFound | null {
  const bw = box.width;
  const bh = box.height;
  const cx = Math.floor(bw / 2);
  const cy = Math.floor(bh / 2);
  const seedR = Math.max(1, Math.round(ppi / 25.4));
  const mark = new Uint8Array(bw * bh);
  const queue: number[] = [];
  for (let dy = -seedR; dy <= seedR; dy++) {
    for (let dx = -seedR; dx <= seedR; dx++) {
      const lx = cx + dx;
      const ly = cy + dy;
      if (lx < 0 || ly < 0 || lx >= bw || ly >= bh) continue;
      if (plate[(box.y + ly) * W + box.x + lx] >= 128 && !mark[ly * bw + lx]) {
        mark[ly * bw + lx] = 1;
        queue.push(ly * bw + lx);
      }
    }
  }
  if (!queue.length) return null;
  let touchesEdge = false;
  let minX = bw;
  let minY = bh;
  let maxX = -1;
  let maxY = -1;
  let sx = 0;
  let sy = 0;
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    const lx = p % bw;
    const ly = (p - lx) / bw;
    sx += lx;
    sy += ly;
    if (lx < minX) minX = lx;
    if (ly < minY) minY = ly;
    if (lx > maxX) maxX = lx;
    if (ly > maxY) maxY = ly;
    for (let k = 0; k < 8; k++) {
      const nx = lx + NEIGHBOUR_X[k];
      const ny = ly + NEIGHBOUR_Y[k];
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) {
        const gx = box.x + nx;
        const gy = box.y + ny;
        if (gx >= 0 && gy >= 0 && gx < W && gy < H && plate[gy * W + gx] >= 128) touchesEdge = true;
        continue;
      }
      const q = ny * bw + nx;
      if (!mark[q] && plate[(box.y + ny) * W + box.x + nx] >= 128) {
        mark[q] = 1;
        queue.push(q);
      }
    }
  }
  // Where the target sits: the crosshair's arms are the strongest column and
  // row of its ink, which stays exact even when the target is cut by its box.
  const colSum = new Uint32Array(bw);
  const rowSum = new Uint32Array(bh);
  for (const p of queue) {
    colSum[p % bw]++;
    rowSum[Math.floor(p / bw)]++;
  }
  const peak = (sums: Uint32Array, fallback: number): number => {
    let max = 0;
    for (const v of sums) if (v > max) max = v;
    let weight = 0;
    let total = 0;
    for (let i = 0; i < sums.length; i++) {
      if (sums[i] >= 0.8 * max) {
        weight += sums[i];
        total += sums[i] * i;
      }
    }
    return weight ? total / weight : fallback;
  };
  const centreX = box.x + peak(colSum, sx / queue.length);
  const centreY = box.y + peak(rowSum, sy / queue.length);
  // Distance from the mark's bounding box to the print area.
  const bx0 = box.x + minX;
  const by0 = box.y + minY;
  const bx1 = box.x + maxX;
  const by1 = box.y + maxY;
  const gapX = Math.max(art.x - bx1, bx0 - (art.x + art.width - 1), 0);
  const gapY = Math.max(art.y - by1, by0 - (art.y + art.height - 1), 0);
  const clearPx = gapX > 0 && gapY > 0 ? Math.hypot(gapX, gapY) : Math.max(gapX, gapY);
  return { name: box.name, pixels: mark, cx: centreX, cy: centreY, clearMm: mm(clearPx, ppi), touchesEdge };
}

/** Ink where a film with a layout is clear: beside the print, and in the ink gap above and below it (the rows
 * between the print and the marks). Zero for a film from before engine 3. */
function inkInClearFilm(data: Uint8Array, canvas: ScreenSet['canvas']): number {
  const { layout, art, widthPx: W, heightPx: H, ppi } = canvas;
  if (!layout) return 0;
  const gap = Math.round((layout.inkGapMm * ppi) / 25.4);
  let n = 0;
  for (let y = Math.max(0, art.y - gap); y < Math.min(H, art.y + art.height + gap); y++) {
    const row = y * W;
    const beside = y >= art.y && y < art.y + art.height;
    for (let x = 0; x < W; x++) {
      if (beside && x === art.x) x = art.x + art.width;
      if (x < W && data[row + x] !== 0) n++;
    }
  }
  return n;
}

function samePixels(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Screen packs
// ---------------------------------------------------------------------------

interface FilmLayer {
  index: number;
  layer: WebtoonLayer;
}

function filmLayers(psd: WebtoonPsd): FilmLayer[] {
  // @webtoon/psd lists layers top first; press order is bottom first.
  return psd.layers
    .filter((l) => parsePlateLayerName(l.name))
    .reverse()
    .map((layer, i) => ({ index: i + 1, layer }));
}

function canvasOf(input: ChecksInput): ScreenSet['canvas'] | null {
  if (input.expected.set) return input.expected.set.canvas;
  const m = input.manifest as PackManifestDetail;
  if (m.print?.canvasPx && m.print.artPx) {
    const base = { widthPx: m.print.canvasPx.width, heightPx: m.print.canvasPx.height, ppi: m.print.ppi, art: m.print.artPx };
    // a manifest from before engine 3 has the one margin, and its films the side-centre marks
    return m.print.layout ? { ...base, layout: m.print.layout } : { ...base, marginMm: m.print.marginMm ?? input.recipe.marks.marginMm };
  }
  return null;
}

async function screenChecks(input: ChecksInput): Promise<CheckResult[]> {
  const entry = input.files.find((f) => f.file.kind === 'screen_psd');
  const set = input.expected.set;
  // A set where nothing prints (the art is the shirt's colour) has no films and
  // no PSD: the engine's blocking warning is the result.
  if (set && set.plates.length === 0) {
    const reasons = set.warnings.filter((w) => w.severity === 'block').map((w) => w.message);
    return [{ id: 'plates', title: TITLES.plates, state: 'failed', detail: reasons.length ? reasons.join(' ') : 'Nothing prints on this set, so it has no films.' }];
  }
  const canvas = canvasOf(input);
  let psd: WebtoonPsd | null = null;
  let openError = '';
  if (entry) {
    try {
      psd = await parsePsdIndependently(entry.bytes);
    } catch (e) {
      openError = e instanceof Error ? e.message : String(e);
    }
  }
  const noFile = (): Outcome => ({
    state: 'failed',
    detail: !entry ? 'There is no screen PSD in the pack.' : entry.bytes.length === 0 ? 'The screen PSD is empty.' : `The screen PSD does not open (${openError}).`,
  });

  // Read every film once, in press order, and keep only what the checks need.
  interface FilmRead {
    index: number;
    name: string;
    hidden: boolean;
    overlay: ReturnType<typeof overlayState>;
    soft: number;
    notBlack: number;
    offCanvas: number;
    artCoverage: number;
    marginCoverage: number;
    mismatch: number | null;
    marks: (MarkFound | null)[];
    /** ink pixels in the ink gap or beside the print */
    clearInk: number;
    features: FeatureFindings | null;
  }
  const films: FilmRead[] = [];
  let windowNames: MarkName[] = [];
  if (psd && canvas) {
    const W = psd.width;
    const H = psd.height;
    const sameCanvas = W === canvas.widthPx && H === canvas.heightPx;
    const art = canvas.art;
    const windows = sameCanvas ? markWindows(canvas, input.recipe.marks.targetOffsetMm) : [];
    windowNames = windows.map((w) => w.name);
    const expectedPlates = set ? [...set.plates].sort((a, b) => a.index - b.index) : [];
    for (const { index, layer } of filmLayers(psd)) {
      const expectedPlate: InkPlate | undefined = expectedPlates[index - 1];
      const film = await filmFromLayer(layer, W, H, art, sameCanvas && expectedPlate ? expectedPlate.plate.data : null);
      const marginArea = W * H - art.width * art.height;
      const halftone = expectedPlate?.halftone ?? input.recipe.halftone;
      films.push({
        index,
        name: layer.name,
        hidden: layer.isHidden,
        overlay: overlayState(layer),
        soft: film.soft,
        notBlack: film.notBlack,
        offCanvas: film.offCanvas,
        artCoverage: sameCanvas ? film.artInk / (art.width * art.height) : 0,
        marginCoverage: sameCanvas && marginArea > 0 ? (film.totalInk - film.artInk) / marginArea : 0,
        mismatch: film.mismatch,
        marks: windows.map((w) => findMark(film.data, W, H, w, art, canvas.ppi)),
        clearInk: sameCanvas ? inkInClearFilm(film.data, canvas) : 0,
        features: sameCanvas
          ? analyseFeatures(film.data, W, art, { ppi: canvas.ppi, lpi: halftone.lpi, minDot: halftone.minDot, minLineMm: input.recipe.minLineMm })
          : null,
      });
    }
  }

  const results: CheckResult[] = [];

  results.push(
    await run('size', () => {
      if (!psd) return noFile();
      if (!canvas) return { state: 'failed', detail: 'The pack has no canvas to check the PSD against.' };
      const problems = integrity(entry ? [entry] : []);
      const states: State[] = problems.length ? ['failed'] : [];
      if (psd.width !== canvas.widthPx || psd.height !== canvas.heightPx) {
        problems.push(`the PSD is ${num(psd.width)} × ${num(psd.height)} px, the films are ${num(canvas.widthPx)} × ${num(canvas.heightPx)} px`);
        states.push('failed');
      }
      const res = psd.resolutionInfo;
      const ppi = res ? (res.horizontalUnit === 2 ? res.horizontal * 2.54 : res.horizontal) : null;
      const vppi = res ? (res.verticalUnit === 2 ? res.vertical * 2.54 : res.vertical) : null;
      if (ppi === null || Math.abs(ppi - canvas.ppi) > 0.01 || vppi === null || Math.abs(vppi - canvas.ppi) > 0.01) {
        problems.push(`the PSD says ${ppi === null ? 'no' : formatNumber(ppi)} ppi, the films are made at ${formatNumber(canvas.ppi)} ppi`);
        states.push('failed');
      }
      if (psd.depth !== 8 || psd.colorMode !== 3) {
        problems.push('the PSD is not 8-bit RGB');
        states.push('failed');
      }
      const ppiMm = canvas.ppi / 25.4;
      const widthMm = input.manifest.placement.widthMm;
      if (Math.abs(canvas.art.width - widthMm * ppiMm) > 1.5) {
        problems.push(`the print area is ${formatNumber(Math.round(mm(canvas.art.width, canvas.ppi) * 10) / 10)} mm wide, the placement says ${formatNumber(widthMm)} mm`);
        states.push('failed');
      }
      const [left, top] = [canvas.art.x, canvas.art.y];
      const right = canvas.widthPx - canvas.art.x - canvas.art.width;
      const bottom = canvas.heightPx - canvas.art.y - canvas.art.height;
      const off = (px: number, wantMm: number) => Math.abs(px - wantMm * ppiMm) > 1.5;
      const layout = canvas.layout;
      // each margin is whole pixels, the right and bottom ones a pixel off at most (engine/units.ts filmCanvas)
      if (layout && (off(left, layout.sideMarginMm) || off(right, layout.sideMarginMm) || off(top, layout.endMarginMm) || off(bottom, layout.endMarginMm))) {
        problems.push(`the margins are not ${formatNumber(layout.sideMarginMm)} mm at the sides and ${formatNumber(layout.endMarginMm)} mm above and below`);
        states.push('review');
      }
      const legacyMarginMm = canvas.marginMm ?? input.recipe.marks.marginMm ?? 25;
      if (!layout && [left, top, right, bottom].some((m) => off(m, legacyMarginMm))) {
        problems.push(`the margin is not ${formatNumber(legacyMarginMm)} mm on every side`);
        states.push('review');
      }
      // A2 portrait at most (owner decision, 16 Oct 2026): the design within 40 × 54 cm, as the engine measures it,
      // and the film within the sheet (a pixel over is rounding)
      const wholePx = (vMm: number) => Math.round(vMm * ppiMm);
      if (canvas.art.width > wholePx(MAX_DESIGN_CM.widthCm * 10) || canvas.art.height > wholePx(MAX_DESIGN_CM.heightCm * 10)) {
        problems.push(`the print is larger than the ${formatNumber(MAX_DESIGN_CM.widthCm)} × ${formatNumber(MAX_DESIGN_CM.heightCm)} cm an A2 film holds`);
        states.push('failed');
      }
      if (canvas.widthPx > wholePx(FILM_SHEET_CM.widthCm * 10) + 1 || canvas.heightPx > wholePx(FILM_SHEET_CM.heightCm * 10) + 1) {
        problems.push(`the film is ${cmText(mm(canvas.widthPx, canvas.ppi))} × ${cmText(mm(canvas.heightPx, canvas.ppi))} cm, larger than an A2 sheet (${formatNumber(FILM_SHEET_CM.widthCm)} × ${formatNumber(FILM_SHEET_CM.heightCm)} cm)`);
        states.push('failed');
      }
      if (entry && entry.bytes.length >= 2 * 1024 ** 3 && entry.bytes.readUInt16BE(4) !== 2) {
        problems.push('the file is over 2 GB but not saved as PSB');
        states.push('failed');
      }
      const state = worst(states);
      const print = `${num(psd.width)} × ${num(psd.height)} px at ${formatNumber(canvas.ppi)} ppi: a ${cmText(mm(canvas.art.width, canvas.ppi))} × ${cmText(mm(canvas.art.height, canvas.ppi))} cm print`;
      const summary = layout
        ? `${print} with margins of ${formatNumber(layout.sideMarginMm)} mm at the sides and ${formatNumber(layout.endMarginMm)} mm above and below.`
        : `${print} plus a ${formatNumber(legacyMarginMm)} mm margin.`;
      return { state, detail: state === 'passed' ? summary : `${summary} But ${list(problems)}.` };
    }),
  );

  results.push(
    await run('structure', async () => {
      if (!psd) return noFile();
      const notes: string[] = [];
      const states: State[] = [];
      const total = films.length;
      const expected = set ? [...set.plates].sort((a, b) => a.index - b.index) : [];
      if (set && total !== expected.length) {
        notes.push(`the PSD has ${total} film layers, the pack ${expected.length}`);
        states.push('failed');
      }
      films.forEach((f) => {
        const want = expected[f.index - 1];
        if (want && f.name !== plateLayerName(want, expected.length, set?.method)) {
          notes.push(`film ${f.index} is named "${f.name}", expected "${plateLayerName(want, expected.length, set?.method)}"`);
          states.push('failed');
        }
        if (!want) {
          const parsed = parsePlateLayerName(f.name);
          if (!parsed || parsed.index !== f.index || parsed.total !== total) {
            notes.push(`film layer "${f.name}" is out of press order`);
            states.push('failed');
          }
        }
        if (f.overlay.on) {
          notes.push(`the colour overlay on film ${f.index} is switched on, so it would not print black`);
          states.push('failed');
        } else if (!f.overlay.present) {
          notes.push(`film ${f.index} has no colour overlay for the preview`);
          states.push('review');
        } else if (want && f.overlay.rgb) {
          const [r, g, b] = hexToRgb(want.target.hex);
          if (Math.abs(r - f.overlay.rgb[0]) > 1 || Math.abs(g - f.overlay.rgb[1]) > 1 || Math.abs(b - f.overlay.rgb[2]) > 1) {
            notes.push(`film ${f.index}'s overlay colour is not its ink colour`);
            states.push('review');
          }
        }
        if (f.hidden) {
          notes.push(`film ${f.index} is hidden`);
          states.push('review');
        }
      });
      const garments = set ? set.garmentCodes.map((c) => input.garments.find((g) => g.code === c)).filter((g): g is GarmentColour => !!g) : [];
      for (const g of garments) {
        const layer = psd.layers.find((l) => l.name === garmentLayerName(g.name));
        if (!layer) {
          notes.push(`no "${garmentLayerName(g.name)}" layer`);
          states.push('review');
        } else if (!layer.isHidden) {
          notes.push(`"${layer.name}" is visible, so it would print`);
          states.push('failed');
        }
      }
      const original = await checkOriginal(psd);
      notes.push(...original.notes);
      states.push(original.state);
      if (!iccOk(psd.icc_profile)) {
        notes.push('no sRGB profile is embedded');
        states.push('review');
      }
      const merged = await checkMergedImage(psd);
      if (merged) {
        notes.push(merged);
        states.push('review');
      }
      const state = worst(states);
      if (state === 'passed') {
        return { state, detail: `${total} films in press order with their colour overlays off, ${garments.length} hidden garment ${garments.length === 1 ? 'layer' : 'layers'}, and ORIGINAL as a hidden, locked smart object.` };
      }
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
    }),
  );

  results.push(
    await run('plates', () => {
      if (!psd) return noFile();
      if (!canvas) return { state: 'failed', detail: 'The pack has no canvas to read the films against.' };
      if (films.length === 0) return { state: 'failed', detail: 'The PSD has no film layers.' };
      const notes: string[] = [];
      const states: State[] = [];
      const expected = set ? [...set.plates].sort((a, b) => a.index - b.index) : [];
      for (const f of films) {
        if (f.soft) {
          notes.push(`film ${f.index} has ${num(f.soft)} grey or semi-transparent pixels`);
          states.push('failed');
        }
        if (f.notBlack) {
          notes.push(`film ${f.index} has ${num(f.notBlack)} pixels that are not black`);
          states.push('failed');
        }
        if (f.artCoverage === 0) {
          notes.push(`film ${f.index} is empty`);
          states.push('failed');
        } else if (f.artCoverage >= 0.999) {
          if (f.marginCoverage >= 0.5) {
            notes.push(`film ${f.index} is solid black, margins included`);
            states.push('failed');
          } else {
            notes.push(`film ${f.index} is solid across the whole print area; check that is meant`);
            states.push('review');
          }
        }
        if (f.mismatch !== null && f.mismatch > 0) {
          notes.push(`film ${f.index} differs from the engine's render in ${num(f.mismatch)} pixels`);
          states.push('failed');
        } else if (f.mismatch === 0) {
          const engine = expected[f.index - 1]?.coverage;
          if (engine !== undefined && Math.abs(engine - f.artCoverage) > 0.005) {
            notes.push(`film ${f.index} covers ${pct(f.artCoverage)} of the print area, the engine reported ${pct(engine)}`);
            states.push('review');
          }
        }
        if (f.offCanvas) {
          notes.push(`film ${f.index} has ink outside the canvas`);
          states.push('review');
        }
      }
      if (set && films.length !== expected.length) {
        notes.push(`${films.length} films in the PSD, ${expected.length} from the engine`);
        states.push('failed');
      }
      if (!set) {
        notes.push('there is no engine render to compare coverage with');
        states.push('review');
      }
      const state = worst(states);
      if (state === 'passed') {
        return { state, detail: `${films.length} films, every one pure black on transparency, none empty or solid, each matching the engine's render pixel for pixel.` };
      }
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
    }),
  );

  results.push(
    await run('marks', () => {
      if (!psd) return noFile();
      if (!canvas) return { state: 'failed', detail: 'The pack has no canvas to find the marks on.' };
      if (films.length === 0) return { state: 'failed', detail: 'The PSD has no films.' };
      const ppi = canvas.ppi;
      const names = windowNames;
      if (names.length === 0) return { state: 'failed', detail: 'The margins are too narrow for registration marks, or the PSD is not the size of the films.' };
      const notes: string[] = [];
      const states: State[] = [];
      if (names.length < 4) {
        notes.push(`only ${names.length} of the four marks fit on the film`);
        states.push('review');
      }
      for (const f of films) {
        const missing = f.marks.map((m, i) => (m ? null : names[i])).filter((n): n is MarkName => !!n);
        if (missing.length) {
          notes.push(`film ${f.index} has no ${list(missing)} mark`);
          states.push('failed');
        }
        if (f.clearInk > 0) {
          notes.push(`film ${f.index} has ink in the ink gap or beside the print (${num(f.clearInk)} px), where the film is kept clear`);
          states.push('review');
        }
      }
      const reference = films.find((f) => f.marks.every((m) => m));
      if (reference) {
        for (const f of films) {
          if (f === reference) continue;
          f.marks.forEach((m, i) => {
            const ref = reference.marks[i]!;
            if (!m || samePixels(m.pixels, ref.pixels)) return;
            const dx = mm(m.cx - ref.cx, ppi);
            const dy = mm(m.cy - ref.cy, ppi);
            const shift = Math.hypot(dx, dy);
            notes.push(
              shift >= 0.05
                ? `the ${m.name} mark on film ${f.index} sits ${formatNumber(Math.round(shift * 100) / 100)} mm off film ${reference.index}'s`
                : `the ${m.name} mark on film ${f.index} is not identical to film ${reference.index}'s`,
            );
            states.push('failed');
          });
        }
        for (const m of reference.marks) {
          if (!m) continue;
          if (m.touchesEdge) {
            notes.push(`the ${m.name} mark runs into other ink`);
            states.push('failed');
          } else if (m.clearMm < 2) {
            notes.push(`the ${m.name} mark is ${formatNumber(Math.round(m.clearMm * 10) / 10)} mm from the art`);
            states.push('failed');
          }
        }
      }
      const state = worst(states);
      if (state === 'passed') {
        const clear = formatNumber(Math.round(Math.min(...reference!.marks.map((m) => m!.clearMm)) * 10) / 10);
        return {
          state,
          detail: canvas.layout
            ? `Identical registration marks at the four corners of every film, ${clear} mm or more clear of the art, and the ink gap clear.`
            : `Identical registration marks on every film, ${clear} mm or more clear of the art.`,
        };
      }
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
    }),
  );

  results.push(
    await run('screens', () => {
      const count = psd ? films.length : (input.manifest.screenCount ?? set?.plates.length ?? 0);
      const heads = input.inks.pressHeads;
      if (count === 0) return { state: 'failed', detail: 'No screens.' };
      if (count > MAX_SCREENS) return { state: 'failed', detail: `${count} screens; the most we print is ${MAX_SCREENS}.` };
      const notes: string[] = [];
      let state: State = 'passed';
      if (count > STANDARD_SCREENS) {
        const extra = count - STANDARD_SCREENS;
        notes.push(`${count} screens, ${extra} above ${STANDARD_SCREENS}: €${extra} per piece on screen-printed runs`);
        state = 'review';
      }
      if (count > heads) {
        notes.push(`more screens than the press's ${heads} heads, so plan the run`);
        state = 'review';
      }
      if (input.manifest.screenCount !== null && input.manifest.screenCount !== count) {
        notes.push(`the manifest says ${input.manifest.screenCount}`);
        state = 'failed';
      }
      if (state === 'passed') return { state, detail: `${count} of ${STANDARD_SCREENS}, so no surcharge.` };
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
    }),
  );

  results.push(
    await run('features', () => {
      if (!psd) return noFile();
      const notes: string[] = [];
      let state: State = 'passed';
      for (const f of films) {
        const ft = f.features;
        if (!ft) continue;
        if (ft.thinPlaces > 0) {
          notes.push(`film ${f.index} has lines under ${formatNumber(input.recipe.minLineMm)} mm in ${ft.thinPlaces} ${ft.thinPlaces === 1 ? 'place' : 'places'}`);
          state = 'review';
        }
        if (ft.specks > 0) {
          notes.push(`film ${f.index} has ${num(ft.specks)} ${ft.specks === 1 ? 'speck' : 'specks'} too small to hold`);
          state = 'review';
        }
      }
      const engineNotes = (set?.warnings ?? []).filter((w) => /thin|line|island|speck|feature/i.test(w.code));
      for (const w of engineNotes) {
        notes.push(w.message.replace(/\.$/, ''));
        if (w.severity !== 'info') state = 'review';
      }
      if (films.some((f) => !f.features)) {
        notes.push('the films could not be measured against the print area');
        state = 'review';
      }
      if (state === 'passed' && !notes.length) {
        return { state, detail: `No line under ${formatNumber(input.recipe.minLineMm)} mm and no speck below the smallest dot the mesh holds.` };
      }
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}; they may close up or drop out.` };
    }),
  );

  results.push(
    await run('inks_measured', () =>
      input.inks.measured
        ? { state: 'passed', detail: 'The proof uses each ink as measured on our blanks.' }
        : { state: 'review', detail: 'The proof uses each ink’s target colour until the inks are measured on our blanks.' },
    ),
  );
  if (!input.inks.measured) results[results.length - 1].title = 'Inks not measured';

  results.push(await run('proof', () => proofOutcome(input)));
  return results;
}

// ---------------------------------------------------------------------------
// DTG/DTF packs
// ---------------------------------------------------------------------------

interface DtgRead {
  garment: GarmentColour;
  file: { file: PackFile; bytes: Buffer };
  expected: DtgLayer | undefined;
  png: ReturnType<typeof decodePngIndependently> | null;
  chunks: ReturnType<typeof readPngChunks> | null;
  error: string;
}

function garmentByCode(input: ChecksInput, code: string): GarmentColour {
  return input.garments.find((g) => g.code === code) ?? { code, name: code, hex: '#808080', isLight: false };
}

async function dtgChecks(input: ChecksInput): Promise<CheckResult[]> {
  const pngFiles = input.files.filter((f) => f.file.kind === 'dtg_png');
  const psdEntry = input.files.find((f) => f.file.kind === 'dtg_psd');
  const layers = input.expected.dtgLayers ?? [];
  const reads: DtgRead[] = pngFiles.map((entry, i) => {
    const code = entry.file.garmentCode ?? (pngFiles.length === 1 && layers.length === 1 ? layers[0].garmentCode : input.manifest.garmentCodes[i]);
    const read: DtgRead = { garment: garmentByCode(input, code), file: entry, expected: layers.find((l) => l.garmentCode === code), png: null, chunks: null, error: '' };
    try {
      read.chunks = readPngChunks(entry.bytes);
      read.png = decodePngIndependently(entry.bytes);
    } catch (e) {
      read.error = e instanceof Error ? e.message : String(e);
    }
    return read;
  });
  let psd: WebtoonPsd | null = null;
  let psdError = '';
  if (psdEntry) {
    try {
      psd = await parsePsdIndependently(psdEntry.bytes);
    } catch (e) {
      psdError = e instanceof Error ? e.message : String(e);
    }
  }
  const missingGarments = input.manifest.garmentCodes.filter((c) => !reads.some((r) => r.garment.code === c));

  const results: CheckResult[] = [];

  results.push(
    await run('size', () => {
      const notes: string[] = [];
      const states: State[] = [];
      const problems = integrity([...pngFiles, ...(psdEntry ? [psdEntry] : [])]);
      if (problems.length) {
        notes.push(...problems);
        states.push('failed');
      }
      if (reads.length === 0) return { state: 'failed', detail: 'There is no DTG/DTF PNG in the pack.' };
      if (missingGarments.length) {
        notes.push(`no PNG for ${list(missingGarments.map((c) => garmentByCode(input, c).name))}`);
        states.push('failed');
      }
      for (const r of reads) {
        const who = r.garment.name;
        if (!r.png || !r.chunks) {
          notes.push(`the PNG for ${who} does not open (${r.error})`);
          states.push('failed');
          continue;
        }
        const ppi = r.expected?.raster.ppi ?? input.recipe.dtg.ppi;
        if (r.png.bitDepth !== 8 || r.png.colorType !== 6) {
          notes.push(`the PNG for ${who} is not 8-bit RGBA`);
          states.push('failed');
        }
        if (r.png.interlaced) {
          notes.push(`the PNG for ${who} is interlaced`);
          states.push('review');
        }
        const phys = r.chunks.find((c) => c.type === 'pHYs');
        const ppm = ppiToPixelsPerMetre(ppi);
        if (!phys) {
          notes.push(`the PNG for ${who} has no resolution set`);
          states.push('failed');
        } else {
          const p = parsePhys(phys);
          if (p.unit !== 1 || Math.abs(p.x - ppm) > 1 || Math.abs(p.y - ppm) > 1) {
            notes.push(`the PNG for ${who} says ${formatNumber(Math.round((p.x * 0.0254) * 10) / 10)} ppi, it should say ${formatNumber(ppi)}`);
            states.push('failed');
          }
        }
        const iccp = r.chunks.find((c) => c.type === 'iCCP');
        if (!iccp || !iccOk(parseIccp(iccp).profile)) {
          notes.push(`the PNG for ${who} has no sRGB profile`);
          states.push('failed');
        }
        if (r.expected && (r.expected.raster.width === 0 || r.expected.raster.height === 0)) {
          // Nothing prints on this garment: one transparent pixel, reported under Transparency.
        } else if (r.expected) {
          const e = r.expected;
          if (r.png.width !== e.raster.width || r.png.height !== e.raster.height) {
            notes.push(`the PNG for ${who} is ${r.png.width} × ${r.png.height} px, the engine made ${e.raster.width} × ${e.raster.height}`);
            states.push('failed');
          }
          if (e.offsetPx.x < 0 || e.offsetPx.y < 0 || e.offsetPx.x + e.raster.width > e.printAreaPx.width || e.offsetPx.y + e.raster.height > e.printAreaPx.height) {
            notes.push(`the crop for ${who} sits outside the print area`);
            states.push('failed');
          }
          if (Math.abs(e.printAreaPx.width - (input.manifest.placement.widthMm * ppi) / 25.4) > 1.5) {
            notes.push(`the print area is not ${formatNumber(input.manifest.placement.widthMm)} mm wide at ${formatNumber(ppi)} ppi`);
            states.push('failed');
          }
        } else {
          notes.push(`there is no engine render for ${who} to compare with`);
          states.push('review');
        }
      }
      if (!psdEntry) {
        notes.push('there is no DTG/DTF PSD');
        states.push('failed');
      } else if (!psd) {
        notes.push(`the DTG/DTF PSD does not open (${psdError})`);
        states.push('failed');
      } else if (layers[0]) {
        const area = layers[0].printAreaPx;
        if (psd.width !== area.width || psd.height !== area.height) {
          notes.push(`the DTG/DTF PSD is ${psd.width} × ${psd.height} px, the print area ${area.width} × ${area.height}`);
          states.push('failed');
        }
        const res = psd.resolutionInfo;
        const ppi = res ? (res.horizontalUnit === 2 ? res.horizontal * 2.54 : res.horizontal) : 0;
        if (Math.abs(ppi - layers[0].raster.ppi) > 0.01) {
          notes.push(`the DTG/DTF PSD says ${formatNumber(ppi)} ppi`);
          states.push('failed');
        }
      }
      const state = worst(states);
      const first = reads.find((r) => r.png)?.png;
      const ppi = layers[0]?.raster.ppi ?? input.recipe.dtg.ppi;
      if (state === 'passed' && first) {
        const area = layers[0]?.printAreaPx;
        return {
          state,
          detail: `${reads.length} ${reads.length === 1 ? 'PNG' : 'PNGs'} at ${formatNumber(ppi)} ppi with sRGB embedded, cropped to the art${area ? ` inside a ${cmText(mm(area.width, ppi))} × ${cmText(mm(area.height, ppi))} cm print area` : ''}.`,
        };
      }
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
    }),
  );

  results.push(
    await run('structure', async () => {
      const notes: string[] = [];
      const states: State[] = [];
      for (const r of reads) {
        if (!r.png || !r.expected || r.expected.raster.width === 0 || r.expected.raster.height === 0) continue;
        const e = r.expected.raster.data;
        const d = r.png.data;
        let diff = 0;
        if (e.length !== d.length) diff = -1;
        else for (let i = 0; i < e.length; i++) if (e[i] !== d[i]) diff++;
        if (diff !== 0) {
          notes.push(`the PNG for ${r.garment.name} differs from the engine's render${diff > 0 ? ` in ${num(Math.ceil(diff / 4))} pixels` : ''}`);
          states.push('failed');
        }
      }
      if (!psd) {
        notes.push(psdEntry ? `the DTG/DTF PSD does not open (${psdError})` : 'there is no DTG/DTF PSD');
        states.push('failed');
      } else {
        for (const l of layers) {
          const garment = garmentByCode(input, l.garmentCode);
          const layer = psd.layers.find((x) => x.name === dtgLayerName(garment.name));
          if (!layer) {
            notes.push(`no "${dtgLayerName(garment.name)}" layer`);
            states.push('failed');
            continue;
          }
          if (l.raster.width === 0 || l.raster.height === 0) {
            // nothing prints on this garment; the layer is empty by design
          } else if (layer.left !== l.offsetPx.x || layer.top !== l.offsetPx.y || layer.width !== l.raster.width || layer.height !== l.raster.height) {
            notes.push(`"${layer.name}" is not where the engine placed it`);
            states.push('failed');
          } else {
            const px = await layer.composite(false);
            let diff = 0;
            for (let i = 0; i < px.length; i++) if (px[i] !== l.raster.data[i]) diff++;
            if (diff) {
              notes.push(`"${layer.name}" differs from the engine's render`);
              states.push('failed');
            }
          }
          const fill = psd.layers.find((x) => x.name === garmentLayerName(garment.name));
          if (!fill) {
            notes.push(`no "${garmentLayerName(garment.name)}" layer`);
            states.push('review');
          } else if (!fill.isHidden) {
            notes.push(`"${fill.name}" is visible`);
            states.push('review');
          }
        }
        const unknown = psd.layers.filter((l) => !l.name.startsWith('DTG/DTF on ') && !garmentNameFromLayer(l.name) && !isOriginalLayerName(l.name));
        if (unknown.length) {
          notes.push(`unexpected layers: ${unknown.map((l) => l.name).join(', ')}`);
          states.push('review');
        }
        const original = await checkOriginal(psd);
        notes.push(...original.notes);
        states.push(original.state);
        if (!iccOk(psd.icc_profile)) {
          notes.push('the PSD has no sRGB profile');
          states.push('review');
        }
        const merged = await checkMergedImage(psd);
        if (merged) {
          notes.push(merged);
          states.push('review');
        }
      }
      const state = worst(states);
      if (state === 'passed') {
        return { state, detail: `The PNGs and the PSD's ${layers.length} garment ${layers.length === 1 ? 'layer match' : 'layers match'} the engine's render pixel for pixel; ORIGINAL is a hidden, locked smart object.` };
      }
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
    }),
  );

  results.push(
    await run('dtg_alpha', () => {
      if (reads.length === 0) return { state: 'failed', detail: 'There is no DTG/DTF PNG in the pack.' };
      const notes: string[] = [];
      const states: State[] = [];
      for (const r of reads) {
        if (!r.png) {
          notes.push(`the PNG for ${r.garment.name} does not open`);
          states.push('failed');
          continue;
        }
        const d = r.png.data;
        let soft = 0;
        let opaque = 0;
        let leftover = 0;
        const garmentLab = hexToLab(r.garment.hex);
        const tolerance = input.recipe.knockoutDeltaE;
        // ΔE2000 per colour, cached: 0 unknown, 1 far, 2 near the garment.
        const near = new Uint8Array(1 << 24);
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3];
          if (a !== 0 && a !== 255) soft++;
          if (a < 128) continue;
          opaque++;
          const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
          let n = near[key];
          if (n === 0) {
            // the engine knocks out colours within the tolerance, inclusive
            n = deltaE2000(srgbToLab(d[i], d[i + 1], d[i + 2]), garmentLab) <= tolerance ? 2 : 1;
            near[key] = n;
          }
          if (n === 2) leftover++;
        }
        if (soft) {
          notes.push(`the PNG for ${r.garment.name} has ${num(soft)} semi-transparent pixels, which print a halo`);
          states.push('failed');
        }
        if (opaque === 0) {
          notes.push(`nothing prints on ${r.garment.name}: the art is the shirt's colour there`);
          states.push('failed');
        } else if (leftover / opaque > 0.005) {
          notes.push(`${pct(leftover / opaque)} of the ${r.garment.name} print is the garment's own colour, which should have been knocked out`);
          states.push('failed');
        } else if (leftover / opaque > 0.0002) {
          notes.push(`${num(leftover)} pixels on ${r.garment.name} are within ΔE ${formatNumber(tolerance)} of the garment colour`);
          states.push('review');
        }
      }
      const state = worst(states);
      if (state === 'passed') return { state, detail: 'Every pixel is fully transparent or fully opaque, with no garment-coloured pixels left in knocked-out areas.' };
      return { state, detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
    }),
  );

  results.push(
    await run('whites', () => {
      const whites = reads.filter((r) => r.expected?.whitesTransparent ?? isWhiteGarment(r.garment.hex));
      if (whites.length === 0) return { state: 'passed', detail: 'No white garments in this pack; the art’s whites print white ink.' };
      const notes: string[] = [];
      for (const r of whites) {
        if (!r.png) continue;
        const d = r.png.data;
        let white = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 128 && d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255) white++;
        if (white) notes.push(`${num(white)} pure white pixels on ${r.garment.name} would print white ink`);
      }
      if (notes.length) return { state: 'failed', detail: `${list(notes).replace(/^./, (c) => c.toUpperCase())}.` };
      return { state: 'passed', detail: `No RGB 255 white left on ${list(whites.map((r) => r.garment.name))}, so no white ink goes down there.` };
    }),
  );

  results.push(await run('proof', () => proofOutcome(input)));
  return results;
}

// ---------------------------------------------------------------------------
// Proof
// ---------------------------------------------------------------------------

async function proofOutcome(input: ChecksInput): Promise<Outcome> {
  const proofs = input.files.filter((f) => f.file.kind === 'proof');
  if (proofs.length === 0) return { state: 'review', detail: 'There is no proof in the pack to check.' };
  if (!input.approvedProof) {
    const blank: string[] = [];
    for (const p of proofs) {
      const stats = await sharp(p.bytes).stats();
      if (stats.channels.slice(0, 3).every((c) => c.stdev < 0.5)) blank.push(p.file.garmentCode ? garmentByCode(input, p.file.garmentCode).name : p.file.name);
    }
    if (blank.length) return { state: 'failed', detail: `The proof for ${list(blank)} is blank.` };
    return { state: 'passed', detail: 'No approved proof yet: these are the proofs the artist will approve.' };
  }
  let best: { name: string; result: Awaited<ReturnType<typeof compareProofs>> } | null = null;
  for (const p of proofs) {
    const result = await compareProofs(input.approvedProof, p.bytes);
    if (!best || result.ssim - result.changedShare > best.result.ssim - best.result.changedShare) {
      best = { name: p.file.garmentCode ? garmentByCode(input, p.file.garmentCode).name : p.file.name, result };
    }
  }
  const { result } = best!;
  const measures = `SSIM ${result.ssim.toFixed(3)}, colour changed on ${pct(result.changedShare)} of the print`;
  if (!result.sameFraming) return { state: 'failed', detail: 'The proof is framed differently from the one the artist approved; the artist must approve again.' };
  if (result.verdict === 'same') return { state: 'passed', detail: `Matches the proof the artist approved (${measures}).` };
  if (result.verdict === 'minor') return { state: 'review', detail: `Small visible changes against the approved proof (${measures}). Check whether the artist needs to approve again.` };
  return { state: 'failed', detail: `Differs from the proof the artist approved (${measures}); the artist must approve again.` };
}

export async function runPackChecks(input: ChecksInput): Promise<CheckResult[]> {
  return input.technique === 'screen' ? screenChecks(input) : dtgChecks(input);
}
