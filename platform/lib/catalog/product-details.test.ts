import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '@/lib/catalog/products';
import { PRINT_SERVICES_FOR_TECHNIQUE, SHOP_PRINT_SERVICE_FLAGS, printServiceCodesFor, printTechniquesFor } from '@/lib/catalog/product-details';

// One style code per garment family (the letter after ST).
const FAMILIES = { T: 'STTU169', S: 'STSU177', J: 'STJM158', P: 'STPU325', A: 'STAU116', B: 'STBU070', W: 'STWU000', K: 'STTK000' };

test('DTF is offered on every garment family, DTG only where it already was', () => {
  const hadDtg = new Set(['T', 'S', 'P', 'K']);
  for (const [family, code] of Object.entries(FAMILIES)) {
    const techniques = printTechniquesFor(code);
    assert.ok(techniques.includes('DTF'), `family ${family}: ${techniques.join(', ')}`);
    assert.equal(techniques.includes('DTG'), hadDtg.has(family), `family ${family}: DTG is unchanged`);
  }
  // unknown families fall back to the same trio
  assert.deepEqual(printTechniquesFor('STZZ000'), ['Screen print', 'DTG', 'DTF']);
});

test('the families that gained DTF keep everything they had', () => {
  assert.deepEqual(printTechniquesFor(FAMILIES.J), ['Embroidery', 'Heat transfer', 'DTF']);
  assert.deepEqual(printTechniquesFor(FAMILIES.A), ['Screen print', 'Embroidery', 'DTF']);
  assert.deepEqual(printTechniquesFor(FAMILIES.B), ['Screen print', 'Embroidery', 'DTF']);
  assert.deepEqual(printTechniquesFor(FAMILIES.W), ['Embroidery', 'DTF']);
});

test('a tee is offered DTG and DTF; a jacket, a bag, trousers and a woven shirt DTF without DTG', () => {
  const tee = printServiceCodesFor('STTU169');
  assert.ok(tee.includes('dtg') && tee.includes('dtf'));
  assert.deepEqual(tee.filter((c) => c.startsWith('screen_')), ['screen_1c', 'screen_2c', 'screen_3c']);

  for (const code of [FAMILIES.J, FAMILIES.A, FAMILIES.B, FAMILIES.W]) {
    const services = printServiceCodesFor(code);
    assert.ok(services.includes('dtf'), `${code} is offered dtf`);
    assert.ok(!services.includes('dtg'), `${code} still has no dtg`);
    assert.ok(services.includes('embroidery'), `${code} keeps embroidery`);
  }
  assert.ok(printServiceCodesFor(FAMILIES.A).includes('screen_1c'), 'a bag keeps its screen print');
  assert.ok(!printServiceCodesFor(FAMILIES.J).includes('screen_1c'), 'and a jacket still has none');
});

test('every blank in the catalogue is offered the dtf print service', () => {
  assert.ok(PRODUCTS.length > 100);
  for (const p of PRODUCTS) assert.ok(printServiceCodesFor(p.code).includes('dtf'), p.code);
});

test('every technique the catalogue names maps to print services, except heat transfer', () => {
  for (const code of Object.values(FAMILIES)) {
    for (const technique of printTechniquesFor(code)) {
      if (technique === 'Heat transfer') continue;
      assert.ok(PRINT_SERVICES_FOR_TECHNIQUE[technique]?.length, `${technique} maps to a print service`);
    }
  }
});

test('shop products print DTG/DTF only: screen is flagged out, dtg and dtf in, embroidery left alone', () => {
  for (const code of ['screen_1c', 'screen_2c', 'screen_3c']) assert.equal(SHOP_PRINT_SERVICE_FLAGS[code], false, code);
  assert.equal(SHOP_PRINT_SERVICE_FLAGS.dtg, true);
  assert.equal(SHOP_PRINT_SERVICE_FLAGS.dtf, true);
  assert.ok(!('embroidery' in SHOP_PRINT_SERVICE_FLAGS), 'embroidery is outside the plan: the seed leaves its flag as it is');
  // every service a blank can be offered has a decision, bar embroidery
  for (const code of Object.values(FAMILIES)) {
    for (const service of printServiceCodesFor(code)) {
      assert.ok(service === 'embroidery' || service in SHOP_PRINT_SERVICE_FLAGS, `${service} is decided`);
    }
  }
});
