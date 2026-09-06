// Per-blank-type print position tables, calibrated against the packshot
// artwork itself (garment silhouette measured from PNG alpha bounding boxes
// with `scripts/_probe_bbox*.mjs`, not eyeballed) so a default placement
// lands the print where a real print sits — centred on the chest, clear of
// collars and kangaroo pockets — without per-blank tuning.
//
// Every box is expressed as a fraction of the packshot image (1200x1500 for
// every packshot we have), plus `widthCm`: the physical width, in cm, that
// the box's fractional width represents. That pair is what lets a caller
// convert a design's `placement.widthCm` into pixels: pxPerCm = (w * imageWidthPx) / widthCm.
// The box's own height is a usable-area guide (how far a print can extend
// before it runs into a hem, pocket or collar) — the design itself keeps its
// own aspect ratio and is only ever scaled by width.

export type PrintPosition = 'front_chest' | 'front_full' | 'front_left_chest' | 'back' | 'centre' | 'front_leg';

export interface PrintArea {
  /** left, as a fraction of the packshot width */
  x: number;
  /** top, as a fraction of the packshot height */
  y: number;
  /** width, as a fraction of the packshot width */
  w: number;
  /** usable-area height, as a fraction of the packshot height */
  h: number;
  /** physical width in cm that `w` represents (derives the cm-to-px scale) */
  widthCm: number;
  /** which packshot image this box is measured against */
  image: 'front' | 'back';
}

export interface TypePlacement {
  defaultPosition: PrintPosition;
  positions: Partial<Record<PrintPosition, PrintArea>>;
}

// Hoodies photograph with the hood up, which pushes the detected garment
// bbox top well above the shoulder line (top 0.0667, height 0.8667 of the
// packshot for STSU177), and have a kangaroo pocket that starts around 62%
// down the garment: 0.0667 + 0.62 * 0.8667 ~= 0.6041 of the packshot height.
// Every hoodie front print box below is already kept above that line; this
// constant lets mockups.ts clamp a caller-supplied offsetYcm against it too.
export const HOODIE_POCKET_LINE_FRAC = 0.6041;

// Sleeve is intentionally not offered: none of our packshots isolate a
// sleeve region from the rest of the garment silhouette (the alpha bbox
// covers the whole garment, arms included), so there is no reliable box to
// hand back — "skip sleeve if no reasonable box" per the wave 1 brief.

export const PLACEMENTS: Record<string, TypePlacement> = {
  'T-shirts': {
    defaultPosition: 'front_chest',
    positions: {
      front_chest: { x: 0.2976, y: 0.3465, w: 0.4039, h: 0.4, widthCm: 28, image: 'front' },
      front_full: { x: 0.1764, y: 0.3047, w: 0.6462, h: 0.5439, widthCm: 38, image: 'front' },
      front_left_chest: { x: 0.535, y: 0.3187, w: 0.1443, h: 0.1732, widthCm: 10, image: 'front' },
      back: { x: 0.2929, y: 0.2896, w: 0.4941, h: 0.526, widthCm: 32, image: 'back' },
    },
  },
  'Sweats & Hoodies': {
    defaultPosition: 'front_chest',
    positions: {
      front_chest: { x: 0.2973, y: 0.3614, w: 0.4046, h: 0.22, widthCm: 28, image: 'front' },
      front_full: { x: 0.2298, y: 0.3267, w: 0.5395, h: 0.2574, widthCm: 38, image: 'front' },
      front_left_chest: { x: 0.5353, y: 0.3267, w: 0.1445, h: 0.1734, widthCm: 10, image: 'front' },
      back: { x: 0.2537, y: 0.2304, w: 0.4918, h: 0.55, widthCm: 32, image: 'back' },
    },
  },
  Jackets: {
    defaultPosition: 'front_chest',
    positions: {
      front_chest: { x: 0.275, y: 0.3536, w: 0.45, h: 0.3, widthCm: 28, image: 'front' },
      front_full: { x: 0.175, y: 0.3212, w: 0.65, h: 0.5541, widthCm: 38, image: 'front' },
      front_left_chest: { x: 0.5396, y: 0.3374, w: 0.1607, h: 0.1929, widthCm: 10, image: 'front' },
      back: { x: 0.2315, y: 0.2744, w: 0.5372, h: 0.4512, widthCm: 32, image: 'back' },
    },
  },
  Polos: {
    defaultPosition: 'front_chest',
    positions: {
      // narrower than a tee (placket + collar eat into the usable chest area)
      front_chest: { x: 0.3145, y: 0.344, w: 0.371, h: 0.3, widthCm: 28, image: 'front' },
      front_full: { x: 0.2571, y: 0.3128, w: 0.4858, h: 0.5472, widthCm: 38, image: 'front' },
      front_left_chest: { x: 0.5398, y: 0.3128, w: 0.1325, h: 0.159, widthCm: 10, image: 'front' },
      back: { x: 0.2525, y: 0.2696, w: 0.495, h: 0.4608, widthCm: 32, image: 'back' },
    },
  },
  Shirts: {
    defaultPosition: 'front_chest',
    positions: {
      // button placket narrows the chest box further than a polo
      front_chest: { x: 0.321, y: 0.3394, w: 0.358, h: 0.28, widthCm: 28, image: 'front' },
      front_full: { x: 0.2539, y: 0.3072, w: 0.4923, h: 0.5655, widthCm: 38, image: 'front' },
      front_left_chest: { x: 0.5434, y: 0.3394, w: 0.1279, h: 0.1535, widthCm: 10, image: 'front' },
      back: { x: 0.2525, y: 0.2632, w: 0.495, h: 0.4736, widthCm: 32, image: 'back' },
    },
  },
  'Kids & Baby': {
    defaultPosition: 'front_chest',
    positions: {
      // smaller reference widths across the board — kids garments are printed smaller
      front_chest: { x: 0.3104, y: 0.3589, w: 0.3675, h: 0.3, widthCm: 18, image: 'front' },
      front_full: { x: 0.2287, y: 0.323, w: 0.5309, h: 0.437, widthCm: 24, image: 'front' },
      front_left_chest: { x: 0.5105, y: 0.335, w: 0.1633, h: 0.196, widthCm: 8, image: 'front' },
      back: { x: 0.2938, y: 0.3165, w: 0.4142, h: 0.3576, widthCm: 20, image: 'back' },
    },
  },
  Bottoms: {
    defaultPosition: 'front_leg',
    positions: {
      // pants photograph flat with both legs spread — box sits on one thigh, near the hip
      front_leg: { x: 0.5649, y: 0.3169, w: 0.2828, h: 0.1964, widthCm: 12, image: 'front' },
      back: { x: 0.5781, y: 0.4149, w: 0.2704, h: 0.1308, widthCm: 12, image: 'back' },
    },
  },
  'Bags & Accessories': {
    defaultPosition: 'centre',
    positions: {
      centre: { x: 0.3099, y: 0.3104, w: 0.3804, h: 0.3318, widthCm: 24, image: 'front' },
      front_full: { x: 0.2407, y: 0.2346, w: 0.5188, h: 0.474, widthCm: 32, image: 'front' },
      front_left_chest: { x: 0.2372, y: 0.1398, w: 0.1268, h: 0.152, widthCm: 8, image: 'front' },
      // most bag packshots share one silhouette front/back; reuse centre's geometry
      back: { x: 0.3099, y: 0.3104, w: 0.3804, h: 0.3318, widthCm: 24, image: 'back' },
    },
  },
};

export function getTypePlacement(blankType: string): TypePlacement | undefined {
  return PLACEMENTS[blankType];
}

export function resolvePrintArea(blankType: string, position: string): { area: PrintArea; position: PrintPosition } | undefined {
  const table = PLACEMENTS[blankType];
  if (!table) return undefined;
  const key = (position in table.positions ? position : table.defaultPosition) as PrintPosition;
  const area = table.positions[key];
  if (!area) return undefined;
  return { area, position: key };
}

export function getDefaultPosition(blankType: string): PrintPosition {
  return PLACEMENTS[blankType]?.defaultPosition ?? 'front_chest';
}

/** Pixels-per-cm implied by a print area measured against an image of the given width. */
export function pxPerCm(area: PrintArea, imageWidthPx: number): number {
  return (area.w * imageWidthPx) / area.widthCm;
}
