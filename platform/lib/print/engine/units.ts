// Physical units. Every engine parameter is in mm, ppi, lpi or degrees;
// pixels exist only on rasters, always with the ppi they were made at.
import type { CanvasSpec, PrintPlacement } from '@/lib/print/types';

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

/** The film canvas: the print area plus the margin on every side. */
export function canvasSpec(size: PrintSize, marginMm: number): CanvasSpec {
  const m = Math.max(0, Math.round(mmToPx(marginMm, size.ppi)));
  return {
    widthPx: size.widthPx + 2 * m,
    heightPx: size.heightPx + 2 * m,
    ppi: size.ppi,
    marginMm,
    art: { x: m, y: m, width: size.widthPx, height: size.heightPx },
  };
}
