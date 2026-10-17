// Per-blank-type print position tables, calibrated against the packshot
// artwork itself (garment silhouette measured from PNG alpha bounding boxes
// with `scripts/_probe_bbox*.mjs`, not eyeballed) so a default placement
// lands the print where a real print sits — centred on the chest, clear of
// collars and kangaroo pockets — without per-blank tuning.
//
// Every box is expressed as a fraction of the packshot image (the black PNGs
// are 1200x1500, the colour webps 900x1125: the same 4:5 frame), plus `widthCm`: the physical width, in cm, that
// the box's fractional width represents. That pair is what lets a caller
// convert a design's `placement.widthCm` into pixels: pxPerCm = (w * imageWidthPx) / widthCm.
// The box's own height is a usable-area guide (how far a print can extend
// before it runs into a hem, pocket or collar) — the design itself keeps its
// own aspect ratio and is only ever scaled by width.
//
// The top of a box is the standard position of a print: COLLAR_DISTANCE_CM below the collar seam (owner decision,
// 16 Oct 2026). "Collar calibration", just above the table, says how the tops were measured and where they are not.
import { COLLAR_DISTANCE_CM, MAX_DESIGN_CM } from '@/lib/print/defaults';

export type PrintPosition = 'front_chest' | 'front_full' | 'front_left_chest' | 'back' | 'centre' | 'front_leg' | 'sleeve_left' | 'sleeve_right';

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
  /** How far below the collar seam the top of the print sits at the standard position (this box), in cm: the owner's rule,
   * COLLAR_DISTANCE_CM (16 Oct 2026), set on the front and back positions of the garments that have a collar or neck seam
   * (T-shirts, polos, sweats and hoodies, kids' tees and sweats). Unset where there is no collar to measure from (bags,
   * accessories, trousers) and on the types the owner has not ruled on (jackets, woven shirts): the job sheet then says
   * "Standard position" instead of a distance. A product's `offsetYcm` moves the print from here (positive = lower), so
   * the real distance below the collar is this plus the offset. The box on the photo shows it where "Collar calibration"
   * below says it was measured. */
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

// Sleeves have no box here: the packshots are front and back only, and none
// isolates a sleeve from the rest of the garment silhouette. A sleeve print
// (sleeve_left, sleeve_right; see "Sleeve prints" below) is offered on the
// blanks that have sleeves and is shown as a flat, true-size proof on a sleeve
// outline (lib/mockups/sleeve-proof.ts), never on a photo (owner, 16 Oct 2026).
// A position a blank can't take is refused with an error that names the ones it
// does (resolvePrintArea, checkPlacementPosition); it is never moved to the
// default spot (Print-Prep-Plan section 13).

/** Every packshot we have is this size or a smaller copy of it (900 x 1125), and the boxes above are fractions of it. For
 * a caller with no photo to measure (a stand-in in a test). */
export const STANDARD_PACKSHOT = { widthPx: 1200, heightPx: 1500 } as const;

// ---------------------------------------------------------------------------
// Collar calibration (owner decision, 16 Oct 2026)
//
// The top of a front or back print sits COLLAR_DISTANCE_CM (5 cm) below the collar seam, and the mockup and the proof
// show it: the top of a box IS that standard position. So on the types below `y` is not tuned by eye. It is the collar
// seam's row on the photo plus 5 cm at the box's own scale (pxPerCm: its width in px over its widthCm), and the usable
// area keeps the bottom edge it had (the hem, or a hoodie's pocket line), so `h` is what is left of it. x, w and widthCm are
// as calibrated before: only the top moved (and the T-shirts' back box, below, was centred as well).
//
// How the seam was measured (scripts/measure-collar-seam.ts reproduces every number here):
//  - Photos: the black packshot (C002, a 1200 x 1500 PNG, the catalogue's own photo of every blank) of 3 to 10
//    representative blanks per garment type: those with the most colours, unisex and women's cuts, a long sleeve, hoodies
//    and crews.
//  - The seam is the lowest point of the neck seam at the centre column: the outer edge of the rib on a tee, a sweatshirt or
//    a kids' garment; the seam under the hood, below its V, on the front of a hoodie; the V where a polo's collar meets its
//    placket. A person read each one on a 3x crop with a 5 px ruler; the script then snapped it to the strongest horizontal
//    edge of the 21 px strip at the centre within 25 px (a polo's V is the reading itself, the button's edge being stronger).
//    Every line was looked at drawn on its crop, and on mockups made with it. A type's seam is the median of its
//    representatives' rows.
//
// Rows measured (px of 1200 x 1500), lowest to highest, and the median in COLLAR_SEAM_ROW_PX:
//   T-shirts          front 354 380 391 396 404 407 441 458         -> 400    back 248 281 283 289 297 304 316 331  -> 293
//   Sweats & Hoodies  front 322 331 333 388 397 401 418 422 424 482 -> 399
//   Polos             front 296 352 355                             -> 352    back 200 245 260                      -> 245
//   Kids & Baby       front 285 369 393 443 481                     -> 393
//
// What this does not do, and why:
//  - One row per type. The blanks of a type are framed differently on their photos (a women's tee sits lower in the frame
//    than a unisex one, a long sleeve higher, a kids' garment fills it), so the box top is 5 cm below the seam at the median
//    blank and 2 to 9 cm below it on the others. On the representatives: T-shirts front 1.7 to 7.7 cm, back 3.0 to 7.4;
//    Sweats & Hoodies front 0.2 to 9.4; Polos front 4.8 to 8.5, back 4.1 to 7.4; Kids & Baby front 1.4 to 9.4. The blank with
//    the most colours of each type is within 1 cm of 5 (STTU169 4.8 front and 5.5 back, STSU177 4.9, STPU222 4.8 and 4.1,
//    STTK184 5.0; the test holds them to 1.5). A box per blank would be exact: the script prints every blank's gap.
//  - Sweats & Hoodies back and Kids & Baby back are as they were, with the distance set (the rule is the owner's) but the
//    box not moved. From behind a hood hides the neck seam of a hooded garment and its tip hangs far below it (STSU177: tip at
//    row 420, against a crew's neckband at 227 on STSU178), so no one box is 5 cm below the collar of both. The Sweats back
//    box happens to be 4.9 cm below the median neckband of the five most popular crews, and 4 to 6 cm above the hood tip of
//    the hoodies; the Kids back box is 7.3 cm below the kids' tee and sweatshirt neckbands. They need a hooded/crew split of
//    the type (or a box per blank).
//  - Jackets and Shirts (woven) have a collar, but the owner's list is T-shirts, long sleeves, polos, sweats and hoodies, and
//    kids' tees and sweats: they keep their boxes and have no distance, so the sheet says "Standard position" for them.
//  - Bags, accessories and trousers have no collar. The Kids & Baby table also serves the kids' joggers and shorts.
//  - The cm are the box's, as the print beside them is drawn: the photos are not at one true scale. A tee's body is about
//    14.3 px per cm down its photo (STTU169 size M: 73 cm from shoulder to hem over 1041 px) and the boxes draw 17.3 to 20.4.

export const COLLAR_SEAM_ROW_PX = {
  'T-shirts': { front: 400, back: 293 },
  'Sweats & Hoodies': { front: 399 },
  Polos: { front: 352, back: 245 },
  'Kids & Baby': { front: 393 },
} as const;
const SEAM = COLLAR_SEAM_ROW_PX;

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

/** A print box whose top is COLLAR_DISTANCE_CM below the collar seam (`seamRowPx`, px of a STANDARD_PACKSHOT), at the box's own
 * scale, keeping its usable area's `bottom` (a fraction of the photo's height). */
function belowCollar(seamRowPx: number, box: { x: number; w: number; bottom: number; widthCm: number; image: 'front' | 'back' }): PrintArea {
  const perCmPx = (box.w * STANDARD_PACKSHOT.widthPx) / box.widthCm;
  const y = round4((seamRowPx + COLLAR_DISTANCE_CM * perCmPx) / STANDARD_PACKSHOT.heightPx);
  return { x: box.x, y, w: box.w, h: round4(box.bottom - y), widthCm: box.widthCm, image: box.image, collarDistanceCm: COLLAR_DISTANCE_CM };
}

export const PLACEMENTS: Record<string, TypePlacement> = {
  'T-shirts': {
    defaultPosition: 'front_chest',
    positions: {
      front_chest: belowCollar(SEAM['T-shirts'].front, { x: 0.2976, w: 0.4039, bottom: 0.7465, widthCm: 28, image: 'front' }),
      front_full: belowCollar(SEAM['T-shirts'].front, { x: 0.1764, w: 0.6462, bottom: 0.8486, widthCm: 38, image: 'front' }),
      front_left_chest: belowCollar(SEAM['T-shirts'].front, { x: 0.535, w: 0.1443, bottom: 0.4919, widthCm: 10, image: 'front' }),
      // x was 0.2929: 48 px right of the middle of every T-shirt back photo (all are centred at 600), so a print
      // hung off the body on that side. Centred now, like every other back box.
      back: belowCollar(SEAM['T-shirts'].back, { x: 0.2529, w: 0.4941, bottom: 0.8156, widthCm: 32, image: 'back' }),
    },
  },
  'Sweats & Hoodies': {
    defaultPosition: 'front_chest',
    positions: {
      // the bottoms are where they were, above a hoodie's pocket line (HOODIE_POCKET_LINE_FRAC)
      front_chest: belowCollar(SEAM['Sweats & Hoodies'].front, { x: 0.2973, w: 0.4046, bottom: 0.5814, widthCm: 28, image: 'front' }),
      front_full: belowCollar(SEAM['Sweats & Hoodies'].front, { x: 0.2298, w: 0.5395, bottom: 0.5841, widthCm: 38, image: 'front' }),
      front_left_chest: belowCollar(SEAM['Sweats & Hoodies'].front, { x: 0.5353, w: 0.1445, bottom: 0.5001, widthCm: 10, image: 'front' }),
      // not moved: see "What this does not do"
      back: { x: 0.2537, y: 0.2304, w: 0.4918, h: 0.55, widthCm: 32, image: 'back', collarDistanceCm: COLLAR_DISTANCE_CM },
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
      front_chest: belowCollar(SEAM.Polos.front, { x: 0.3145, w: 0.371, bottom: 0.644, widthCm: 28, image: 'front' }),
      front_full: belowCollar(SEAM.Polos.front, { x: 0.2571, w: 0.4858, bottom: 0.86, widthCm: 38, image: 'front' }),
      front_left_chest: belowCollar(SEAM.Polos.front, { x: 0.5398, w: 0.1325, bottom: 0.4718, widthCm: 10, image: 'front' }),
      back: belowCollar(SEAM.Polos.back, { x: 0.2525, w: 0.495, bottom: 0.7304, widthCm: 32, image: 'back' }),
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
      front_chest: belowCollar(SEAM['Kids & Baby'].front, { x: 0.3104, w: 0.3675, bottom: 0.6589, widthCm: 18, image: 'front' }),
      front_full: belowCollar(SEAM['Kids & Baby'].front, { x: 0.2287, w: 0.5309, bottom: 0.76, widthCm: 24, image: 'front' }),
      front_left_chest: belowCollar(SEAM['Kids & Baby'].front, { x: 0.5105, w: 0.1633, bottom: 0.531, widthCm: 8, image: 'front' }),
      // not moved: see "What this does not do"
      back: { x: 0.2938, y: 0.3165, w: 0.4142, h: 0.3576, widthCm: 20, image: 'back', collarDistanceCm: COLLAR_DISTANCE_CM },
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

/** The photo positions a blank type can print at, in the order the table lists them. Sleeves are not among them: they
 * have no photo (positionsFor adds them for a blank that has sleeves). */
export function availablePositions(blankType: string): PrintPosition[] {
  const table = tableFor(blankType);
  return table ? (Object.keys(table.positions) as PrintPosition[]) : [];
}

// ---------------------------------------------------------------------------
// Sleeve prints (owner decision, 16 Oct 2026)
//
// Named from the wearer's side, as front_left_chest is: sleeve_left is the wearer's left arm. Offered only on blanks
// with sleeves that take a print (SLEEVE_PRINTS), and shown as a flat, true-size proof on a sleeve outline with its
// measurements, never on a photo.

export const SLEEVE_POSITIONS = ['sleeve_left', 'sleeve_right'] as const satisfies readonly PrintPosition[];
export type SleevePosition = (typeof SLEEVE_POSITIONS)[number];
export type SleeveKind = 'short' | 'long';

export function isSleevePosition(position: string): position is SleevePosition {
  return position === 'sleeve_left' || position === 'sleeve_right';
}

/** OWNER DEFAULTS (16 Oct 2026), adjust here: the biggest print each kind of sleeve takes, in cm. A print is sized by its
 * width; its height is the width times the art's aspect, and must fit too. */
export const SLEEVE_PRINT_MAX_CM: Readonly<Record<SleeveKind, { widthCm: number; heightCm: number }>> = {
  short: { widthCm: 10, heightCm: 10 },
  long: { widthCm: 8, heightCm: 40 },
};

/** OWNER DEFAULTS (16 Oct 2026), adjust here: the blanks that take sleeve prints, by style code, and their kind of sleeve.
 * From the catalogue (lib/catalog/products.ts and product-details.ts). A blank that isn't listed has no sleeve print.
 * Left out on purpose:
 * - tank tops (STTM961, STTW962, STTW963), gilets and body warmers, bags, beanies, hats and bottoms: no sleeves;
 * - the dolman tee (STTW089): its sleeves are cut in one with the body, so there is no sleeve to lay flat;
 * - puffers and padded jackets (STJM188, STJM837, STJU840, STJU841, STJW191, STJW839): quilted sleeves; the sherpa
 *   jacket (STJU248): pile sleeves; the bomber (STJU251): a zipped pocket on the sleeve;
 * - woven shirts and the overshirt (STWM968, STWM969, STWW971, STWW973, STJU845): plackets and cuffs on the sleeve;
 * - Kids & Baby: their sleeves are smaller than the adult sizes above. */
export const SLEEVE_PRINTS: Readonly<Record<string, SleeveKind>> = {
  // T-shirts
  STTM562: 'short',
  STTU078: 'short',
  STTU169: 'short',
  STTU170: 'short',
  STTU171: 'short',
  STTU258: 'short',
  STTU263: 'short',
  STTU758: 'short',
  STTU788: 'short',
  STTU815: 'short',
  STTU959: 'short',
  STTU964: 'short',
  STTW079: 'short',
  STTW172: 'short',
  STTW173: 'short',
  STTW174: 'short',
  STTW175: 'short',
  STTW176: 'short',
  STTW259: 'short',
  STTW264: 'short',
  // long-sleeve tees
  STTU199: 'long',
  STTU200: 'long',
  STTW219: 'long',
  // polos
  STPM224: 'short',
  STPU222: 'short',
  STPW977: 'short',
  STPU223: 'long',
  // sweats and hoodies
  STSU011: 'long',
  STSU077: 'long',
  STSU168: 'long',
  STSU177: 'long',
  STSU178: 'long',
  STSU179: 'long',
  STSU201: 'long',
  STSU202: 'long',
  STSU204: 'long',
  STSU205: 'long',
  STSU207: 'long',
  STSU208: 'long',
  STSU209: 'long',
  STSU229: 'long',
  STSU253: 'long',
  STSU255: 'long',
  STSU256: 'long',
  STSU257: 'long',
  STSU261: 'long',
  STSU269: 'long',
  STSU795: 'long',
  STSU797: 'long',
  STSU798: 'long',
  STSU799: 'long',
  STSU824: 'long',
  STSU856: 'long',
  STSU857: 'long',
  STSU868: 'long',
  STSW212: 'long',
  STSW213: 'long',
  STSW214: 'long',
  STSW217: 'long',
  STSW218: 'long',
  STSW254: 'long',
  STSW262: 'long',
  STSW268: 'long',
  // jackets with flat sleeves: softshells, fleeces, the coach jacket, the anorak and the weather jacket
  STJM158: 'long',
  STJM167: 'long',
  STJM238: 'long',
  STJW239: 'long',
  STJU242: 'long',
  STJU833: 'long',
  STJU834: 'long',
  STJU846: 'long',
};

/** The kind of sleeve a blank prints on, or null when it takes no sleeve print. */
export function sleeveKindFor(blankCode: string | null | undefined): SleeveKind | null {
  const code = blankCode?.trim().toUpperCase() ?? '';
  return code && Object.hasOwn(SLEEVE_PRINTS, code) ? SLEEVE_PRINTS[code] : null;
}

/** A blank as the position checks need it: its style code (sleeves are per blank) and its type (the photo boxes). */
export interface BlankRef {
  code: string;
  type: string;
}

/** Every position a blank can print at: its type's photo positions, then its sleeves when it has them. */
export function positionsFor(blank: BlankRef): PrintPosition[] {
  return [...availablePositions(blank.type), ...(sleeveKindFor(blank.code) ? SLEEVE_POSITIONS : [])];
}

/** Why a position is refused, in words, with the positions the garment does take. `sleeves` says what is known about
 * the garment's sleeves: it has them (a sleeve is only refused on a photo), it has none, or nobody said. */
function unknownPositionMessage(blankType: string, position: string, available: PrintPosition[], sleeves: 'has' | 'none' | 'unknown' = 'unknown'): string {
  const take = `${blankType} take: ${available.join(', ')}.`;
  if (isSleevePosition(position)) {
    if (sleeves === 'none') return `This garment has no sleeves to print on. ${take}`;
    return `A sleeve print has no garment photo to go on: it is shown as a flat, true-size proof instead. ${take}`;
  }
  const which = /sleeve/i.test(position) && sleeves === 'has' ? ' Say which sleeve: sleeve_left or sleeve_right.' : '';
  return `"${position}" is not a print position for ${blankType}.${which} ${take}`;
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

/** The box for a position on the garment photo, or undefined when the blank type has no table at all (callers decide
 * what to show). A position the table lacks throws UnknownPositionError; it never falls back to the type's default.
 * A sleeve has no box: it is never drawn on a photo (the caller handles sleeves before asking). */
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

/** The non-throwing check of a position, for the services and tools that take one from the artist or the model and
 * must answer in words. With the blank's code a sleeve is checked too: it passes on a blank that has sleeves
 * (sleeveKindFor), and the refusal lists the sleeves among the positions. Without it a sleeve is refused, as there is
 * nothing to tell whether the garment has sleeves. A blank type with no table passes: there is nothing to check it
 * against. */
export function checkPlacementPosition(blankType: string, position: string, blankCode?: string): PositionCheck {
  const sleeves: 'has' | 'none' | 'unknown' = blankCode === undefined ? 'unknown' : sleeveKindFor(blankCode) ? 'has' : 'none';
  const refuse = (): PositionCheck => {
    const positions: PrintPosition[] = [...availablePositions(blankType), ...(sleeves === 'has' ? SLEEVE_POSITIONS : [])];
    return { ok: false, error: unknownPositionMessage(blankType, position, positions, sleeves), positions };
  };
  if (isSleevePosition(position)) {
    if (sleeves === 'has') return { ok: true, position };
    // a blank type with no table is not checked, as before; a code that says "no sleeves" is
    return !tableFor(blankType) && sleeves === 'unknown' ? { ok: true, position } : refuse();
  }
  try {
    resolvePrintArea(blankType, position);
    return { ok: true, position };
  } catch (err) {
    if (err instanceof UnknownPositionError) return refuse();
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

// ---------------------------------------------------------------------------
// Print areas: the rules a product's areas follow (owner decision, 16 Oct 2026)

// The biggest print area is MAX_DESIGN_CM (lib/print/defaults.ts), 40 x 54 cm, portrait only (owner, 16 Oct 2026). Films and
// screens are A2 portrait at most, 42 x 59.4 cm, and the sheet holds the reg marks and a margin for ink deposit around the
// design, so the design itself is 2 cm narrower and 5.4 cm shorter. A landscape design is too wide, whichever way it is turned.
// A shop product's base price includes one area up to this size.

/** The narrowest print the print files can be made at (validateDrop in lib/services/print-prep.ts). */
export const MIN_PRINT_WIDTH_CM = 2;

/** The side of the garment a position is on. Agrees with placementKind in lib/pricing/pod-table.ts: the front positions
 * (the bag's centre and the leg print included) are the front. */
export type AreaSide = 'front' | 'back' | 'sleeve';

export function areaSide(position: string): AreaSide | null {
  if (position === 'back') return 'back';
  if (isSleevePosition(position)) return 'sleeve';
  if (position === 'front_chest' || position === 'front_full' || position === 'front_left_chest' || position === 'centre' || position === 'front_leg') return 'front';
  return null;
}

const POSITION_LABELS: Record<string, string> = {
  front_chest: 'Front chest',
  front_full: 'Front',
  front_left_chest: 'Left chest',
  back: 'Back',
  centre: 'Centre',
  front_leg: 'Leg',
  sleeve_left: 'Left sleeve',
  sleeve_right: 'Right sleeve',
};

/** 'Front chest', 'Left sleeve': a position as artists and staff read it. */
export function printPositionLabel(position: string): string {
  if (Object.hasOwn(POSITION_LABELS, position)) return POSITION_LABELS[position];
  const words = position.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The biggest print a position takes on a blank: the sleeve's size for a sleeve, 40 x 54 cm (MAX_DESIGN_CM) for everything else. */
export function maxPrintCm(blankCode: string | null | undefined, position: string): { widthCm: number; heightCm: number } {
  const kind = isSleevePosition(position) ? sleeveKindFor(blankCode) : null;
  return kind ? SLEEVE_PRINT_MAX_CM[kind] : MAX_DESIGN_CM;
}

const tenth = (n: number) => Math.round(n * 10) / 10;

/** The width a print takes when the artist doesn't say: the photo box's calibrated width, or the sleeve's widest print,
 * narrowed when the art is tall so its height still fits (`aspect` is the art's height over its width, when known). */
export function defaultAreaWidthCm(blank: BlankRef, position: string, aspect?: number | null): number {
  const max = maxPrintCm(blank.code, position);
  const usual = isSleevePosition(position) ? max.widthCm : (tableFor(blank.type)?.positions[position as PrintPosition]?.widthCm ?? 28);
  const fits = aspect && aspect > 0 ? Math.min(usual, max.widthCm, max.heightCm / aspect) : Math.min(usual, max.widthCm);
  return Math.max(MIN_PRINT_WIDTH_CM, Math.floor(fits * 10) / 10);
}

/** A print area as the rules see it: where, how wide, and how tall when the art is known (width times its aspect). */
export interface AreaSize {
  position: string;
  widthCm: number;
  heightCm?: number | null;
}

export type AreaCheck = { ok: true } | { ok: false; error: string };

function sideList(labels: string[]): string {
  return labels.length <= 1 ? (labels[0] ?? '') : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** The rules for a product's print areas (owner, 16 Oct 2026): at least one; each a position the garment takes (sleeves
 * only on a blank with sleeves); each position once; at most one front area (front chest, full front or left chest)
 * and one back; and each no bigger than 40 x 54 cm, portrait (MAX_DESIGN_CM; a sleeve: its own size). In plain words when one fails.
 * A run's backing product (`forRun`) keeps the run's own positions, which were checked when it was quoted: only the
 * sizes are checked. */
export function checkPrintAreas(blank: BlankRef, areas: readonly AreaSize[], opts: { forRun?: boolean } = {}): AreaCheck {
  if (areas.length === 0) return { ok: false, error: 'Say where the print goes: a product prints at least one area.' };
  if (!opts.forRun) {
    const seen = new Set<string>();
    for (const area of areas) {
      const check = checkPlacementPosition(blank.type, area.position, blank.code);
      if (!check.ok) return { ok: false, error: check.error };
      if (seen.has(area.position)) return { ok: false, error: `A product prints each position once: there are two ${printPositionLabel(area.position).toLowerCase()} prints.` };
      seen.add(area.position);
    }
    const fronts = areas.filter((a) => areaSide(a.position) === 'front');
    if (fronts.length > 1) {
      return { ok: false, error: `A product has one front print, and ${sideList(fronts.map((a) => printPositionLabel(a.position).toLowerCase()))} are all on the front. Keep one of them.` };
    }
  }
  for (const area of areas) {
    const label = printPositionLabel(area.position).toLowerCase();
    if (!Number.isFinite(area.widthCm) || area.widthCm < MIN_PRINT_WIDTH_CM) return { ok: false, error: `A print is at least ${MIN_PRINT_WIDTH_CM} cm wide: the ${label} print is ${tenth(area.widthCm)} cm.` };
    const max = maxPrintCm(blank.code, area.position);
    const height = area.heightCm ?? null;
    const tooWide = area.widthCm > max.widthCm + 1e-9;
    const tooTall = height !== null && Number.isFinite(height) && height > max.heightCm + 1e-9;
    if (!tooWide && !tooTall) continue;
    const size = height !== null && Number.isFinite(height) ? `${tenth(area.widthCm)} × ${tenth(height)} cm` : `${tenth(area.widthCm)} cm wide`;
    const kind = isSleevePosition(area.position) ? sleeveKindFor(blank.code) : null;
    const limit = kind
      ? `A ${kind}-sleeve print can be at most ${max.widthCm} × ${max.heightCm} cm`
      : `A print area can be at most ${max.widthCm} × ${max.heightCm} cm, so the reg marks and ink margin fit an A2 film`;
    return { ok: false, error: `${limit}: the ${label} print would be ${size}. Make it narrower.` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// A product's print areas (products.placements)

/** One print area of a product: where it prints, how big, and the design printed there. */
export interface ProductArea {
  position: string;
  widthCm: number;
  /** from the standard position of the blank and position, in cm (positive = lower); left out at the standard position */
  offsetYcm?: number;
  /** the design printed in this area; null only on a product made without one */
  designId: string | null;
}

const SIDE_ORDER: Record<string, number> = { front: 0, back: 1, sleeve: 2 };

/** Front first, then the back, then the left and the right sleeve. The first area is the product's main one (its
 * designId is products.design_id). */
export function sortAreas<T extends { position: string }>(areas: readonly T[]): T[] {
  const rank = (a: T) => (SIDE_ORDER[areaSide(a.position) ?? ''] ?? 3) * 10 + (a.position === 'sleeve_right' ? 1 : 0);
  return [...areas].sort((a, b) => rank(a) - rank(b));
}

function readArea(raw: unknown, designId: string | null, fallback?: { position: string; widthCm: number }): ProductArea | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const position = typeof o.position === 'string' && o.position.trim() ? o.position.trim() : fallback?.position;
  const widthCm = typeof o.widthCm === 'number' && o.widthCm > 0 ? o.widthCm : fallback?.widthCm;
  if (!position || widthCm === undefined) return null;
  const area: ProductArea = { position, widthCm, designId: typeof o.designId === 'string' && o.designId ? o.designId : designId };
  if (typeof o.offsetYcm === 'number' && Number.isFinite(o.offsetYcm) && o.offsetYcm !== 0) area.offsetYcm = o.offsetYcm;
  return area;
}

/** A product's print areas, in order (sortAreas). From `placements` when the row has them; a row from before them is
 * read from its one `placement` and its design (the legacy columns, which nothing writes any more). A row with neither
 * gets `fallback` (the caller's usual spot) with its design, or no area at all. */
export function productAreasOf(
  row: { placements?: unknown; placement?: unknown; designId?: string | null },
  fallback?: { position: string; widthCm: number },
): ProductArea[] {
  const designId = row.designId ?? null;
  if (Array.isArray(row.placements) && row.placements.length > 0) {
    // An area that doesn't name its design prints the product's own.
    const areas = row.placements.map((raw) => readArea(raw, designId)).filter((a): a is ProductArea => a !== null);
    if (areas.length > 0) return sortAreas(areas);
  }
  const legacy = readArea(row.placement, designId, fallback ?? undefined);
  if (legacy) return [legacy];
  return fallback ? [{ ...fallback, designId }] : [];
}

/** The standard collar distance of a blank type's print position, in cm: how far below the collar seam
 * the top of the print sits at the standard position (COLLAR_DISTANCE_CM, set on the front and back positions of T-shirts,
 * polos, sweats and hoodies and kids' garments). Undefined where there is no rule (bags, accessories, trousers, jackets,
 * woven shirts), and for a blank type or position that has no box, which is not an error here. */
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

/** The line under a sheet's garments when some row could only say "Standard position": a garment with no collar to measure
 * from (a bag, a cap, trousers), or a type the owner's 5 cm rule doesn't cover (jackets, woven shirts). */
export const COLLAR_DISTANCE_UNSET_NOTE =
  "Standard position is the usual place for that garment and position. These garments have no standard distance below the collar, so these rows give the offset from it, not a distance below the collar.";

/** Pixels-per-cm implied by a print area measured against an image of the given width. */
export function pxPerCm(area: PrintArea, imageWidthPx: number): number {
  return (area.w * imageWidthPx) / area.widthCm;
}

// Where a print lands on a packshot is worked out by the mockup (lib/services/mockups.ts) and by the
// proof's print box (printBoxFor in lib/print/pipeline.ts) from the three rules below, so a print that a
// product moved sits at the same height in both. Only the print is placed here: a mockup also shrinks a
// print to clear a hoodie's pocket (a picture can), a proof never does (it shows the print as made).

/** How far a product's vertical offset moves a print, in packshot pixels (positive = lower). A cm on the
 * photo is `pxPerCm` px: the box is `widthCm` wide and spans `w` of the photo's width. The offset is from
 * the box's own top, the standard position (COLLAR_DISTANCE_CM below the collar seam where "Collar
 * calibration" says so); it is not itself a distance from the collar. */
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
