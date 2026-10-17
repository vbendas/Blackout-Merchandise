// The catalogue's words for how a garment prints: an artist reads "digital print", and DTF only where it matters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printTechniquesFor } from '@/lib/catalog/product-details';
import { printPhrase } from './catalogue-state';

test('a garment with DTG reads as a digital print: DTG and DTF are not two choices to an artist', () => {
  assert.equal(printPhrase(printTechniquesFor('STTU169')), 'Screen print, digital print');
  assert.equal(printPhrase(printTechniquesFor('STSU177')), 'Screen print, digital print, embroidery');
  assert.equal(printPhrase(['DTG', 'DTF']), 'Digital print');
});

test('a garment with no DTG says DTF, which is where it matters', () => {
  assert.equal(printPhrase(printTechniquesFor('STJM158')), 'Embroidery, heat transfer, digital print (DTF)');
  assert.equal(printPhrase(printTechniquesFor('STAU116')), 'Screen print, embroidery, digital print (DTF)');
  assert.equal(printPhrase(['DTF']), 'Digital print (DTF)');
});

test('the other methods read as they did, and no technique reads as nothing', () => {
  assert.equal(printPhrase(['Screen print', 'Embroidery']), 'Screen print, embroidery');
  assert.equal(printPhrase([]), '');
});
