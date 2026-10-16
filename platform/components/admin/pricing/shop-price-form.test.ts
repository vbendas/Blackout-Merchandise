// The logic behind the shop-product price editor: what is typed becomes whole cents (rounded to the cent,
// never negative), edits wait for Save, a whole type can be set at once, only the garments that changed are
// sent, and the examples follow the boxes. No React here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PodGarmentRow } from '@/lib/pricing/pod-table';
import {
  applyTypePrice,
  centsFromText,
  defaultPreviewCode,
  editBase,
  editDtf,
  filterRows,
  formFromSaved,
  garmentKey,
  patchFromForm,
  placeholderCount,
  previewBase,
  rowState,
  savedFromRows,
  typeOptions,
  type SavedShopPrices,
  type ShopFormErrors,
  type ShopFormValues,
} from './shop-price-form';

const EXTRAS = { secondMainPrintCents: 100, sleevesCents: 200 };

function garment(code: string, name: string, type: string, patch: Partial<PodGarmentRow> = {}): PodGarmentRow {
  return { code, name, supplierName: null, type, baseCents: null, dtfCents: null, placeholderCents: 1625, ...patch };
}

const ROWS: PodGarmentRow[] = [
  garment('STTU169', 'Classic tee', 'T-shirts'),
  garment('STTU170', 'Light tee', 'T-shirts', { supplierName: 'Creator 2.0' }),
  garment('STTU171', 'Washed tee', 'T-shirts', { placeholderCents: 1690 }),
  garment('STSU177', 'Heavy hoodie', 'Sweats & Hoodies', { placeholderCents: 2800 }),
  garment('STJM158', "Men's hooded softshell", 'Jackets', { placeholderCents: 3500 }),
  garment('STNP000', 'Unpriced tee', 'T-shirts', { placeholderCents: null }),
];

function fresh(rows = ROWS, extras = EXTRAS): { rows: PodGarmentRow[]; saved: SavedShopPrices; values: ShopFormValues } {
  const saved = savedFromRows(rows, extras);
  return { rows, saved, values: formFromSaved(rows, saved) };
}

function ok(result: ReturnType<typeof patchFromForm>) {
  assert.ok(result.ok, result.ok ? '' : JSON.stringify(result.errors));
  return result;
}

function failure(result: ReturnType<typeof patchFromForm>): { errors: ShopFormErrors; first: string } {
  assert.equal(result.ok, false, 'the form should not pass');
  return result.ok ? { errors: {}, first: '' } : result;
}

// ---------------------------------------------------------------------------
// Money

test('amounts are read like people write them', () => {
  assert.equal(centsFromText('17'), 1700);
  assert.equal(centsFromText('17.5'), 1750);
  assert.equal(centsFromText('17.50'), 1750);
  assert.equal(centsFromText('17,50'), 1750, 'a decimal comma');
  assert.equal(centsFromText(' 17 '), 1700);
  assert.equal(centsFromText('€17'), 1700);
  assert.equal(centsFromText('€ 17.25'), 1725);
  assert.equal(centsFromText('0'), 0);
  assert.equal(centsFromText('0.01'), 1);
  assert.equal(centsFromText('1000'), 100_000);
});

test('amounts are whole cents, never float noise: 0.29 is 29 cents and 1.15 is 115', () => {
  assert.equal(centsFromText('0.29'), 29);
  assert.equal(centsFromText('1.15'), 115);
  assert.equal(centsFromText('16.99'), 1699);
  assert.equal(centsFromText('4.35'), 435);
  assert.equal(centsFromText('0.07'), 7);
  assert.equal(centsFromText('1234.56'), 123_456);
});

test('more than two decimals are rounded to the nearest cent, half up', () => {
  assert.equal(centsFromText('17.004'), 1700);
  assert.equal(centsFromText('17.005'), 1701, 'half rounds up');
  assert.equal(centsFromText('17.0049999'), 1700);
  assert.equal(centsFromText('17.555'), 1756);
  assert.equal(centsFromText('17.554'), 1755);
  assert.equal(centsFromText('16.999'), 1700, 'and carries into the euros');
  assert.equal(centsFromText('0.005'), 1);
  assert.equal(centsFromText('0.004'), 0);
  assert.equal(centsFromText('17,995'), 1800);
});

test('a negative, a word or a malformed number is not an amount', () => {
  for (const text of ['-1', '-0.50', '+5', 'abc', '', ' ', '1.2.3', '17.', '.5', ',5', '1e3', '12 34', '€', '€-5', '17€', '1,2,3', '--', '0x10', '١٢']) {
    assert.equal(centsFromText(text), null, JSON.stringify(text));
  }
});

// ---------------------------------------------------------------------------
// The form

test('a saved price is shown as it was saved, and a garment nobody set shows its placeholder', () => {
  const rows = ROWS.map((r) => (r.code === 'STTU169' ? { ...r, baseCents: 1700, dtfCents: 1900 } : r));
  const { values } = fresh(rows);
  assert.deepEqual(values.rows.STTU169, { base: '17.00', dtf: '19.00', set: true });
  assert.deepEqual(values.rows.STTU170, { base: '16.25', dtf: '', set: false });
  assert.deepEqual(values.rows.STTU171, { base: '16.90', dtf: '', set: false });
  assert.deepEqual(values.rows.STNP000, { base: '', dtf: '', set: false }, 'no cost: nothing to show');
  assert.equal(values.secondMain, '1.00');
  assert.equal(values.sleeves, '2.00');
});

test('nothing typed means nothing to save, whatever the placeholders say', () => {
  const { rows, saved, values } = fresh();
  const result = ok(patchFromForm(values, rows, saved));
  assert.deepEqual(result.patch, {});
  assert.equal(result.changed, 0);
});

test('typing a base price chooses it: that garment is set and is saved, the others are not', () => {
  const { rows, saved, values } = fresh();
  const next = editBase(values, 'STTU169', '17');
  assert.deepEqual(next.rows.STTU169, { base: '17', dtf: '', set: true });
  assert.equal(next.rows.STTU170.set, false);
  const result = ok(patchFromForm(next, rows, saved));
  assert.deepEqual(result.patch, { garments: { STTU169: { cents: 1700 } } });
  assert.equal(result.changed, 1);
});

test('a garment the boxes have not met (added to the catalogue while the page was open) can still be priced', () => {
  const { rows, saved, values } = fresh();
  const added = [...rows, garment('STTU999', 'New tee', 'T-shirts')];
  // nothing typed for it: not set, never sent, no crash
  assert.equal(ok(patchFromForm(values, added, saved)).changed, 0);
  assert.equal(rowState(added[added.length - 1], values, saved), 'placeholder');
  // typing a price chooses it
  const typed = editBase(values, 'STTU999', '17');
  assert.deepEqual(typed.rows.STTU999, { base: '17', dtf: '', set: true });
  assert.deepEqual(ok(patchFromForm(typed, added, saved)).patch, { garments: { STTU999: { cents: 1700 } } });
  // and a whole type reaches it too
  const applied = applyTypePrice(values, added, 'T-shirts', '18');
  assert.ok(applied.ok);
  assert.deepEqual(applied.values.rows.STTU999, { base: '18.00', dtf: '', set: true });
  assert.equal(applied.count, 5);
});

test('typing the placeholder value in again still chooses it: the owner can accept a placeholder as it is', () => {
  const { rows, saved, values } = fresh();
  const next = editBase(values, 'STTU171', '16.90');
  assert.deepEqual(ok(patchFromForm(next, rows, saved)).patch, { garments: { STTU171: { cents: 1690 } } });
});

test('an unchanged saved garment is not sent again', () => {
  const rows = ROWS.map((r) => (r.code === 'STTU169' ? { ...r, baseCents: 1700 } : r));
  const { saved, values } = fresh(rows);
  const same = editBase(values, 'STTU169', '17.00');
  assert.equal(ok(patchFromForm(same, rows, saved)).changed, 0);
  assert.equal(ok(patchFromForm(editBase(values, 'STTU169', '17'), rows, saved)).changed, 0, '17 is 17.00');
  const dearer = ok(patchFromForm(editBase(values, 'STTU169', '17.01'), rows, saved));
  assert.deepEqual(dearer.patch, { garments: { STTU169: { cents: 1701 } } });
});

test('cents are rounded on the way to the server', () => {
  const { rows, saved, values } = fresh();
  assert.deepEqual(ok(patchFromForm(editBase(values, 'STTU169', '17.555'), rows, saved)).patch, { garments: { STTU169: { cents: 1756 } } });
  assert.deepEqual(ok(patchFromForm(editBase(values, 'STTU169', '0.29'), rows, saved)).patch, { garments: { STTU169: { cents: 29 } } });
  assert.deepEqual(ok(patchFromForm(editBase(values, 'STTU169', '16,999'), rows, saved)).patch, { garments: { STTU169: { cents: 1700 } } });
});

test('a negative or unreadable price is an error at that box, and nothing is sent', () => {
  const { rows, saved, values } = fresh();
  for (const text of ['-5', '-0.01', 'abc', '17.', '1.2.3']) {
    const { errors, first } = failure(patchFromForm(editBase(values, 'STTU170', text), rows, saved));
    assert.equal(errors[garmentKey('STTU170', 'base')], 'Use an amount like 17.00.', text);
    assert.equal(first, 'garments.STTU170.base');
  }
});

test('an empty box, zero, or a price over the limit is an error with its own words', () => {
  const { rows, saved, values } = fresh();
  assert.equal(failure(patchFromForm(editBase(values, 'STTU170', ''), rows, saved)).errors['garments.STTU170.base'], 'Enter a price like 17.00.');
  assert.equal(failure(patchFromForm(editBase(values, 'STTU170', '0'), rows, saved)).errors['garments.STTU170.base'], 'A price runs from €0.01 to €1000.');
  assert.equal(failure(patchFromForm(editBase(values, 'STTU170', '0.004'), rows, saved)).errors['garments.STTU170.base'], 'A price runs from €0.01 to €1000.', '0.004 rounds to nothing');
  assert.equal(failure(patchFromForm(editBase(values, 'STTU170', '1000.01'), rows, saved)).errors['garments.STTU170.base'], 'A price runs from €0.01 to €1000.');
  assert.equal(ok(patchFromForm(editBase(values, 'STTU170', '1000'), rows, saved)).changed, 1);
  assert.equal(ok(patchFromForm(editBase(values, 'STTU170', '0.01'), rows, saved)).changed, 1);
});

test('a garment nobody touched is never validated or sent, even with no placeholder', () => {
  const { rows, saved, values } = fresh();
  assert.equal(values.rows.STNP000.base, '');
  assert.equal(ok(patchFromForm(values, rows, saved)).changed, 0);
});

test('a DTF price is typed once the base is set; empty means DTF uses the base price', () => {
  const { rows, saved, values } = fresh();
  // not set: the DTF box does nothing
  assert.equal(editDtf(values, 'STTU169', '19'), values);
  const base = editBase(values, 'STTU169', '17');
  const withDtf = editDtf(base, 'STTU169', '19.50');
  assert.deepEqual(ok(patchFromForm(withDtf, rows, saved)).patch, { garments: { STTU169: { cents: 1700, dtfCents: 1950 } } });
  assert.deepEqual(ok(patchFromForm(editDtf(base, 'STTU169', '  '), rows, saved)).patch, { garments: { STTU169: { cents: 1700 } } }, 'blank is no DTF price');
  const bad = failure(patchFromForm(editDtf(base, 'STTU169', '-3'), rows, saved));
  assert.equal(bad.errors['garments.STTU169.dtf'], 'Use an amount like 17.00.');
  assert.equal(bad.first, 'garments.STTU169.dtf');
});

test('clearing a saved DTF price sends the garment without one', () => {
  const rows = ROWS.map((r) => (r.code === 'STTU169' ? { ...r, baseCents: 1700, dtfCents: 1900 } : r));
  const { saved, values } = fresh(rows);
  const cleared = editDtf(values, 'STTU169', '');
  assert.deepEqual(ok(patchFromForm(cleared, rows, saved)).patch, { garments: { STTU169: { cents: 1700 } } });
});

test('the extras are sent only when they change, each on its own', () => {
  const { rows, saved, values } = fresh();
  const sleeves = ok(patchFromForm({ ...values, sleeves: '2.50' }, rows, saved));
  assert.deepEqual(sleeves.patch, { extras: { sleevesCents: 250 } });
  assert.equal(sleeves.changed, 1);
  const both = ok(patchFromForm({ ...values, secondMain: '0', sleeves: '3' }, rows, saved));
  assert.deepEqual(both.patch, { extras: { secondMainPrintCents: 0, sleevesCents: 300 } }, 'zero is a valid extra');
  assert.equal(both.changed, 2);
  assert.equal(ok(patchFromForm({ ...values, sleeves: '2' }, rows, saved)).changed, 0, 'the same amount typed again');
});

test('a negative or unreadable extra is an error by name, and an extra over the limit too', () => {
  const { rows, saved, values } = fresh();
  assert.equal(failure(patchFromForm({ ...values, sleeves: '-1' }, rows, saved)).errors['extras.sleeves'], 'Use an amount like 17.00.');
  assert.equal(failure(patchFromForm({ ...values, secondMain: 'x' }, rows, saved)).errors['extras.secondMain'], 'Use an amount like 17.00.');
  assert.equal(failure(patchFromForm({ ...values, secondMain: '' }, rows, saved)).errors['extras.secondMain'], 'Enter an amount like 1.00, or 0.00 for none.');
  assert.equal(failure(patchFromForm({ ...values, sleeves: '100.01' }, rows, saved)).errors['extras.sleeves'], 'An extra runs from €0 to €100.');
  assert.equal(ok(patchFromForm({ ...values, sleeves: '100' }, rows, saved)).changed, 1);
});

test('the first box to look at follows the page: extras, then garments in the order listed', () => {
  const { rows, saved, values } = fresh();
  let next = editBase(editBase(values, 'STSU177', 'x'), 'STTU170', 'y');
  assert.equal(failure(patchFromForm(next, rows, saved)).first, 'garments.STTU170.base', 'STTU170 is listed before STSU177');
  next = { ...next, sleeves: 'z' };
  assert.equal(failure(patchFromForm(next, rows, saved)).first, 'extras.sleeves');
  const both = failure(patchFromForm({ ...next, secondMain: 'w' }, rows, saved));
  assert.equal(both.first, 'extras.secondMain');
  assert.deepEqual(Object.keys(both.errors).sort(), ['extras.secondMain', 'extras.sleeves', 'garments.STSU177.base', 'garments.STTU170.base']);
});

// ---------------------------------------------------------------------------
// Set a whole type

test('set the price for all of a type: every garment of it is set, the others are not', () => {
  const { rows, saved, values } = fresh();
  const applied = applyTypePrice(values, rows, 'T-shirts', '17');
  assert.ok(applied.ok);
  assert.equal(applied.count, 4, 'every T-shirt, whatever it is called');
  assert.equal(applied.cents, 1700);
  for (const code of ['STTU169', 'STTU170', 'STTU171', 'STNP000']) assert.deepEqual(applied.values.rows[code], { base: '17.00', dtf: '', set: true }, code);
  assert.equal(applied.values.rows.STSU177.set, false, 'the hoodie is not a T-shirt');
  assert.equal(applied.values.rows.STJM158.set, false);

  const result = ok(patchFromForm(applied.values, rows, saved));
  assert.deepEqual(result.patch, { garments: { STTU169: { cents: 1700 }, STTU170: { cents: 1700 }, STTU171: { cents: 1700 }, STNP000: { cents: 1700 } } });
  assert.equal(result.changed, 4);
});

test('then individual edits: a garment can differ from its type, and the type can be set again', () => {
  const { rows, saved, values } = fresh();
  const applied = applyTypePrice(values, rows, 'T-shirts', '€17');
  assert.ok(applied.ok);
  const edited = editBase(applied.values, 'STTU171', '18.50');
  const patch = ok(patchFromForm(edited, rows, saved)).patch;
  assert.equal(patch.garments?.STTU171?.cents, 1850);
  assert.equal(patch.garments?.STTU169?.cents, 1700);
  const again = applyTypePrice(edited, rows, 'T-shirts', '18');
  assert.ok(again.ok);
  assert.equal(again.values.rows.STTU171.base, '18.00', 'the second set wins over the edit');
});

test('setting a type leaves the DTF prices as they are and rounds like a box does', () => {
  const rows = ROWS.map((r) => (r.code === 'STTU169' ? { ...r, baseCents: 1700, dtfCents: 1900 } : r));
  const { values } = fresh(rows);
  const applied = applyTypePrice(values, rows, 'T-shirts', '17.555');
  assert.ok(applied.ok);
  assert.equal(applied.cents, 1756);
  assert.deepEqual(applied.values.rows.STTU169, { base: '17.56', dtf: '19.00', set: true });
});

test('setting a type needs a type and a price a box would take', () => {
  const { rows, values } = fresh();
  assert.deepEqual(applyTypePrice(values, rows, '', '17'), { ok: false, error: 'Pick a garment type first.' });
  assert.deepEqual(applyTypePrice(values, rows, 'Hats', '17'), { ok: false, error: 'Pick a garment type first.' });
  assert.deepEqual(applyTypePrice(values, rows, 'T-shirts', '-17'), { ok: false, error: 'Use an amount like 17.00.' });
  assert.deepEqual(applyTypePrice(values, rows, 'T-shirts', ''), { ok: false, error: 'Enter a price like 17.00.' });
  assert.deepEqual(applyTypePrice(values, rows, 'T-shirts', '0'), { ok: false, error: 'A price runs from €0.01 to €1000.' });
  assert.equal(applyTypePrice(values, rows, 'T-shirts', 'abc').ok, false);
  // a refusal changes nothing
  assert.equal(values.rows.STTU169.set, false);
});

// ---------------------------------------------------------------------------
// Looking at the table

test('a garment is a placeholder, unsaved, set, or has no price', () => {
  const rows = ROWS.map((r) => (r.code === 'STSU177' ? { ...r, baseCents: 3400 } : r));
  const { saved, values } = fresh(rows);
  assert.equal(rowState(rows[0], values, saved), 'placeholder');
  assert.equal(rowState(rows[3], values, saved), 'set');
  assert.equal(rowState(rows[5], values, saved), 'none');
  assert.equal(rowState(rows[0], editBase(values, 'STTU169', '17'), saved), 'unsaved');
  assert.equal(rowState(rows[3], editBase(values, 'STSU177', '34.00'), saved), 'set', 'the same price typed again is still set');
  assert.equal(rowState(rows[3], editBase(values, 'STSU177', '35'), saved), 'unsaved');
  assert.equal(rowState(rows[3], editDtf(values, 'STSU177', '36'), saved), 'unsaved', 'a new DTF price is a change too');
  assert.equal(rowState(rows[5], editBase(values, 'STNP000', '12'), saved), 'unsaved');
});

test('the search finds a garment by name, code, supplier name or type, all words at once', () => {
  const { rows, saved } = fresh();
  const find = (query: string, extra: Partial<Parameters<typeof filterRows>[2]> = {}) => filterRows(rows, saved, { query, type: '', show: 'all', ...extra }).map((r) => r.code);
  assert.deepEqual(find(''), rows.map((r) => r.code));
  assert.deepEqual(find('hoodie'), ['STSU177']);
  assert.deepEqual(find('STTU17'), ['STTU170', 'STTU171']);
  assert.deepEqual(find('creator'), ['STTU170'], 'the supplier name');
  assert.deepEqual(find('LIGHT TEE'), ['STTU170'], 'case does not matter, and both words must be there');
  assert.deepEqual(find('t-shirts washed'), ['STTU171']);
  assert.deepEqual(find('jacket'), ['STJM158'], 'the type matches too');
  assert.deepEqual(find('beanie'), [], 'no match is an empty list');
  assert.deepEqual(find('', { type: 'Jackets' }), ['STJM158']);
  assert.deepEqual(find('tee', { type: 'Sweats & Hoodies' }), []);
});

test('the placeholder filter follows what is saved, so a garment does not leave the list while its price is typed', () => {
  const rows = ROWS.map((r) => (r.code === 'STSU177' ? { ...r, baseCents: 3400 } : r));
  const { saved } = fresh(rows);
  const show = (mode: 'all' | 'placeholder' | 'set') => filterRows(rows, saved, { query: '', type: '', show: mode }).map((r) => r.code);
  assert.deepEqual(show('set'), ['STSU177']);
  assert.deepEqual(show('placeholder'), ['STTU169', 'STTU170', 'STTU171', 'STJM158', 'STNP000']);
  assert.equal(show('all').length, 6);
  assert.equal(placeholderCount(rows, saved), 5);
  assert.equal(placeholderCount(ROWS, savedFromRows(ROWS, EXTRAS)), 6);
  // after a save the saved prices change, and so do the lists
  const after = savedFromRows(rows, EXTRAS);
  after.garments.STTU169 = { cents: 1700 };
  assert.equal(placeholderCount(rows, after), 4);
});

test('the types, with their counts, in the order the garments come', () => {
  assert.deepEqual(typeOptions(ROWS), [
    { type: 'T-shirts', count: 4 },
    { type: 'Sweats & Hoodies', count: 1 },
    { type: 'Jackets', count: 1 },
  ]);
  assert.deepEqual(typeOptions([]), []);
});

// ---------------------------------------------------------------------------
// The example prices

test('the examples start on a T-shirt the owner has priced, else any T-shirt, else the first garment', () => {
  const priced = ROWS.map((r) => (r.code === 'STTU171' ? { ...r, baseCents: 1700 } : r));
  assert.equal(defaultPreviewCode(priced, savedFromRows(priced, EXTRAS)), 'STTU171');
  assert.equal(defaultPreviewCode(ROWS, savedFromRows(ROWS, EXTRAS)), 'STTU169');
  const noTees = ROWS.filter((r) => r.type !== 'T-shirts');
  assert.equal(defaultPreviewCode(noTees, savedFromRows(noTees, EXTRAS)), 'STSU177');
  assert.equal(defaultPreviewCode([], savedFromRows([], EXTRAS)), null);
});

test('the examples follow what is typed, and fall back to what is saved while it can not be read', () => {
  const rows = ROWS.map((r) => (r.code === 'STTU169' ? { ...r, baseCents: 1700 } : r));
  const { saved, values } = fresh(rows);
  assert.deepEqual(previewBase(values, rows, saved, 'STTU169', 'dtg'), { baseCents: 1700, extras: EXTRAS, placeholder: false });
  // typing a new price
  assert.equal(previewBase(editBase(values, 'STTU169', '18'), rows, saved, 'STTU169', 'dtg')?.baseCents, 1800);
  // typing nonsense falls back to the saved price
  assert.equal(previewBase(editBase(values, 'STTU169', 'abc'), rows, saved, 'STTU169', 'dtg')?.baseCents, 1700);
  // typed extras
  assert.deepEqual(previewBase({ ...values, sleeves: '3.50', secondMain: '-1' }, rows, saved, 'STTU169', 'dtg')?.extras, { secondMainPrintCents: 100, sleevesCents: 350 });
});

test('a garment nobody set is a placeholder example, and one with no cost has none', () => {
  const { rows, saved, values } = fresh();
  assert.deepEqual(previewBase(values, rows, saved, 'STTU169', 'dtg'), { baseCents: 1625, extras: EXTRAS, placeholder: true });
  assert.equal(previewBase(values, rows, saved, 'STNP000', 'dtg'), null);
  assert.equal(previewBase(values, rows, saved, 'NOPE', 'dtg'), null);
  // typing a price turns the example into the typed one
  assert.deepEqual(previewBase(editBase(values, 'STNP000', '12'), rows, saved, 'STNP000', 'dtg'), { baseCents: 1200, extras: EXTRAS, placeholder: false });
});

test('the DTF example uses the typed DTF price, then the saved one, then the base price', () => {
  const rows = ROWS.map((r) => (r.code === 'STSU177' ? { ...r, baseCents: 3400, dtfCents: 3700 } : r));
  const { saved, values } = fresh(rows);
  assert.equal(previewBase(values, rows, saved, 'STSU177', 'dtf')?.baseCents, 3700);
  assert.equal(previewBase(values, rows, saved, 'STSU177', 'dtg')?.baseCents, 3400);
  assert.equal(previewBase(editDtf(values, 'STSU177', '39'), rows, saved, 'STSU177', 'dtf')?.baseCents, 3900);
  assert.equal(previewBase(editDtf(values, 'STSU177', ''), rows, saved, 'STSU177', 'dtf')?.baseCents, 3400, 'cleared: the base price');
  // a garment with a typed base and no DTF price
  assert.equal(previewBase(editBase(fresh().values, 'STTU169', '17'), ROWS, fresh().saved, 'STTU169', 'dtf')?.baseCents, 1700);
});
