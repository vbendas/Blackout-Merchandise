// The logic behind the screen-print price editor: the table as typed, the boxes that need a look,
// the rows and columns that can come and go, and the example prices. No React here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultScreenPriceTable } from '@/lib/pricing/screen-print';
import {
  EXAMPLE_GARMENT_CENTS,
  addBand,
  addBreak,
  addTier,
  bandLabel,
  canAddBand,
  canAddBreak,
  canAddTier,
  cents,
  eurosText,
  exampleRows,
  firstBox,
  formFromTable,
  removeBand,
  removeBreak,
  removeTier,
  tableFromForm,
  tierLabel,
  type PriceFormErrors,
  type PriceFormValues,
} from './price-form';

const saved = defaultScreenPriceTable();
const form = (): PriceFormValues => formFromTable(saved);

function failure(values: PriceFormValues): { errors: PriceFormErrors; first: string } {
  const result = tableFromForm(values);
  assert.equal(result.ok, false, 'the form should not pass');
  return result.ok ? { errors: {}, first: '' } : result;
}

test('the placeholder table goes to the form and back unchanged', () => {
  const result = tableFromForm(form());
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.table, saved);
});

test('the form holds money as euros and everything else as typed numbers', () => {
  const values = form();
  assert.deepEqual(values.breaks, ['1', '25', '50', '100']);
  assert.deepEqual(values.tiers[0], { from: '1', cells: ['3.50', '3.22', '2.98', '2.73'] });
  assert.equal(values.tiers.length, 8);
  assert.equal(values.setup, '0.00');
  assert.equal(values.additional, '100');
  assert.equal(values.margin, '30');
  assert.deepEqual(values.bands, [{ from: '0', percent: '100' }]);
});

test('an edit comes through as cents and whole numbers', () => {
  const values = form();
  values.tiers[2].cells[1] = '6,05';
  values.setup = '12.5';
  values.additional = ' 80 ';
  values.margin = '25';
  const result = tableFromForm(values);
  assert.ok(result.ok, result.ok ? '' : JSON.stringify(result.errors));
  assert.equal(result.table.tiers[2].printCents[1], 605);
  assert.equal(result.table.setupCentsPerScreen, 1250);
  assert.equal(result.table.additionalPlacementPercent, 80);
  assert.equal(result.table.marginPercent, 25);
});

test('amounts are read like people write them', () => {
  assert.equal(cents('3.50'), 350);
  assert.equal(cents('3,5'), 350);
  assert.equal(cents(' 12 '), 1200);
  assert.equal(cents('0'), 0);
  assert.equal(cents('3.505'), null);
  assert.equal(cents('-1'), null);
  assert.equal(cents('abc'), null);
  assert.equal(cents(''), null);
  assert.equal(eurosText(520), '5.20');
});

test('a box that is not a number says so, by name', () => {
  const values = form();
  values.breaks[1] = 'many';
  values.tiers[3].cells[0] = '12.345';
  values.tiers[1].from = '';
  values.margin = 'lots';
  const { errors, first } = failure(values);
  assert.equal(errors['breaks.1'], 'Use a whole number.');
  assert.equal(errors['tiers.3.cells.0'], 'Use an amount like 3.50.');
  assert.equal(errors['tiers.1.from'], 'Use a whole number.');
  assert.equal(errors.margin, 'Use a whole number.');
  assert.equal(first, 'breaks.1', 'the first one in the order the page lists them');
});

test('a table that reads but makes no sense is refused at the box the check names', () => {
  const values = form();
  values.tiers[4].cells[2] = '0.50'; // 5 screens at 50 pieces cost less than 4
  const { errors, first } = failure(values);
  assert.match(errors['tiers.4.cells.2'], /More screens should not cost less/);
  assert.equal(first, 'tiers.4.cells.2');

  const dearer = form();
  dearer.tiers[0].cells[3] = '9.00'; // 100 pieces dearer than 50
  assert.match(failure(dearer).errors['tiers.0.cells.3'], /A bigger quantity should not cost more/);

  const values2 = form();
  values2.breaks[0] = '5';
  assert.match(failure(values2).errors['breaks.0'], /first quantity break must be 1 piece/);

  const values3 = form();
  values3.additional = '999';
  assert.match(failure(values3).errors.additional, /0 to 300 percent/);
});

test('firstBox follows the page order: breaks, tiers, the settings, then size bands', () => {
  const values = form();
  const errors = { 'bands.0.percent': 'x', margin: 'y', 'tiers.2.cells.1': 'z' };
  assert.equal(firstBox(values, errors), 'tiers.2.cells.1');
  assert.equal(firstBox(values, { 'bands.0.percent': 'x', margin: 'y' }), 'margin');
  assert.equal(firstBox(values, { form: 'whatever' }), 'form');
});

test('a quantity break is added after the last, priced like it, and the first can never be removed', () => {
  const values = form();
  assert.equal(canAddBreak(values), true);
  const more = addBreak(values);
  assert.deepEqual(more.breaks, ['1', '25', '50', '100', '200']);
  assert.ok(more.tiers.every((tier) => tier.cells.length === 5));
  assert.equal(more.tiers[0].cells[4], more.tiers[0].cells[3]);
  assert.equal(tableFromForm(more).ok, true, 'a new column passes the checks');

  assert.deepEqual(removeBreak(more, 2).breaks, ['1', '25', '100', '200']);
  assert.ok(removeBreak(more, 2).tiers.every((tier) => tier.cells.length === 4));
  assert.equal(removeBreak(values, 0), values, 'the first break stays');
  assert.equal(removeBreak(values, 9), values);

  let full = values;
  while (canAddBreak(full)) full = addBreak(full);
  assert.equal(full.breaks.length, 8);
  assert.equal(addBreak(full), full);
});

test('a first break under 25 gets 25 as the next', () => {
  const values: PriceFormValues = { ...form(), breaks: ['1'], tiers: form().tiers.map((tier) => ({ ...tier, cells: [tier.cells[0]] })) };
  assert.deepEqual(addBreak(values).breaks, ['1', '25']);
});

test('a tier is added after the last, one screen up, priced like it; the first can never be removed', () => {
  const values: PriceFormValues = { ...form(), tiers: form().tiers.slice(0, 3) };
  assert.equal(canAddTier(values), true);
  const more = addTier(values);
  assert.equal(more.tiers.length, 4);
  assert.equal(more.tiers[3].from, '4');
  assert.deepEqual(more.tiers[3].cells, values.tiers[2].cells);
  assert.equal(removeTier(more, 0), more);
  assert.deepEqual(removeTier(more, 1).tiers.map((t) => t.from), ['1', '3', '4']);

  const eight = form();
  assert.equal(canAddTier(eight), false, 'one tier for each standard screen count is the most');
  assert.equal(addTier(eight), eight);
});

test('a tier past the standard 8 can not be added', () => {
  const values: PriceFormValues = { ...form(), tiers: [form().tiers[0], { from: '8', cells: form().tiers[7].cells }] };
  assert.equal(canAddTier(values), false);
});

test('a size band is added 10 cm wider at the same percentage; the first can never be removed', () => {
  const values = form();
  const more = addBand(values);
  assert.deepEqual(more.bands, [{ from: '0', percent: '100' }, { from: '10', percent: '100' }]);
  assert.equal(removeBand(more, 0), more);
  assert.deepEqual(removeBand(more, 1).bands, values.bands);
  let full = values;
  while (canAddBand(full)) full = addBand(full);
  assert.equal(full.bands.length, 6);
  assert.equal(addBand(full), full);
});

test('rows say what they cover in words', () => {
  const values = form();
  assert.equal(tierLabel(values, 0), '1 screen');
  assert.equal(tierLabel(values, 7), '8 screens');

  const grouped: PriceFormValues = { ...values, tiers: [values.tiers[0], { ...values.tiers[2], from: '3' }, { ...values.tiers[6], from: '7' }] };
  assert.equal(tierLabel(grouped, 0), '1 to 2 screens');
  assert.equal(tierLabel(grouped, 1), '3 to 6 screens');
  assert.equal(tierLabel(grouped, 2), '7 to 8 screens', 'the last tier runs to the standard 8');

  assert.equal(bandLabel(values, 0), 'Any width');
  const sized = { ...values, bands: [{ from: '0', percent: '80' }, { from: '15', percent: '100' }, { from: '35', percent: '125' }] };
  assert.equal(bandLabel(sized, 0), 'Up to 14 cm');
  assert.equal(bandLabel(sized, 1), '15 to 34 cm');
  assert.equal(bandLabel(sized, 2), '35 cm and wider');
});

test('the examples are the price of one piece for every screen count 1 to 15 at each break', () => {
  const rows = exampleRows(saved);
  assert.equal(rows.length, 15);
  assert.deepEqual(rows.map((r) => r.screens), Array.from({ length: 15 }, (_, i) => i + 1));
  assert.equal(EXAMPLE_GARMENT_CENTS, 650);
  // 1 screen at the first break: the 6.50 blank, 3.50 of print, 30% margin on both
  assert.equal(rows[0].unitCents[0], 650 + 350 + 300);
  assert.equal(rows[0].surchargeCents, 0);
  // 8 screens and 9 screens use the same print price; the 9th adds the fixed euro
  assert.equal(rows[8].unitCents[0] - rows[7].unitCents[0], 100);
  assert.equal(rows[8].surchargeCents, 100);
  assert.equal(rows[14].surchargeCents, 700);
  assert.equal(rows[14].unitCents[2] - rows[7].unitCents[2], 700);
  assert.equal(rows[0].unitCents.length, saved.breaks.length);
});
