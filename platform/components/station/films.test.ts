// A job's screens matched to the films of its job sheet: by the pack and the press position the service lists, else by
// the set's name and film count, else not at all (the screen still shows).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleJobSheetView } from '@/lib/print/job-sheet-sample';
import type { JobSheetView } from '@/lib/print/job-sheet-view';
import type { ScreenProgress } from '@/lib/services/production-progress';
import { matchFilms } from './films';

const view = (): JobSheetView => sampleJobSheetView(new Date('2026-10-16T09:00:00Z'));

const screensOf = (packId: string, setName: string, count: number, from = 1): ScreenProgress[] =>
  Array.from({ length: count }, (_, i) => ({ key: `${packId}:${from + i}`, setName, position: `${from + i}/${count}`, inkName: `Ink ${from + i}`, status: 'waiting' as const, packId, filmNumber: from + i }));

test('screens are matched to the films of the set they are in: by the pack and the press position', () => {
  const sheet = view();
  const groups = matchFilms(sheet, [...screensOf('mock-pack-darks', 'Darks', 6), ...screensOf('mock-pack-lights', 'Lights', 4)]);
  assert.deepEqual(groups.map((g) => [g.key, g.setName, g.set?.setName, g.rows.length]), [['mock-pack-darks', 'Darks', 'Darks', 6], ['mock-pack-lights', 'Lights', 'Lights', 4]]);
  const orchid = groups[0].rows[1];
  assert.deepEqual([orchid.screen.filmNumber, orchid.film?.label, orchid.film?.pantone, orchid.film?.base, orchid.film?.meshText, orchid.film?.ruling], [2, 'PANTONE 237 C', 'PANTONE 237 C', 'HB Opaque', '230 (91T)', '55 lpi 22.5°']);
  assert.equal(groups[0].rows[0].film?.label, 'Underbase');
  assert.equal(groups[1].rows[0].film?.label, 'PANTONE 237 C', 'the lights set has its own first film');
});

test('the groups come in the order the screens first appear, and a group’s screens in press order', () => {
  const groups = matchFilms(view(), [...screensOf('mock-pack-lights', 'Lights', 4).reverse(), ...screensOf('mock-pack-darks', 'Darks', 6)]);
  assert.deepEqual(groups.map((g) => g.setName), ['Lights', 'Darks']);
  assert.deepEqual(groups[0].rows.map((r) => r.screen.filmNumber), [1, 2, 3, 4]);
});

test('two packs of one set name are told apart by their pack', () => {
  const sheet = view();
  // The sheet's second set is a Darks set too (another garment), in another pack.
  sheet.screenSets = [{ ...sheet.screenSets[0], packId: 'pack-tee', blankName: 'Classic tee' }, { ...sheet.screenSets[0], packId: 'pack-hoodie', blankName: 'Heavy hoodie', films: sheet.screenSets[0].films.slice(0, 3), screens: 3 }];
  const groups = matchFilms(sheet, [...screensOf('pack-hoodie', 'Darks', 3), ...screensOf('pack-tee', 'Darks', 6)]);
  assert.deepEqual(groups.map((g) => [g.key, g.set?.blankName, g.rows.map((r) => r.film?.index)]), [
    ['pack-hoodie', 'Heavy hoodie', [1, 2, 3]],
    ['pack-tee', 'Classic tee', [1, 2, 3, 4, 5, 6]],
  ]);
});

test('a pack the sheet no longer shows is matched by the set’s name and film count, each set taken once', () => {
  const sheet = view();
  const groups = matchFilms(sheet, [...screensOf('old-pack-a', 'Darks', 6), ...screensOf('old-pack-b', 'Darks', 6)]);
  assert.equal(groups[0].set?.setName, 'Darks');
  assert.equal(groups[0].rows[2].film?.label, 'PANTONE 2582 C');
  assert.equal(groups[1].set, null, 'the sheet has one Darks set, taken by the first pack');
  assert.deepEqual(groups[1].rows.map((r) => r.film), [null, null, null, null, null, null]);
  // A film count that does not fit the set is not matched to it either.
  assert.equal(matchFilms(sheet, screensOf('old-pack-c', 'Darks', 3))[0].set, null);
});

test('with no job sheet the screens still show, with what the service says of them', () => {
  const groups = matchFilms(null, screensOf('pack-1', 'Darks', 2));
  assert.deepEqual(groups.map((g) => [g.setName, g.set, g.rows.map((r) => [r.screen.inkName, r.film])]), [['Darks', null, [['Ink 1', null], ['Ink 2', null]]]]);
  assert.deepEqual(matchFilms(view(), []), []);
});

test('a screen whose press position the set does not have has no film', () => {
  const groups = matchFilms(view(), screensOf('mock-pack-darks', 'Darks', 1, 9));
  assert.equal(groups[0].set?.setName, 'Darks');
  assert.equal(groups[0].rows[0].film, null);
});
