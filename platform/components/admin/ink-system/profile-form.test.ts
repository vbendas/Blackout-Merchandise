import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { checkInkSystemProfile, formFromProfile, opacityInks, profileFromForm, type InkFormValues } from './profile-form';

const saved = DEFAULT_INK_SYSTEM;
const form = (): InkFormValues => formFromProfile(saved);

function failure(values: InkFormValues) {
  const result = profileFromForm(values, saved);
  assert.equal(result.ok, false, 'the form should not pass');
  return result.ok ? {} : result.errors;
}

test('the default profile goes to the form and back unchanged', () => {
  const result = profileFromForm(form(), saved);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.profile, saved);
});

test('opacity shows as a percentage', () => {
  assert.deepEqual(form().opacity, { 'HB Neutral': '55', 'HB Opaque': '85', 'Aquaflex V2 White': '92' });
});

test('the form holds every number as text, as typed', () => {
  const values = form();
  assert.equal(values.flashSeconds, '4');
  assert.equal(values.flashCelsius, '230');
  assert.equal(values.meshMin, '158');
  assert.equal(values.cureMin, '2');
  assert.equal(values.cureMax, '2.5');
  assert.equal(values.offContactMin, '3');
  assert.equal(values.offContactMax, '4');
  assert.equal(values.pressHeads, '8');
});

test('an edit comes through as numbers', () => {
  const values = { ...form(), meshMax: '320', flashSeconds: '4.5', pressHeads: '10', name: '  MagnaPrint HB  ', opacity: { ...form().opacity, 'HB Opaque': '90' } };
  const result = profileFromForm(values, saved);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.profile.mesh.max, 320);
    assert.equal(result.profile.underbase.flash.seconds, 4.5);
    assert.equal(result.profile.pressHeads, 10);
    assert.equal(result.profile.name, 'MagnaPrint HB');
    assert.equal(result.profile.opacity['HB Opaque'], 0.9);
  }
});

test('what the form does not show is kept', () => {
  const withExtras = { ...saved, measured: true, opacity: { ...saved.opacity, 'Retired Ink': 0.4 } };
  const result = profileFromForm(formFromProfile(withExtras), withExtras);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.profile.measured, true);
    assert.equal(result.profile.opacity['Retired Ink'], 0.4);
  }
});

test('a number box left empty says it needs a number', () => {
  const errors = failure({ ...form(), meshMin: '' });
  assert.match(errors.meshMin ?? '', /needs a number/);
});

test('mesh counts are whole numbers in range', () => {
  assert.match(failure({ ...form(), meshMin: '158.5' }).meshMin ?? '', /whole number/);
  assert.match(failure({ ...form(), meshMax: '900' }).meshMax ?? '', /20 to 500/);
});

test('the coarsest mesh can’t be below the finest', () => {
  assert.match(failure({ ...form(), meshMin: '300', meshMax: '200' }).meshMax ?? '', /below the finest/);
});

test('a reversed mesh range is one problem, not four', () => {
  const errors = failure({ ...form(), meshMin: '300', meshMax: '200' });
  assert.deepEqual(Object.keys(errors), ['meshMax']);
});

test('suggested meshes sit between the finest and the coarsest', () => {
  const errors = failure({ ...form(), meshHalftone: '400', meshSolid: '100' });
  assert.match(errors.meshHalftone ?? '', /between 158 and 305/);
  assert.match(errors.meshSolid ?? '', /between 158 and 305/);
  assert.equal(errors.meshUnderbase, undefined);
});

test('cure and off-contact ranges can’t be reversed', () => {
  assert.match(failure({ ...form(), cureMin: '3', cureMax: '2' }).cureMax ?? '', /shorter than the shortest/);
  assert.match(failure({ ...form(), offContactMin: '5', offContactMax: '3' }).offContactMax ?? '', /below the smaller/);
});

test('temperatures, times and heads stay in sane ranges', () => {
  assert.match(failure({ ...form(), flashCelsius: '50' }).flashCelsius ?? '', /100 to 400/);
  assert.match(failure({ ...form(), flashSeconds: '0' }).flashSeconds ?? '', /0.5 to 60/);
  assert.match(failure({ ...form(), cureCelsius: '500' }).cureCelsius ?? '', /100 to 250/);
  assert.match(failure({ ...form(), pressHeads: '16' }).pressHeads ?? '', /1 to 15/);
  assert.match(failure({ ...form(), pigmentMaxPct: '40' }).pigmentMaxPct ?? '', /0 to 20/);
});

test('names can’t be empty', () => {
  assert.match(failure({ ...form(), name: '  ' }).name ?? '', /needs a name/);
  assert.match(failure({ ...form(), baseDark: '' }).baseDark ?? '', /needs a name/);
  assert.match(failure({ ...form(), underbaseInk: ' ' }).underbaseInk ?? '', /needs a name/);
});

test('an opacity is a percentage between 0 and 100', () => {
  const errors = failure({ ...form(), opacity: { ...form().opacity, 'HB Opaque': '120' } });
  assert.equal(errors['opacity:HB Opaque'], 'Opacity goes from 0 to 100 %.');
  const blank = failure({ ...form(), opacity: { ...form().opacity, 'HB Opaque': '' } });
  assert.match(blank['opacity:HB Opaque'] ?? '', /needs a number/);
});

test('renaming an ink asks for its opacity', () => {
  const values = { ...form(), baseDark: 'HB Opaque 2' };
  assert.deepEqual(opacityInks(values), ['HB Neutral', 'HB Opaque 2', 'Aquaflex V2 White']);
  const errors = failure(values);
  assert.match(errors['opacity:HB Opaque 2'] ?? '', /needs a number/);

  const filled = profileFromForm({ ...values, opacity: { ...values.opacity, 'HB Opaque 2': '80' } }, saved);
  assert.equal(filled.ok, true);
  if (filled.ok) assert.equal(filled.profile.opacity['HB Opaque 2'], 0.8);
});

test('an ink named twice has one opacity', () => {
  const values = { ...form(), highlightInk: 'Aquaflex V2 White' };
  assert.deepEqual(opacityInks(values), ['HB Neutral', 'HB Opaque', 'Aquaflex V2 White']);
});

// ---------------------------------------------------------------------------
// What the server action receives
// ---------------------------------------------------------------------------

test('the server accepts the default profile', () => {
  const result = checkInkSystemProfile(structuredClone(saved));
  assert.equal(result.ok, true);
});

test('the server keeps only the fields it knows', () => {
  const result = checkInkSystemProfile({ ...structuredClone(saved), isAdmin: true, mesh: { ...saved.mesh, extra: 1 } });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal('isAdmin' in result.profile, false);
    assert.equal('extra' in result.profile.mesh, false);
  }
});

test('the server refuses what is not a profile', () => {
  assert.equal(checkInkSystemProfile(null).ok, false);
  assert.equal(checkInkSystemProfile('MagnaPrint').ok, false);
  assert.equal(checkInkSystemProfile({}).ok, false);
  assert.equal(checkInkSystemProfile({ ...saved, pressHeads: '8' }).ok, false);
  assert.equal(checkInkSystemProfile({ ...saved, pressHeads: Number.NaN }).ok, false);
  assert.equal(checkInkSystemProfile({ ...saved, measured: 'yes' }).ok, false);
});

test('the server refuses an opacity above 1 and a named ink without one', () => {
  const tooOpaque = checkInkSystemProfile({ ...structuredClone(saved), opacity: { ...saved.opacity, 'HB Opaque': 1.5 } });
  assert.equal(tooOpaque.ok, false);

  const missing = checkInkSystemProfile({ ...structuredClone(saved), bases: { ...saved.bases, dark: 'Unmeasured Base' } });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.match(missing.error, /Opacity is needed for Unmeasured Base/);
});

test('the server says what is wrong in words', () => {
  const result = checkInkSystemProfile({ ...structuredClone(saved), mesh: { ...saved.mesh, min: 400, max: 200 } });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /coarsest mesh/);
});
