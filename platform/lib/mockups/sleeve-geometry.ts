// Where everything goes on a sleeve proof: how big the sleeve is, the scale it is drawn at, its outline, and
// the places of the print, its dimension lines and its label. Pure arithmetic (no sharp), so a proof's scale
// can be checked without drawing one. All positions are px on the proof. A right sleeve is the exact mirror of
// a left one (the print itself is never mirrored; that is the renderer's business).

export type SleeveKind = 'short' | 'long';
export type SleeveSide = 'left' | 'right';

/** The plate a proof is drawn on: the ecru the garment photos sit on. */
export const PLATE_HEX = '#ECE5DA';

/** Width the proof is designed at; any other width scales everything, text and lines included. */
export const DESIGN_WIDTH_PX = 800;

/** Proofs are 4:5 like the 1200 x 1500 front and back mockups they sit beside, so they tile with them. */
export const PROOF_ASPECT = 1.25;

/** The vertical band the sleeve is centred in (design px): under the label, clear of the bottom edge. */
const SLEEVE_BAND = { top: 100, bottom: 960 } as const;

/**
 * The sleeve a proof is drawn on: a flat sleeve of a unisex adult size M, seen from the outside of the arm
 * with the shoulder at the top. These are defaults, not measurements of one garment (there are no sleeve
 * photos to measure yet), and the print is sized against this outline: "true size" means true to it.
 */
export interface SleeveSpec {
  /** flat width at the underarm line, where the sleeve is widest, in cm */
  widthCm: number;
  /** from the shoulder point (the top of the cap) down the centre line to the hem, in cm */
  lengthCm: number;
  /** from the shoulder point to the underarm line, in cm */
  capDepthCm: number;
  /** flat width at the hem (short sleeve) or the end of the cuff (long sleeve), in cm */
  hemWidthCm: number;
  /** a rib cuff: the sleeve narrows to `sleeveEndWidthCm` where it meets a cuff `heightCm` tall */
  cuff?: { heightCm: number; sleeveEndWidthCm: number };
  /** how far below the shoulder point the top of the print sits, in cm */
  printTopCm: number;
  /** the biggest print the sleeve takes, in cm: clear of the seams and the hem, and inside the sleeve where it narrows */
  maxPrintWidthCm: number;
  maxPrintHeightCm: number;
  /** drawing scale at the design width, in px per cm: a short sleeve fills the plate, a long one its height */
  designPxPerCm: number;
}

export const SLEEVE_SPECS: Record<SleeveKind, SleeveSpec> = {
  // T-shirt sleeve: 21 cm across at the underarm, 22 cm from the shoulder point to the hem. The print starts
  // 5 cm below the shoulder, past the sweep of the cap, and 12 x 12 cm leaves more than 2 cm to each seam and
  // 5 cm to the hem.
  short: { widthCm: 21, lengthCm: 22, capDepthCm: 6.5, hemWidthCm: 18, printTopCm: 5, maxPrintWidthCm: 12, maxPrintHeightCm: 12, designPxPerCm: 28 },
  // Sweatshirt sleeve: 22 cm across at the underarm, 64 cm from the shoulder point to the end of a 6.5 cm rib
  // cuff that is 11 cm across. The print starts 10 cm down the arm and can run 40 cm along it, to 7.5 cm above
  // the cuff; 9 cm wide still leaves about 2.5 cm to each seam at its lower end, where the sleeve is narrowest.
  long: {
    widthCm: 22,
    lengthCm: 64,
    capDepthCm: 7,
    hemWidthCm: 11,
    cuff: { heightCm: 6.5, sleeveEndWidthCm: 12.5 },
    printTopCm: 10,
    maxPrintWidthCm: 9,
    maxPrintHeightCm: 40,
    designPxPerCm: 13.4,
  },
};

/** Px per cm on a proof `widthPx` wide: the one scale of the outline, the print and the dimension lines. */
export function sleeveScale(sleeve: SleeveKind, widthPx: number = DESIGN_WIDTH_PX): number {
  return (SLEEVE_SPECS[sleeve].designPxPerCm * widthPx) / DESIGN_WIDTH_PX;
}

/** Proof height for a width: always 4:5. */
export function proofHeight(widthPx: number): number {
  return Math.round(widthPx * PROOF_ASPECT);
}

/** A size as the proof states it: to the millimetre, no trailing zero ("9", "12.5"). */
export function formatCm(cm: number): string {
  return String(Math.round(cm * 10) / 10);
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A dimension line: the bracket along one side of the print, and where its figure goes. */
export interface DimensionLine {
  /** the bracket as SVG path data */
  path: string;
  text: {
    x: number;
    y: number;
    /** the figure reads upwards along the line (the height dimension) */
    vertical: boolean;
    label: string;
  };
}

export interface SleeveLayout {
  width: number;
  height: number;
  /** the sleeve outline, as SVG path data */
  outline: string;
  /** the hem stitch (short sleeve, drawn dashed) and the cuff seam (long sleeve, drawn solid), as SVG path data */
  stitch: string;
  seam: string;
  /** where the print lands: whole px, centred on the outer centre line */
  print: Rect;
  widthDim: DimensionLine;
  heightDim: DimensionLine;
  label: { x: number; y: number };
  /** text size, and the weights of the dimension lines, of the sleeve's outline and of its stitching, in px */
  fontPx: number;
  linePx: number;
  outlinePx: number;
  hairPx: number;
}

export interface LayoutRequest {
  sleeve: SleeveKind;
  side: SleeveSide;
  widthPx: number;
  printWidthCm: number;
  printHeightCm: number;
}

/** Path numbers: two decimals, no "-0", so the markup is short and the same every time. */
export function num(v: number): string {
  const r = Math.round(v * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
}

// The cap (the curved top, sewn to the body) is the same style on both sleeves. The shoulder point sits a little
// forward of the centre line, and the front of the cap is steeper and ends higher than the back, which sweeps
// down in an S. That makes a left sleeve and a right sleeve different shapes, and the outline read as a sleeve
// rather than a dome. Handles are fractions of the way across the cap (x) and of the way down to the underarm (y).
const CAP = {
  shoulderForwardCm: 1.6,
  front: { endDropCm: -0.4, outX: 0.22, outY: 0.6, apexX: 0.45 },
  back: { endDropCm: 0.6, outX: 0.34, outY: 0.5, apexX: 0.55 },
} as const;

export function layoutSleeve(req: LayoutRequest): SleeveLayout {
  const spec = SLEEVE_SPECS[req.sleeve];
  const width = req.widthPx;
  const height = proofHeight(width);
  const k = width / DESIGN_WIDTH_PX;
  const s = sleeveScale(req.sleeve, width);
  const cx = width / 2;
  const bandPx = SLEEVE_BAND.bottom - SLEEVE_BAND.top;
  const apexY = (SLEEVE_BAND.top + (bandPx - spec.lengthCm * spec.designPxPerCm) / 2) * k;

  // Centimetres from the shoulder point (x across, y down). The drawing is of a left sleeve seen from outside
  // the arm, so the front of the body is on the left; a right sleeve is that, mirrored.
  const mirror = req.side === 'right';
  const X = (xCm: number) => cx + (mirror ? -xCm : xCm) * s;
  const Y = (yCm: number) => apexY + yCm * s;
  const pt = (xCm: number, yCm: number) => `${num(X(xCm))} ${num(Y(yCm))}`;

  const halfW = spec.widthCm / 2;
  const halfHem = spec.hemWidthCm / 2;
  const hemY = spec.lengthCm;
  const yCuff = spec.cuff ? hemY - spec.cuff.heightCm : hemY;
  const halfEnd = spec.cuff ? spec.cuff.sleeveEndWidthCm / 2 : halfHem;

  const apexX = -CAP.shoulderForwardCm;
  const underFront = spec.capDepthCm + CAP.front.endDropCm;
  const underBack = spec.capDepthCm + CAP.back.endDropCm;
  const frontReach = halfW + apexX;
  const backReach = halfW - apexX;
  const frontCap = `C ${pt(apexX - CAP.front.apexX * frontReach, 0)} ${pt(-halfW + CAP.front.outX * frontReach, underFront * (1 - CAP.front.outY))} ${pt(-halfW, underFront)}`;
  const backCap = `C ${pt(halfW - CAP.back.outX * backReach, underBack * (1 - CAP.back.outY))} ${pt(apexX + CAP.back.apexX * backReach, 0)} ${pt(apexX, 0)}`;
  // sides run straight from the underarm to the hem, or to the cuff, which is a little narrower than the sleeve
  const downFront = spec.cuff
    ? `L ${pt(-halfEnd, yCuff)} L ${pt(-halfHem, yCuff)} L ${pt(-halfHem, hemY)} L ${pt(halfHem, hemY)} L ${pt(halfHem, yCuff)} L ${pt(halfEnd, yCuff)}`
    : `L ${pt(-halfHem, hemY)} L ${pt(halfHem, hemY)}`;
  const outline = `M ${pt(apexX, 0)} ${frontCap} ${downFront} L ${pt(halfW, underBack)} ${backCap} Z`;

  /** half the flat width of a side at depth y, for a side that leaves the underarm at `from` */
  const sideAt = (from: number, yCm: number) => halfW + ((halfEnd - halfW) * (yCm - from)) / (yCuff - from);
  let stitch = '';
  let seam = '';
  if (spec.cuff) {
    seam = `M ${pt(-halfHem, yCuff)} L ${pt(halfHem, yCuff)}`;
  } else {
    // a stitch line 2 cm above the hem, 0.6 cm in from each side
    const y = hemY - 2;
    stitch = `M ${pt(-(sideAt(underFront, y) - 0.6), y)} L ${pt(sideAt(underBack, y) - 0.6, y)}`;
  }

  // The print: whole px, centred on the centre line, its top at the start of the print area. Its px size is
  // its cm size at the proof's scale, rounded.
  const pw = Math.max(1, Math.round(req.printWidthCm * s));
  const ph = Math.max(1, Math.round(req.printHeightCm * s));
  const print: Rect = { left: Math.round(cx - pw / 2), top: Math.round(Y(spec.printTopCm)), width: pw, height: ph };

  // The proof is shown at about half its width beside the mockups, so type and lines are sized to survive that.
  const fontPx = 24 * k;
  const linePx = Math.max(1, Math.round(2 * k));
  const hairPx = Math.max(1, Math.round(k));
  // a line `linePx` wide is crisp when its centre is half a pixel in (odd) or on a pixel edge (even)
  const crisp = (v: number) => (linePx % 2 === 1 ? Math.floor(v) + 0.5 : Math.round(v));
  const gap = 14 * k;
  const lead = 5 * k;
  const pad = 6 * k;
  const capHeight = 0.73 * fontPx;

  // width: a bracket under the print, its figure below it
  const right = print.left + print.width;
  const bottom = print.top + print.height;
  const wx1 = crisp(print.left + linePx / 2);
  const wx2 = crisp(right - linePx / 2);
  const wy0 = Math.round(bottom + lead);
  const wyL = crisp(bottom + gap);
  const widthDim: DimensionLine = {
    path: `M ${num(wx1)} ${num(wy0)} V ${num(wyL)} H ${num(wx2)} V ${num(wy0)}`,
    text: { x: (print.left + right) / 2, y: wyL + pad + capHeight, vertical: false, label: `${formatCm(req.printWidthCm)} cm` },
  };

  // height: a bracket beside the print, on the back of the sleeve (the right of a left sleeve, the left of a
  // right one), its figure beyond it, reading upwards
  const toward = mirror ? -1 : 1;
  const edge = mirror ? print.left : right;
  const hy1 = crisp(print.top + linePx / 2);
  const hy2 = crisp(bottom - linePx / 2);
  const hx0 = Math.round(edge + toward * lead);
  const hxL = crisp(edge + toward * gap);
  const heightDim: DimensionLine = {
    path: `M ${num(hx0)} ${num(hy1)} H ${num(hxL)} V ${num(hy2)} H ${num(hx0)}`,
    text: {
      // a figure turned to read upwards has its baseline on the right
      x: mirror ? hxL - pad : hxL + pad + capHeight,
      y: (print.top + bottom) / 2,
      vertical: true,
      label: `${formatCm(req.printHeightCm)} cm`,
    },
  };

  return { width, height, outline, stitch, seam, print, widthDim, heightDim, label: { x: 44 * k, y: 66 * k }, fontPx, linePx, outlinePx: 2 * k, hairPx };
}
