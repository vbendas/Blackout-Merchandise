import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typeFor } from '@/lib/catalog/catalog-filters';
import { PRODUCTS } from '@/lib/catalog/products';
import {
  PLACEMENTS,
  UnknownPositionError,
  availablePositions,
  checkPlacementPosition,
  defaultPlacementFor,
  describePrintHeight,
  getDefaultPosition,
  HOODIE_POCKET_LINE_FRAC,
  keepOnPhoto,
  pocketLineFraction,
  printOffsetPx,
  pxPerCm,
  resolvePrintArea,
  standardCollarDistanceCm,
} from '@/lib/mockups/placements';

test('a known position resolves to its box', () => {
  const resolved = resolvePrintArea('T-shirts', 'front_chest');
  assert.equal(resolved?.position, 'front_chest');
  assert.equal(resolved?.area.widthCm, 28);
});

test('a sleeve is refused with the positions the garment does take, never moved to the default', () => {
  for (const blankType of Object.keys(PLACEMENTS)) {
    assert.throws(
      () => resolvePrintArea(blankType, 'sleeve'),
      (err: unknown) => {
        assert.ok(err instanceof UnknownPositionError);
        assert.equal(err.position, 'sleeve');
        assert.match(err.message, /Sleeve prints are not supported yet/);
        for (const position of availablePositions(blankType)) assert.ok(err.message.includes(position), `${position} is listed for ${blankType}`);
        return true;
      },
    );
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

test('a standard collar distance is a measured number or nothing: none is guessed, and an odd type or position has none', () => {
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
  assert.equal(standardCollarDistanceCm('T-shirts', 'constructor'), undefined);
  assert.equal(standardCollarDistanceCm('constructor', 'front_chest'), undefined);
});

test('a standard collar distance that is set is read from the position it was set on', () => {
  const area = PLACEMENTS['T-shirts'].positions.back!;
  area.collarDistanceCm = 5.5;
  try {
    assert.equal(standardCollarDistanceCm('T-shirts', 'back'), 5.5);
    assert.equal(standardCollarDistanceCm('T-shirts', 'front_chest'), PLACEMENTS['T-shirts'].positions.front_chest?.collarDistanceCm, 'only that position');
  } finally {
    delete area.collarDistanceCm;
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
