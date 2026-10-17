// Physical units. Every engine parameter is in mm, ppi, lpi or degrees;
// pixels exist only on rasters, always with the ppi they were made at.
import { FILM_SHEET_CM, MAX_DESIGN_CM } from '@/lib/print/defaults';
import type { CanvasSpec, FilmLayout, PrintPlacement } from '@/lib/print/types';

export const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, ppi: number): number {
  return (mm / MM_PER_INCH) * ppi;
}

export function pxToMm(px: number, ppi: number): number {
  return (px / ppi) * MM_PER_INCH;
}

export interface PrintSize {
  widthMm: number;
  heightMm: number;
  /** print area at `ppi` */
  widthPx: number;
  heightPx: number;
  ppi: number;
  /** the artwork's own resolution at this print size */
  sourcePpi: number;
}

/** The print area: the whole art canvas scaled to the placement width. */
export function printSize(placement: PrintPlacement, artWidth: number, artHeight: number, ppi: number): PrintSize {
  if (!(placement.widthMm > 0)) throw new Error(`placement width must be positive, got ${placement.widthMm}`);
  if (!(artWidth > 0) || !(artHeight > 0)) throw new Error(`empty artwork: ${artWidth}x${artHeight}`);
  const heightMm = (placement.widthMm * artHeight) / artWidth;
  return {
    widthMm: placement.widthMm,
    heightMm,
    widthPx: Math.max(1, Math.round(mmToPx(placement.widthMm, ppi))),
    heightPx: Math.max(1, Math.round(mmToPx(heightMm, ppi))),
    ppi,
    sourcePpi: artWidth / (placement.widthMm / MM_PER_INCH),
  };
}

const cm = (mm: number): string => String(Number((mm / 10).toFixed(3)));

/**
 * Refuses a print bigger than a screen film holds (owner decision, 16 Oct 2026): films are A2 portrait at most and
 * the sheet keeps its margins for the ink deposit and the marks, so the design is at most MAX_DESIGN_CM, 40 × 54 cm,
 * and never turned. Compared in whole pixels at the film's resolution, so a design that is 40 × 54 cm to within half
 * a pixel passes.
 */
export function assertFitsFilm(size: PrintSize): void {
  const maxW = Math.round(mmToPx(MAX_DESIGN_CM.widthCm * 10, size.ppi));
  const maxH = Math.round(mmToPx(MAX_DESIGN_CM.heightCm * 10, size.ppi));
  if (size.widthPx <= maxW && size.heightPx <= maxH) return;
  const over = [size.widthPx > maxW ? `${cm(size.widthMm)} cm wide` : null, size.heightPx > maxH ? `${cm(size.heightMm)} cm tall` : null].filter(Boolean);
  throw new Error(
    `The print is ${over.join(' and ')}; a design can be at most ${MAX_DESIGN_CM.widthCm} × ${MAX_DESIGN_CM.heightCm} cm, portrait, because a screen film is A2 (${FILM_SHEET_CM.widthCm} × ${FILM_SHEET_CM.heightCm} cm) with room kept for the registration marks. Make the print smaller.`,
  );
}

/**
 * The film: the print area with `layout.sideMarginMm` of clear film left and right and `layout.endMarginMm` above
 * and below, where the ink-deposit gap, the corner registration marks and the label strip go (marks.ts). The margins
 * stay the same whatever the design's size, so a smaller design makes a smaller film; a 40 × 54 cm design with the
 * default margins (10 and 27 mm) fills an A2 sheet.
 *
 * Rounding: the print area is whole pixels already (printSize), the left and top margins are rounded to whole
 * pixels, and the film's width and height are its size in mm rounded once, so the right and bottom margins take
 * what is left (the same, or a pixel off). At 600 ppi a 400 × 540 mm design is 9449 × 12756 px and its film
 * 9921 × 14031 px, A2 to the nearest pixel (420 mm is 9921.26 px, 594 mm 14031.496 px), with margins of 236 px at
 * both sides, 638 px on top and 637 px below.
 *
 * No size limit here (tests build films of any size); the engine's films go through canvasSpec.
 */
export function filmCanvas(size: PrintSize, layout: FilmLayout): CanvasSpec {
  const left = Math.max(0, Math.round(mmToPx(layout.sideMarginMm, size.ppi)));
  const top = Math.max(0, Math.round(mmToPx(layout.endMarginMm, size.ppi)));
  return {
    widthPx: Math.max(left + size.widthPx, Math.round(mmToPx(size.widthMm + 2 * layout.sideMarginMm, size.ppi))),
    heightPx: Math.max(top + size.heightPx, Math.round(mmToPx(size.heightMm + 2 * layout.endMarginMm, size.ppi))),
    ppi: size.ppi,
    layout: { sideMarginMm: layout.sideMarginMm, endMarginMm: layout.endMarginMm, inkGapMm: layout.inkGapMm },
    art: { x: left, y: top, width: size.widthPx, height: size.heightPx },
  };
}

/** The film canvas of an engine set: filmCanvas, for a print no bigger than a film holds (assertFitsFilm). */
export function canvasSpec(size: PrintSize, layout: FilmLayout): CanvasSpec {
  assertFitsFilm(size);
  return filmCanvas(size, layout);
}
