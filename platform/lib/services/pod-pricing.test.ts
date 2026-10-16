// Shop-product pricing on PGlite (Print-Prep-Plan sections 1 and 10, owner decision of 16 Oct 2026): each
// garment has a base price (one print area up to A2, front or back), +1 euro when the print becomes front
// and back, +2 euros once for sleeve prints. podPrice() reads the table the owner saves at /admin/pricing;
// until a garment is saved it stands on today's one-print DTG base cost and says so. Runs keep their own
// pricing. The catalogue comes from lib/services/test-catalogue.ts: a T-shirt there costs 6.50 + 6.00 +
// 3.75 = 16.25 for one DTG print.
import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { seedTestCatalogue, type TEST_CATALOGUE } from '@/lib/services/test-catalogue';
import type { Actor } from '@/lib/auth/permissions';
import type { PodPlacementInput } from '@/lib/pricing/pod-table';
import { applyTypePrice, formFromSaved, patchFromForm, savedFromRows } from '@/components/admin/pricing/shop-price-form';

let t: TestDb;
let pricing: typeof import('@/lib/services/pricing-admin');
let pod: typeof import('@/lib/pricing/pod');
let quotes: typeof import('@/lib/services/quotes');
let cat: typeof TEST_CATALOGUE;
let ownerId: string;
let owner: Actor;

const TEE_PLACEHOLDER = 650 + 600 + 375;

const front = { position: 'front_chest', widthCm: 28 };
const back = { position: 'back', widthCm: 28 };
const sleeveLeft = { position: 'sleeve_left', widthCm: 8 };
const sleeveRight = { position: 'sleeve_right', widthCm: 8 };

before(async () => {
  t = await setupTestDb();
  cat = await seedTestCatalogue(t.db);
  // more garments, so a type has several: a second and third T-shirt (the third a little dearer), one that is switched off, and one with no cost at all
  await t.db.insert(schema.blanks).values([
    { code: 'STTU170', name: 'T-shirt', type: 'T-shirts' },
    { code: 'STTU171', name: 'T-shirt', type: 'T-shirts' },
    { code: 'STTU999', name: 'T-shirt', type: 'T-shirts', isActive: false },
    { code: 'STNP000', name: 'Unpriced tee', type: 'T-shirts' },
  ]);
  await t.db.insert(schema.baseCosts).values([
    { blankCode: 'STTU170', printServiceCode: 'dtg', qtyFrom: 1, garmentCostCents: 650, printCostCents: 600, marginCents: 375 },
    { blankCode: 'STTU171', printServiceCode: 'dtg', qtyFrom: 1, garmentCostCents: 700, printCostCents: 600, marginCents: 390 },
  ]);
  pricing = await import('@/lib/services/pricing-admin');
  pod = await import('@/lib/pricing/pod');
  quotes = await import('@/lib/services/quotes');
  ownerId = (await seedUser(t.db, { email: 'owner@merchfrom.test', role: 'admin' })).userId;
  owner = { userId: ownerId, role: 'admin' };
});

after(async () => {
  await t.close();
});

beforeEach(async () => {
  await t.db.delete(schema.appSettings);
  await t.db.delete(schema.staffActivity);
});

async function setPrices(input: unknown) {
  const saved = await pricing.setPodPrices(owner, input);
  assert.ok(saved.ok, saved.ok ? '' : saved.error);
  return saved.value;
}

async function totalOf(blankCode: string, placements: PodPlacementInput[], service?: string) {
  const price = await pod.podPrice(blankCode, placements, service);
  assert.ok(price, `${blankCode} has a price`);
  return price;
}

const keys = (price: { lines: { key: string }[] }) => price.lines.map((l) => l.key);

// ---------------------------------------------------------------------------
// The contract

test('pod.ts keeps the contract: the same names, now backed by the table', () => {
  assert.equal(typeof pod.podPrice, 'function');
  assert.equal(pod.placementKind('back'), 'back');
  assert.equal(pod.placementKind('sleeve_left'), 'sleeve');
  assert.equal(pod.placementKind('front_leg'), 'front');
  assert.equal(pod.placementKind('centre'), 'front');
  assert.deepEqual(pod.DEFAULT_POD_EXTRAS, { secondMainPrintCents: 100, sleevesCents: 200 });
});

// ---------------------------------------------------------------------------
// Before the owner has saved anything

test('before anything is saved a garment stands on its one-print DTG cost, marked as a placeholder, and the extras still apply', async () => {
  const one = await totalOf(cat.tee, [front]);
  assert.deepEqual(keys(one), ['base']);
  assert.equal(one.totalCents, TEE_PLACEHOLDER);
  assert.equal(one.totalCents, 1625);
  assert.equal(one.placeholder, true);
  assert.equal(one.blankCode, cat.tee);

  assert.equal((await totalOf(cat.tee, [front, back])).totalCents, 1625 + 100);
  assert.equal((await totalOf(cat.tee, [front, sleeveLeft])).totalCents, 1625 + 200);
  assert.equal((await totalOf(cat.tee, [front, back, sleeveLeft, sleeveRight])).totalCents, 1625 + 300);
  for (const placements of [[front], [back], [front, back], [front, sleeveLeft]]) {
    assert.equal((await totalOf(cat.tee, placements)).placeholder, true);
  }
});

test('the placeholder is the same number products carry today: garment, print and margin of the DTG row', async () => {
  const [row] = await t.db.select().from(schema.baseCosts).where(and(eq(schema.baseCosts.blankCode, cat.tee), eq(schema.baseCosts.printServiceCode, 'dtg'), eq(schema.baseCosts.qtyFrom, 1)));
  assert.equal((await totalOf(cat.tee, [front])).totalCents, row.totalCents);
  const quote = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 1 });
  assert.equal((await totalOf(cat.tee, [front])).totalCents, quote?.unitBaseCostCents);
});

test('an unknown blank has no price', async () => {
  assert.equal(await pod.podPrice('NOPE000', [front]), null);
  assert.equal(await pod.podPrice('', [front]), null);
  assert.equal(await pod.podPrice('constructor', [front]), null);
  // not even when the table has an entry under that name
  await t.db.insert(schema.appSettings).values({ key: 'pod_price_table', value: 'json', valueJson: { version: 1, table: { extras: { secondMainPrintCents: 100, sleevesCents: 200 }, garments: { NOPE000: { cents: 1700 } } } } });
  assert.equal(await pod.podPrice('NOPE000', [front]), null);
});

test('a blank in the catalogue with no cost at all has no price until the owner sets one', async () => {
  assert.equal(await pod.podPrice('STNP000', [front]), null);
  await setPrices({ garments: { STNP000: { cents: 1500 } } });
  const price = await totalOf('STNP000', [front, back]);
  assert.equal(price.totalCents, 1600);
  assert.equal(price.placeholder, false, 'the owner set it');
});

// ---------------------------------------------------------------------------
// The owner's price: the breakdown cases

test('T-shirt at 17 euros: front only, back only, front and back, sleeves, and the lot', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 } } });

  const frontOnly = await totalOf(cat.tee, [front]);
  assert.deepEqual(frontOnly.lines, [{ key: 'base', label: 'Garment with one print', cents: 1700 }]);
  assert.equal(frontOnly.totalCents, 1700);
  assert.equal(frontOnly.placeholder, false);

  assert.equal((await totalOf(cat.tee, [back])).totalCents, 1700, 'back only');

  const frontAndBack = await totalOf(cat.tee, [front, back]);
  assert.deepEqual(frontAndBack.lines, [
    { key: 'base', label: 'Garment with one print', cents: 1700 },
    { key: 'second_main_print', label: 'Front and back', cents: 100 },
  ]);
  assert.equal(frontAndBack.totalCents, 1800, 'front and back: +€1');

  const oneSleeve = await totalOf(cat.tee, [front, sleeveLeft]);
  assert.deepEqual(keys(oneSleeve), ['base', 'sleeves']);
  assert.equal(oneSleeve.totalCents, 1900, 'sleeves: +€2');
  const bothSleeves = await totalOf(cat.tee, [front, sleeveLeft, sleeveRight]);
  assert.deepEqual(keys(bothSleeves), ['base', 'sleeves'], 'one sleeve line');
  assert.equal(bothSleeves.totalCents, 1900, 'charged once for one sleeve or both');

  const all = await totalOf(cat.tee, [front, back, sleeveLeft, sleeveRight]);
  assert.deepEqual(keys(all), ['base', 'second_main_print', 'sleeves']);
  assert.equal(all.totalCents, 2000, 'front, back and sleeves: +€3');
  assert.equal(all.lines.reduce((sum, l) => sum + l.cents, 0), all.totalCents);
});

test('a placement carries a width and a height, and neither changes the price', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 } } });
  assert.equal((await totalOf(cat.tee, [{ position: 'front_full', widthCm: 59, heightCm: 42 }])).totalCents, 1700);
  assert.equal((await totalOf(cat.tee, [{ position: 'front_left_chest', widthCm: 4 }])).totalCents, 1700);
});

test('the extras follow what the owner sets, for every garment', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 }, [cat.hoodie]: { cents: 3400 } } });
  await setPrices({ extras: { secondMainPrintCents: 150, sleevesCents: 350 } });
  assert.equal((await totalOf(cat.tee, [front, back])).totalCents, 1850);
  assert.equal((await totalOf(cat.hoodie, [front, back, sleeveLeft])).totalCents, 3400 + 150 + 350);
  // and the placeholder garments too
  assert.equal((await totalOf(cat.jacket, [front, sleeveLeft], 'dtf')).totalCents, TEE_PLACEHOLDER + 350);
  const state = await pricing.getPodPriceTableState();
  assert.deepEqual(state.table.extras, { secondMainPrintCents: 150, sleevesCents: 350 });
  assert.deepEqual(state.table.garments[cat.tee], { cents: 1700 }, 'saving the extras did not touch a price');
});

// ---------------------------------------------------------------------------
// Placeholders

test('a garment is a placeholder until the owner sets it, and only the garments set are real', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 } } });
  assert.equal((await totalOf(cat.tee, [front])).placeholder, false);
  assert.equal((await totalOf(cat.hoodie, [front])).placeholder, true, 'the hoodie was never set');
  assert.equal((await totalOf(cat.hoodie, [front])).totalCents, 1625);
  assert.equal((await totalOf('STTU170', [front])).placeholder, true);
  // setting it back to the placeholder
  await setPrices({ garments: { [cat.tee]: null } });
  const again = await totalOf(cat.tee, [front]);
  assert.equal(again.placeholder, true);
  assert.equal(again.totalCents, TEE_PLACEHOLDER);
});

test('a placeholder follows the blank\'s own base cost: the dearer garment starts dearer', async () => {
  assert.equal((await totalOf('STTU171', [front])).totalCents, 700 + 600 + 390);
  assert.equal((await totalOf('STTU170', [front])).totalCents, 1625);
});

test('a garment that can not take DTG stands on its DTF cost, and is a placeholder all the same', async () => {
  const offered = await t.db.select().from(schema.blankPrintServices).where(eq(schema.blankPrintServices.blankCode, cat.jacket));
  assert.ok(!offered.some((o) => o.printServiceCode === 'dtg'), 'the jacket has no DTG');
  const price = await totalOf(cat.jacket, [front], 'dtf');
  assert.equal(price.totalCents, 650 + 600 + 375);
  assert.equal(price.placeholder, true);
  assert.equal((await totalOf(cat.beanie, [{ position: 'centre', widthCm: 20 }], 'dtf')).totalCents, 1625);
});

// ---------------------------------------------------------------------------
// DTF

test('DTF uses the DTG base price unless the owner sets a DTF price for the garment', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 }, [cat.hoodie]: { cents: 3400, dtfCents: 3700 } } });
  assert.equal((await totalOf(cat.tee, [front], 'dtf')).totalCents, 1700, 'no override: the same');
  assert.equal((await totalOf(cat.tee, [front], 'dtg')).totalCents, 1700);
  assert.equal((await totalOf(cat.hoodie, [front], 'dtf')).totalCents, 3700, 'the override');
  assert.equal((await totalOf(cat.hoodie, [front], 'dtg')).totalCents, 3400, 'DTG is untouched by it');
  assert.equal((await totalOf(cat.hoodie, [front])).totalCents, 3400, 'DTG is the default method');
  // the extras sit on top of either
  assert.equal((await totalOf(cat.hoodie, [front, back, sleeveLeft], 'dtf')).totalCents, 3700 + 100 + 200);
  assert.equal((await totalOf(cat.hoodie, [front, back, sleeveLeft], 'dtf')).placeholder, false);
});

test('a DTF price can be taken away: the garment saved again without one uses its base price for DTF', async () => {
  await setPrices({ garments: { [cat.hoodie]: { cents: 3400, dtfCents: 3700 } } });
  assert.equal((await totalOf(cat.hoodie, [front], 'dtf')).totalCents, 3700);
  await setPrices({ garments: { [cat.hoodie]: { cents: 3400 } } });
  assert.equal((await totalOf(cat.hoodie, [front], 'dtf')).totalCents, 3400);
  assert.deepEqual((await pricing.getPodPriceTableState()).table.garments[cat.hoodie], { cents: 3400 });
});

// ---------------------------------------------------------------------------
// Methods outside the table

test('embroidery is outside the shop table: the blank\'s own cost for it, a placeholder, and no extras', async () => {
  await setPrices({ garments: { [cat.hoodie]: { cents: 3400 } } });
  const price = await totalOf(cat.hoodie, [front, back, sleeveLeft], 'embroidery');
  assert.deepEqual(keys(price), ['base']);
  assert.equal(price.totalCents, 650 + 850 + Math.round(0.3 * (650 + 850)), 'garment, embroidery and margin, as before');
  assert.equal(price.placeholder, true);
  // a method nothing prices has no price
  assert.equal(await pod.podPrice(cat.hoodie, [front], 'screen_2c'), null);
  assert.equal(await pod.podPrice(cat.hoodie, [front], 'laser'), null);
});

// ---------------------------------------------------------------------------
// Bulk set by type

test('set the price for all of a type: every garment of it, and no other garment', async () => {
  const rows = await pricing.listPodGarments(owner);
  const saved = savedFromRows(rows, { secondMainPrintCents: 100, sleevesCents: 200 });
  const applied = applyTypePrice(formFromSaved(rows, saved), rows, 'T-shirts', '17');
  assert.ok(applied.ok);
  const teeCodes = rows.filter((r) => r.type === 'T-shirts').map((r) => r.code);
  assert.ok(teeCodes.length >= 4, 'several T-shirts');
  assert.equal(applied.count, teeCodes.length);

  const change = patchFromForm(applied.values, rows, saved);
  assert.ok(change.ok);
  assert.deepEqual(Object.keys(change.patch.garments ?? {}).sort(), [...teeCodes].sort());
  await setPrices(change.patch);

  for (const code of teeCodes) {
    const price = await totalOf(code, [front]);
    assert.equal(price.totalCents, 1700, code);
    assert.equal(price.placeholder, false, code);
  }
  // the hoodie, the shorts, the jacket and the beanie are still on their placeholders
  for (const code of [cat.hoodie, cat.shorts, cat.jacket, cat.beanie]) {
    const price = await pod.podPrice(code, [{ position: code === cat.beanie ? 'centre' : 'front_chest', widthCm: 20 }], code === cat.hoodie ? 'dtg' : 'dtf');
    assert.equal(price?.placeholder, true, code);
    assert.equal(price?.totalCents, 1625, code);
  }
  // then individual edits: one T-shirt a euro more, with a DTF price
  const after = await pricing.listPodGarments(owner);
  const savedAfter = savedFromRows(after, { secondMainPrintCents: 100, sleevesCents: 200 });
  const boxes = formFromSaved(after, savedAfter);
  boxes.rows[cat.tee] = { base: '18.00', dtf: '19.50', set: true };
  const single = patchFromForm(boxes, after, savedAfter);
  assert.ok(single.ok);
  assert.deepEqual(single.patch, { garments: { [cat.tee]: { cents: 1800, dtfCents: 1950 } } }, 'only the garment that changed is sent');
  await setPrices(single.patch);
  assert.equal((await totalOf(cat.tee, [front])).totalCents, 1800);
  assert.equal((await totalOf(cat.tee, [front], 'dtf')).totalCents, 1950);
  assert.equal((await totalOf('STTU170', [front])).totalCents, 1700, 'the rest of the type kept the bulk price');
});

test('what is saved merges into what is there: a garment a change does not name keeps its price', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 } } });
  // somebody else saved the hoodie from a page that never saw the T-shirt
  await setPrices({ garments: { [cat.hoodie]: { cents: 3400 } } });
  const state = await pricing.getPodPriceTableState();
  assert.deepEqual(state.table.garments, { [cat.tee]: { cents: 1700 }, [cat.hoodie]: { cents: 3400 } });
  assert.ok(state.updatedAt);
});

// ---------------------------------------------------------------------------
// The admin list

test('the admin list: active garments by type, with the saved price and the placeholder each stands on', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700, dtfCents: 1800 } } });
  const rows = await pricing.listPodGarments(owner);

  assert.ok(!rows.some((r) => r.code === 'STTU999'), 'a garment that is switched off is not listed');
  assert.deepEqual([...new Set(rows.map((r) => r.type))], ['T-shirts', 'Sweats & Hoodies', 'Jackets', 'Bags & Accessories', 'Bottoms'], 'in the order the Studio lists the types');

  const tee = rows.find((r) => r.code === cat.tee);
  assert.deepEqual(tee, { code: cat.tee, name: 'Classic tee', supplierName: null, type: 'T-shirts', baseCents: 1700, dtfCents: 1800, placeholderCents: TEE_PLACEHOLDER });
  const hoodie = rows.find((r) => r.code === cat.hoodie);
  assert.equal(hoodie?.baseCents, null, 'not set');
  assert.equal(hoodie?.placeholderCents, 1625);
  assert.equal(hoodie?.name, 'Heavy hoodie', 'the name artists read');
  const jacket = rows.find((r) => r.code === cat.jacket);
  assert.equal(jacket?.placeholderCents, 1625, 'a garment with no DTG stands on its DTF cost');
  assert.equal(rows.find((r) => r.code === 'STNP000')?.placeholderCents, null, 'a garment with no cost has nothing to stand on');
});

// ---------------------------------------------------------------------------
// The permission gates

const refused = (message = "You don't have Manage access to Catalogue and pricing.") => ({ ok: false, error: message });

test('saving needs Catalogue and pricing Manage: everyone else is refused and nothing is written', async () => {
  const patch = { garments: { [cat.tee]: { cents: 1700 } } };
  const stored = async () => (await t.db.select().from(schema.appSettings).where(eq(schema.appSettings.key, 'pod_price_table'))).length;
  const actors: [string, Actor][] = [
    ['an artist', { userId: ownerId, role: 'artist' }],
    ['staff with no access', { userId: ownerId, role: 'staff', permissions: {} }],
    ['Catalogue and pricing View', { userId: ownerId, role: 'staff', permissions: { catalogue: 'view' } }],
    ['Catalogue and pricing Work', { userId: ownerId, role: 'staff', permissions: { catalogue: 'work' } }],
    ['Manage on every other area', { userId: ownerId, role: 'staff', permissions: { prepress: 'manage', production: 'manage', runs: 'manage', shop_orders: 'manage', money: 'manage' } }],
    ['Manage, but paused', { userId: ownerId, role: 'staff', permissions: { catalogue: 'manage' }, suspended: true }],
  ];
  for (const [who, actor] of actors) {
    assert.deepEqual(await pricing.setPodPrices(actor, patch), refused(), who);
  }
  assert.equal(await stored(), 0, 'nothing was written');

  const staff: Actor = { userId: ownerId, role: 'staff', permissions: { catalogue: 'manage' } };
  assert.equal((await pricing.setPodPrices(staff, patch)).ok, true, 'Manage');
  assert.equal(await stored(), 1);
  assert.equal((await pricing.setPodPrices(owner, { extras: { sleevesCents: 250 } })).ok, true, 'the owner');
});

test('the refusal comes before the input is looked at', async () => {
  const view: Actor = { userId: ownerId, role: 'staff', permissions: { catalogue: 'view' } };
  assert.deepEqual(await pricing.setPodPrices(view, 'not a patch'), refused());
  assert.deepEqual(await pricing.setPodPrices(view, undefined), refused());
  assert.deepEqual(await pricing.setPodPrices(view, { garments: { STTU169: { cents: -5 } } }), refused());
});

test('reading the garment list needs Catalogue and pricing View', async () => {
  const deny = { name: 'PermissionError', message: "You don't have View access to Catalogue and pricing." };
  await assert.rejects(pricing.listPodGarments({ userId: ownerId, role: 'artist' }), deny);
  await assert.rejects(pricing.listPodGarments({ userId: ownerId, role: 'staff', permissions: { support: 'manage' } }), deny);
  await assert.rejects(pricing.listPodGarments({ userId: ownerId, role: 'staff', permissions: { catalogue: 'view' }, suspended: true }), deny);
  assert.ok((await pricing.listPodGarments({ userId: ownerId, role: 'staff', permissions: { catalogue: 'view' } })).length > 0);
  assert.ok((await pricing.listPodGarments({ userId: ownerId, role: 'staff', permissions: { catalogue: 'manage' } })).length > 0);
  assert.ok((await pricing.listPodGarments(owner)).length > 0);
});

// ---------------------------------------------------------------------------
// Validation, on the server too: a browser can send anything

test('negative, fractional, zero and oversized prices are refused by name, and nothing is saved', async () => {
  const stored = async () => (await t.db.select().from(schema.appSettings).where(eq(schema.appSettings.key, 'pod_price_table'))).length;
  const cases: [unknown, string][] = [
    [{ garments: { [cat.tee]: { cents: -100 } } }, `garments.${cat.tee}.base`],
    [{ garments: { [cat.tee]: { cents: 1700.5 } } }, `garments.${cat.tee}.base`],
    [{ garments: { [cat.tee]: { cents: 0 } } }, `garments.${cat.tee}.base`],
    [{ garments: { [cat.tee]: { cents: 100_001 } } }, `garments.${cat.tee}.base`],
    [{ garments: { [cat.tee]: { cents: '1700' } } }, `garments.${cat.tee}.base`],
    [{ garments: { [cat.tee]: { cents: 1700, dtfCents: -1 } } }, `garments.${cat.tee}.dtf`],
    [{ extras: { sleevesCents: -200 } }, 'extras.sleeves'],
    [{ extras: { secondMainPrintCents: 100.5 } }, 'extras.secondMain'],
    [{ extras: { secondMainPrintCents: 10_001 } }, 'extras.secondMain'],
  ];
  for (const [input, field] of cases) {
    const result = await pricing.setPodPrices(owner, input);
    assert.equal(result.ok, false, JSON.stringify(input));
    if (!result.ok) assert.equal(result.field, field, JSON.stringify(input));
  }
  const nothing = await pricing.setPodPrices(owner, {});
  assert.deepEqual(nothing, { ok: false, error: 'There is nothing to save.', field: undefined });
  assert.equal(await stored(), 0);
});

test('a garment that is not in the catalogue can not be priced, but a stale entry for one can be cleared', async () => {
  const unknown = await pricing.setPodPrices(owner, { garments: { [cat.tee]: { cents: 1700 }, NOPE000: { cents: 1000 } } });
  assert.deepEqual(unknown, { ok: false, error: 'NOPE000 is not a garment in the catalogue.', field: 'garments.NOPE000.base' });
  assert.equal((await pricing.getPodPriceTableState()).updatedAt, null, 'not even the valid half was saved');

  // a stale entry (the blank went away) is hand-written into the row, then cleared
  await t.db.insert(schema.appSettings).values({
    key: 'pod_price_table',
    value: 'json',
    valueJson: { version: 1, table: { extras: { secondMainPrintCents: 100, sleevesCents: 200 }, garments: { GONE000: { cents: 999 } } } },
  });
  const cleared = await pricing.setPodPrices(owner, { garments: { GONE000: null } });
  assert.ok(cleared.ok);
  assert.deepEqual(cleared.value.table.garments, {});
});

test('a saved row that no longer passes the checks is ignored: every garment falls back to its placeholder', async () => {
  const errors = mock.method(console, 'error', () => {});
  try {
    await t.db.insert(schema.appSettings).values({
      key: 'pod_price_table',
      value: 'json',
      valueJson: { version: 1, table: { extras: { secondMainPrintCents: -5, sleevesCents: 200 }, garments: { [cat.tee]: { cents: 1700 } } } },
    });
    const state = await pricing.getPodPriceTableState();
    assert.equal(state.updatedAt, null);
    assert.deepEqual(state.table.garments, {});
    assert.deepEqual(state.table.extras, { secondMainPrintCents: 100, sleevesCents: 200 });
    const price = await totalOf(cat.tee, [front]);
    assert.equal(price.totalCents, TEE_PLACEHOLDER);
    assert.equal(price.placeholder, true);
    assert.ok(errors.mock.callCount() >= 1, 'and it says so in the log');
    // saving over it repairs it
    await setPrices({ garments: { [cat.tee]: { cents: 1700 } } });
    assert.equal((await totalOf(cat.tee, [front])).totalCents, 1700);
  } finally {
    errors.mock.restore();
  }
});

test('a row with no table in it at all, or someone else\'s settings row, leaves the placeholders', async () => {
  await t.db.insert(schema.appSettings).values({ key: 'pod_price_table', value: 'json', valueJson: { version: 1 } });
  assert.equal((await pricing.getPodPriceTableState()).updatedAt, null);
  assert.equal((await totalOf(cat.tee, [front])).placeholder, true);
});

// ---------------------------------------------------------------------------
// The activity log

test('a save is recorded in the staff activity log, in words', async () => {
  const staff: Actor = { userId: ownerId, role: 'staff', permissions: { catalogue: 'manage' } };
  await pricing.setPodPrices(staff, { garments: { [cat.tee]: { cents: 1700 }, [cat.hoodie]: { cents: 3400 } }, extras: { sleevesCents: 250 } });
  await pricing.setPodPrices(staff, { garments: { [cat.tee]: null } });
  const log = await t.db.select().from(schema.staffActivity).where(and(eq(schema.staffActivity.actorId, ownerId), eq(schema.staffActivity.action, 'pricing.shop_table')));
  assert.equal(log.length, 2);
  assert.ok(log.every((row) => row.area === 'catalogue' && row.itemType === 'pricing'));
  const summaries = log.map((row) => (row.detail as { summary: string }).summary).sort();
  assert.deepEqual(summaries, ['Changed shop-product prices: 1 back to the placeholder', 'Changed shop-product prices: 2 garments, the extras']);

  // a refused save is not logged
  await t.db.delete(schema.staffActivity);
  await pricing.setPodPrices({ userId: ownerId, role: 'staff', permissions: { catalogue: 'view' } }, { garments: { [cat.tee]: { cents: 1 } } });
  await pricing.setPodPrices(owner, { garments: { [cat.tee]: { cents: -1 } } });
  assert.deepEqual(await t.db.select().from(schema.staffActivity), []);
});

// ---------------------------------------------------------------------------
// Quotes

test('a one-off shop quote is podPrice for one piece, with its breakdown', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 } } });
  const quote = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 1, shop: { placements: [front, back, sleeveLeft] } });
  assert.ok(quote);
  const price = await totalOf(cat.tee, [front, back, sleeveLeft]);
  assert.equal(quote.unitBaseCostCents, price.totalCents);
  assert.equal(quote.unitBaseCostCents, 2000);
  assert.equal(quote.totalCents, 2000);
  assert.deepEqual(quote.breaks, [{ qtyFrom: 1, unitCents: 2000 }]);
  assert.deepEqual(quote.breakdown, price);
  assert.equal(quote.estimate, undefined);
});

test('a shop price is the same for every piece: there are no quantity breaks, as the checkout charges it', async () => {
  await setPrices({ garments: { [cat.tee]: { cents: 1700 } } });
  const three = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 3, shop: { placements: [front] } });
  assert.equal(three?.unitBaseCostCents, 1700);
  assert.equal(three?.totalCents, 5100);
  const hundred = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 100, shop: { placements: [front] } });
  assert.equal(hundred?.unitBaseCostCents, 1700, 'no discount at 100');
  assert.deepEqual(hundred?.breaks, [{ qtyFrom: 1, unitCents: 1700 }]);
});

test('a shop quote follows the print method: DTF takes the garment\'s DTF price', async () => {
  await setPrices({ garments: { [cat.hoodie]: { cents: 3400, dtfCents: 3700 } } });
  assert.equal((await quotes.quoteFor({ blankCode: cat.hoodie, printServiceCode: 'dtf', qty: 1, shop: { placements: [front] } }))?.unitBaseCostCents, 3700);
  assert.equal((await quotes.quoteFor({ blankCode: cat.hoodie, printServiceCode: 'dtg', qty: 1, shop: { placements: [front] } }))?.unitBaseCostCents, 3400);
});

test('a shop quote says when its base is still a placeholder', async () => {
  const quote = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 1, shop: { placements: [front] } });
  assert.equal(quote?.breakdown?.placeholder, true);
  assert.equal(quote?.unitBaseCostCents, 1625);
});

test('no shop quote for screen print, which is for runs, or for a blank with no price', async () => {
  assert.equal(await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'screen_2c', qty: 1, shop: { placements: [front] } }), null);
  assert.equal(await quotes.quoteFor({ blankCode: 'NOPE000', printServiceCode: 'dtg', qty: 1, shop: { placements: [front] } }), null);
  assert.equal(await quotes.quoteFor({ blankCode: 'STNP000', printServiceCode: 'dtg', qty: 1, shop: { placements: [front] } }), null);
});

test('runs keep their own pricing: the shop table never reaches them', async () => {
  const runBefore = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 30 });
  const oneBefore = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 1 });
  assert.ok(runBefore && oneBefore);
  await setPrices({ garments: { [cat.tee]: { cents: 1700, dtfCents: 1900 } }, extras: { secondMainPrintCents: 500, sleevesCents: 500 } });
  const runAfter = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 30 });
  const oneAfter = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 1 });
  assert.deepEqual(runAfter, runBefore);
  assert.deepEqual(oneAfter, oneBefore, 'a quote that does not say it is a shop product is a run quote, even for one piece');
  assert.equal(oneAfter?.unitBaseCostCents, 1625);
  assert.deepEqual(runAfter?.breaks.map((b) => b.qtyFrom), [1, 25], 'with its quantity breaks');
  // the screen-print estimate is untouched too
  const screen = await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'screen_2c', qty: 30 });
  assert.equal(screen?.estimate, true);
});

// ---------------------------------------------------------------------------
// The catalogue's "from" price is the garment's shop price

test('the "from" price is the garment\'s shop price: its placeholder until one is set, then the owner\'s, DTF\'s when cheaper', async () => {
  const { getBlank, listBlanks } = await import('@/lib/services/blanks');
  const fromOf = async (code: string) => [(await getBlank(code))?.fromPriceCents, (await listBlanks({ q: code })).items.find((b) => b.code === code)?.fromPriceCents];

  // nothing set: the one-print DTG cost every shop product of it stands on (not the 25+ run break, not embroidery)
  assert.deepEqual(await fromOf(cat.tee), [TEE_PLACEHOLDER, TEE_PLACEHOLDER]);
  assert.equal((await pricing.loadShopFromPrices()).get(cat.tee), TEE_PLACEHOLDER);
  assert.equal((await pricing.loadShopFromPrices()).has('STNP000'), false, 'a garment with no cost at all has no "from" price');

  await setPrices({ garments: { [cat.tee]: { cents: 1700 }, STNP000: { cents: 1500 } } });
  assert.deepEqual(await fromOf(cat.tee), [1700, 1700]);
  assert.equal((await pricing.loadShopFromPrices()).get('STNP000'), 1500, 'priced by the owner: it has one now');

  // a DTF price below the base: the cheapest way to make the product
  await setPrices({ garments: { [cat.tee]: { cents: 1700, dtfCents: 1600 } } });
  assert.deepEqual(await fromOf(cat.tee), [1600, 1600]);
  await setPrices({ garments: { [cat.tee]: { cents: 1700, dtfCents: 1900 } } });
  assert.deepEqual(await fromOf(cat.tee), [1700, 1700]);
  // runs are untouched by it
  assert.equal((await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 1 }))?.unitBaseCostCents, TEE_PLACEHOLDER);
});

// ---------------------------------------------------------------------------
// The assistant's admin tools: set_shop_price writes the shop table; set_base_cost prices runs and says so

function staffCtx(userId: string, role: 'admin' | 'staff', permissions?: Record<string, string>) {
  return { userId, clerkId: `clerk-${userId}`, role, storeId: null, conversationId: '00000000-0000-4000-8000-0000000000aa', idempotencyKey: 'k', locale: 'en', ...(permissions ? { permissions } : {}) } as Parameters<
    typeof import('@/lib/tools/admin').setShopPriceTool.run
  >[0];
}

test('set_shop_price sets a garment\'s shop price in the shop table, keeps a DTF price it isn\'t told about, and goes back to the placeholder', async () => {
  const { setShopPriceTool } = await import('@/lib/tools/admin');
  const ctx = staffCtx(ownerId, 'admin');

  const set = await setShopPriceTool.run(ctx, { blankCode: cat.tee.toLowerCase(), priceCents: 1700 });
  assert.equal(set.data.ok, true, set.data.error);
  assert.equal(set.data.blankCode, cat.tee, 'the code as the catalogue writes it');
  assert.deepEqual(set.data.examples?.slice(0, 2), ['One print, front or back: €17.00', 'Front and back: €18.00']);
  assert.ok(set.data.examples?.includes('Front and back with sleeves: €20.00'));
  const price = await totalOf(cat.tee, [front, back, sleeveLeft]);
  assert.equal(price.totalCents, 2000);
  assert.equal(price.placeholder, false);

  // a DTF price, then a new base without naming DTF: the DTF price stays
  assert.equal((await setShopPriceTool.run(ctx, { blankCode: cat.tee, priceCents: 1700, dtfPriceCents: 1900 })).data.dtfPriceCents, 1900);
  const moved = await setShopPriceTool.run(ctx, { blankCode: cat.tee, priceCents: 1800 });
  assert.equal(moved.data.dtfPriceCents, 1900);
  assert.equal((await totalOf(cat.tee, [front], 'dtf')).totalCents, 1900);
  // null: DTF uses the base price again
  assert.equal((await setShopPriceTool.run(ctx, { blankCode: cat.tee, priceCents: 1800, dtfPriceCents: null })).data.dtfPriceCents, null);
  assert.equal((await totalOf(cat.tee, [front], 'dtf')).totalCents, 1800);

  // back to the placeholder
  const cleared = await setShopPriceTool.run(ctx, { blankCode: cat.tee, priceCents: null });
  assert.equal(cleared.data.ok, true, cleared.data.error);
  assert.equal(cleared.data.placeholderCents, TEE_PLACEHOLDER);
  assert.equal((await totalOf(cat.tee, [front])).placeholder, true);

  // the log has it, in words
  const log = await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.action, 'pricing.shop_table'));
  assert.equal(log.length, 5);
});

test('set_shop_price is refused without Catalogue and pricing Manage, for an unknown garment and for a wrong price; nothing is written', async () => {
  const { setShopPriceTool } = await import('@/lib/tools/admin');
  const viewer = await setShopPriceTool.run(staffCtx(ownerId, 'staff', { catalogue: 'view' }), { blankCode: cat.tee, priceCents: 1700 });
  assert.equal(viewer.data.ok, false);
  const unknown = await setShopPriceTool.run(staffCtx(ownerId, 'admin'), { blankCode: 'NOPE000', priceCents: 1700 });
  assert.equal(unknown.data.ok, false);
  assert.match(unknown.data.error ?? '', /not a garment in the catalogue/);
  const dtfAlone = await setShopPriceTool.run(staffCtx(ownerId, 'admin'), { blankCode: cat.tee, priceCents: null, dtfPriceCents: 1600 });
  assert.equal(dtfAlone.data.ok, false);
  assert.deepEqual(await t.db.select().from(schema.appSettings), []);
  assert.deepEqual(await t.db.select().from(schema.staffActivity), []);
});

test('set_base_cost prices runs: its result says what shop products of the garment cost, from the shop table or the placeholder', async () => {
  const { setBaseCostTool, listBaseCostsTool } = await import('@/lib/tools/admin');
  const ctx = staffCtx(ownerId, 'admin');
  const where = and(eq(schema.baseCosts.blankCode, cat.tee), eq(schema.baseCosts.printServiceCode, 'dtg'), eq(schema.baseCosts.qtyFrom, 1));
  const [row] = await t.db.select().from(schema.baseCosts).where(where);
  try {
    // no shop price yet: the one-piece DTG row is the placeholder, and the result says so
    const placeholder = await setBaseCostTool.run(ctx, { blankCode: cat.tee, printServiceCode: 'dtg', garmentCostCents: 700, printCostCents: 600, marginCents: 400 });
    assert.equal(placeholder.data.ok, true, placeholder.data.error);
    assert.equal(placeholder.data.shopPricePlaceholder, true);
    assert.equal(placeholder.data.shopPriceCents, 1700);
    assert.match(placeholder.data.note ?? '', /no shop price yet/);

    // with a shop price, the row no longer moves shop products
    await setPrices({ garments: { [cat.tee]: { cents: 1900 } } });
    const runsOnly = await setBaseCostTool.run(ctx, { blankCode: cat.tee, printServiceCode: 'dtg', garmentCostCents: 650, printCostCents: 600, marginCents: 300 });
    assert.equal(runsOnly.data.shopPricePlaceholder, false);
    assert.equal(runsOnly.data.shopPriceCents, 1900);
    assert.match(runsOnly.data.note ?? '', /priced from the shop price table/);
    assert.equal((await totalOf(cat.tee, [front])).totalCents, 1900, 'the shop price stands');
    assert.equal((await quotes.quoteFor({ blankCode: cat.tee, printServiceCode: 'dtg', qty: 1 }))?.unitBaseCostCents, 1550, 'the run row moved');

    // embroidery rows say nothing about the shop table
    const embroidery = await setBaseCostTool.run(ctx, { blankCode: cat.tee, printServiceCode: 'embroidery', garmentCostCents: 650, printCostCents: 850, marginCents: 450 });
    assert.equal(embroidery.data.note, undefined);

    const listed = await listBaseCostsTool.run(ctx, { blankCode: cat.tee });
    assert.equal(listed.data.shopPriceCents, 1900);
    assert.equal(listed.data.shopPricePlaceholder, false);
  } finally {
    await t.db.update(schema.baseCosts).set({ garmentCostCents: row.garmentCostCents, printCostCents: row.printCostCents, marginCents: row.marginCents }).where(where);
  }
});
