// The screen-print price table and the fixed rule behind it, with no database: what a
// number of screens and a quantity cost, the surcharge at 8, 9 and 15, the refusal above 15,
// several print positions, and the checks a saved table has to pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLACEMENTS, printPositionLabel } from '@/lib/mockups/placements';
import {
  ABSOLUTE_MAX_SCREENS,
  EXTRA_SCREEN_CENTS_PER_PIECE,
  SCREEN_RULE,
  STANDARD_MAX_SCREENS,
  basePrintCents,
  breakIndexFor,
  checkScreenPriceTable,
  coloursLabel,
  coloursOfService,
  defaultScreenPriceTable,
  describePositionEffect,
  describeRunLine,
  describeRunLines,
  describeScreenEffect,
  estimateScreens,
  euros,
  eurosFixed,
  isScreenServiceCode,
  positionLabel,
  priceScreenPrint,
  runExtrasCents,
  screenPriceLine,
  screenPriceLines,
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

test('the fixed rule is EUR 1 a piece for each screen above 8, on each print position, up to 15', () => {
  assert.equal(STANDARD_MAX_SCREENS, 8);
  assert.equal(ABSOLUTE_MAX_SCREENS, 15);
  assert.equal(EXTRA_SCREEN_CENTS_PER_PIECE, 100);
  assert.equal(
    SCREEN_RULE,
    'On a run, each colour above 8 adds €1 per piece on each print position, up to 15 colours on a position. The white underbase and highlight white count as colours.',
  );
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
  assert.equal(describeScreenEffect(6).line, '6 colours: no surcharge');
  assert.equal(describeScreenEffect(8).line, '8 colours: no surcharge');
  assert.equal(describeScreenEffect(9).line, '9 colours: +€1.00 per piece');
  assert.equal(describeScreenEffect(11).line, '11 colours: +€3.00 per piece');
  assert.equal(describeScreenEffect(15).line, '15 colours: +€7.00 per piece');
  assert.equal(describeScreenEffect(1).line, '1 colour: no surcharge');
  assert.equal(describeScreenEffect(11).over, 3);
  assert.equal(describeScreenEffect(11).rule, SCREEN_RULE);
  assert.equal(describeScreenEffect(8).refused, false);
  assert.equal(describeScreenEffect(15).refused, false);
});

test('above 15 screens the line says it can not be printed', () => {
  const effect = describeScreenEffect(16);
  assert.equal(effect.refused, true);
  assert.equal(effect.surchargeCents, 0, 'a count that is refused carries no price');
  assert.equal(effect.line, '16 colours: more than the 15 we can print');
  assert.equal(describeScreenEffect(0).line, 'No colours to print yet');
});

test('money is shown without cents when it is whole euros; a price line always shows its cents', () => {
  assert.equal(euros(300), '€3');
  assert.equal(euros(150), '€1.50');
  assert.equal(euros(5), '€0.05');
  assert.equal(euros(0), '€0');
  assert.equal(eurosFixed(200), '€2.00');
  assert.equal(eurosFixed(150), '€1.50');
  assert.equal(eurosFixed(0), '€0.00');
  assert.equal(eurosFixed(-100), '-€1.00');
  assert.equal(coloursLabel(1), '1 colour');
  assert.equal(coloursLabel(10), '10 colours');
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
// The surcharge is counted per print position (owner, 16 Oct 2026)

/** A T-shirt with a front and a back print: the screens on each, priced at a table where every count above 5 costs the same. */
function frontAndBack(front: number, back: number, patch: Partial<ScreenPriceTable> = {}) {
  const priced = priceScreenPrint(table(patch), {
    garmentCents: 1000,
    qty: 1,
    placements: [
      { screens: front, widthCm: 28, position: 'front_chest' },
      { screens: back, widthCm: 32, position: 'back' },
    ],
  });
  assert.ok(priced.ok, priced.ok ? '' : priced.error);
  return priced.value;
}

test("the owner's example: 10 colours on the back is +2 euros, the front at 10 colours too is 2 more, +4 a piece in all", () => {
  const plain = frontAndBack(8, 8);
  const backOnly = frontAndBack(8, 10);
  const both = frontAndBack(10, 10);
  assert.equal(plain.surchargeCents, 0);
  assert.equal(backOnly.surchargeCents, 200);
  assert.equal(both.surchargeCents, 400);
  // the print itself costs the same in all three (every count above 5 is the last tier): only the colours above 8 move the price
  assert.equal(backOnly.unitCents - plain.unitCents, 200);
  assert.equal(both.unitCents - plain.unitCents, 400);
  // each position carries its own, on its own count
  assert.deepEqual(backOnly.placements.map((p) => p.surchargeCents), [0, 200]);
  assert.deepEqual(both.placements.map((p) => p.surchargeCents), [200, 200]);
});

test('each position counts alone: 9 and 15 are +1 and +7, 6 and 10 are 0 and +2, never one surcharge on the most', () => {
  assert.equal(frontAndBack(9, 15).surchargeCents, 100 + 700);
  assert.deepEqual(frontAndBack(9, 15).placements.map((p) => p.surchargeCents), [100, 700]);
  assert.equal(frontAndBack(6, 10).surchargeCents, 200, 'the front at 6 adds nothing; the back at 10 adds its own 2');
  assert.equal(frontAndBack(8, 8).surchargeCents, 0, 'at 8 on both, nothing');
  assert.equal(frontAndBack(15, 15).surchargeCents, 1400);
  // a position at 8 beside one at 9: only the 9th screen counts
  assert.equal(frontAndBack(8, 9).surchargeCents, 100);
});

test('three positions add up one by one: a front, a back and a sleeve at 10 colours each are +6', () => {
  const priced = priceScreenPrint(table(), {
    garmentCents: 0,
    qty: 1,
    placements: [
      { screens: 10, widthCm: 28, position: 'front_chest' },
      { screens: 10, widthCm: 32, position: 'back' },
      { screens: 10, widthCm: 8, position: 'sleeve_left' },
    ],
  });
  assert.ok(priced.ok);
  assert.equal(priced.value.surchargeCents, 600);
});

test('the surcharge is the same at any margin and at any second-position rate: it is added after both and never discounted', () => {
  const at = (patch: Partial<ScreenPriceTable>) => {
    const base = frontAndBack(8, 8, patch);
    const both = frontAndBack(10, 10, patch);
    return both.unitCents - base.unitCents;
  };
  assert.equal(at({}), 400);
  assert.equal(at({ marginPercent: 50 }), 400, 'no margin on the surcharge');
  assert.equal(at({ additionalPlacementPercent: 40 }), 400, 'no second-position discount on it');
  assert.equal(at({ marginPercent: 80, additionalPlacementPercent: 0 }), 400);
});

test('a position over 15 refuses the whole line, whatever the other needs, and the refusal names the position', () => {
  const refused = priceScreenPrint(table(), {
    garmentCents: 1000,
    qty: 1,
    placements: [
      { screens: 6, widthCm: 28, position: 'front_chest' },
      { screens: 16, widthCm: 32, position: 'back' },
    ],
  });
  assert.deepEqual(refused, { ok: false, error: 'Back: 16 screens is more than the 15 we can print. Use fewer screens.' });
  // the other way round, and with the cap itself fine
  const first = priceScreenPrint(table(), { garmentCents: 0, qty: 1, placements: [{ screens: 17, widthCm: 28, position: 'front_chest' }, { screens: 4, widthCm: 32, position: 'back' }] });
  assert.deepEqual(first, { ok: false, error: 'Front chest: 17 screens is more than the 15 we can print. Use fewer screens.' });
  assert.ok(priceScreenPrint(table(), { garmentCents: 0, qty: 1, placements: [{ screens: 15, widthCm: 28 }, { screens: 15, widthCm: 32 }] }).ok);
});

test('the position words are the ones the rest of the platform uses: every position a garment can take', () => {
  const positions = new Set(['sleeve_left', 'sleeve_right', ...Object.values(PLACEMENTS).flatMap((type) => Object.keys(type.positions))]);
  assert.ok(positions.size >= 8, 'front chest, full front, left chest, back, centre, leg and both sleeves are all covered');
  for (const position of positions) assert.equal(positionLabel(position), printPositionLabel(position), position);
  // a position this file has never heard of reads as words, as printPositionLabel does
  assert.equal(positionLabel('hood_back'), 'Hood back');
  assert.equal(positionLabel('hood_back'), printPositionLabel('hood_back'));
  assert.equal(positionLabel('constructor'), 'Constructor', 'a position called like a built-in is only a word');
});

test('a position and its words: the count, what it adds, and whether it is a guess', () => {
  const back = describePositionEffect({ position: 'back', screens: 10 });
  assert.equal(back.line, 'Back · 10 colours: +€2.00');
  assert.equal(back.name, 'Back · 10 colours');
  assert.equal(back.label, 'Back');
  assert.equal(back.surchargeCents, 200);
  assert.equal(back.over, 2);
  assert.equal(describePositionEffect({ position: 'front_full', screens: 10 }).line, 'Front · 10 colours: +€2.00');
  assert.equal(describePositionEffect({ position: 'front_chest', screens: 6 }).line, 'Front chest · 6 colours: no surcharge');
  assert.equal(describePositionEffect({ position: 'sleeve_left', screens: 8 }).line, 'Left sleeve · 8 colours: no surcharge');
  assert.equal(describePositionEffect({ position: 'back', screens: 1 }).line, 'Back · 1 colour: no surcharge');
  const guess = describePositionEffect({ position: 'back', screens: 4, basis: 'estimate' });
  assert.equal(guess.line, 'Back · 4 colours (estimate): no surcharge');
  assert.equal(guess.estimate, true);
  assert.equal(describePositionEffect({ position: 'back', screens: 4, basis: 'pack' }).estimate, false);
  assert.equal(describePositionEffect({ position: 'back', screens: 16 }).line, 'Back · 16 colours: more than the 15 we can print');
  assert.equal(describePositionEffect({ position: 'back', screens: 0 }).line, 'Back · no colours to print yet');
});

test('the breakdown lines of a screen-printed piece: one for each position, in the order given, with the owner\'s wording', () => {
  const lines = screenPriceLines([
    { position: 'back', screens: 10 },
    { position: 'front_full', screens: 10 },
  ]);
  assert.deepEqual(lines.map(describeRunLine), ['Back · 10 colours: +€2.00', 'Front · 10 colours: +€2.00']);
  assert.deepEqual(lines[0], { key: 'colours', label: 'Back · 10 colours', cents: 200, position: 'back', colours: 10 });
  assert.equal(runExtrasCents(lines), 400);
  assert.equal(describeRunLines(lines), 'Back · 10 colours: +€2.00; Front · 10 colours: +€2.00 (+€4.00 per piece in all)');

  // a position with nothing to add keeps its line, so the artist sees its count
  const plain = screenPriceLine({ position: 'front_chest', screens: 6 });
  assert.equal(plain.cents, 0);
  assert.equal(describeRunLine(plain), 'Front chest · 6 colours: no surcharge');
  assert.equal(describeRunLines([plain]), 'Front chest · 6 colours: no surcharge', 'nothing is charged: nothing is added');
  assert.equal(describeRunLines([screenPriceLine({ position: 'back', screens: 10 })]), 'Back · 10 colours: +€2.00 per piece');

  // a guess names itself and never charges (a guess is capped at 8)
  const guess = screenPriceLine({ position: 'back', screens: 4, basis: 'estimate' });
  assert.deepEqual(guess, { key: 'colours', label: 'Back · 4 colours (estimate)', cents: 0, position: 'back', colours: 4, estimate: true });
});

test('the line of a position says the same as its effect', () => {
  for (const screens of [1, 6, 8, 9, 12, 15]) {
    for (const position of ['front_chest', 'back', 'sleeve_right']) {
      for (const basis of ['pack', 'estimate'] as const) {
        assert.equal(describeRunLine(screenPriceLine({ position, screens, basis })), describePositionEffect({ position, screens, basis }).line, `${position} ${screens} ${basis}`);
      }
    }
  }
});

test('a refused count shows as refused on its line, with no price', () => {
  const line = screenPriceLine({ position: 'back', screens: 16 });
  assert.equal(line.cents, 0);
  assert.equal(line.refused, true);
  assert.equal(describeRunLine(line), 'Back · 16 colours: more than the 15 we can print');
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

test('a line says how its screens were found, in the words the quote uses: each position on its own', () => {
  const pack = (position: string, screens: number) => ({ position, widthCm: 28, screens, basis: 'pack' as const, setId: position, approved: true });
  const guess = (position: string, screens: number) => ({ ...pack(position, screens), basis: 'estimate' as const, approved: false });
  assert.equal(summariseLineScreens([pack('front_chest', 6)]), 'Front chest · 6 colours: no surcharge');
  assert.equal(summariseLineScreens([pack('front_chest', 11)]), 'Front chest · 11 colours: +€3.00 per piece');
  assert.equal(summariseLineScreens([guess('front_chest', 4)]), 'Front chest · 4 colours (estimate): no surcharge');
  assert.equal(
    summariseLineScreens([pack('front_chest', 6), pack('back', 10)]),
    'Front chest · 6 colours: no surcharge; Back · 10 colours: +€2.00 (+€2.00 per piece in all)',
  );
  // a guess marks its own position only: the other one is the design's real count
  assert.equal(
    summariseLineScreens([pack('front_chest', 10), guess('back', 4)]),
    'Front chest · 10 colours: +€2.00; Back · 4 colours (estimate): no surcharge (+€2.00 per piece in all)',
  );
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
