// Flat, true-size proof of a sleeve print. Owner decision, 16 Oct 2026: the
// garment photos are front and back only, so a sleeve print is shown on a
// sleeve outline at true size, with its measurements, next to the front and
// back mockups. Real sleeve photos can replace it later.
//
// The proof is drawn on an ecru plate, 4:5 like the mockups: a sleeve outline
// in the garment colour (thin outline, so a white sleeve reads on ecru and a
// black one reads by its fill), the print laid on it at the sleeve's own scale
// with its transparency intact, a dimension line for each side of the print,
// and a label. Where things go is in sleeve-geometry.ts; this file validates,
// resizes the print and draws.
import sharp, { type OutputInfo } from 'sharp';
import {
  PLATE_HEX,
  SLEEVE_SPECS,
  formatCm,
  layoutSleeve,
  num,
  type DimensionLine,
  type SleeveLayout,
} from './sleeve-geometry';

export interface SleeveProofInput {
  /** the print as it will print (the DTG layer, or a crop of the screen proof), RGBA PNG */
  print: Buffer;
  /** the printed size */
  printWidthCm: number;
  printHeightCm: number;
  /** the garment colour the sleeve is drawn in */
  garmentHex: string;
  side: 'left' | 'right';
  sleeve: 'short' | 'long';
  /** output width in px; default 800 */
  widthPx?: number;
}

export type SleeveProofErrorCode = 'invalid_input' | 'invalid_print' | 'empty_print' | 'print_shape' | 'too_large' | 'no_font';

/** Why a proof could not be drawn, in plain words. `max` is set for `too_large`: the biggest print the sleeve takes. */
export class SleeveProofError extends Error {
  readonly max?: { widthCm: number; heightCm: number };
  constructor(
    readonly code: SleeveProofErrorCode,
    message: string,
    options?: { max?: { widthCm: number; heightCm: number }; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'SleeveProofError';
    this.max = options?.max;
  }
}

const DEFAULT_WIDTH_PX = 800;
const MIN_WIDTH_PX = 200;
const MAX_WIDTH_PX = 4000;

/** A print under a millimetre is not a print, and would be labelled "0 cm". */
const MIN_PRINT_CM = 0.1;

/** Alpha below this is invisible: a print with nothing above it is empty. */
const VISIBLE_ALPHA = 8;

/** What the shape of the print's pixels may differ from the shape of its printed size by, besides the rounding of the
 * size and of the image (see decodePrint): a hair, for sizes worked out in floating point. */
const SHAPE_SLACK = 0.005;

// The labels are text in an SVG, drawn by the librsvg inside sharp, which has no glyphs without a system font
// (the print worker's image installs fontconfig and DejaVu for this). IBM Plex Mono first, the platform's label
// face; the rest are the monospaced faces a Mac, Windows, Debian and everything else have.
const FONT_FAMILY = "'IBM Plex Mono', 'DejaVu Sans Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

/** One character as the renderer draws it, as pixels. */
async function drawnChar(ch: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><text x="4" y="24" font-family="${FONT_FAMILY}" font-size="24" fill="#000000">${ch}</text></svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
}

/** With no font at all the renderer does not leave the text out: it draws an empty box for every character. So a
 * font is there when the characters the label uses come out different from one nothing has a glyph for. */
async function rendererHasFont(): Promise<boolean> {
  const [missing, ...drawn] = await Promise.all(['\ue000', '0', '9', '×', '·', 'c', 'm'].map(drawnChar));
  return drawn.every((d) => !d.equals(missing));
}

let fontReady: Promise<void> | undefined;
let warnedNoFont = false;

/** Without a font the dimension lines would carry empty boxes where the figures go, and the proof would look
 * finished and not be one. So find that out (once per process) and say so, rather than hand back a proof whose
 * measurements cannot be read. A failed check is not kept: the next proof asks again. The error is also logged,
 * once, because callers that fall back to "no proof" would otherwise hide why. */
function requireFont(): Promise<void> {
  fontReady ??= rendererHasFont().then((found) => {
    if (found) return;
    const message =
      'The renderer has no font to write the measurements with. Install fontconfig and a font on this machine (the print worker image has fonts-dejavu-core).';
    if (!warnedNoFont) {
      warnedNoFont = true;
      console.warn('[sleeve-proof]', message);
    }
    throw new SleeveProofError('no_font', message);
  });
  return fontReady.catch((err: unknown) => {
    fontReady = undefined;
    throw err;
  });
}

type Rgb = [number, number, number];

function parseHex(hex: unknown): Rgb {
  const m = typeof hex === 'string' ? /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim()) : null;
  if (!m) throw new SleeveProofError('invalid_input', `The garment colour must be a hex colour like #18181A, got ${JSON.stringify(hex)}.`);
  const full = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function linear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** White or near-black, whichever reads better on the garment: ink for the lines and figures drawn on it. */
function inkOn(garment: Rgb): string {
  const l = luminance(garment);
  const onWhite = 1.05 / (l + 0.05);
  const onBlack = (l + 0.05) / (luminance([17, 17, 17]) + 0.05);
  return onWhite >= onBlack ? '#ffffff' : '#111111';
}

interface Checked {
  garment: Rgb;
  widthPx: number;
}

function checkInput(input: SleeveProofInput): Checked {
  const { sleeve, side, printWidthCm: w, printHeightCm: h } = input;
  if (typeof sleeve !== 'string' || !Object.hasOwn(SLEEVE_SPECS, sleeve)) {
    throw new SleeveProofError('invalid_input', `The sleeve must be "short" or "long", got ${JSON.stringify(sleeve)}.`);
  }
  if (side !== 'left' && side !== 'right') {
    throw new SleeveProofError('invalid_input', `The side must be "left" or "right", got ${JSON.stringify(side)}.`);
  }
  if (!(input.print instanceof Uint8Array) || input.print.length === 0) {
    throw new SleeveProofError('invalid_print', 'The print is empty: there is no image to put on the sleeve.');
  }
  if (typeof w !== 'number' || typeof h !== 'number' || !Number.isFinite(w) || !Number.isFinite(h) || w < MIN_PRINT_CM || h < MIN_PRINT_CM) {
    const show = (v: unknown) => (typeof v === 'string' ? JSON.stringify(v) : String(v));
    throw new SleeveProofError('invalid_print', `The printed size must be a width and a height of at least ${MIN_PRINT_CM} cm, got ${show(w)} × ${show(h)}.`);
  }
  const widthPx = input.widthPx ?? DEFAULT_WIDTH_PX;
  if (typeof widthPx !== 'number' || !Number.isFinite(widthPx) || widthPx < MIN_WIDTH_PX || widthPx > MAX_WIDTH_PX) {
    throw new SleeveProofError('invalid_input', `The proof width must be between ${MIN_WIDTH_PX} and ${MAX_WIDTH_PX} px, got ${widthPx}.`);
  }
  const garment = parseHex(input.garmentHex);

  // Sizes are stated to the millimetre, so that is how they are compared: a print that reads "12 cm" fits 12.
  const spec = SLEEVE_SPECS[sleeve];
  const tenths = (v: number) => Math.round(v * 10) / 10;
  if (tenths(w) > spec.maxPrintWidthCm || tenths(h) > spec.maxPrintHeightCm) {
    throw new SleeveProofError(
      'too_large',
      `A ${formatCm(w)} × ${formatCm(h)} cm print is larger than a ${sleeve} sleeve takes. The most it takes is ${spec.maxPrintWidthCm} × ${spec.maxPrintHeightCm} cm.`,
      { max: { widthCm: spec.maxPrintWidthCm, heightCm: spec.maxPrintHeightCm } },
    );
  }
  return { garment, widthPx: Math.round(widthPx) };
}

interface Pixels {
  data: Buffer;
  width: number;
  height: number;
}

/** The print as 8-bit sRGB RGBA, or why it is not one. */
async function decodePrint(print: Buffer, printWidthCm: number, printHeightCm: number): Promise<Pixels> {
  let decoded: { data: Buffer; info: OutputInfo };
  try {
    decoded = await sharp(print).toColourspace('srgb').ensureAlpha().raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true });
  } catch (cause) {
    throw new SleeveProofError('invalid_print', 'The print is not an image that can be read (it should be a PNG).', { cause });
  }
  const { data, info } = decoded;
  if (info.channels !== 4 || info.width < 1 || info.height < 1 || data.length !== info.width * info.height * 4) {
    throw new SleeveProofError('invalid_print', `The print could not be read as an RGBA image (${info.width} × ${info.height} px, ${info.channels} channels).`);
  }
  let visible = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= VISIBLE_ALPHA) {
      visible = true;
      break;
    }
  }
  if (!visible) throw new SleeveProofError('empty_print', 'The print is empty: every pixel of it is transparent, so there is nothing to put on the sleeve.');

  // The image is laid in its printed size exactly, so its shape must be that size's shape: a mismatch means the
  // size belongs to some other crop, and stretching the print to it would be a wrong proof. Sizes come stated to
  // the millimetre, so each side may be half a millimetre out (a height worked out from the art's aspect and
  // rounded, say), and the image's own sides are whole pixels.
  const shapePx = info.width / info.height;
  const shapeCm = printWidthCm / printHeightCm;
  const allowed = SHAPE_SLACK + 0.06 / printWidthCm + 0.06 / printHeightCm + 1 / Math.min(info.width, info.height);
  if (Math.abs(shapePx / shapeCm - 1) > allowed) {
    throw new SleeveProofError(
      'print_shape',
      `The print is ${info.width} × ${info.height} px (${num(shapePx)}:1 wide to tall) but its printed size is ${formatCm(printWidthCm)} × ${formatCm(printHeightCm)} cm (${num(shapeCm)}:1). Give the size the print will be made at.`,
    );
  }
  return { data, width: info.width, height: info.height };
}

function textAttrs(layout: SleeveLayout): string {
  return `font-family="${FONT_FAMILY}" font-size="${num(layout.fontPx)}"`;
}

function dimensionSvg(dim: DimensionLine, layout: SleeveLayout, ink: string): string {
  const { x, y, vertical, label } = dim.text;
  const transform = vertical ? ` transform="rotate(-90 ${num(x)} ${num(y)})"` : '';
  return [
    `<path d="${dim.path}" fill="none" stroke="${ink}" stroke-width="${layout.linePx}"/>`,
    `<text x="${num(x)}" y="${num(y)}" text-anchor="middle" ${textAttrs(layout)} fill="${ink}"${transform}>${label}</text>`,
  ].join('');
}

/** The plate, the sleeve, its stitching, the dimension lines and the label: everything but the print. */
function baseSvg(layout: SleeveLayout, garment: Rgb, label: string): string {
  const { width, height } = layout;
  const fill = toHex(garment);
  const ink = inkOn(garment);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${PLATE_HEX}"/>`,
    `<path d="${layout.outline}" fill="${fill}" stroke="#000000" stroke-opacity="0.55" stroke-width="${num(layout.outlinePx)}" stroke-linejoin="round"/>`,
    layout.stitch
      ? `<path d="${layout.stitch}" fill="none" stroke="${ink}" stroke-opacity="0.4" stroke-width="${layout.hairPx}" stroke-dasharray="${num(5 * layout.hairPx)} ${num(4 * layout.hairPx)}"/>`
      : '',
    layout.seam ? `<path d="${layout.seam}" fill="none" stroke="${ink}" stroke-opacity="0.4" stroke-width="${layout.hairPx}"/>` : '',
    dimensionSvg(layout.widthDim, layout, ink),
    dimensionSvg(layout.heightDim, layout, ink),
    `<text x="${num(layout.label.x)}" y="${num(layout.label.y)}" ${textAttrs(layout)} fill="#000000" fill-opacity="0.8">${label}</text>`,
    '</svg>',
  ].join('');
}

/** A PNG of the sleeve outline with the print placed at true scale and labelled with its size. */
export async function renderSleeveProof(input: SleeveProofInput): Promise<Buffer> {
  const { garment, widthPx } = checkInput(input);
  const { print: bytes, printWidthCm, printHeightCm, side, sleeve } = input;
  const art = await decodePrint(bytes, printWidthCm, printHeightCm);
  await requireFont();

  const layout = layoutSleeve({ sleeve, side, widthPx, printWidthCm, printHeightCm });
  const box = layout.print;

  // Resized to its printed size at the proof's scale (sharp premultiplies the alpha, so no dark fringes).
  const placed = await sharp(art.data, { raw: { width: art.width, height: art.height, channels: 4 } })
    .resize({ width: box.width, height: box.height, fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const label = `${side === 'left' ? 'Left' : 'Right'} sleeve · ${formatCm(printWidthCm)} × ${formatCm(printHeightCm)} cm · true size`;
  return sharp(Buffer.from(baseSvg(layout, garment, label), 'utf8'))
    .composite([
      {
        input: placed.data,
        raw: { width: placed.info.width, height: placed.info.height, channels: 4 },
        left: box.left,
        top: box.top,
      },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}
