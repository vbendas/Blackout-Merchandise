// The shop price table and the arithmetic behind podPrice(), with no database: which print areas
// add what, the table's checks, patches, and the example prices the admin page shows.
// Owner decision, 16 Oct 2026: a T-shirt at EUR 17 includes one print area up to A2 on the front or
// the back; +1 makes it front and back; +2 adds sleeve prints, once, for one sleeve or both.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_POD_EXTRAS,
  DTF_MARK_LABEL,
  DTF_RULE,
  POD_EXAMPLES,
  POD_LINE_LABELS,
  POD_TABLE_LIMITS,
  applyPodPricePatch,
  baseCentsFor,
  buildPodBreakdown,
  checkPodPricePatch,
  checkPodPriceTable,
  defaultPodPriceTable,
  garmentMethod,
  garmentPriceOf,
  isDigitalAsk,
  isDigitalService,
  isMarkedDtf,
  methodLocked,
  placementKind,
  podExampleRows,
  printedNote,
  runExtraLines,
  type PodPriceTable,
} from './pod-table';
import { describeRunLine, describeRunLines, runExtrasCents } from './screen-print';

const EXTRAS = { secondMainPrintCents: 100, sleevesCents: 200 };

/** A T-shirt at 17.00 with these print positions. */
function tee(...positions: string[]) {
  return buildPodBreakdown({ blankCode: 'STTU169', baseCents: 1700, placeholder: false, extras: EXTRAS, placements: positions.map((position) => ({ position })) });
}

const keys = (b: ReturnType<typeof tee>) => b.lines.map((l) => l.key);

// ---------------------------------------------------------------------------
// Placement kinds

test('the owner example extras are the default: +1 euro front and back, +2 euros sleeves', () => {
  assert.deepEqual(DEFAULT_POD_EXTRAS, { secondMainPrintCents: 100, sleevesCents: 200 });
});

test('a position is front, back, a sleeve or something else', () => {
  for (const front of ['front_chest', 'front_full', 'front_left_chest', 'front_leg', 'centre']) assert.equal(placementKind(front), 'front', front);
  assert.equal(placementKind('back'), 'back');
  assert.equal(placementKind('sleeve_left'), 'sleeve');
  assert.equal(placementKind('sleeve_right'), 'sleeve');
  // as it was: a bare 'sleeve' is not one of the positions, and an unknown one adds nothing
  assert.equal(placementKind('sleeve'), 'other');
  assert.equal(placementKind('hood'), 'other');
  assert.equal(placementKind(''), 'other');
});

// ---------------------------------------------------------------------------
// The breakdown

test('front only: the base price, nothing more', () => {
  const price = tee('front_chest');
  assert.deepEqual(keys(price), ['base']);
  assert.equal(price.totalCents, 1700);
  assert.equal(price.blankCode, 'STTU169');
  assert.equal(price.placeholder, false);
});

test('back only: the same base price, front or back', () => {
  const price = tee('back');
  assert.deepEqual(keys(price), ['base']);
  assert.equal(price.totalCents, 1700);
});

test('any front position is the front: chest, full, left chest, a bag centre, a leg', () => {
  for (const position of ['front_chest', 'front_full', 'front_left_chest', 'centre', 'front_leg']) {
    assert.equal(tee(position).totalCents, 1700, position);
    assert.equal(tee(position, 'back').totalCents, 1800, `${position} and back`);
  }
});

test('front and back: +1 euro, once', () => {
  const price = tee('front_chest', 'back');
  assert.deepEqual(keys(price), ['base', 'second_main_print']);
  assert.deepEqual(price.lines[1], { key: 'second_main_print', label: 'Front and back', cents: 100 });
  assert.equal(price.totalCents, 1800);
  assert.equal(tee('back', 'front_full').totalCents, 1800, 'in either order');
});

test('sleeves: +2 euros ONCE, for one sleeve or both', () => {
  const one = tee('front_chest', 'sleeve_left');
  assert.deepEqual(keys(one), ['base', 'sleeves']);
  assert.deepEqual(one.lines[1], { key: 'sleeves', label: 'Sleeve prints', cents: 200 });
  assert.equal(one.totalCents, 1900);

  const both = tee('front_chest', 'sleeve_left', 'sleeve_right');
  assert.deepEqual(keys(both), ['base', 'sleeves'], 'one sleeve line, not two');
  assert.equal(both.totalCents, 1900, 'both sleeves cost what one does');

  assert.equal(tee('back', 'sleeve_right').totalCents, 1900, 'a back print with one sleeve');
});

test('front, back and sleeves: +3 euros, which is the +1 and the +2', () => {
  const price = tee('front_chest', 'back', 'sleeve_left', 'sleeve_right');
  assert.deepEqual(keys(price), ['base', 'second_main_print', 'sleeves']);
  assert.equal(price.totalCents, 2000, 'T-shirt, front and back with sleeves = €20');
  assert.equal(price.lines.reduce((sum, l) => sum + l.cents, 0), price.totalCents);
});

test('the total is always the lines added up, and the lines come in the order base, front and back, sleeves', () => {
  const price = tee('sleeve_left', 'back', 'front_chest');
  assert.deepEqual(keys(price), ['base', 'second_main_print', 'sleeves']);
  assert.equal(price.totalCents, price.lines.reduce((sum, l) => sum + l.cents, 0));
});

test('no print area, or one the table does not know, adds nothing', () => {
  assert.equal(tee().totalCents, 1700);
  assert.deepEqual(keys(tee()), ['base']);
  assert.equal(tee('front_chest', 'hood').totalCents, 1700);
  assert.equal(tee('hood', 'back').totalCents, 1700, 'an unknown position is not a front: back alone is still one print');
});

test('only sleeves: the base price and the sleeve extra (the owner priced sleeves as an addition)', () => {
  const price = tee('sleeve_left');
  assert.deepEqual(keys(price), ['base', 'sleeves']);
  assert.equal(price.totalCents, 1900);
});

test('print size does not change the price: the base covers up to A2', () => {
  const small = buildPodBreakdown({ blankCode: 'X', baseCents: 1700, placeholder: false, extras: EXTRAS, placements: [{ position: 'front_chest' }] });
  assert.equal(small.totalCents, 1700);
  // the placement input carries a width and a height; podPrice ignores them
  const sized = buildPodBreakdown({ blankCode: 'X', baseCents: 1700, placeholder: false, extras: EXTRAS, placements: [{ position: 'front_full', widthCm: 59, heightCm: 42 } as { position: string }] });
  assert.equal(sized.totalCents, 1700);
});

test('the words of each line are the ones artists read', () => {
  assert.deepEqual(POD_LINE_LABELS, { base: 'Garment with one print', second_main_print: 'Front and back', sleeves: 'Sleeve prints' });
  const price = tee('front_chest', 'back', 'sleeve_left');
  assert.deepEqual(price.lines.map((l) => l.label), ['Garment with one print', 'Front and back', 'Sleeve prints']);
});

test('the owner can change the extras: the breakdown follows them', () => {
  const price = buildPodBreakdown({
    blankCode: 'X',
    baseCents: 2000,
    placeholder: false,
    extras: { secondMainPrintCents: 150, sleevesCents: 350 },
    placements: [{ position: 'front_chest' }, { position: 'back' }, { position: 'sleeve_left' }],
  });
  assert.deepEqual(price.lines.map((l) => l.cents), [2000, 150, 350]);
  assert.equal(price.totalCents, 2500);
});

test('an extra of zero keeps its line, so the artist still sees what the product prints on', () => {
  const price = buildPodBreakdown({
    blankCode: 'X',
    baseCents: 1700,
    placeholder: false,
    extras: { secondMainPrintCents: 0, sleevesCents: 0 },
    placements: [{ position: 'front_chest' }, { position: 'back' }, { position: 'sleeve_left' }],
  });
  assert.deepEqual(keys(price), ['base', 'second_main_print', 'sleeves']);
  assert.equal(price.totalCents, 1700);
});

test('with no extras given the owner example extras are used', () => {
  const price = buildPodBreakdown({ blankCode: 'X', baseCents: 1700, placeholder: true, placements: [{ position: 'front_chest' }, { position: 'back' }, { position: 'sleeve_left' }] });
  assert.equal(price.totalCents, 1700 + DEFAULT_POD_EXTRAS.secondMainPrintCents + DEFAULT_POD_EXTRAS.sleevesCents);
  assert.equal(price.placeholder, true, 'the flag passes through');
});

// ---------------------------------------------------------------------------
// The table

test('the empty table prices nothing and carries the owner example extras', () => {
  const table = defaultPodPriceTable();
  assert.deepEqual(table, { extras: { secondMainPrintCents: 100, sleevesCents: 200 }, garments: {} });
  // a copy each time: changing one never changes the next
  table.extras.sleevesCents = 999;
  assert.equal(defaultPodPriceTable().extras.sleevesCents, 200);
  assert.equal(DEFAULT_POD_EXTRAS.sleevesCents, 200);
});

test('a garment is looked up by its own key: no blank is called constructor', () => {
  const table: PodPriceTable = { extras: EXTRAS, garments: { STTU169: { cents: 1700 } } };
  assert.deepEqual(garmentPriceOf(table, 'STTU169'), { cents: 1700 });
  assert.equal(garmentPriceOf(table, 'STSU177'), undefined);
  assert.equal(garmentPriceOf(table, 'constructor'), undefined);
  assert.equal(garmentPriceOf(table, 'toString'), undefined);
  assert.equal(garmentPriceOf(table, '__proto__'), undefined);
});

test('DTF uses the base price unless the garment has a DTF price', () => {
  assert.equal(baseCentsFor({ cents: 1700 }, 'dtg'), 1700);
  assert.equal(baseCentsFor({ cents: 1700 }, 'dtf'), 1700, 'no override: the same as DTG');
  assert.equal(baseCentsFor({ cents: 1700, dtfCents: 1900 }, 'dtf'), 1900);
  assert.equal(baseCentsFor({ cents: 1700, dtfCents: 1900 }, 'dtg'), 1700, 'DTG never takes the DTF price');
  assert.equal(baseCentsFor({ cents: 1700, dtfCents: 1500 }, 'dtf'), 1500, 'a DTF price can be lower too');
});

// ---------------------------------------------------------------------------
// Checks

test('a table with a missing or wrong shape is refused in plain words', () => {
  for (const input of [null, undefined, 'table', 7, [], true]) {
    const checked = checkPodPriceTable(input);
    assert.equal(checked.ok, false);
    if (!checked.ok) assert.equal(checked.error, 'The shop price table is missing.');
  }
  const noExtras = checkPodPriceTable({ garments: {} });
  assert.deepEqual(noExtras.ok ? null : [noExtras.error, noExtras.field], ['The extras are missing.', 'extras']);
  const noGarments = checkPodPriceTable({ extras: EXTRAS });
  assert.deepEqual(noGarments.ok ? null : [noGarments.error, noGarments.field], ['The garment prices are missing.', 'garments']);
  const arrayGarments = checkPodPriceTable({ extras: EXTRAS, garments: [] });
  assert.equal(arrayGarments.ok, false);
});

test('a good table comes back normalised, with only the fields it knows', () => {
  const checked = checkPodPriceTable({
    extras: { secondMainPrintCents: 100, sleevesCents: 200, note: 'x' },
    garments: { STTU169: { cents: 1700, dtfCents: 1900, colour: 'red' }, STSU177: { cents: 3400, dtfCents: null }, STBU070: { cents: 1000, dtfCents: undefined } },
    extra: true,
  });
  assert.ok(checked.ok);
  assert.deepEqual(checked.table, {
    extras: { secondMainPrintCents: 100, sleevesCents: 200 },
    garments: { STTU169: { cents: 1700, dtfCents: 1900 }, STSU177: { cents: 3400 }, STBU070: { cents: 1000 } },
  });
});

test('prices are whole cents, at least one cent, and not past the limit: negatives, fractions and zero are refused by name', () => {
  const table = (garment: unknown) => ({ extras: EXTRAS, garments: { STTU169: garment } });
  for (const cents of [-1, -1700, 0, 1700.5, 0.5, Number.NaN, Infinity, '1700', null, undefined, POD_TABLE_LIMITS.maxCents + 1]) {
    const checked = checkPodPriceTable(table({ cents }));
    assert.equal(checked.ok, false, `base ${String(cents)}`);
    if (!checked.ok) {
      assert.equal(checked.field, 'garments.STTU169.base');
      assert.equal(checked.error, 'A price runs from €0.01 to €1000.');
    }
  }
  assert.ok(checkPodPriceTable(table({ cents: 1 })).ok, 'one cent is the lowest');
  assert.ok(checkPodPriceTable(table({ cents: POD_TABLE_LIMITS.maxCents })).ok, 'and the limit itself is fine');

  for (const dtfCents of [-1, 0, 1900.5, '1900', POD_TABLE_LIMITS.maxCents + 1]) {
    const checked = checkPodPriceTable(table({ cents: 1700, dtfCents }));
    assert.equal(checked.ok, false, `dtf ${String(dtfCents)}`);
    if (!checked.ok) assert.equal(checked.field, 'garments.STTU169.dtf');
  }
  assert.equal(checkPodPriceTable(table('17')).ok, false, 'a garment that is not an object');
  assert.equal(checkPodPriceTable(table(null)).ok, false);
});

test('an extra may be zero, never negative, a fraction or more than the limit', () => {
  const table = (extras: unknown) => ({ extras, garments: {} });
  assert.ok(checkPodPriceTable(table({ secondMainPrintCents: 0, sleevesCents: 0 })).ok, 'no extra is a choice');
  assert.ok(checkPodPriceTable(table({ secondMainPrintCents: POD_TABLE_LIMITS.maxExtraCents, sleevesCents: POD_TABLE_LIMITS.maxExtraCents })).ok);
  for (const cents of [-1, 100.5, '100', null, undefined, POD_TABLE_LIMITS.maxExtraCents + 1]) {
    const first = checkPodPriceTable(table({ secondMainPrintCents: cents, sleevesCents: 200 }));
    assert.equal(first.ok, false, `second main ${String(cents)}`);
    if (!first.ok) assert.deepEqual([first.field, first.error], ['extras.secondMain', 'An extra runs from €0 to €100.']);
    const second = checkPodPriceTable(table({ secondMainPrintCents: 100, sleevesCents: cents }));
    assert.equal(second.ok, false, `sleeves ${String(cents)}`);
    if (!second.ok) assert.equal(second.field, 'extras.sleeves');
  }
});

test('a garment key must look like a blank code', () => {
  for (const code of ['__proto__', 'a b', '', '../x', 'x'.repeat(41), '-X', '_X']) {
    const checked = checkPodPriceTable({ extras: EXTRAS, garments: { [code]: { cents: 1700 } } });
    assert.equal(checked.ok, false, JSON.stringify(code));
  }
  for (const code of ['STTU169', 'STAU771', 'X1', 'ST-TU_169']) {
    assert.ok(checkPodPriceTable({ extras: EXTRAS, garments: { [code]: { cents: 1700 } } }).ok, code);
  }
  // a __proto__ that came from JSON is an own key, and is refused too
  const parsed = JSON.parse('{"extras":{"secondMainPrintCents":100,"sleevesCents":200},"garments":{"__proto__":{"cents":1}}}');
  assert.equal(checkPodPriceTable(parsed).ok, false);
  assert.equal(({} as Record<string, unknown>).cents, undefined, 'and Object.prototype is untouched');
});

test('the table has a size limit', () => {
  const garments: Record<string, unknown> = {};
  for (let i = 0; i <= POD_TABLE_LIMITS.maxGarments; i++) garments[`G${i}`] = { cents: 100 };
  assert.equal(checkPodPriceTable({ extras: EXTRAS, garments }).ok, false);
  delete garments[`G${POD_TABLE_LIMITS.maxGarments}`];
  assert.ok(checkPodPriceTable({ extras: EXTRAS, garments }).ok);
});

// ---------------------------------------------------------------------------
// Patches

test('a patch names the extras and the garments it changes, and nothing else', () => {
  const checked = checkPodPricePatch({ extras: { sleevesCents: 300 }, garments: { STTU169: { cents: 1700, dtfCents: 1800 }, STSU177: null }, ignored: 1 });
  assert.ok(checked.ok);
  assert.deepEqual(checked.patch, { extras: { sleevesCents: 300 }, garments: { STTU169: { cents: 1700, dtfCents: 1800 }, STSU177: null } });
  const onlyExtra = checkPodPricePatch({ extras: { secondMainPrintCents: 0 } });
  assert.ok(onlyExtra.ok);
  assert.deepEqual(onlyExtra.patch, { extras: { secondMainPrintCents: 0 } });
});

test('an empty patch, or one that is not an object, has nothing to save', () => {
  for (const input of [null, undefined, 'x', 3, [], {}, { extras: {} }, { garments: {} }, { extras: {}, garments: {} }]) {
    const checked = checkPodPricePatch(input);
    assert.equal(checked.ok, false, JSON.stringify(input));
    if (!checked.ok) assert.equal(checked.error, 'There is nothing to save.');
  }
});

test('a patch is checked like a table is: wrong prices are refused by name', () => {
  const cases: [unknown, string][] = [
    [{ garments: { STTU169: { cents: -100 } } }, 'garments.STTU169.base'],
    [{ garments: { STTU169: { cents: 1700.5 } } }, 'garments.STTU169.base'],
    [{ garments: { STTU169: { cents: 0 } } }, 'garments.STTU169.base'],
    [{ garments: { STTU169: { cents: 1700, dtfCents: -1 } } }, 'garments.STTU169.dtf'],
    [{ garments: { STTU169: 'x' } }, 'garments.STTU169.base'],
    [{ extras: { sleevesCents: -1 } }, 'extras.sleeves'],
    [{ extras: { secondMainPrintCents: 100.5 } }, 'extras.secondMain'],
    [{ extras: 'x' }, 'extras'],
    [{ garments: 'x' }, 'garments'],
  ];
  for (const [input, field] of cases) {
    const checked = checkPodPricePatch(JSON.parse(JSON.stringify(input)));
    assert.equal(checked.ok, false, JSON.stringify(input));
    if (!checked.ok) assert.equal(checked.field, field, JSON.stringify(input));
  }
  // a __proto__ from JSON is an own key (an object literal would set the prototype instead): refused, never merged in
  const proto = checkPodPricePatch(JSON.parse('{"garments":{"__proto__":{"cents":1}}}'));
  assert.equal(proto.ok, false);
  if (!proto.ok) assert.equal(proto.field, 'garments');
  assert.equal(({} as Record<string, unknown>).cents, undefined, 'and Object.prototype is untouched');
});

test('a patch sets garments, takes some back to the placeholder, changes the extras, and leaves the rest alone', () => {
  const table: PodPriceTable = { extras: EXTRAS, garments: { STTU169: { cents: 1700, dtfCents: 1900 }, STSU177: { cents: 3400 }, STBU070: { cents: 1000 } } };
  const next = applyPodPricePatch(table, { extras: { sleevesCents: 250 }, garments: { STTU169: { cents: 1800 }, STSU177: null, STAU771: { cents: 900 } } });
  assert.deepEqual(next, {
    extras: { secondMainPrintCents: 100, sleevesCents: 250 },
    garments: { STTU169: { cents: 1800 }, STBU070: { cents: 1000 }, STAU771: { cents: 900 } },
  });
  assert.deepEqual(next.garments.STTU169, { cents: 1800 }, 'a whole entry replaces the old one: the DTF price goes with it');
  // the table it was applied to is untouched
  assert.deepEqual(table.garments.STTU169, { cents: 1700, dtfCents: 1900 });
  assert.equal(table.extras.sleevesCents, 200);
  assert.deepEqual(applyPodPricePatch(table, {}), table);
});

// ---------------------------------------------------------------------------
// Examples

test('the examples are the owner words: one print, front and back, sleeves, sleeves once, everything', () => {
  assert.deepEqual(POD_EXAMPLES.map((e) => e.label), [
    'One print, front or back',
    'Front and back',
    'Front with one sleeve',
    'Front with both sleeves',
    'Front and back with sleeves',
  ]);
  const rows = podExampleRows(1700, EXTRAS);
  assert.deepEqual(rows.map((r) => r.totalCents), [1700, 1800, 1900, 1900, 2000]);
  assert.deepEqual(rows.map((r) => r.sum), ['€17', '€17 + €1', '€17 + €2', '€17 + €2', '€17 + €1 + €2']);
  assert.equal(rows[4].label, 'Front and back with sleeves');
});

test('the examples use the same arithmetic as a product price, whatever the base and extras', () => {
  const rows = podExampleRows(2149, { secondMainPrintCents: 175, sleevesCents: 0 });
  assert.deepEqual(rows.map((r) => r.totalCents), [2149, 2324, 2149, 2149, 2324]);
  for (const example of POD_EXAMPLES) {
    const priced = buildPodBreakdown({ blankCode: '', baseCents: 2149, placeholder: false, extras: { secondMainPrintCents: 175, sleevesCents: 0 }, placements: example.positions.map((position) => ({ position })) });
    assert.equal(rows.find((r) => r.key === example.key)?.totalCents, priced.totalCents, example.key);
  }
});

// ---------------------------------------------------------------------------
// Runs: a DTG/DTF run pays the same extras for more print positions (owner, 16 Oct 2026: "DTG/DTF pays also extras for new
// print positions"), on top of its own price for the garment with one print

const runLines = (extras: typeof EXTRAS, ...positions: string[]) => runExtraLines(extras, positions.map((position) => ({ position })));

test('a run with one print position pays no extra, front or back', () => {
  assert.deepEqual(runLines(EXTRAS, 'front_chest'), []);
  assert.deepEqual(runLines(EXTRAS, 'back'), []);
  assert.deepEqual(runLines(EXTRAS, 'front_full', 'front_left_chest'), [], 'two fronts are not a back: nothing is added for them');
  assert.deepEqual(runLines(EXTRAS), []);
});

test('front and back on a run is +1 euro', () => {
  const lines = runLines(EXTRAS, 'front_chest', 'back');
  assert.deepEqual(lines, [{ key: 'second_main_print', label: 'Front and back', cents: 100 }]);
  assert.equal(describeRunLine(lines[0]), 'Front and back: +€1.00');
  assert.deepEqual(runLines(EXTRAS, 'back', 'front_full'), lines, 'in either order');
});

test('sleeve prints on a run are +2 euros ONCE, for one sleeve or both', () => {
  const one = runLines(EXTRAS, 'front_chest', 'sleeve_left');
  assert.deepEqual(one, [{ key: 'sleeves', label: 'Sleeve prints', cents: 200 }]);
  assert.equal(describeRunLine(one[0]), 'Sleeve prints: +€2.00');
  assert.deepEqual(runLines(EXTRAS, 'front_chest', 'sleeve_left', 'sleeve_right'), one, 'both sleeves cost what one does');
  assert.deepEqual(runLines(EXTRAS, 'back', 'sleeve_right'), one);
});

test('front, back and sleeves on a run are +3 euros: the +1 and the +2, front and back first', () => {
  const lines = runLines(EXTRAS, 'front_chest', 'back', 'sleeve_left', 'sleeve_right');
  assert.deepEqual(lines.map((line) => line.key), ['second_main_print', 'sleeves']);
  assert.equal(runExtrasCents(lines), 300);
  assert.equal(describeRunLines(lines), 'Front and back: +€1.00; Sleeve prints: +€2.00 (+€3.00 per piece in all)');
});

test('the run extras are the shop\'s own: the owner changing them changes runs too, and a zero keeps its line', () => {
  const changed = runExtraLines({ secondMainPrintCents: 150, sleevesCents: 350 }, [{ position: 'front_chest' }, { position: 'back' }, { position: 'sleeve_left' }]);
  assert.deepEqual(changed.map((line) => line.cents), [150, 350]);
  const none = runExtraLines({ secondMainPrintCents: 0, sleevesCents: 0 }, [{ position: 'front_chest' }, { position: 'back' }, { position: 'sleeve_left' }]);
  assert.deepEqual(none.map((line) => [line.key, line.cents]), [['second_main_print', 0], ['sleeves', 0]]);
  assert.equal(describeRunLine(none[0]), 'Front and back: no extra charge');
});

test('for every example the admin page shows, a run pays what a shop product adds on top of its base', () => {
  for (const example of POD_EXAMPLES) {
    const shop = buildPodBreakdown({ blankCode: '', baseCents: 1700, placeholder: false, extras: EXTRAS, placements: example.positions.map((position) => ({ position })) });
    const run = runExtraLines(EXTRAS, example.positions.map((position) => ({ position })));
    assert.deepEqual(run, shop.lines.filter((line) => line.key !== 'base'), example.key);
    assert.ok(run.every((line) => (line.key as string) !== 'base'));
  }
});

// ---------------------------------------------------------------------------
// Which digital method a garment prints with (owner, 17 Oct 2026): DTG by default, DTF only where DTG isn't ideal

test('a garment whose family has DTG prints DTG, unless the owner marked it', () => {
  assert.deepEqual(garmentMethod({ offersDtg: true, offersDtf: true, markedDtf: false }), { code: 'dtg', dtfBecause: null });
  assert.deepEqual(garmentMethod({ offersDtg: true, offersDtf: true, markedDtf: true }), { code: 'dtf', dtfBecause: 'marked' });
});

test('a garment whose family has no DTG always prints DTF, marked or not', () => {
  assert.deepEqual(garmentMethod({ offersDtg: false, offersDtf: true, markedDtf: false }), { code: 'dtf', dtfBecause: 'no_dtg' });
  assert.deepEqual(garmentMethod({ offersDtg: false, offersDtf: true, markedDtf: true }), { code: 'dtf', dtfBecause: 'no_dtg' }, 'the family decides before the mark does');
});

test('a garment that can print only one of the two prints that one, and one that offers neither has no method', () => {
  assert.deepEqual(garmentMethod({ offersDtg: true, offersDtf: false, markedDtf: true }), { code: 'dtg', dtfBecause: null }, 'a mark can not make a garment print what it can not');
  assert.equal(garmentMethod({ offersDtg: false, offersDtf: false, markedDtf: false }), null);
  assert.equal(garmentMethod({ offersDtg: false, offersDtf: false, markedDtf: true }), null);
});

test('the mark is the owner\'s to change only on a garment that can print either way: with no DTG the toggle is locked', () => {
  assert.equal(methodLocked({ offersDtg: true, offersDtf: true }), false);
  assert.equal(methodLocked({ offersDtg: false, offersDtf: true }), true, 'no DTG: always DTF, locked on');
  assert.equal(methodLocked({ offersDtg: true, offersDtf: false }), true);
  assert.equal(methodLocked({ offersDtg: false, offersDtf: false }), true);
});

test('a garment is marked when its code is in the table\'s list', () => {
  const table: PodPriceTable = { extras: EXTRAS, garments: {}, dtfInstead: ['STSU177'] };
  assert.equal(isMarkedDtf(table, 'STSU177'), true);
  assert.equal(isMarkedDtf(table, 'STTU169'), false);
  assert.equal(isMarkedDtf({ extras: EXTRAS, garments: {} }, 'STSU177'), false, 'a table saved before the marks existed has none');
  assert.equal(isMarkedDtf(table, 'constructor'), false);
});

test('the two digital methods, and what may be asked for them', () => {
  assert.equal(isDigitalService('dtg') && isDigitalService('dtf'), true);
  for (const code of ['digital', 'screen_1c', 'embroidery', '', 'DTG']) assert.equal(isDigitalService(code), false, code);
  for (const code of ['digital', 'dtg', 'dtf']) assert.equal(isDigitalAsk(code), true, code);
  for (const code of ['screen_2c', 'embroidery', 'laser', '']) assert.equal(isDigitalAsk(code), false, code);
});

test('the words: the owner\'s label and rule, and the note that says DTF only where it matters', () => {
  assert.equal(DTF_MARK_LABEL, "Print with DTF (DTG isn't ideal)");
  assert.equal(DTF_RULE, "A shop product prints DTG, or DTF on a garment where DTG isn't ideal: one with no DTG, or one you mark in the table below.");
  assert.equal(DTF_RULE.split('. ').length, 1, 'one sentence');
  assert.equal(printedNote('dtf'), "Printed DTF on this garment, since DTG isn't ideal for it.");
  assert.equal(printedNote('dtg'), 'Printed DTG on this garment.');
});

test('DTF costs what DTG does until the owner fills in a DTF price, and then a garment that prints DTF costs that', () => {
  const method = (markedDtf: boolean, offersDtg = true) => garmentMethod({ offersDtg, offersDtf: true, markedDtf })!.code;
  // the default for every garment: no DTF price, so DTG and DTF are the same number
  const same = { cents: 1700 };
  assert.equal(baseCentsFor(same, method(false)), 1700);
  assert.equal(baseCentsFor(same, method(true)), 1700, 'marked DTF: still the same price');
  assert.equal(baseCentsFor(same, method(false, false)), 1700, 'no DTG: still the same price');
  // a DTF price: used by the garments that print DTF, never by one that prints DTG
  const own = { cents: 1700, dtfCents: 1900 };
  assert.equal(baseCentsFor(own, method(false)), 1700, 'prints DTG: the base price');
  assert.equal(baseCentsFor(own, method(true)), 1900, 'marked: the DTF price');
  assert.equal(baseCentsFor(own, method(false, false)), 1900, 'no DTG: the DTF price');
});

// ---------------------------------------------------------------------------
// The marks in the table and in a patch

test('a table without marks has none, and a good one keeps its marks sorted and without duplicates', () => {
  const none = checkPodPriceTable({ extras: EXTRAS, garments: {} });
  assert.ok(none.ok);
  assert.equal('dtfInstead' in none.table, false, 'absent, so a table saved before the marks reads the same');
  for (const empty of [[], null, undefined]) {
    const checked = checkPodPriceTable({ extras: EXTRAS, garments: {}, dtfInstead: empty });
    assert.ok(checked.ok);
    assert.equal('dtfInstead' in checked.table, false, JSON.stringify(empty));
  }
  const marked = checkPodPriceTable({ extras: EXTRAS, garments: { STTU169: { cents: 1700 } }, dtfInstead: ['STSU177', 'STAU771', 'STSU177'] });
  assert.ok(marked.ok);
  assert.deepEqual(marked.table.dtfInstead, ['STAU771', 'STSU177']);
  assert.deepEqual(marked.table.garments, { STTU169: { cents: 1700 } }, 'a mark is not a price: the garment has none');
});

test('a mark list that is not a list of garment codes is refused in words, by name', () => {
  for (const dtfInstead of ['STSU177', { STSU177: true }, 7, true]) {
    const checked = checkPodPriceTable({ extras: EXTRAS, garments: {}, dtfInstead });
    assert.equal(checked.ok, false, JSON.stringify(dtfInstead));
    if (!checked.ok) assert.deepEqual([checked.error, checked.field], ['The garments printed with DTF are missing.', 'dtfInstead']);
  }
  for (const code of ['__proto__', 'a b', '', 7, null, '../x']) {
    const checked = checkPodPriceTable({ extras: EXTRAS, garments: {}, dtfInstead: ['STSU177', code] });
    assert.equal(checked.ok, false, JSON.stringify(code));
    if (!checked.ok) assert.equal(checked.field, 'dtfInstead');
  }
  const tooMany = Array.from({ length: POD_TABLE_LIMITS.maxGarments + 1 }, (_, i) => `G${i}`);
  assert.equal(checkPodPriceTable({ extras: EXTRAS, garments: {}, dtfInstead: tooMany }).ok, false);
});

test('a patch marks and unmarks garments, and a mark alone is something to save', () => {
  const checked = checkPodPricePatch({ dtfInstead: { STSU177: true, STTU169: false } });
  assert.ok(checked.ok);
  assert.deepEqual(checked.patch, { dtfInstead: { STSU177: true, STTU169: false } });
  const withPrices = checkPodPricePatch({ garments: { STTU169: { cents: 1700 } }, dtfInstead: { STSU177: true }, extras: { sleevesCents: 250 } });
  assert.ok(withPrices.ok);
  assert.deepEqual(withPrices.patch, { extras: { sleevesCents: 250 }, garments: { STTU169: { cents: 1700 } }, dtfInstead: { STSU177: true } });
  const empty = checkPodPricePatch({ dtfInstead: {} });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.error, 'There is nothing to save.');
});

test('a patch with a mark that is not on or off, or not a garment, is refused by name', () => {
  const notYesNo = checkPodPricePatch({ dtfInstead: { STSU177: 'yes' } });
  assert.equal(notYesNo.ok, false);
  if (!notYesNo.ok) assert.deepEqual([notYesNo.error, notYesNo.field], ['Say whether STSU177 prints DTF: on or off.', 'garments.STSU177.method']);
  for (const value of [1, null, undefined, 'true']) assert.equal(checkPodPricePatch({ dtfInstead: { STSU177: value } }).ok, false, String(value));
  assert.equal(checkPodPricePatch({ dtfInstead: 'STSU177' }).ok, false);
  assert.equal(checkPodPricePatch({ dtfInstead: ['STSU177'] }).ok, false);
  const proto = checkPodPricePatch(JSON.parse('{"dtfInstead":{"__proto__":true}}'));
  assert.equal(proto.ok, false);
  assert.equal(({} as Record<string, unknown>).true, undefined, 'and Object.prototype is untouched');
});

test('applying a patch turns marks on and off, keeps the rest, and leaves the old table alone', () => {
  const table: PodPriceTable = { extras: EXTRAS, garments: { STTU169: { cents: 1700, dtfCents: 1900 } }, dtfInstead: ['STAU771'] };
  const next = applyPodPricePatch(table, { dtfInstead: { STSU177: true, STAU771: false } });
  assert.deepEqual(next.dtfInstead, ['STSU177']);
  assert.deepEqual(next.garments, table.garments, 'a mark does not touch a price, nor its DTF price');
  assert.deepEqual(table.dtfInstead, ['STAU771'], 'the table it was applied to is untouched');
  // turning the last mark off leaves no list at all
  const none = applyPodPricePatch(next, { dtfInstead: { STSU177: false } });
  assert.equal('dtfInstead' in none, false);
  assert.deepEqual(none, { extras: EXTRAS, garments: table.garments });
  // a price patch keeps the marks
  assert.deepEqual(applyPodPricePatch(table, { garments: { STTU169: { cents: 1800 } } }).dtfInstead, ['STAU771']);
  // marking twice is one mark, and a mark off a garment that has none is nothing
  assert.deepEqual(applyPodPricePatch(next, { dtfInstead: { STSU177: true, STBU070: false } }).dtfInstead, ['STSU177']);
});
