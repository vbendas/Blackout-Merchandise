// The shop channel on PGlite: shop products print DTG or DTF, screen print is
// for runs, embroidery is left as it was, and a position the garment cannot
// take is refused. Catalogue and flags come from lib/services/test-catalogue.ts,
// which reads the same tables as the real seed.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { seedTestCatalogue, type TEST_CATALOGUE } from '@/lib/services/test-catalogue';

let t: TestDb;
let products: typeof import('@/lib/services/products');
let cat: typeof TEST_CATALOGUE;
let storeId: string;
let otherStoreId: string;

const placement = { position: 'front_chest', widthCm: 28 };

async function productCount(): Promise<number> {
  return (await t.db.select().from(schema.products)).length;
}

before(async () => {
  t = await setupTestDb();
  cat = await seedTestCatalogue(t.db);
  products = await import('@/lib/services/products');
  storeId = (await seedUser(t.db, { email: 'artist@merchfrom.test', withStore: true })).storeId!;
  otherStoreId = (await seedUser(t.db, { email: 'other@merchfrom.test', withStore: true })).storeId!;
});

after(async () => {
  await t.close();
});

function tee(printServiceCode: string, extra: Partial<Parameters<typeof products.createProduct>[0]> = {}) {
  return products.createProduct({ storeId, blankCode: cat.tee, printServiceCode, placement, colours: [cat.black], sizes: ['M'], ...extra });
}

test('a shop product prints DTG or DTF', async () => {
  const dtg = await tee('dtg');
  assert.ok(dtg.ok, dtg.ok ? '' : dtg.error);
  assert.equal(dtg.value.printServiceCode, 'dtg');
  assert.equal(dtg.value.baseCostCents, 650 + 600 + Math.round(0.3 * (650 + 600)), 'priced as before: garment, print and margin');

  const dtf = await tee('dtf');
  assert.ok(dtf.ok, dtf.ok ? '' : dtf.error);
  assert.equal(dtf.value.printServiceCode, 'dtf');
  assert.equal(dtf.value.printServiceName, 'Direct-to-film print');
});

test('screen print is refused for a shop product, and the error says what works', async () => {
  const before = await productCount();
  for (const code of ['screen_1c', 'screen_2c', 'screen_3c']) {
    const result = await tee(code);
    assert.equal(result.ok, false, code);
    if (result.ok) continue;
    assert.match(result.error, /Screen print \(\d colours?\) is for runs, not shop products\./, code);
    assert.match(result.error, /dtg \(Direct-to-garment print\)/);
    assert.match(result.error, /dtf \(Direct-to-film print\)/);
    assert.doesNotMatch(result.error, /screen_/, 'it does not offer the screen codes back');
  }
  assert.equal(await productCount(), before, 'nothing was created');
});

test('embroidery, outside the plan, is accepted as it was', async () => {
  const result = await products.createProduct({ storeId, blankCode: cat.hoodie, printServiceCode: 'embroidery', placement, colours: [cat.black], sizes: ['M'] });
  assert.ok(result.ok, result.ok ? '' : result.error);
  assert.equal(result.value.printServiceCode, 'embroidery');
});

test('a method the blank does not offer is refused, naming the shop methods it does', async () => {
  // shorts: screen print, DTF and embroidery, no DTG
  const result = await products.createProduct({ storeId, blankCode: cat.shorts, printServiceCode: 'dtg', placement: { position: 'front_leg', widthCm: 12 }, colours: [cat.black], sizes: ['M'] });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /isn't offered on the/);
    const choices = result.error.split('Use one of:')[1] ?? '';
    assert.match(choices, /dtf \(Direct-to-film print\)/);
    assert.match(choices, /embroidery \(Embroidery\)/);
    assert.doesNotMatch(choices, /screen_|dtg/, 'only shop methods, and not the one just refused');
  }
});

test('DTF is the shop method on blanks that never had DTG: jackets, bags, hats, trousers', async () => {
  const cases: [string, string, RegExp][] = [
    [cat.jacket, 'front_chest', /isn't offered on the/], // a jacket has no screen print either
    [cat.beanie, 'centre', /is for runs, not shop products/],
    [cat.shorts, 'front_leg', /is for runs, not shop products/],
  ];
  for (const [blankCode, position, screenRefusal] of cases) {
    const base = { storeId, blankCode, placement: { position, widthCm: 10 }, colours: [cat.black], sizes: ['M'] };
    const dtf = await products.createProduct({ ...base, printServiceCode: 'dtf' });
    assert.ok(dtf.ok, `${blankCode}: ${dtf.ok ? '' : dtf.error}`);
    assert.equal(dtf.value.printServiceCode, 'dtf', blankCode);
    assert.equal(dtf.value.baseCostCents, 650 + 600 + Math.round(0.3 * (650 + 600)), `${blankCode}: priced like DTG until the owner sets it`);

    const dtg = await products.createProduct({ ...base, printServiceCode: 'dtg' });
    assert.equal(dtg.ok, false, `${blankCode} has no dtg`);
    if (!dtg.ok) assert.match(dtg.error, /dtf \(Direct-to-film print\)/, 'and the error points to dtf');

    const screen = await products.createProduct({ ...base, printServiceCode: 'screen_1c' });
    assert.equal(screen.ok, false, `${blankCode}: no screen print in the shop`);
    if (!screen.ok) assert.match(screen.error, screenRefusal);
  }
});

test("a sleeve is refused, and so is a position the garment does not take", async () => {
  const sleeve = await tee('dtg', { placement: { position: 'sleeve', widthCm: 8 } });
  assert.equal(sleeve.ok, false);
  if (!sleeve.ok) assert.match(sleeve.error, /"sleeve" is not a print position for T-shirts\. Say which sleeve: sleeve_left or sleeve_right\. T-shirts take: front_chest, front_full, front_left_chest, back, sleeve_left, sleeve_right\./);

  // trousers are not chest prints: it used to be moved to the leg without a word
  const chestOnShorts = await products.createProduct({ storeId, blankCode: cat.shorts, printServiceCode: 'dtf', placement, colours: [cat.black], sizes: ['M'] });
  assert.equal(chestOnShorts.ok, false);
  if (!chestOnShorts.ok) assert.match(chestOnShorts.error, /"front_chest" is not a print position for Bottoms\. Bottoms take: front_leg, back\./);

  const legOnShorts = await products.createProduct({ storeId, blankCode: cat.shorts, printServiceCode: 'dtf', placement: { position: 'front_leg', widthCm: 12 }, colours: [cat.black], sizes: ['M'] });
  assert.ok(legOnShorts.ok, legOnShorts.ok ? '' : legOnShorts.error);
});

test('moving a product to another position is checked the same way', async () => {
  const made = await tee('dtg');
  assert.ok(made.ok);
  const sleeve = await products.updateProduct(storeId, made.value.id, { placement: { position: 'sleeve', widthCm: 8 } });
  assert.equal(sleeve.ok, false);
  if (!sleeve.ok) assert.match(sleeve.error, /"sleeve" is not a print position for T-shirts/);

  const back = await products.updateProduct(storeId, made.value.id, { placement: { position: 'back', widthCm: 30 } });
  assert.ok(back.ok, back.ok ? '' : back.error);
  assert.deepEqual(back.value.placement, { position: 'back', widthCm: 30 });
});

test("a shop cannot put another shop's design on a product", async () => {
  const [theirs] = await t.db.insert(schema.designs).values({ storeId: otherStoreId, source: 'upload', originalUrl: 'https://art.test/theirs.png' }).returning();
  const result = await tee('dtg', { designId: theirs.id });
  assert.deepEqual(result, { ok: false, error: 'Design not found for this shop.' });
});

test("a run's backing product may carry screen print but never reaches the shop with it", async () => {
  const backing = await tee('screen_2c', { forRun: true, name: 'Bulk run — T-shirt (Black)' });
  assert.ok(backing.ok, backing.ok ? '' : backing.error);
  assert.equal(backing.value.printServiceCode, 'screen_2c');
  assert.equal(backing.value.status, 'draft');

  const toShop = await products.transition(backing.value.id, 'live');
  assert.equal(toShop.ok, false);
  if (!toShop.ok) assert.match(toShop.error, /Screen print \(2 colours\) is for runs, so this product can't go to your shop\. Shop products print DTG or DTF\./);
  assert.match((await products.shopMethodError(backing.value.id)) ?? '', /is for runs/);
  const [row] = await t.db.select().from(schema.products).where(eq(schema.products.id, backing.value.id));
  assert.equal(row.status, 'draft', 'it stayed a draft');

  // while a DTG product moves on as before
  const dtg = await tee('dtg');
  assert.ok(dtg.ok);
  assert.equal(await products.shopMethodError(dtg.value.id), null);
  // (transition is the state machine only: the artwork, the price and the payouts are asked by publishProduct.)
  const moved = await products.transition(dtg.value.id, 'live');
  assert.deepEqual(moved, { ok: true, value: 'live' });
});

test('the screen flags are what the seed sets: screen out of the shop, DTG and DTF in', async () => {
  const rows = await t.db.select().from(schema.printServices);
  const flags = Object.fromEntries(rows.map((r) => [r.code, r.availableInShop]));
  assert.deepEqual(flags, { screen_1c: false, screen_2c: false, screen_3c: false, dtg: true, dtf: true, embroidery: true });
});
