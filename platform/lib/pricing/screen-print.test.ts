// The screen-print price table and the fixed rule behind it, with no database: what a
// number of screens and a quantity cost, the surcharge at 8, 9 and 15, the refusal above 15,
// several print positions, and the checks a saved table has to pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ABSOLUTE_MAX_SCREENS,
  EXTRA_SCREEN_CENTS_PER_PIECE,
  SCREEN_RULE,
  STANDARD_MAX_SCREENS,
  basePrintCents,
  breakIndexFor,
  checkScreenPriceTable,
  coloursOfService,
  defaultScreenPriceTable,
  describeScreenEffect,
  estimateScreens,
  euros,
  isScreenServiceCode,
  priceScreenPrint,
  screenSurchargeCents,
  setupCentsFor,
  sizeBandFor,
  summariseLineScreens,
  tierFor,
  type ScreenPriceTable,
} from './screen-print';

/** A small table that is easy to read: tiers at 1, 3 and 6 screens, breaks at 1, 10 and 50 pieces. */
function table(patch: Partial<ScreenPriceTable> = {}): ScreenPriceTable {
  return {
    breaks: [1, 10, 50],
    tiers: [
      { fromScreens: 1, printCents: [400, 300, 200] },
      { fromScreens: 3, printCents: [700, 600, 500] },
      { fromScreens: 6, printCents: [1000, 900, 800] },
    ],
    setupCentsPerScreen: 0,
    additionalPlacementPercent: 100,
    marginPercent: 0,
    sizeBands: [{ fromWidthCm: 0, percent: 100 }],
    ...patch,
  };
}

const one = (screens: number, widthCm = 28) => [{ screens, widthCm }];

// ---------------------------------------------------------------------------
// The rule

test('the fixed rule is EUR 1 a piece for each screen above 8, up to 15', () => {
  assert.equal(STANDARD_MAX_SCREENS, 8);
  assert.equal(ABSOLUTE_MAX_SCREENS, 15);
  assert.equal(EXTRA_SCREEN_CENTS_PER_PIECE, 100);
  assert.equal(SCREEN_RULE, 'On a run, each screen above 8 adds €1 per piece, up to 15 screens.');
});

test('the surcharge is nothing up to 8, then a euro for each screen above', () => {
  assert.equal(screenSurchargeCents(1), 0);
  assert.equal(screenSurchargeCents(8), 0);
  assert.equal(screenSurchargeCents(9), 100);
  assert.equal(screenSurchargeCents(11), 300);
  assert.equal(screenSurchargeCents(12), 400);
  assert.equal(screenSurchargeCents(15), 700);
});

test('the price line names the count and what it does: no surcharge, or the euros a piece', () => {
  assert.equal(describeScreenEffect(6).line, '6 screens: no surcharge');
  assert.equal(describeScreenEffect(8).line, '8 screens: no surcharge');
  assert.equal(describeScreenEffect(9).line, '9 screens: +€1 per piece');
  assert.equal(describeScreenEffect(11).line, '11 screens: +€3 per piece');
  assert.equal(describeScreenEffect(15).line, '15 screens: +€7 per piece');
  assert.equal(describeScreenEffect(1).line, '1 screen: no surcharge');
  assert.equal(describeScreenEffect(11).over, 3);
  assert.equal(describeScreenEffect(11).rule, SCREEN_RULE);
  assert.equal(describeScreenEffect(8).refused, false);
  assert.equal(describeScreenEffect(15).refused, false);
});

test('above 15 screens the line says it can not be printed', () => {
  const effect = describeScreenEffect(16);
  assert.equal(effect.refused, true);
  assert.equal(effect.line, '16 screens: more than the 15 we can print');
  assert.equal(describeScreenEffect(0).line, 'No screens to print yet');
});

test('money is shown without cents when it is whole euros', () => {
  assert.equal(euros(300), '€3');
  assert.equal(euros(150), '€1.50');
  assert.equal(euros(5), '€0.05');
  assert.equal(euros(0), '€0');
});

// ---------------------------------------------------------------------------
// Tier and quantity break lookup

test('a number of screens takes the tier it falls in; more than the last starts at takes the last', () => {
  const t = table();
  assert.equal(tierFor(t, 1).fromScreens, 1);
  assert.equal(tierFor(t, 2).fromScreens, 1);
  assert.equal(tierFor(t, 3).fromScreens, 3);
  assert.equal(tierFor(t, 5).fromScreens, 3);
  assert.equal(tierFor(t, 6).fromScreens, 6);
  assert.equal(tierFor(t, 8).fromScreens, 6);
  // 9 to 15 screens are priced at the last tier (the fixed charge is added on top)
  assert.equal(tierFor(t, 12).fromScreens, 6);
  assert.equal(tierFor(t, 15).fromScreens, 6);
});

test('a quantity takes the largest break at or below it, and one under the first break takes the first', () => {
  const t = table();
  assert.equal(breakIndexFor(t, 1), 0);
  assert.equal(breakIndexFor(t, 9), 0);
  assert.equal(breakIndexFor(t, 10), 1);
  assert.equal(breakIndexFor(t, 49), 1);
  assert.equal(breakIndexFor(t, 50), 2);
  assert.equal(breakIndexFor(t, 5000), 2);
  assert.equal(breakIndexFor(t, 0), 0);
});

test('the base print price is the tier at the quantity break', () => {
  const t = table();
  assert.equal(basePrintCents(t, 2, 1), 400);
  assert.equal(basePrintCents(t, 2, 10), 300);
  assert.equal(basePrintCents(t, 4, 49), 600);
  assert.equal(basePrintCents(t, 7, 50), 800);
  assert.equal(basePrintCents(t, 13, 50), 800);
});

test('a print width takes the size band it falls in', () => {
  const t = table({
    sizeBands: [
      { fromWidthCm: 0, percent: 80 },
      { fromWidthCm: 15, percent: 100 },
      { fromWidthCm: 35, percent: 125 },
    ],
  });
  assert.equal(sizeBandFor(t, 5).percent, 80);
  assert.equal(sizeBandFor(t, 14.9).percent, 80);
  assert.equal(sizeBandFor(t, 15).percent, 100);
  assert.equal(sizeBandFor(t, 28).percent, 100);
  assert.equal(sizeBandFor(t, 38).percent, 125);
});

// ---------------------------------------------------------------------------
// A price

test('a piece costs the blank, the print, the margin on both, and the fixed charge', () => {
  const t = table({ marginPercent: 30 });
  const priced = priceScreenPrint(t, { garmentCents: 650, qty: 1, placements: one(2) });
  assert.ok(priced.ok);
  assert.equal(priced.value.garmentCents, 650);
  assert.equal(priced.value.printCents, 400);
  // 30% of (650 + 400) = 315
  assert.equal(priced.value.marginCents, 315);
  assert.equal(priced.value.surchargeCents, 0);
  assert.equal(priced.value.unitCents, 650 + 400 + 315);
});

test('the surcharge is added after the margin, not marked up: 8 screens none, 9 a euro, 15 seven', () => {
  const t = table({ marginPercent: 50 });
  const at = (screens: number) => {
    const priced = priceScreenPrint(t, { garmentCents: 1000, qty: 1, placements: one(screens) });
    assert.ok(priced.ok, priced.ok ? '' : priced.error);
    return priced.value;
  };
  const eight = at(8);
  const nine = at(9);
  const fifteen = at(15);
  // 8, 9 and 15 screens all use the last tier's print price, so only the fixed charge moves
  assert.equal(eight.printCents, 1000);
  assert.equal(nine.printCents, 1000);
  assert.equal(fifteen.printCents, 1000);
  assert.equal(eight.surchargeCents, 0);
  assert.equal(nine.surchargeCents, 100);
  assert.equal(fifteen.surchargeCents, 700);
  assert.equal(nine.unitCents - eight.unitCents, 100, 'the margin does not apply to the surcharge');
  assert.equal(fifteen.unitCents - eight.unitCents, 700);
});

test('more than 15 screens is refused, and so is a print with none', () => {
  const t = table();
  const sixteen = priceScreenPrint(t, { garmentCents: 650, qty: 10, placements: one(16) });
  assert.deepEqual(sixteen, { ok: false, error: '16 screens is more than the 15 we can print. Use fewer screens.' });
  const none = priceScreenPrint(t, { garmentCents: 650, qty: 10, placements: one(0) });
  assert.deepEqual(none, { ok: false, error: 'A print needs at least one screen.' });
  const nowhere = priceScreenPrint(t, { garmentCents: 650, qty: 10, placements: [] });
  assert.equal(nowhere.ok, false);
  // one position over the limit refuses the whole line
  const mixed = priceScreenPrint(t, { garmentCents: 650, qty: 10, placements: [{ screens: 4, widthCm: 28 }, { screens: 20, widthCm: 28 }] });
  assert.equal(mixed.ok, false);
});

test('the default table reproduces the old seed: 1, 2 and 3 screens were 3.50, 5.20 and 6.90, and 30% margin made 13.00 on a 6.50 tee', () => {
  const t = defaultScreenPriceTable();
  assert.deepEqual(t.breaks, [1, 25, 50, 100]);
  assert.equal(basePrintCents(t, 1, 1), 350);
  assert.equal(basePrintCents(t, 2, 1), 520);
  assert.equal(basePrintCents(t, 3, 1), 690);
  // the seed's 8, 15 and 22 percent off at 25, 50 and 100 pieces
  assert.equal(basePrintCents(t, 1, 25), Math.round(350 * 0.92));
  assert.equal(basePrintCents(t, 2, 50), Math.round(520 * 0.85));
  assert.equal(basePrintCents(t, 3, 100), Math.round(690 * 0.78));
  const tee = priceScreenPrint(t, { garmentCents: 650, qty: 1, placements: one(1) });
  assert.ok(tee.ok);
  assert.equal(tee.value.unitCents, 650 + 350 + Math.round(0.3 * (650 + 350)));
  assert.equal(tee.value.unitCents, 1300);
  // and it continues the same step for the screens the old services never had
  assert.equal(basePrintCents(t, 8, 1), 350 + 170 * 7);
  assert.equal(t.setupCentsPerScreen, 0);
  assert.equal(t.additionalPlacementPercent, 100);
  assert.deepEqual(t.sizeBands, [{ fromWidthCm: 0, percent: 100 }]);
});

test('the default table is one the checks accept, and more screens never cost less nor more pieces cost more', () => {
  const checked = checkScreenPriceTable(defaultScreenPriceTable());
  assert.ok(checked.ok, checked.ok ? '' : checked.error);
  const t = defaultScreenPriceTable();
  for (let i = 1; i < t.tiers.length; i++) for (let j = 0; j < t.breaks.length; j++) assert.ok(t.tiers[i].printCents[j] >= t.tiers[i - 1].printCents[j]);
  for (const tier of t.tiers) for (let j = 1; j < t.breaks.length; j++) assert.ok(tier.printCents[j] <= tier.printCents[j - 1]);
});

test('the quantity break changes the price, 9 pieces against 10', () => {
  const t = table();
  const at = (qty: number) => {
    const priced = priceScreenPrint(t, { garmentCents: 0, qty, placements: one(4) });
    assert.ok(priced.ok);
    return priced.value.unitCents;
  };
  assert.equal(at(9), 700);
  assert.equal(at(10), 600);
  assert.equal(at(50), 500);
});

test('print size scales the print price, and the margin follows', () => {
  const t = table({
    marginPercent: 10,
    sizeBands: [
      { fromWidthCm: 0, percent: 50 },
      { fromWidthCm: 20, percent: 100 },
      { fromWidthCm: 40, percent: 150 },
    ],
  });
  const at = (widthCm: number) => {
    const priced = priceScreenPrint(t, { garmentCents: 600, qty: 1, placements: one(4, widthCm) });
    assert.ok(priced.ok);
    return priced.value;
  };
  assert.equal(at(10).printCents, 350);
  assert.equal(at(28).printCents, 700);
  assert.equal(at(45).printCents, 1050);
  assert.equal(at(10).unitCents, 600 + 350 + Math.round(0.1 * (600 + 350)));
});

// ---------------------------------------------------------------------------
// Several print positions

test('a second print position is priced at its own tier and the second-position rate', () => {
  const t = table({ additionalPlacementPercent: 80 });
  // front 6 screens (1000), back 3 screens (700): the dearest pays in full, the other at 80%
  const priced = priceScreenPrint(t, { garmentCents: 500, qty: 1, placements: [{ screens: 3, widthCm: 28 }, { screens: 6, widthCm: 28 }] });
  assert.ok(priced.ok);
  assert.equal(priced.value.placements[0].printCents, Math.round(700 * 0.8), 'the first listed is the cheaper one, so it takes the rate');
  assert.equal(priced.value.placements[0].additional, true);
  assert.equal(priced.value.placements[1].printCents, 1000);
  assert.equal(priced.value.placements[1].additional, false);
  assert.equal(priced.value.printCents, 560 + 1000);
  assert.equal(priced.value.unitCents, 500 + 1560);
});

test('every position carries its own surcharge, and a second position is never discounted on it', () => {
  const t = table({ additionalPlacementPercent: 50 });
  const priced = priceScreenPrint(t, { garmentCents: 0, qty: 1, placements: [{ screens: 10, widthCm: 28 }, { screens: 9, widthCm: 28 }] });
  assert.ok(priced.ok);
  // both use the last tier's 1000; the first listed pays in full, the second at 50%
  assert.deepEqual(
    priced.value.placements.map((p) => [p.printCents, p.surchargeCents, p.additional]),
    [
      [1000, 200, false],
      [500, 100, true],
    ],
  );
  assert.equal(priced.value.surchargeCents, 300);
  assert.equal(priced.value.unitCents, 1500 + 300);
});

test('at the default 100 percent a second position costs the same as the first', () => {
  const t = table();
  const priced = priceScreenPrint(t, { garmentCents: 0, qty: 1, placements: [{ screens: 2, widthCm: 28 }, { screens: 2, widthCm: 10 }] });
  assert.ok(priced.ok);
  assert.equal(priced.value.printCents, 800);
});

test('three positions: one in full and two at the rate', () => {
  const t = table({ additionalPlacementPercent: 60 });
  const priced = priceScreenPrint(t, { garmentCents: 0, qty: 1, placements: [{ screens: 2, widthCm: 28 }, { screens: 4, widthCm: 28 }, { screens: 7, widthCm: 28 }] });
  assert.ok(priced.ok);
  assert.deepEqual(priced.value.placements.map((p) => p.printCents), [240, 420, 1000]);
  assert.deepEqual(priced.value.placements.map((p) => p.additional), [true, true, false]);
});

// ---------------------------------------------------------------------------
// Setup

test('setup is charged for each set of screens once, however many colours share it', () => {
  const t = table({ setupCentsPerScreen: 1500 });
  // darks (6 screens) shared by two lines, lights (4) on its own
  const sets = [
    { id: 'darks', screens: 6 },
    { id: 'darks', screens: 6 },
    { id: 'lights', screens: 4 },
  ];
  assert.equal(setupCentsFor(t, sets), (6 + 4) * 1500);
  assert.equal(setupCentsFor(table(), sets), 0, 'no setup fee until one is set');
  assert.equal(setupCentsFor(t, []), 0);
});

// ---------------------------------------------------------------------------
// Estimates

test('a screen service names its colours in its code, and a guess adds the whites on a dark garment', () => {
  assert.equal(isScreenServiceCode('screen_2c'), true);
  assert.equal(isScreenServiceCode('dtg'), false);
  assert.equal(coloursOfService('screen_1c'), 1);
  assert.equal(coloursOfService('screen_3c'), 3);
  assert.equal(coloursOfService('screen'), 3);
  assert.equal(estimateScreens(2, true), 2);
  assert.equal(estimateScreens(2, false), 4);
  assert.equal(estimateScreens(3, false), 5);
});

test('a guess never goes past the standard 8, so it never carries the surcharge', () => {
  assert.equal(estimateScreens(8, false), 8);
  assert.equal(estimateScreens(20, false), 8);
  assert.equal(estimateScreens(0, true), 1);
});

test('a line says how its screens were found, in the words the quote uses', () => {
  const pack = (position: string, screens: number) => ({ position, widthCm: 28, screens, basis: 'pack' as const, setId: position, approved: true });
  assert.equal(summariseLineScreens([pack('front_chest', 6)], 'pack'), '6 screens: no surcharge');
  assert.equal(summariseLineScreens([pack('front_chest', 11)], 'pack'), '11 screens: +€3 per piece');
  assert.equal(summariseLineScreens([pack('front_chest', 4)], 'estimate'), 'Estimate: 4 screens: no surcharge');
  assert.equal(summariseLineScreens([pack('front_chest', 6), pack('back', 10)], 'pack'), 'front chest 6 screens, back 10 screens: +€2 per piece');
});

// ---------------------------------------------------------------------------
// The checks a saved table passes

test('a table with a missing or wrong shape is refused in plain words', () => {
  assert.deepEqual(checkScreenPriceTable(null), { ok: false, error: 'The price table is missing.' });
  assert.equal(checkScreenPriceTable({}).ok, false);
  assert.equal(checkScreenPriceTable([]).ok, false);
});

function bad(patch: Record<string, unknown>) {
  const result = checkScreenPriceTable({ ...table(), ...patch });
  assert.equal(result.ok, false, 'should be refused');
  return result.ok ? { error: '', field: undefined } : result;
}

test('quantity breaks start at 1, go up, and are whole numbers', () => {
  assert.match(bad({ breaks: [5, 10, 50] }).error, /first quantity break must be 1/);
  assert.equal(bad({ breaks: [5, 10, 50] }).field, 'breaks.0');
  assert.match(bad({ breaks: [1, 10, 10] }).error, /must go up/);
  assert.equal(bad({ breaks: [1, 10, 10] }).field, 'breaks.2');
  assert.match(bad({ breaks: [1, 2.5, 50] }).error, /whole numbers/);
  assert.match(bad({ breaks: [] }).error, /at least one quantity break/);
  assert.match(bad({ breaks: [1, 2, 3, 4, 5, 6, 7, 8, 9] }).error, /at most 8/);
});

test('tiers start at 1 screen, go up, stay within the standard 8, and price every break', () => {
  const tiers = table().tiers;
  assert.equal(bad({ tiers: [{ ...tiers[0], fromScreens: 2 }, tiers[1], tiers[2]] }).field, 'tiers.0.from');
  assert.match(bad({ tiers: [tiers[0], { ...tiers[1], fromScreens: 1 }, tiers[2]] }).error, /must go up/);
  assert.match(bad({ tiers: [tiers[0], { ...tiers[1], fromScreens: 9 }] }).error, /from 1 to 8/);
  const short = bad({ tiers: [{ fromScreens: 1, printCents: [400, 300] }, tiers[1], tiers[2]] });
  assert.match(short.error, /every quantity break/);
  assert.match(bad({ tiers: [{ fromScreens: 1, printCents: [400, 300, -1] }, tiers[1], tiers[2]] }).error, /€0 to €1000/);
  assert.match(bad({ tiers: [{ fromScreens: 1, printCents: [400.5, 300, 200] }, tiers[1], tiers[2]] }).error, /€0 to/);
});

test('more screens never cost less, and more pieces never cost more a piece', () => {
  const cheaperUp = bad({
    tiers: [
      { fromScreens: 1, printCents: [400, 300, 200] },
      { fromScreens: 3, printCents: [700, 250, 500] },
    ],
  });
  assert.equal(cheaperUp.field, 'tiers.1.cells.1');
  assert.match(cheaperUp.error, /At 10 pieces, 3 to 8 screens cost less than 1 to 2 screens/);

  const dearerBulk = bad({
    tiers: [
      { fromScreens: 1, printCents: [400, 300, 350] },
      { fromScreens: 3, printCents: [700, 600, 500] },
    ],
  });
  assert.equal(dearerBulk.field, 'tiers.0.cells.2');
  assert.match(dearerBulk.error, /For 1 to 2 screens, 50 pieces cost more a piece than 10/);
});

test('setup, second position, margin and size bands are checked too', () => {
  assert.equal(bad({ setupCentsPerScreen: -1 }).field, 'setup');
  assert.equal(bad({ setupCentsPerScreen: 12.5 }).field, 'setup');
  assert.equal(bad({ additionalPlacementPercent: 301 }).field, 'additional');
  assert.equal(bad({ marginPercent: -5 }).field, 'margin');
  assert.equal(bad({ marginPercent: 'lots' }).field, 'margin');
  assert.equal(bad({ sizeBands: [{ fromWidthCm: 5, percent: 100 }] }).field, 'bands.0.from');
  assert.equal(bad({ sizeBands: [{ fromWidthCm: 0, percent: 100 }, { fromWidthCm: 0, percent: 90 }] }).field, 'bands.1.from');
  assert.equal(bad({ sizeBands: [{ fromWidthCm: 0, percent: 0 }] }).field, 'bands.0.percent');
  assert.match(bad({ sizeBands: [] }).error, /at least one print size band/);
});

test('a good table comes back normalised, with only the fields it knows', () => {
  const checked = checkScreenPriceTable({ ...table({ marginPercent: 25, setupCentsPerScreen: 1200 }), stray: 'dropped' });
  assert.ok(checked.ok);
  assert.deepEqual(Object.keys(checked.table).sort(), ['additionalPlacementPercent', 'breaks', 'marginPercent', 'setupCentsPerScreen', 'sizeBands', 'tiers']);
  assert.equal(checked.table.marginPercent, 25);
  assert.equal(checked.table.setupCentsPerScreen, 1200);
});
