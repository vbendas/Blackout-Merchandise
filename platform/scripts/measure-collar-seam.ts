/**
 * Where is the collar seam on a packshot, and does the print box sit 5 cm below it? (owner, 16 Oct 2026)
 *
 * The front and back mockups and proofs put the top of a print COLLAR_DISTANCE_CM below the collar seam
 * (lib/print/defaults.ts). The boxes in lib/mockups/placements.ts are fractions of the packshot, so that needs the
 * seam's row on the photos. This finds it the way a person does, and checks the table against it:
 *
 *  1. Photos: the black packshot (C002, a 1200 x 1500 PNG, the catalogue's own photo of every blank) of a few
 *     representative blanks per garment type (REPRESENTATIVES). Black shows the stitched edge best.
 *  2. A person looks at the neck at 3x with a ruler (--look) and says where the seam is, to about 25 px (`around`).
 *  3. The detector snaps to it (findSeamRow): the 21 px strip at the centre column is averaged per row and the seam is
 *     the lowest strong horizontal edge within 25 px of `around`: the outer edge of the rib on a tee, a sweatshirt or a
 *     kids' garment; the seam under the hood, at the front of a hoodie; and, on a polo, the V where the collar meets the
 *     placket, which is read by eye (`by: 'eye'`) because the first button's edge is stronger than the crease.
 *  4. The seam of a garment type is the median of its representatives' rows, in px of the 1200 x 1500 frame. That is
 *     COLLAR_SEAM_ROW_PX in placements.ts, and each box's top is that row plus 5 cm at the box's own scale.
 *
 * Run from platform/, or anywhere in the repo with the path to it (nothing here touches a database or the network):
 *   npx tsx scripts/measure-collar-seam.ts                       the representatives, their medians, and the gap in cm
 *   npx tsx scripts/measure-collar-seam.ts --look STTU169 front  a ruler crop with the seam and the box top drawn on it
 * The exit code is 1 when a median is not the row in the table.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { COLLAR_DISTANCE_CM } from '@/lib/print/defaults';
import { COLLAR_SEAM_ROW_PX, PLACEMENTS, STANDARD_PACKSHOT, pxPerCm, type PrintArea } from '@/lib/mockups/placements';

export type Side = 'front' | 'back';

export interface Reading {
  style: string;
  /** the seam's row in px of the 1200 x 1500 frame, read off a ruler crop (--look) to about +-25 px */
  around: number;
  /** 'eye': `around` is the reading itself (a polo's V). Otherwise the detector snaps to the edge near it. */
  by?: 'eye';
  /** what the row is, where it is not the neckband: 'hood tip' */
  note?: string;
}

/** How far from `around` the detector looks, in px. */
export const WINDOW_PX = 25;

/** The photos the seam of each garment type is the median of: the blanks with the most colours (the unisex and the women's
 * cuts), a long sleeve, hoodies and crews. Each `around` was read on a 3x crop with a 5 px ruler (--look). */
export const REPRESENTATIVES: Record<string, Partial<Record<Side, Reading[]>>> = {
  'T-shirts': {
    front: [
      { style: 'STTU169', around: 404 },
      { style: 'STTU170', around: 396 },
      { style: 'STTU788', around: 380 },
      { style: 'STTW172', around: 441 },
      { style: 'STTW079', around: 458 },
      { style: 'STTW219', around: 407 },
      { style: 'STTU199', around: 354 },
      { style: 'STTU964', around: 391 },
    ],
    back: [
      { style: 'STTU169', around: 283 },
      { style: 'STTU170', around: 289 },
      { style: 'STTU788', around: 281 },
      { style: 'STTW172', around: 331 },
      { style: 'STTW079', around: 304 },
      { style: 'STTW219', around: 316 },
      { style: 'STTU199', around: 248 },
      { style: 'STTU964', around: 297 },
    ],
  },
  'Sweats & Hoodies': {
    front: [
      { style: 'STSU177', around: 401 },
      { style: 'STSU168', around: 411 },
      { style: 'STSU011', around: 424 },
      { style: 'STSU077', around: 397 },
      { style: 'STSW213', around: 482 },
      { style: 'STSU178', around: 333 },
      { style: 'STSU868', around: 388 },
      { style: 'STSW212', around: 422 },
      { style: 'STSU208', around: 322 },
      { style: 'STSU799', around: 327 },
    ],
  },
  Polos: {
    front: [
      { style: 'STPU222', around: 355, by: 'eye' },
      { style: 'STPM224', around: 352, by: 'eye' },
      { style: 'STPU223', around: 296, by: 'eye' },
    ],
    back: [
      { style: 'STPU222', around: 260 },
      { style: 'STPM224', around: 243 },
      { style: 'STPU223', around: 199 },
    ],
  },
  'Kids & Baby': {
    front: [
      { style: 'STTK184', around: 393 },
      { style: 'STSK181', around: 369 },
      { style: 'STSK180', around: 443 },
      { style: 'STTB918', around: 481 },
      { style: 'STUB103', around: 285 },
    ],
  },
};

/** The sides left as they were, with what the photos say. From behind, a hood hides the neck seam of a hooded garment and
 * hangs 200 px or more below it, so there is no neckband to measure on a hoodie, and the box that suits a crew's neckband
 * overlaps the hood. The rows are the hood tips of the most popular hoodies and the neckbands of the most popular crews. */
export const NOT_CALIBRATED: { type: string; side: Side; readings: Reading[] }[] = [
  {
    type: 'Sweats & Hoodies',
    side: 'back',
    readings: [
      { style: 'STSU177', around: 420, note: 'hood tip' },
      { style: 'STSU168', around: 444, note: 'hood tip' },
      { style: 'STSU011', around: 456, note: 'hood tip' },
      { style: 'STSU178', around: 227, note: 'neckband' },
      { style: 'STSU868', around: 276, note: 'neckband' },
      { style: 'STSW212', around: 301, note: 'neckband' },
      { style: 'STSU799', around: 254, note: 'neckband' },
      { style: 'STSU208', around: 256, note: 'neckband' },
    ],
  },
  {
    type: 'Kids & Baby',
    side: 'back',
    readings: [
      { style: 'STSK180', around: 544, note: 'hood tip' },
      { style: 'STTK184', around: 294, note: 'neckband' },
      { style: 'STSK181', around: 289, note: 'neckband' },
      { style: 'STTB918', around: 345, note: 'neckband' },
    ],
  },
];

const PACKSHOT_DIR = path.resolve(__dirname, '..', 'public', 'packshots');
const FRAME = STANDARD_PACKSHOT;
const STRIP = { from: FRAME.widthPx / 2 - 10, to: FRAME.widthPx / 2 + 10 };

export function packshotFile(style: string, side: Side): string {
  return path.join(PACKSHOT_DIR, `${side === 'front' ? 'PFM0' : 'PBM0'}_${style}_C002.png`);
}

/** The seam's row in px of the 1200 x 1500 frame: the lowest strong horizontal edge of the centre strip within
 * `window` (rows). Null when there is none. `strength` is the edge's colour step across 4 rows, 0 to 255. */
export async function findSeamRow(file: string, window: [number, number]): Promise<{ row: number; strength: number } | null> {
  const { data } = await sharp(file).resize(FRAME.widthPx, FRAME.heightPx, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { widthPx, heightPx } = FRAME;
  // the mean colour of the strip in each row, over mid grey where the photo is transparent, and whether the strip is garment all along
  const mean = new Float64Array(heightPx * 3);
  const opaque = new Uint8Array(heightPx);
  for (let y = 0; y < heightPx; y++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let solid = 1;
    for (let x = STRIP.from; x <= STRIP.to; x++) {
      const i = (y * widthPx + x) * 4;
      const a = data[i + 3] / 255;
      r += data[i] * a + 128 * (1 - a);
      g += data[i + 1] * a + 128 * (1 - a);
      b += data[i + 2] * a + 128 * (1 - a);
      if (data[i + 3] < 250) solid = 0;
    }
    const n = STRIP.to - STRIP.from + 1;
    mean.set([r / n, g / n, b / n], y * 3);
    opaque[y] = solid;
  }
  // a Gaussian blur over 7 rows, then the colour step across 4 rows (luminance weights), not counted next to the photo's edge
  const kernel = [0.0045, 0.054, 0.242, 0.399, 0.242, 0.054, 0.0045];
  const blurred = new Float64Array(heightPx * 3);
  for (let y = 3; y < heightPx - 3; y++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let j = -3; j <= 3; j++) sum += mean[(y + j) * 3 + c] * kernel[j + 3];
      blurred[y * 3 + c] = sum / 1.0009;
    }
  }
  const step = new Float64Array(heightPx);
  for (let y = 6; y < heightPx - 6; y++) {
    let clear = true;
    for (let j = -4; j <= 4; j++) if (!opaque[y + j]) clear = false;
    if (!clear) continue;
    const dr = blurred[(y + 2) * 3] - blurred[(y - 2) * 3];
    const dg = blurred[(y + 2) * 3 + 1] - blurred[(y - 2) * 3 + 1];
    const db = blurred[(y + 2) * 3 + 2] - blurred[(y - 2) * 3 + 2];
    step[y] = Math.sqrt(0.2126 * dr * dr + 0.7152 * dg * dg + 0.0722 * db * db);
  }
  const lo = Math.max(7, Math.round(window[0]));
  const hi = Math.min(heightPx - 8, Math.round(window[1]));
  let strongest = 0;
  for (let y = lo; y <= hi; y++) strongest = Math.max(strongest, step[y]);
  const threshold = Math.max(1.2, 0.3 * strongest);
  for (let y = hi; y >= lo; y--) {
    if (step[y] < threshold || step[y] < step[y - 1] || step[y] < step[y + 1]) continue;
    let weight = 0;
    let moment = 0;
    for (let j = -3; j <= 3; j++) {
      weight += step[y + j];
      moment += step[y + j] * (y + j);
    }
    return { row: moment / weight, strength: step[y] };
  }
  return null;
}

/** A representative's row: read by eye, or where the detector finds the edge near what the eye saw. */
export async function readingRow(reading: Reading, side: Side): Promise<number | null> {
  if (reading.by === 'eye') return reading.around;
  const found = await findSeamRow(packshotFile(reading.style, side), [reading.around - WINDOW_PX, reading.around + WINDOW_PX]);
  return found ? found.row : null;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The box a print on this side of the garment is drawn in for the gap check: the chest print, or the back. */
export function mainBox(type: string, side: Side): PrintArea {
  const box = PLACEMENTS[type]?.positions[side === 'front' ? 'front_chest' : 'back'];
  if (!box) throw new Error(`${type} has no ${side} box`);
  return box;
}

/** How far below a seam row the top of a box is, in cm at the box's own scale. */
export function gapCm(box: PrintArea, seamRow: number): number {
  return (box.y * FRAME.heightPx - seamRow) / pxPerCm(box, FRAME.widthPx);
}

async function report(): Promise<void> {
  let differs = false;
  for (const [type, sides] of Object.entries(REPRESENTATIVES)) {
    for (const side of ['front', 'back'] as const) {
      const readings = sides[side];
      if (!readings) continue;
      const box = mainBox(type, side);
      console.log(`\n${type} ${side}: the ${side === 'front' ? 'front chest' : 'back'} box top is at row ${(box.y * FRAME.heightPx).toFixed(1)}`);
      const rows: number[] = [];
      for (const reading of readings) {
        const row = await readingRow(reading, side);
        if (row === null) {
          console.log(`  ${reading.style}  no edge near row ${reading.around}`);
          differs = true;
          continue;
        }
        rows.push(row);
        console.log(`  ${reading.style}  seam ${row.toFixed(1)}${reading.by === 'eye' ? ' (by eye)' : ''}  box top is ${gapCm(box, row).toFixed(1)} cm below it`);
      }
      const middle = Math.round(median(rows));
      const inTable = COLLAR_SEAM_ROW_PX[type as keyof typeof COLLAR_SEAM_ROW_PX]?.[side as 'front'];
      const same = inTable !== undefined && Math.abs(inTable - median(rows)) <= 1;
      if (!same) differs = true;
      console.log(`  median ${median(rows).toFixed(1)} -> ${middle}; the table says ${inTable ?? 'nothing'}${same ? ' (agrees)' : ' (DIFFERS)'}; ${COLLAR_DISTANCE_CM} cm below it is ${gapCm(box, middle).toFixed(1)} cm at the box top`);
    }
  }
  console.log('\nNot calibrated (the box is as it was; the gap is how far below each reading its top is):');
  for (const { type, side, readings } of NOT_CALIBRATED) {
    const box = mainBox(type, side);
    console.log(`${type} ${side}: box top at row ${(box.y * FRAME.heightPx).toFixed(1)}`);
    const bands: number[] = [];
    for (const reading of readings) {
      const row = await readingRow(reading, side);
      if (row !== null && reading.note === 'neckband') bands.push(row);
      console.log(`  ${reading.style}  ${reading.note ?? 'seam'} ${row === null ? 'not found' : `${row.toFixed(1)}  box top is ${gapCm(box, row).toFixed(1)} cm below it`}`);
    }
    if (bands.length > 0) console.log(`  neckband median ${median(bands).toFixed(1)}: the box top is ${gapCm(box, median(bands)).toFixed(1)} cm below it`);
  }
  if (differs) process.exitCode = 1;
}

/** A ruler crop of a blank's neck with the seam (blue), the table's seam row (green) and the box top (red) on it. */
async function look(style: string, side: Side, outDir?: string): Promise<void> {
  const { typeFor } = await import('@/lib/catalog/catalog-filters');
  const type = typeFor(style);
  const box = mainBox(type, side);
  const reading = REPRESENTATIVES[type]?.[side]?.find((r) => r.style === style) ?? NOT_CALIBRATED.find((n) => n.type === type && n.side === side)?.readings.find((r) => r.style === style);
  const row = reading ? await readingRow(reading, side) : null;
  const table = COLLAR_SEAM_ROW_PX[type as keyof typeof COLLAR_SEAM_ROW_PX]?.[side as 'front'];
  const boxTop = box.y * FRAME.heightPx;
  const y0 = Math.max(0, Math.round(Math.min(row ?? table ?? boxTop, boxTop) - 120));
  const y1 = Math.min(FRAME.heightPx, Math.round(boxTop + 60));
  const zoom = 2.4;
  const crop = await sharp(packshotFile(style, side))
    .flatten({ background: '#d0d0d0' })
    .linear(2.2, 8)
    .extract({ left: 300, top: y0, width: 600, height: y1 - y0 })
    .resize({ width: Math.round(600 * zoom) })
    .png()
    .toBuffer();
  const ruler = 46;
  const width = Math.round(600 * zoom) + ruler;
  const height = Math.round((y1 - y0) * zoom);
  const at = (y: number) => (y - y0) * zoom;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  for (let y = Math.ceil(y0 / 5) * 5; y <= y1; y += 5) {
    svg += `<line x1="${ruler - (y % 10 === 0 ? 14 : 6)}" y1="${at(y)}" x2="${ruler}" y2="${at(y)}" stroke="#d00"/>`;
    if (y % 20 === 0) svg += `<text x="2" y="${at(y) + 4}" font-size="11" font-family="Arial, Helvetica, sans-serif" fill="#d00">${y}</text>`;
  }
  const line = (y: number, colour: string) => `<line x1="${ruler}" y1="${at(y)}" x2="${width}" y2="${at(y)}" stroke="${colour}" stroke-width="1.5"/>`;
  if (row !== null) svg += line(row, '#2050ff');
  if (table !== undefined) svg += line(table, '#18a050');
  svg += `${line(boxTop, '#e02020')}</svg>`;
  const picture = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite([{ input: crop, left: ruler, top: 0 }, { input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toBuffer();
  const dir = outDir ?? path.join(os.tmpdir(), 'collar-seam');
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, `${style}-${side}.png`);
  await writeFile(out, picture);
  console.log(`${type} ${style} ${side}: seam ${row?.toFixed(1) ?? 'not read'} (blue), table ${table ?? 'none'} (green), box top ${boxTop.toFixed(1)} (red)${row === null ? '' : `, ${gapCm(box, row).toFixed(1)} cm below the seam`}\n${out}`);
}

async function main(): Promise<void> {
  const [mode, style, side, outDir] = process.argv.slice(2);
  if (mode === '--look') return look(style, side as Side, outDir);
  return report();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
