import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typeFor } from '@/lib/catalog/catalog-filters';
import { PRODUCTS } from '@/lib/catalog/products';
import {
  COLLAR_SEAM_ROW_PX,
  PLACEMENTS,
  SLEEVE_PRINT_MAX_CM,
  STANDARD_PACKSHOT,
  UnknownPositionError,
  availablePositions,
  checkPlacementPosition,
  checkPrintAreas,
  defaultAreaWidthCm,
  defaultPlacementFor,
  describePrintHeight,
  getDefaultPosition,
  HOODIE_POCKET_LINE_FRAC,
  keepOnPhoto,
  maxPrintCm,
  pocketLineFraction,
  printOffsetPx,
  pxPerCm,
  resolvePrintArea,
  standardCollarDistanceCm,
  type PrintPosition,
} from '@/lib/mockups/placements';
import { COLLAR_DISTANCE_CM, MAX_DESIGN_CM } from '@/lib/print/defaults';
import { NOT_CALIBRATED, REPRESENTATIVES, gapCm, mainBox, median, readingRow, type Side } from '@/scripts/measure-collar-seam';

test('a known position resolves to its box', () => {
  const resolved = resolvePrintArea('T-shirts', 'front_chest');
  assert.equal(resolved?.position, 'front_chest');
  assert.equal(resolved?.area.widthCm, 28);
});

test('a bare "sleeve" is no position, and a sleeve has no box on a photo: refused with the positions, never moved to the default', () => {
  for (const blankType of Object.keys(PLACEMENTS)) {
    assert.throws(
      () => resolvePrintArea(blankType, 'sleeve'),
      (err: unknown) => {
        assert.ok(err instanceof UnknownPositionError);
        assert.equal(err.position, 'sleeve');
        assert.match(err.message, new RegExp(`"sleeve" is not a print position for ${blankType.replace(/[&]/g, '\\$&')}`));
        for (const position of availablePositions(blankType)) assert.ok(err.message.includes(position), `${position} is listed for ${blankType}`);
        return true;
      },
    );
    // sleeve_left is a position, but there is no photo of a sleeve to put a box on
    assert.throws(() => resolvePrintArea(blankType, 'sleeve_left'), /A sleeve print has no garment photo to go on: it is shown as a flat, true-size proof instead\./);
  }
});

test('any other unknown position is refused the same way', () => {
  assert.throws(() => resolvePrintArea('Polos', 'left_ankle'), /"left_ankle" is not a print position for Polos/);
});

test('names every object has are not positions', () => {
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.throws(() => resolvePrintArea('T-shirts', name), UnknownPositionError, name);
  }
  // and not blank types either: nothing to check a position against
  assert.equal(resolvePrintArea('constructor', 'front_chest'), undefined);
});

test('a blank type with no table has no box to resolve and nothing to check against', () => {
  assert.equal(resolvePrintArea('Hats', 'front_chest'), undefined);
  assert.deepEqual(checkPlacementPosition('Hats', 'sleeve'), { ok: true, position: 'sleeve' });
});

test('checkPlacementPosition answers in words instead of throwing', () => {
  const refused = checkPlacementPosition('Bottoms', 'front_chest');
  assert.equal(refused.ok, false);
  if (!refused.ok) {
    assert.deepEqual(refused.positions, ['front_leg', 'back']);
    assert.match(refused.error, /Bottoms take: front_leg, back/);
  }
  assert.deepEqual(checkPlacementPosition('Bottoms', 'front_leg'), { ok: true, position: 'front_leg' });
});

test('an omitted position takes the garment type usual spot; trousers are not chest prints', () => {
  assert.equal(getDefaultPosition('Bottoms'), 'front_leg');
  assert.deepEqual(defaultPlacementFor('Bottoms'), { position: 'front_leg', widthCm: 12 });
  assert.deepEqual(defaultPlacementFor('T-shirts'), { position: 'front_chest', widthCm: 28 });
  // and the usual spot is always one the table accepts
  for (const blankType of Object.keys(PLACEMENTS)) {
    assert.equal(checkPlacementPosition(blankType, defaultPlacementFor(blankType).position).ok, true, blankType);
  }
});

test('every garment type in the catalogue has at least one print position, so every blank can be mocked up', () => {
  // DTF is offered on all of them (bags, beanies, jackets, trousers, woven shirts included): a type
  // with no measured box could not be previewed or placed. None is invented here; this fails if one appears.
  const types = new Set(PRODUCTS.map((p) => typeFor(p.code)));
  assert.ok(types.size >= 8, [...types].join(', '));
  for (const type of types) assert.ok(availablePositions(type).length > 0, `${type} has no print position`);
});

// -- how high a print sits ---------------------------------------------------------------------

test('a standard collar distance is a number of cm or nothing, and an odd type or position has none', () => {
  for (const [blankType, table] of Object.entries(PLACEMENTS)) {
    for (const [position, area] of Object.entries(table.positions)) {
      const distance = area.collarDistanceCm;
      if (distance !== undefined) assert.ok(Number.isFinite(distance) && distance >= 0 && distance <= 40, `${blankType} ${position}: ${distance} cm is not a distance below a collar`);
      assert.equal(standardCollarDistanceCm(blankType, position), distance);
    }
  }
  assert.equal(standardCollarDistanceCm('No such type', 'front_chest'), undefined);
  assert.equal(standardCollarDistanceCm(undefined, 'front_chest'), undefined);
  assert.equal(standardCollarDistanceCm('T-shirts', 'sleeve'), undefined);
  assert.equal(standardCollarDistanceCm('T-shirts', 'sleeve_left'), undefined, 'a sleeve has no collar to measure from');
  assert.equal(standardCollarDistanceCm('T-shirts', 'constructor'), undefined);
  assert.equal(standardCollarDistanceCm('constructor', 'front_chest'), undefined);
});

test('the collar distance is 5 cm on the front and back positions of the garments with a collar or neck seam, and nowhere else', () => {
  assert.equal(COLLAR_DISTANCE_CM, 5);
  // T-shirts (long sleeves included), polos, sweats and hoodies (from the neck seam), and kids' tees and sweats
  for (const type of ['T-shirts', 'Polos', 'Sweats & Hoodies', 'Kids & Baby']) {
    for (const position of ['front_chest', 'front_full', 'front_left_chest', 'back'] as const) {
      assert.equal(PLACEMENTS[type].positions[position]?.collarDistanceCm, COLLAR_DISTANCE_CM, `${type} ${position}`);
      assert.equal(standardCollarDistanceCm(type, position), COLLAR_DISTANCE_CM, `${type} ${position}`);
    }
  }
  // bags and accessories, trousers (the leg print and the back), and the types the owner has not ruled on
  for (const type of ['Bags & Accessories', 'Bottoms', 'Jackets', 'Shirts']) {
    for (const position of availablePositions(type)) assert.equal(standardCollarDistanceCm(type, position), undefined, `${type} ${position}`);
  }
  assert.equal(standardCollarDistanceCm('Bottoms', 'front_leg'), undefined);
  assert.equal(standardCollarDistanceCm('Bags & Accessories', 'centre'), undefined);
  // and the sheet then says how far below the collar, plus the offset
  assert.equal(describePrintHeight(standardCollarDistanceCm('T-shirts', 'front_chest'), 2).text, '7 cm below the collar');
});

test('a standard collar distance that is set is read from the position it was set on', () => {
  const area = PLACEMENTS['T-shirts'].positions.back!;
  const original = area.collarDistanceCm;
  area.collarDistanceCm = 5.5;
  try {
    assert.equal(standardCollarDistanceCm('T-shirts', 'back'), 5.5);
    assert.equal(standardCollarDistanceCm('T-shirts', 'front_chest'), PLACEMENTS['T-shirts'].positions.front_chest?.collarDistanceCm, 'only that position');
  } finally {
    if (original === undefined) delete area.collarDistanceCm;
    else area.collarDistanceCm = original;
  }
});

// -- the biggest print ---------------------------------------------------------------------------

test('a print area is at most 40 x 54 cm, portrait, so the reg marks and ink margin fit an A2 film; a sleeve keeps its own size', () => {
  const tee = { code: 'STTU169', type: 'T-shirts' };
  assert.deepEqual(MAX_DESIGN_CM, { widthCm: 40, heightCm: 54 });
  for (const position of ['front_chest', 'front_full', 'front_left_chest', 'back']) assert.deepEqual(maxPrintCm('STTU169', position), MAX_DESIGN_CM, position);
  assert.deepEqual(maxPrintCm(null, 'front_chest'), MAX_DESIGN_CM);
  assert.deepEqual(maxPrintCm('STTU169', 'sleeve_left'), SLEEVE_PRINT_MAX_CM.short);
  assert.deepEqual(maxPrintCm('STSU177', 'sleeve_right'), SLEEVE_PRINT_MAX_CM.long);

  const check = (position: string, widthCm: number, heightCm?: number, opts?: { forRun?: boolean }) => checkPrintAreas(tee, [{ position, widthCm, heightCm }], opts);
  const refused = (result: ReturnType<typeof check>) => {
    assert.equal(result.ok, false);
    return result.ok ? '' : result.error;
  };
  // portrait up to 40 x 54 is accepted, front and back, whatever the shape inside it
  for (const position of ['front_chest', 'front_full', 'back']) {
    assert.deepEqual(check(position, 40, 54), { ok: true }, `${position} at the limit`);
    assert.deepEqual(check(position, 30, 54), { ok: true });
    assert.deepEqual(check(position, 40, 20), { ok: true });
    assert.deepEqual(check(position, 40), { ok: true }, 'a width alone');
  }
  // a hair over, in width or in height, is refused, and says what the limit is and why
  const limit = 'A print area can be at most 40 × 54 cm, so the reg marks and ink margin fit an A2 film';
  assert.equal(refused(check('back', 40.1, 54)), `${limit}: the back print would be 40.1 × 54 cm. Make it narrower.`);
  assert.equal(refused(check('front_full', 40, 54.1)), `${limit}: the front print would be 40 × 54.1 cm. Make it narrower.`);
  assert.equal(refused(check('front_chest', 40.1)), `${limit}: the front chest print would be 40.1 cm wide. Make it narrower.`);
  // landscape is refused: A2 portrait only
  assert.equal(refused(check('back', 54, 40)), `${limit}: the back print would be 54 × 40 cm. Make it narrower.`);
  assert.match(refused(check('front_full', 45, 30)), /at most 40 × 54 cm/);
  // A2 itself no longer fits: the sheet holds the marks
  assert.match(refused(check('front_full', 42, 59.4)), /at most 40 × 54 cm/);
  // a run's backing product is held to the same size
  assert.deepEqual(check('back', 40, 54, { forRun: true }), { ok: true });
  assert.match(refused(check('back', 40.1, 54, { forRun: true })), /at most 40 × 54 cm/);
  // two prints: the size is checked on each
  const both = checkPrintAreas(tee, [{ position: 'front_chest', widthCm: 28 }, { position: 'back', widthCm: 41 }]);
  assert.equal(both.ok, false);
  // the sleeves are as they were
  assert.deepEqual(check('sleeve_left', 10, 10), { ok: true });
  assert.match(refused(check('sleeve_left', 10.1, 10)), /^A short-sleeve print can be at most 10 × 10 cm/);

  // the usual width fits the art: a tall full front is narrowed so its height stays within 54 cm
  assert.equal(defaultAreaWidthCm(tee, 'front_full', 1.6), 33.7);
  assert.equal(defaultAreaWidthCm(tee, 'front_full', 1), 38, 'the box width where the art is no taller than it');
  assert.equal(defaultAreaWidthCm(tee, 'back', 1.2), 32);
  for (const [type, table] of Object.entries(PLACEMENTS)) {
    for (const [position, area] of Object.entries(table.positions)) assert.ok(area.widthCm <= MAX_DESIGN_CM.widthCm, `${type} ${position}: its usual ${area.widthCm} cm is within the limit`);
  }
});

test('without a standard collar distance a print is at the standard position, and the offset says how far it was moved', () => {
  const height = (offset?: number) => describePrintHeight(undefined, offset);
  assert.deepEqual(height(), { text: 'Standard position', collarKnown: false });
  assert.deepEqual(height(0), { text: 'Standard position', collarKnown: false }, 'nothing extra at 0');
  assert.equal(height(0.04).text, 'Standard position', 'a hundredth of a centimetre is no offset');
  assert.deepEqual(height(2), { text: 'Standard position, 2 cm lower', collarKnown: false });
  assert.equal(height(-2).text, 'Standard position, 2 cm higher');
  assert.equal(height(1.5).text, 'Standard position, 1.5 cm lower');
  assert.equal(height(Number.NaN).text, 'Standard position');
});

test('with a standard collar distance a print is that far below the collar, plus the offset', () => {
  const height = (offset?: number) => describePrintHeight(7, offset);
  assert.deepEqual(height(), { text: '7 cm below the collar', collarKnown: true });
  assert.equal(height(0).text, '7 cm below the collar');
  assert.equal(height(1.5).text, '8.5 cm below the collar');
  assert.equal(height(-2).text, '5 cm below the collar', 'moved higher, so nearer the collar');
  assert.equal(describePrintHeight(6.1, 0.2).text, '6.3 cm below the collar', 'no floating point tails');
  assert.equal(describePrintHeight(3, -5).text, '2 cm above the collar', 'moved past the collar line');
  assert.equal(describePrintHeight(3, -3).text, '0 cm below the collar');
  // Never "from collar": that is not what an offset is.
  for (const text of [height().text, height(2).text, describePrintHeight(undefined, 2).text]) assert.doesNotMatch(text, /from collar/);
});

// -- where a print lands on a photo: the rules the mockup and the proof share ------------------

test('a cm of offset is as many pixels as the box spans a cm, and scales with the photo', () => {
  const area = PLACEMENTS['T-shirts'].positions.front_chest!; // 28 cm across 0.4039 of the photo's width
  const perCm = (area.w * 1200) / 28;
  assert.equal(pxPerCm(area, 1200), perCm);
  assert.ok(Math.abs(printOffsetPx(area, 1200, 1) - 17.31) < 0.01, 'about 17.3 px a cm on a 1200 px photo');
  assert.equal(printOffsetPx(area, 1200, 3), 3 * perCm);
  assert.equal(printOffsetPx(area, 1200, -2), -2 * perCm, 'higher is negative');
  assert.equal(printOffsetPx(area, 1200, 0), 0);
  assert.equal(printOffsetPx(area, 1200, undefined), 0, 'no offset is the standard position');
  assert.equal(printOffsetPx(area, 2400, 1), 2 * printOffsetPx(area, 1200, 1), 'twice the photo, twice the pixels');
  // The box's own scale, not the print's: a kids' box is calibrated at 18 cm, so a cm is more of its photo.
  const kids = PLACEMENTS['Kids & Baby'].positions.front_chest!;
  assert.equal(kids.widthCm, 18);
  assert.equal(printOffsetPx(kids, 1200, 1), (kids.w * 1200) / 18);
  assert.ok(printOffsetPx(kids, 1200, 1) > printOffsetPx(area, 1200, 1));
});

test('a print is held on the photo, in pixels or in fractions of it', () => {
  const photo = { width: 1200, height: 1500 };
  assert.deepEqual(keepOnPhoto({ left: 100, top: 200 }, { width: 300, height: 400 }, photo), { left: 100, top: 200 }, 'where it fits it stays');
  assert.deepEqual(keepOnPhoto({ left: -50, top: -20 }, { width: 300, height: 400 }, photo), { left: 0, top: 0 });
  assert.deepEqual(keepOnPhoto({ left: 1000, top: 1400 }, { width: 300, height: 400 }, photo), { left: 900, top: 1100 }, 'pulled back so its far edges are on the photo');
  assert.deepEqual(keepOnPhoto({ left: 5, top: 5 }, { width: 2000, height: 2000 }, photo), { left: 0, top: 0 }, 'a print bigger than the photo sits at its corner');
  // the same rule in fractions of the photo (a proof's box)
  assert.deepEqual(keepOnPhoto({ left: 0.9, top: 0.9 }, { width: 0.4, height: 0.4 }, { width: 1, height: 1 }), { left: 0.6, top: 0.6 });
});

test('only the front of a hoodie has a pocket line', () => {
  const hoodie = PLACEMENTS['Sweats & Hoodies'].positions;
  assert.equal(pocketLineFraction('Sweats & Hoodies', hoodie.front_chest!), HOODIE_POCKET_LINE_FRAC);
  assert.equal(pocketLineFraction('Sweats & Hoodies', hoodie.front_full!), HOODIE_POCKET_LINE_FRAC);
  assert.equal(pocketLineFraction('Sweats & Hoodies', hoodie.back!), undefined, 'the back has no pocket');
  assert.equal(pocketLineFraction('T-shirts', PLACEMENTS['T-shirts'].positions.front_chest!), undefined);
});

// -- the collar calibration (owner, 16 Oct 2026) --------------------------------------------------------
// The top of a front or back print is 5 cm below the collar seam, and the box on the photo shows it. How the seam was
// measured, and where it was not, is in "Collar calibration" in placements.ts; scripts/measure-collar-seam.ts finds it.

/** x, width, widthCm and the bottom of the usable area (y + h) of every box of a collar type, as calibrated before the collar
 * rule: only the top of a box moved. (The one exception: the T-shirts' back box was 0.2929, 48 px right of the middle of every
 * T-shirt back photo, and is centred now.) */
const BEFORE_THE_COLLAR_RULE = {
  'T-shirts': { front_chest: [0.2976, 0.4039, 28, 0.7465], front_full: [0.1764, 0.6462, 38, 0.8486], front_left_chest: [0.535, 0.1443, 10, 0.4919], back: [0.2529, 0.4941, 32, 0.8156] },
  'Sweats & Hoodies': { front_chest: [0.2973, 0.4046, 28, 0.5814], front_full: [0.2298, 0.5395, 38, 0.5841], front_left_chest: [0.5353, 0.1445, 10, 0.5001], back: [0.2537, 0.4918, 32, 0.7804] },
  Polos: { front_chest: [0.3145, 0.371, 28, 0.644], front_full: [0.2571, 0.4858, 38, 0.86], front_left_chest: [0.5398, 0.1325, 10, 0.4718], back: [0.2525, 0.495, 32, 0.7304] },
  'Kids & Baby': { front_chest: [0.3104, 0.3675, 18, 0.6589], front_full: [0.2287, 0.5309, 24, 0.76], front_left_chest: [0.5105, 0.1633, 8, 0.531], back: [0.2938, 0.4142, 20, 0.6741] },
} as const;

test('only the top of a box moved: its x, width, size in cm and bottom edge are as they were, so a print is as centred and as clear of hem and pocket', () => {
  for (const [type, boxes] of Object.entries(BEFORE_THE_COLLAR_RULE)) {
    for (const [position, [x, w, widthCm, bottom]] of Object.entries(boxes)) {
      const area = PLACEMENTS[type].positions[position as PrintPosition]!;
      assert.equal(area.x, x, `${type} ${position} x`);
      assert.equal(area.w, w, `${type} ${position} w`);
      assert.equal(area.widthCm, widthCm, `${type} ${position} widthCm`);
      assert.ok(Math.abs(area.y + area.h - bottom) < 1e-9, `${type} ${position}: the bottom edge is ${area.y + area.h}, was ${bottom}`);
      // centred on the photo, but for the left chest, which is on the wearer's left: within 12 px (the kids' garments sit 7 px left)
      if (position !== 'front_left_chest') assert.ok(Math.abs(area.x + area.w / 2 - 0.5) < 0.01, `${type} ${position} is centred: its middle is at ${(area.x + area.w / 2).toFixed(4)}`);
      // still a box on the photo
      assert.ok(area.x >= 0 && area.x + area.w <= 1 && area.y > 0 && area.h > 0.1 && area.y + area.h <= 1, `${type} ${position} is on the photo`);
      // a hoodie's chest prints stay above its pocket line
      if (type === 'Sweats & Hoodies' && position !== 'back') assert.ok(area.y + area.h <= HOODIE_POCKET_LINE_FRAC, `${position} stays above the pocket`);
    }
  }
});

test('the top of a calibrated box is the collar seam plus 5 cm at the box\'s own scale; the sides not calibrated are as they were', () => {
  const seams: Record<string, Partial<Record<Side, number>>> = COLLAR_SEAM_ROW_PX;
  assert.deepEqual(Object.keys(seams), ['T-shirts', 'Sweats & Hoodies', 'Polos', 'Kids & Baby']);
  for (const [type, rows] of Object.entries(seams)) {
    for (const side of ['front', 'back'] as const) {
      const [positions, seam] = [Object.entries(PLACEMENTS[type].positions).filter(([, area]) => area.image === side), rows[side]];
      if (seam === undefined) continue;
      for (const [position, area] of positions) {
        const wanted = seam + COLLAR_DISTANCE_CM * pxPerCm(area, STANDARD_PACKSHOT.widthPx);
        assert.ok(Math.abs(area.y * STANDARD_PACKSHOT.heightPx - wanted) < 0.1, `${type} ${position}: the top is at row ${area.y * STANDARD_PACKSHOT.heightPx}, 5 cm below the seam at row ${seam} is ${wanted}`);
      }
    }
  }
  // Sweats & Hoodies back and Kids & Baby back: a hood hides the neck seam from behind, so the boxes are not moved
  assert.equal(seams['Sweats & Hoodies'].back, undefined);
  assert.equal(seams['Kids & Baby'].back, undefined);
  assert.deepEqual([PLACEMENTS['Sweats & Hoodies'].positions.back!.y, PLACEMENTS['Sweats & Hoodies'].positions.back!.h], [0.2304, 0.55]);
  assert.deepEqual([PLACEMENTS['Kids & Baby'].positions.back!.y, PLACEMENTS['Kids & Baby'].positions.back!.h], [0.3165, 0.3576]);
  // and the types the owner has not ruled on, bags and trousers are untouched
  assert.deepEqual([PLACEMENTS.Jackets.positions.front_chest!.y, PLACEMENTS.Shirts.positions.back!.y, PLACEMENTS.Bottoms.positions.front_leg!.y, PLACEMENTS['Bags & Accessories'].positions.centre!.y], [0.3536, 0.2632, 0.3169, 0.3104]);
});

/** The blanks with the most colours in a type: the photos most prints are shown on. */
const MOST_COLOURS = { 'T-shirts': ['STTU169', 'STTU170'], 'Sweats & Hoodies': ['STSU177'], Polos: ['STPU222', 'STPM224'], 'Kids & Baby': ['STTK184'] } as const;
/** How far from 5 cm a print may sit on one of those photos: the photos of one blank differ by that much between colours
 * (STTU169: the seam is at row 389 on white, 404 on black and 408 on most colours, which is 0.2 to 1.1 cm), and a 5 px
 * misreading is 0.3 cm. */
const TOLERANCE_CM = 1.5;

test('on the real packshots the box is 5 cm below the collar seam at the median of the representatives, and within 1.5 cm of it on the blanks with the most colours', async () => {
  for (const [type, sides] of Object.entries(REPRESENTATIVES)) {
    for (const side of ['front', 'back'] as const) {
      const readings = sides[side];
      if (!readings) continue;
      const rows: number[] = [];
      for (const reading of readings) {
        const row = await readingRow(reading, side);
        assert.ok(row !== null, `${type} ${side} ${reading.style}: no seam found near row ${reading.around}`);
        rows.push(row);
        // below the collar and not absurdly far: the spread between blanks of a type is the type's, not a miss
        const gap = gapCm(mainBox(type, side), row);
        assert.ok(gap > 0 && gap < 10, `${type} ${side} ${reading.style}: the box top is ${gap.toFixed(1)} cm below the seam`);
      }
      // the row the table was built from is what the photos say
      const table = (COLLAR_SEAM_ROW_PX as Record<string, Partial<Record<Side, number>>>)[type][side];
      assert.ok(table !== undefined && Math.abs(median(rows) - table) <= 1, `${type} ${side}: the photos say row ${median(rows)}, the table ${table}`);
      assert.ok(Math.abs(gapCm(mainBox(type, side), median(rows)) - COLLAR_DISTANCE_CM) < 0.1, `${type} ${side}: 5 cm at the median`);

      // every box of that side, on the photos of the blanks with the most colours
      for (const style of MOST_COLOURS[type as keyof typeof MOST_COLOURS]) {
        const reading = readings.find((r) => r.style === style);
        if (!reading) continue;
        const row = await readingRow(reading, side);
        assert.ok(row !== null);
        for (const [position, area] of Object.entries(PLACEMENTS[type].positions).filter(([, a]) => a.image === side)) {
          const gap = gapCm(area, row);
          assert.ok(Math.abs(gap - COLLAR_DISTANCE_CM) <= TOLERANCE_CM, `${type} ${style} ${position}: the print top is ${gap.toFixed(1)} cm below the collar seam, not 5 ± ${TOLERANCE_CM}`);
        }
      }
    }
  }
});

test('the backs left as they were: a hooded garment hides its neck seam, its hood tip is below the box top, and the box suits a crew\'s neckband', async () => {
  for (const { type, side, readings } of NOT_CALIBRATED) {
    const box = mainBox(type, side);
    const bands: number[] = [];
    for (const reading of readings) {
      const row = await readingRow(reading, side);
      assert.ok(row !== null, `${type} ${reading.style}`);
      if (reading.note === 'hood tip') assert.ok(gapCm(box, row) < 0, `${type} ${reading.style}: the hood tip is ${(-gapCm(box, row)).toFixed(1)} cm below the box top`);
      else bands.push(row);
    }
    // the neckbands of the blanks with the most colours: a Sweats & Hoodies back box is 5 cm below them (4.9), a Kids & Baby one 7.3
    const gap = gapCm(box, median(bands));
    if (type === 'Sweats & Hoodies') assert.ok(Math.abs(gap - COLLAR_DISTANCE_CM) < 0.5, `${type}: ${gap.toFixed(1)} cm below the neckband`);
    else assert.ok(gap > 6, `${type}: ${gap.toFixed(1)} cm below the neckband`);
  }
});
