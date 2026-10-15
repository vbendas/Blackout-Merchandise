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
  /** How far below the collar seam the top of the print sits at the standard position (this box), in cm,
   * measured on a real garment. Unset until someone has measured it: nothing is guessed, and the job sheet
   * says "Standard position" instead of a distance. A product's `offsetYcm` moves the print from here
   * (positive = lower), so the real distance below the collar is this plus the offset. */
  collarDistanceCm?: number;
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
// hand back. Asking for one is refused with an error that names the
// positions the blank does take (resolvePrintArea, checkPlacementPosition);
// it is never moved to the default spot (Print-Prep-Plan section 13).

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

// hasOwn, not a bare index: a blank type of 'constructor' has no table.
function tableFor(blankType: string): TypePlacement | undefined {
  return Object.hasOwn(PLACEMENTS, blankType) ? PLACEMENTS[blankType] : undefined;
}

export function getTypePlacement(blankType: string): TypePlacement | undefined {
  return tableFor(blankType);
}

/** The positions a blank type can print at, in the order the table lists them. */
export function availablePositions(blankType: string): PrintPosition[] {
  const table = tableFor(blankType);
  return table ? (Object.keys(table.positions) as PrintPosition[]) : [];
}

function unknownPositionMessage(blankType: string, position: string, available: PrintPosition[]): string {
  const why = /sleeve/i.test(position) ? 'Sleeve prints are not supported yet' : `"${position}" is not a print position for ${blankType}`;
  return `${why}. ${blankType} take: ${available.join(', ')}.`;
}

/** Thrown for a position the blank type has no calibrated box for. The caller
 * is never handed the default spot instead: a print that quietly lands
 * somewhere the artist did not ask for is worse than an error. */
export class UnknownPositionError extends Error {
  readonly code = 'unknown_position';
  constructor(
    readonly blankType: string,
    readonly position: string,
    readonly available: PrintPosition[],
  ) {
    super(unknownPositionMessage(blankType, position, available));
    this.name = 'UnknownPositionError';
  }
}

/** The box for a position, or undefined when the blank type has no table at
 * all (callers decide what to show). A position the table lacks throws
 * UnknownPositionError; it never falls back to the type's default. */
export function resolvePrintArea(blankType: string, position: string): { area: PrintArea; position: PrintPosition } | undefined {
  const table = tableFor(blankType);
  if (!table) return undefined;
  // hasOwn, not `in`: 'constructor' and 'toString' are not positions.
  if (!Object.hasOwn(table.positions, position)) {
    throw new UnknownPositionError(blankType, position, availablePositions(blankType));
  }
  const key = position as PrintPosition;
  const area = table.positions[key];
  if (!area) throw new UnknownPositionError(blankType, position, availablePositions(blankType));
  return { area, position: key };
}

export type PositionCheck = { ok: true; position: string } | { ok: false; error: string; positions: PrintPosition[] };

/** The non-throwing form of resolvePrintArea, for the services and tools that
 * take a position from the artist or the model and must answer in words.
 * A blank type with no table passes: there is nothing to check it against. */
export function checkPlacementPosition(blankType: string, position: string): PositionCheck {
  try {
    resolvePrintArea(blankType, position);
    return { ok: true, position };
  } catch (err) {
    if (err instanceof UnknownPositionError) return { ok: false, error: err.message, positions: err.available };
    throw err;
  }
}

export function getDefaultPosition(blankType: string): PrintPosition {
  return tableFor(blankType)?.defaultPosition ?? 'front_chest';
}

/** The blank type's usual spot at its usual width, for callers that were not
 * given a placement. Not a fallback for a position that was refused. */
export function defaultPlacementFor(blankType: string): { position: PrintPosition; widthCm: number } {
  const position = getDefaultPosition(blankType);
  return { position, widthCm: tableFor(blankType)?.positions[position]?.widthCm ?? 28 };
}

/** The standard collar distance of a blank type's print position, in cm: how far below the collar seam
 * the top of the print sits at the standard position. Undefined when it isn't set (not measured yet),
 * and for a blank type or position that has no box, which is not an error here. */
export function standardCollarDistanceCm(blankType: string | undefined, position: string): number | undefined {
  const table = blankType === undefined ? undefined : tableFor(blankType);
  if (!table || !Object.hasOwn(table.positions, position)) return undefined;
  return table.positions[position as PrintPosition]?.collarDistanceCm;
}

/** What a sheet says about how high a print sits. */
export interface PrintHeight {
  /** '8.5 cm below the collar', or 'Standard position, 2 cm lower' */
  text: string;
  /** false when the standard collar distance isn't set, so the text is the offset and not a distance */
  collarKnown: boolean;
}

/** The standard position is where a position's box sits; a product's offset moves the print from it
 * (positive = lower). With the standard collar distance known the sheet gives the real distance below
 * the collar (standard plus offset). Without it, it says "Standard position", then the offset
 * ("2 cm lower", "2 cm higher"; nothing at 0): a printer must not be told a distance nobody measured. */
export function describePrintHeight(standardCm: number | undefined, offsetCm: number | undefined): PrintHeight {
  const tenths = (n: number) => Math.round(n * 10) / 10;
  const offset = tenths(typeof offsetCm === 'number' && Number.isFinite(offsetCm) ? offsetCm : 0);
  if (standardCm !== undefined) {
    const below = tenths(standardCm + offset);
    return { text: below >= 0 ? `${below} cm below the collar` : `${-below} cm above the collar`, collarKnown: true };
  }
  if (offset === 0) return { text: 'Standard position', collarKnown: false };
  return { text: `Standard position, ${Math.abs(offset)} cm ${offset > 0 ? 'lower' : 'higher'}`, collarKnown: false };
}

/** The line under a sheet's garments when some row could only say "Standard position". */
export const COLLAR_DISTANCE_UNSET_NOTE =
  "Standard position is the usual place for that garment and position. The standard collar distance isn't set yet, so these rows give the offset from it, not a distance below the collar.";

/** Pixels-per-cm implied by a print area measured against an image of the given width. */
export function pxPerCm(area: PrintArea, imageWidthPx: number): number {
  return (area.w * imageWidthPx) / area.widthCm;
}

// Where a print lands on a packshot is worked out by the mockup (lib/services/mockups.ts) and by the
// proof's print box (printBoxFor in lib/print/pipeline.ts) from the three rules below, so a print that a
// product moved sits at the same height in both. Only the print is placed here: a mockup also shrinks a
// print to clear a hoodie's pocket (a picture can), a proof never does (it shows the print as made).

/** Every packshot we have is this size, and the boxes above are fractions of it. For a caller with no
 * photo to measure (a stand-in in a test). */
export const STANDARD_PACKSHOT = { widthPx: 1200, heightPx: 1500 } as const;

/** How far a product's vertical offset moves a print, in packshot pixels (positive = lower). A cm on the
 * photo is `pxPerCm` px: the box is `widthCm` wide and spans `w` of the photo's width. The offset is from
 * the box's own top, the standard position; it is not a distance from the collar. */
export function printOffsetPx(area: PrintArea, imageWidthPx: number, offsetYcm: number | undefined): number {
  return (offsetYcm ?? 0) * pxPerCm(area, imageWidthPx);
}

/** Holds a print on the photo: its left edge within [0, photo width - print width], its top within
 * [0, photo height - print height]. Any one unit, so long as all three arguments use it: pixels for a
 * mockup (the design's size), fractions of the photo for a proof's box (the usable area's size). */
export function keepOnPhoto(
  at: { left: number; top: number },
  print: { width: number; height: number },
  photo: { width: number; height: number },
): { left: number; top: number } {
  return {
    left: Math.min(Math.max(at.left, 0), Math.max(0, photo.width - print.width)),
    top: Math.min(Math.max(at.top, 0), Math.max(0, photo.height - print.height)),
  };
}

/** Where a hoodie's kangaroo pocket starts, as a fraction of the photo's height, for a print on the
 * front of a hoodie; undefined for every other garment and for the back. */
export function pocketLineFraction(blankType: string, area: PrintArea): number | undefined {
  return blankType === 'Sweats & Hoodies' && area.image === 'front' ? HOODIE_POCKET_LINE_FRAC : undefined;
}
