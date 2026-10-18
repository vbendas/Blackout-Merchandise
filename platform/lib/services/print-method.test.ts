// How a shop product prints is the garment's call, not the artist's (owner decision, 17 Oct 2026): DTG by default,
// and DTF only where DTG isn't ideal, which is a garment whose catalogue family has no DTG plus any garment the owner
// marks "Print with DTF" in /admin/pricing. DTF costs what DTG does until the owner fills in a DTF price, and a garment
// that prints DTF then costs that price. A 'dtg' or 'dtf' that disagrees is corrected with a short note, never refused;
// a run is screen print or "digital", and digital is the garment's method; a product made before follows its garment on
// its next edit. The real services and tools on PGlite, with the catalogue of lib/services/test-catalogue.ts:
//   tee STTU169 and hoodie STSU177 offer DTG and DTF; shorts, jacket and beanie offer DTF only.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { seedTestCatalogue, type TEST_CATALOGUE } from '@/lib/services/test-catalogue';
import type { Actor } from '@/lib/auth/permissions';
import type { ToolContext } from '@/lib/tools/types';

process.env.FAL_API_KEY = '';

let t: TestDb;
let pricing: typeof import('@/lib/services/pricing-admin');
let pod: typeof import('@/lib/pricing/pod');
let products: typeof import('@/lib/services/products');
let bulk: typeof import('@/lib/services/bulk');
let productTools: typeof import('@/lib/tools/products');
let catalogTools: typeof import('@/lib/tools/catalog');
let cat: typeof TEST_CATALOGUE;
let owner: Actor;
let ownerId: string;
let storeId: string;
let ctx: ToolContext;

const front = { position: 'front_chest', widthCm: 28 };
const back = { position: 'back', widthCm: 28 };
const sleeveLeft = { position: 'sleeve_left', widthCm: 8 };
const shipTo = { name: 'Ana Artist', line1: 'Carrer de Mallorca 1', city: 'Barcelona', postcode: '08001', country: 'ES' };

/** The placeholder every garment stands on until the owner prices it: 6.50 + 6.00 + 3.75 for one print. */
const PLACEHOLDER = 650 + 600 + 375;
const DTF_NOTE = "Printed DTF on this garment, since DTG isn't ideal for it.";
const DTG_NOTE = 'Printed DTG on this garment.';

before(async () => {
  t = await setupTestDb();
  cat = await seedTestCatalogue(t.db);
  // a garment the catalogue lists no print services for at all, for a product made before the garment decided
  await t.db.insert(schema.blanks).values({ code: 'STNP000', name: 'Unlisted tee', type: 'T-shirts' });
  pricing = await import('@/lib/services/pricing-admin');
  pod = await import('@/lib/pricing/pod');
  products = await import('@/lib/services/products');
  bulk = await import('@/lib/services/bulk');
  productTools = await import('@/lib/tools/products');
  catalogTools = await import('@/lib/tools/catalog');
  ownerId = (await seedUser(t.db, { email: 'owner@blackoutmerch.test', role: 'admin' })).userId;
  owner = { userId: ownerId, role: 'admin' };
  const artist = await seedUser(t.db, { email: 'artist@blackoutmerch.test', withStore: true });
  storeId = artist.storeId!;
  ctx = { userId: artist.userId, clerkId: 'clerk-artist', role: 'artist', storeId, conversationId: randomUUID(), idempotencyKey: 'k', locale: 'en' };
});

after(async () => {
  await t.close();
});

beforeEach(async () => {
  await t.db.delete(schema.appSettings);
  await t.db.delete(schema.staffActivity);
});

async function save(patch: unknown, actor: Actor = owner) {
  const saved = await pricing.setPodPrices(actor, patch);
  assert.ok(saved.ok, saved.ok ? '' : saved.error);
  return saved.value;
}

const setPrices = (garments: Record<string, { cents: number; dtfCents?: number } | null>) => save({ garments });
const mark = (code: string, on = true) => save({ dtfInstead: { [code]: on } });
const methodOf = async (code: string) => (await pricing.resolveShopMethod(code))?.code;

async function newProduct(blankCode: string, extra: Partial<Parameters<typeof products.createProduct>[0]> = {}) {
  const made = await products.createProduct({ storeId, blankCode, placement: blankCode === cat.beanie ? { position: 'centre', widthCm: 12 } : front, colours: [cat.black], sizes: ['M'], ...extra });
  assert.ok(made.ok, made.ok ? '' : made.error);
  return made;
}

const rowOf = async (productId: string) => (await t.db.select().from(schema.products).where(eq(schema.products.id, productId)))[0];

// ---------------------------------------------------------------------------
// Method by garment

test('method by garment: a family with DTG prints DTG, a family without prints DTF, and a marked garment prints DTF', async () => {
  assert.deepEqual(await pricing.resolveShopMethod(cat.tee), { code: 'dtg', dtfBecause: null });
  assert.deepEqual(await pricing.resolveShopMethod(cat.hoodie), { code: 'dtg', dtfBecause: null });
  for (const code of [cat.shorts, cat.jacket, cat.beanie]) assert.deepEqual(await pricing.resolveShopMethod(code), { code: 'dtf', dtfBecause: 'no_dtg' }, code);

  await mark(cat.tee);
  assert.deepEqual(await pricing.resolveShopMethod(cat.tee), { code: 'dtf', dtfBecause: 'marked' });
  assert.equal(await methodOf(cat.hoodie), 'dtg', 'only the garment that was marked');

  await mark(cat.tee, false);
  assert.equal(await methodOf(cat.tee), 'dtg', 'and DTG again once the mark is off');
  assert.equal('dtfInstead' in (await pricing.getPodPriceTableState()).table, false, 'no list kept when nothing is marked');
  assert.equal(await pricing.resolveShopMethod('NOPE000'), null, 'a blank the catalogue does not have');
  assert.equal(await pricing.resolveShopMethod('STNP000'), null, 'a blank that lists no digital method');
});

test('the mark is the same table the prices are in: saving a price keeps it, and the mark keeps the price', async () => {
  await mark(cat.hoodie);
  await setPrices({ [cat.tee]: { cents: 1700 } });
  const state = await pricing.getPodPriceTableState();
  assert.deepEqual(state.table.dtfInstead, [cat.hoodie]);
  assert.deepEqual(state.table.garments, { [cat.tee]: { cents: 1700 } });
  const [row] = await t.db.select().from(schema.appSettings).where(eq(schema.appSettings.key, 'pod_price_table'));
  assert.deepEqual((row.valueJson as { table: { dtfInstead: string[] } }).table.dtfInstead, [cat.hoodie], 'stored in app_settings with the prices');

  // a mark on a garment that has no price yet does not pin one
  assert.equal((state.table.garments as Record<string, unknown>)[cat.hoodie], undefined);
  const hoodie = (await pod.podPrice(cat.hoodie, [front]))!;
  assert.equal(hoodie.placeholder, true);
  assert.equal(hoodie.totalCents, PLACEHOLDER);
});

test('the catalogue and the list name each garment\'s method: the words say DTF only where it is DTF', async () => {
  await mark(cat.hoodie);
  const words = async (code: string) => (await catalogTools.getBlankTool.run(ctx, { code })).data;
  const tee = await words(cat.tee);
  assert.deepEqual(tee.printServices?.find((p) => p.code === 'digital'), { code: 'digital', name: 'Digital print', shop: true, prints: 'DTG' });
  assert.equal(tee.printServices?.some((p) => p.code === 'dtg' || p.code === 'dtf'), false, 'DTG and DTF are one entry for an artist, not two choices');
  assert.equal(tee.printServices?.find((p) => p.code === 'screen_1c')?.shop, false, 'screen print stays for runs');
  const hoodie = await words(cat.hoodie);
  assert.equal(hoodie.printServices?.find((p) => p.code === 'digital')?.prints, 'DTF', 'marked');
  assert.equal(hoodie.printServices?.find((p) => p.code === 'embroidery')?.shop, true);
  assert.equal((await words(cat.jacket)).printServices?.find((p) => p.code === 'digital')?.prints, 'DTF', 'no DTG');

  // the blank card an artist reads: no jargon for the usual print
  const card = async (code: string) => ((await catalogTools.getBlankTool.run(ctx, { code })).ui?.cards?.[0] as { printServices?: string[] }).printServices;
  assert.deepEqual(await card(cat.tee), ['Screen print', 'Digital print']);
  assert.deepEqual(await card(cat.jacket), ['Digital print (DTF)', 'Embroidery']);
  assert.deepEqual(await card(cat.hoodie), ['Screen print', 'Digital print (DTF)', 'Embroidery']);

  const detail = await (await import('@/lib/services/blanks')).getBlank(cat.jacket);
  assert.deepEqual(detail?.digitalMethod, { code: 'dtf', dtfBecause: 'no_dtg' });
});

// ---------------------------------------------------------------------------
// A passed method is corrected, never refused

test('a new product takes the garment\'s method, and a dtg or dtf that says otherwise is corrected with a note', async () => {
  // the tee prints DTG
  assert.equal((await newProduct(cat.tee)).value.printServiceCode, 'dtg');
  const dtf = await newProduct(cat.tee, { printServiceCode: 'dtf' });
  assert.equal(dtf.value.printServiceCode, 'dtg');
  assert.equal(dtf.note, DTG_NOTE);

  // marked, it prints DTF, and a 'dtg' is the one corrected
  await mark(cat.tee);
  assert.equal((await newProduct(cat.tee)).value.printServiceCode, 'dtf');
  const dtg = await newProduct(cat.tee, { printServiceCode: 'dtg' });
  assert.equal(dtg.value.printServiceCode, 'dtf');
  assert.equal(dtg.note, DTF_NOTE);
  assert.equal((await newProduct(cat.tee, { printServiceCode: 'dtf' })).note, undefined, 'it was right');

  // a garment with no DTG: DTF whatever is asked
  for (const asked of [undefined, 'dtf', 'dtg']) assert.equal((await newProduct(cat.jacket, asked ? { printServiceCode: asked } : {})).value.printServiceCode, 'dtf', String(asked));
});

test('the create_product tool: the method is left out, a dtg or dtf that disagrees is corrected and the artist is told in a note', async () => {
  const input = { blankCode: cat.jacket, placement: front, colours: [cat.black], sizes: ['M'] };
  assert.equal(productTools.createProductTool.input.safeParse(input).success, true, 'printServiceCode is optional now');

  const plain = await productTools.createProductTool.run(ctx, input);
  assert.equal(plain.data.ok, true, plain.data.error);
  assert.equal(plain.data.note, undefined);
  assert.equal(plain.data.print, 'Printed DTF on this garment', 'said where it matters: this garment prints DTF');
  const card = plain.ui?.cards?.find((c) => c.kind === 'product') as { printService: string };
  assert.equal(card.printService, 'Printed DTF on this garment');

  // the tee is DTG: nothing to say about DTG, and a 'dtf' is corrected, never an error
  const tee = await productTools.createProductTool.run(ctx, { ...input, blankCode: cat.tee });
  assert.equal(tee.data.ok, true);
  assert.equal(tee.data.print, undefined, 'DTG is the usual print and needs no words');
  assert.equal((tee.ui?.cards?.find((c) => c.kind === 'product') as { printService: string }).printService, 'Digital print');
  const asked = await productTools.createProductTool.run(ctx, { ...input, blankCode: cat.tee, printServiceCode: 'dtf' });
  assert.equal(asked.data.ok, true, asked.data.error);
  assert.equal(asked.data.note, DTG_NOTE);
  const notice = asked.ui?.cards?.find((c) => c.kind === 'notice') as { text: string; tone: string };
  assert.deepEqual([notice.text, notice.tone], [DTG_NOTE, 'info'], 'the artist sees it too');

  // jackets asked for DTG: corrected to DTF
  const jacket = await productTools.createProductTool.run(ctx, { ...input, printServiceCode: 'dtg' });
  assert.equal(jacket.data.ok, true, jacket.data.error);
  assert.equal(jacket.data.note, DTF_NOTE);

  // screen print is still refused, in words that offer no choice of DTG and DTF
  const screen = await productTools.createProductTool.run(ctx, { ...input, printServiceCode: 'screen_1c' });
  assert.equal(screen.data.ok, false);
  assert.doesNotMatch(screen.data.error ?? '', /dtg|dtf/i);
});

test('the create_product words never ask an artist to choose between DTG and DTF', () => {
  const text = productTools.createProductTool.description;
  assert.match(text, /leave printServiceCode out and never ask the artist about DTG or DTF/);
  assert.doesNotMatch(text, /unless the artist asks for 'dtf'/);
  const quote = productTools.getQuoteTool.description;
  assert.match(quote, /so leave printServiceCode out/);
  assert.match(quote, /printServiceCode 'digital'/);
});

test('a shop quote prices the garment\'s method too: a dtf asked for on a DTG garment is corrected with the note', async () => {
  await setPrices({ [cat.tee]: { cents: 1700, dtfCents: 1900 }, [cat.jacket]: { cents: 2000 } });
  const tee = await productTools.getQuoteTool.run(ctx, { blankCode: cat.tee, positions: ['front_chest'], printServiceCode: 'dtf', qty: 1 });
  assert.equal(tee.data.ok, true, tee.data.error);
  assert.equal(tee.data.unitBaseCostCents, 1700, 'the tee prints DTG, so its DTG price: the artist could not buy it as DTF');
  assert.equal(tee.data.note, DTG_NOTE);
  const jacket = await productTools.getQuoteTool.run(ctx, { blankCode: cat.jacket, positions: ['front_chest'], printServiceCode: 'dtg', qty: 1 });
  assert.equal(jacket.data.unitBaseCostCents, 2000);
  assert.equal(jacket.data.note, DTF_NOTE);
  const left = await productTools.getQuoteTool.run(ctx, { blankCode: cat.jacket, positions: ['front_chest'], qty: 1 });
  assert.equal(left.data.note, undefined, 'nothing to correct');

  // a run quote of one method prices the garment's: 'digital' on the jacket is its DTF rows, a 'dtg' there is corrected
  const digital = await productTools.getQuoteTool.run(ctx, { blankCode: cat.jacket, printServiceCode: 'digital', qty: 30 });
  assert.equal(digital.data.ok, true, digital.data.error);
  assert.equal(digital.data.note, undefined);
  const corrected = await productTools.getQuoteTool.run(ctx, { blankCode: cat.jacket, printServiceCode: 'dtg', qty: 30 });
  assert.equal(corrected.data.ok, true, corrected.data.error);
  assert.equal(corrected.data.note, DTF_NOTE);
  assert.equal(corrected.data.totalCents, digital.data.totalCents, 'the same price as digital');
});

// ---------------------------------------------------------------------------
// Runs: screen print or digital, and digital is the garment's method

test('a run line resolves digital to the garment\'s method, a marked tee included', async () => {
  const quote = async (blankCode: string, printServiceCode: string) => {
    const result = await bulk.createBulkQuote({
      storeId,
      lines: [{ blankCode, printServiceCode, placement: blankCode === cat.shorts ? { position: 'front_leg', widthCm: 12 } : front, colourCode: cat.black, sizes: { M: 5 } }],
      shipTo,
    });
    assert.ok(result.ok, result.ok ? '' : result.error);
    return { code: result.value.lines[0].printServiceCode, name: result.value.lines[0].printServiceName, notes: result.notes };
  };
  assert.deepEqual(await quote(cat.tee, 'digital'), { code: 'dtg', name: 'Direct-to-garment print', notes: undefined });
  assert.deepEqual(await quote(cat.shorts, 'digital'), { code: 'dtf', name: 'Direct-to-film print', notes: undefined });
  assert.deepEqual(await quote(cat.tee, 'dtf'), { code: 'dtg', name: 'Direct-to-garment print', notes: [DTG_NOTE] }, 'a dtf that disagrees is corrected');

  await mark(cat.tee);
  assert.deepEqual(await quote(cat.tee, 'digital'), { code: 'dtf', name: 'Direct-to-film print', notes: undefined });
  assert.deepEqual(await quote(cat.tee, 'dtg'), { code: 'dtf', name: 'Direct-to-film print', notes: [DTF_NOTE] });
  // screen print is the run's other choice, and no mark touches it
  assert.equal((await quote(cat.tee, 'screen_2c')).code, 'screen_2c');
  // a line off a product that names no method prints the garment's method now, not the one the product was made with
  const made = await products.createProduct({ storeId, blankCode: cat.hoodie, printServiceCode: 'dtg', placement: front, colours: [cat.black], sizes: ['M'] });
  assert.ok(made.ok);
  await mark(cat.hoodie);
  const off = await bulk.createBulkQuote({ storeId, lines: [{ productId: made.value.id, colourCode: cat.black, sizes: { M: 5 } }], shipTo });
  assert.ok(off.ok, off.ok ? '' : off.error);
  assert.equal(off.value.lines[0].printServiceCode, 'dtf');
  assert.equal(off.notes, undefined, 'nothing was asked, so nothing is corrected');
});

test('a run is priced from its own rows for the garment\'s method, and the shop table never reaches the run price', async () => {
  const unit = async (code: string, printServiceCode: string) => {
    const result = await bulk.createBulkQuote({ storeId, lines: [{ blankCode: code, printServiceCode, placement: front, colourCode: cat.black, sizes: { M: 30 } }], shipTo });
    assert.ok(result.ok, result.ok ? '' : result.error);
    return result.value.lines[0].unitCents;
  };
  const before = await unit(cat.jacket, 'digital');
  await setPrices({ [cat.jacket]: { cents: 2000, dtfCents: 2600 } });
  assert.equal(await unit(cat.jacket, 'digital'), before, 'a shop price, or a DTF price, never changes a run');
  assert.equal(await unit(cat.jacket, 'dtg'), before, 'and a corrected dtg is the same run');
});

// ---------------------------------------------------------------------------
// Same price: DTF costs what DTG does until the owner fills in a DTF price

test('DTG and DTF cost the same for a garment, shop price and placeholder alike, until a DTF price is filled in', async () => {
  const same = async (code: string, positions = [front, back, sleeveLeft]) => {
    const dtg = (await pod.podPrice(code, positions, 'dtg'))!;
    const dtf = (await pod.podPrice(code, positions, 'dtf'))!;
    assert.deepEqual(dtf, dtg, code);
    return dtg.totalCents;
  };
  // placeholders
  assert.equal(await same(cat.tee), PLACEHOLDER + 300);
  assert.equal(await same(cat.jacket), PLACEHOLDER + 300);
  // the owner's prices, with no DTF price: DTF is the same number
  await setPrices({ [cat.tee]: { cents: 1700 }, [cat.jacket]: { cents: 2000 } });
  assert.equal(await same(cat.tee), 2000);
  assert.equal(await same(cat.jacket), 2300);
  assert.equal((await pricing.getPodPriceTableState()).table.garments[cat.jacket]?.dtfCents, undefined, 'nothing stored for DTF: empty is the default');

  // a product costs that whichever way it prints: the tee unmarked (DTG) and marked (DTF)
  const asDtg = await newProduct(cat.tee);
  assert.equal(asDtg.value.baseCostCents, 1700);
  await mark(cat.tee);
  const asDtf = await newProduct(cat.tee);
  assert.equal(asDtf.value.printServiceCode, 'dtf');
  assert.equal(asDtf.value.baseCostCents, 1700, 'DTF at the same price');
});

test('a DTF price the owner filled in is honoured for the garments that print DTF, and never reaches one that prints DTG', async () => {
  await setPrices({ [cat.tee]: { cents: 1700, dtfCents: 1900 }, [cat.jacket]: { cents: 2000, dtfCents: 2300 } });
  // the tee prints DTG: its base price, whatever DTF is set to
  assert.equal((await pod.podPrice(cat.tee, [front]))!.totalCents, 1700);
  assert.equal((await newProduct(cat.tee)).value.baseCostCents, 1700);
  // the jacket prints DTF: the DTF price, extras on top
  assert.equal((await pod.podPrice(cat.jacket, [front]))!.totalCents, 2300);
  const jacket = await newProduct(cat.jacket);
  assert.equal(jacket.value.baseCostCents, 2300);
  assert.deepEqual(jacket.value.baseCostLines, [{ key: 'base', label: 'Garment with one print', cents: 2300 }]);
  assert.equal((await pod.podPrice(cat.jacket, [front, back, sleeveLeft]))!.totalCents, 2300 + 100 + 200);
  assert.equal((await pricing.loadShopFromPrices([cat.tee, cat.jacket])).get(cat.jacket), 2300);

  // marked "Print with DTF", the tee is a DTF garment and costs its DTF price; unmarked, it is back to the base
  await mark(cat.tee);
  assert.equal((await pod.podPrice(cat.tee, [front]))!.totalCents, 1900);
  assert.equal((await newProduct(cat.tee)).value.baseCostCents, 1900);
  await mark(cat.tee, false);
  assert.equal((await pod.podPrice(cat.tee, [front]))!.totalCents, 1700);
});

test('an old row with a DTF price in it, saved before the marks existed, is read as it is and kept on the next save', async () => {
  await t.db.insert(schema.appSettings).values({
    key: 'pod_price_table',
    value: 'json',
    valueJson: { version: 1, table: { extras: { secondMainPrintCents: 100, sleevesCents: 200 }, garments: { [cat.jacket]: { cents: 2000, dtfCents: 2300 }, [cat.tee]: { cents: 1700, dtfCents: 1900 } } } },
  });
  const state = await pricing.getPodPriceTableState();
  assert.notEqual(state.updatedAt, null, 'it passes the checks: no error, no fallback to the placeholders');
  assert.deepEqual(state.table.garments[cat.jacket], { cents: 2000, dtfCents: 2300 });
  assert.equal((await pod.podPrice(cat.jacket, [front]))!.totalCents, 2300, 'its DTF price is honoured on the garment that prints DTF');
  assert.equal((await pod.podPrice(cat.tee, [front]))!.totalCents, 1700);

  // a save of something else keeps the DTF prices, and adds the mark beside them
  await save({ extras: { sleevesCents: 250 }, dtfInstead: { [cat.tee]: true } });
  const after = await pricing.getPodPriceTableState();
  assert.deepEqual(after.table.garments, state.table.garments);
  assert.deepEqual(after.table.dtfInstead, [cat.tee]);
  assert.equal((await pod.podPrice(cat.tee, [front]))!.totalCents, 1900, 'now a DTF garment: its stored DTF price');
});

// ---------------------------------------------------------------------------
// The admin toggle: gated, and locked for a garment with no DTG

const refused = (message = "You don't have Manage access to Catalogue and pricing.") => ({ ok: false, error: message });

test('the mark needs Catalogue and pricing Manage: everyone else is refused and nothing is written', async () => {
  const patch = { dtfInstead: { [cat.tee]: true } };
  const stored = async () => (await t.db.select().from(schema.appSettings).where(eq(schema.appSettings.key, 'pod_price_table'))).length;
  const actors: [string, Actor][] = [
    ['an artist', { userId: ownerId, role: 'artist' }],
    ['staff with no access', { userId: ownerId, role: 'staff', permissions: {} }],
    ['Catalogue and pricing View', { userId: ownerId, role: 'staff', permissions: { catalogue: 'view' } }],
    ['Catalogue and pricing Work', { userId: ownerId, role: 'staff', permissions: { catalogue: 'work' } }],
    ['Manage on every other area', { userId: ownerId, role: 'staff', permissions: { prepress: 'manage', production: 'manage', runs: 'manage', shop_orders: 'manage', money: 'manage' } }],
    ['Manage, but paused', { userId: ownerId, role: 'staff', permissions: { catalogue: 'manage' }, suspended: true }],
  ];
  for (const [who, actor] of actors) assert.deepEqual(await pricing.setPodPrices(actor, patch), refused(), who);
  assert.equal(await stored(), 0, 'nothing was written');
  assert.equal(await methodOf(cat.tee), 'dtg');
  // the refusal comes before the input is looked at
  assert.deepEqual(await pricing.setPodPrices({ userId: ownerId, role: 'staff', permissions: { catalogue: 'view' } }, { dtfInstead: 'nonsense' }), refused());

  const staff: Actor = { userId: ownerId, role: 'staff', permissions: { catalogue: 'manage' } };
  assert.equal((await pricing.setPodPrices(staff, patch)).ok, true, 'Manage');
  assert.equal(await methodOf(cat.tee), 'dtf');
  assert.equal((await pricing.setPodPrices(owner, { dtfInstead: { [cat.tee]: false } })).ok, true, 'the owner');
});

test('a mark is recorded in the activity log, in words, and a refused one is not', async () => {
  const staff: Actor = { userId: ownerId, role: 'staff', permissions: { catalogue: 'manage' } };
  await pricing.setPodPrices(staff, { dtfInstead: { [cat.tee]: true, [cat.hoodie]: true } });
  await pricing.setPodPrices(staff, { dtfInstead: { [cat.tee]: false }, garments: { [cat.tee]: { cents: 1700 } } });
  const log = await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.action, 'pricing.shop_table'));
  const summaries = log.map((row) => (row.detail as { summary: string }).summary).sort();
  assert.deepEqual(summaries, ['Changed how shop products print: 2 garments set to print DTF', 'Changed shop-product prices: 1 garment, 1 back to DTG']);
  await t.db.delete(schema.staffActivity);
  await pricing.setPodPrices({ userId: ownerId, role: 'staff', permissions: { catalogue: 'view' } }, { dtfInstead: { [cat.tee]: true } });
  await pricing.setPodPrices(owner, { dtfInstead: { [cat.jacket]: true } });
  assert.deepEqual(await t.db.select().from(schema.staffActivity), []);
});

test('the toggle is locked for a garment with no DTG: it always prints DTF, and saving a mark on or off for it is refused', async () => {
  const rows = await pricing.listPodGarments(owner);
  for (const code of [cat.jacket, cat.beanie, cat.shorts]) {
    const row = rows.find((r) => r.code === code)!;
    assert.deepEqual([row.offersDtg, row.offersDtf], [false, true], `${code} is locked: the list says there is no DTG`);
  }
  const tee = rows.find((r) => r.code === cat.tee)!;
  assert.deepEqual([tee.offersDtg, tee.offersDtf], [true, true], 'the tee can switch');

  for (const on of [true, false]) {
    const result = await pricing.setPodPrices(owner, { dtfInstead: { [cat.jacket]: on } });
    assert.deepEqual(result, { ok: false, error: "The Men's hooded softshell has no DTG, so it always prints DTF.", field: `garments.${cat.jacket}.method` }, String(on));
  }
  assert.equal(await methodOf(cat.jacket), 'dtf', 'and it still prints DTF');
  // nothing is saved from a patch that holds a locked garment: not even the half that is fine
  const mixed = await pricing.setPodPrices(owner, { garments: { [cat.tee]: { cents: 1700 } }, dtfInstead: { [cat.hoodie]: true, [cat.beanie]: true } });
  assert.equal(mixed.ok, false);
  const state = await pricing.getPodPriceTableState();
  assert.equal(state.updatedAt, null, 'nothing was saved');
  assert.equal(await methodOf(cat.hoodie), 'dtg');
});

test('a mark names a garment of the catalogue; a stale mark of one that has gone can still be taken off', async () => {
  const unknown = await pricing.setPodPrices(owner, { dtfInstead: { NOPE000: true } });
  assert.deepEqual(unknown, { ok: false, error: 'NOPE000 is not a garment in the catalogue.', field: 'garments.NOPE000.method' });
  await t.db.insert(schema.appSettings).values({
    key: 'pod_price_table',
    value: 'json',
    valueJson: { version: 1, table: { extras: { secondMainPrintCents: 100, sleevesCents: 200 }, garments: {}, dtfInstead: ['GONE000'] } },
  });
  assert.deepEqual((await pricing.getPodPriceTableState()).table.dtfInstead, ['GONE000']);
  const cleared = await pricing.setPodPrices(owner, { dtfInstead: { GONE000: false } });
  assert.ok(cleared.ok);
  assert.equal('dtfInstead' in cleared.value.table, false);
  // a mark that is not on or off is refused by name
  const wrong = await pricing.setPodPrices(owner, { dtfInstead: { [cat.tee]: 'yes' } });
  assert.equal(wrong.ok, false);
  if (!wrong.ok) assert.equal(wrong.field, `garments.${cat.tee}.method`);
});

// ---------------------------------------------------------------------------
// Products made before follow their garment on their next edit

test('an existing product follows its garment on its next edit: marked, it prints DTF, with a note', async () => {
  const made = await newProduct(cat.tee);
  assert.equal(made.value.printServiceCode, 'dtg');
  await mark(cat.tee);
  assert.equal((await products.getProduct(storeId, made.value.id))!.printServiceCode, 'dtg', 'nothing moves until the product is edited');

  const renamed = await products.updateProduct(storeId, made.value.id, { name: 'Tour tee' });
  assert.ok(renamed.ok, renamed.ok ? '' : renamed.error);
  assert.equal(renamed.value.printServiceCode, 'dtf');
  assert.equal(renamed.value.printServiceName, 'Direct-to-film print');
  assert.equal(renamed.note, DTF_NOTE);
  assert.equal((await rowOf(made.value.id)).printServiceCode, 'dtf', 'stored');

  // the next edit has nothing more to say
  const again = await products.updateProduct(storeId, made.value.id, { name: 'Tour tee v2' });
  assert.ok(again.ok);
  assert.equal(again.note, undefined);

  // and it follows back when the owner takes the mark off
  await mark(cat.tee, false);
  const back = await products.updateProduct(storeId, made.value.id, { description: 'Black, heavy' });
  assert.ok(back.ok);
  assert.equal(back.value.printServiceCode, 'dtg');
  assert.equal(back.note, DTG_NOTE);
});

test('an area edit reprices with the method the product follows to: a DTF price counts once the garment prints DTF', async () => {
  await setPrices({ [cat.tee]: { cents: 1700, dtfCents: 1900 } });
  const made = await newProduct(cat.tee);
  assert.equal(made.value.baseCostCents, 1700);
  assert.ok((await products.setPrice(storeId, made.value.id, 3000)).ok);
  await mark(cat.tee);

  const edited = await products.editProductAreas(storeId, made.value.id, { add: [{ position: 'back' }] });
  assert.ok(edited.ok, edited.ok ? '' : edited.error);
  assert.equal(edited.value.printServiceCode, 'dtf');
  assert.equal(edited.value.baseCostCents, 1900 + 100, 'the DTF price, and +1 for front and back');
  assert.equal(edited.note, DTF_NOTE);

  // a rename of a product that follows its garment never trips over its price: only an area change reprices it
  const tight = await newProduct(cat.hoodie);
  assert.ok((await products.setPrice(storeId, tight.value.id, tight.value.baseCostCents! + 100)).ok);
  await setPrices({ [cat.hoodie]: { cents: 5000, dtfCents: 6000 } });
  await mark(cat.hoodie);
  const renamed = await products.updateProduct(storeId, tight.value.id, { name: 'Hoodie, renamed' });
  assert.ok(renamed.ok, renamed.ok ? '' : renamed.error);
  assert.equal(renamed.value.printServiceCode, 'dtf');
  assert.equal(renamed.value.baseCostCents, tight.value.baseCostCents, 'the snapshot it was made with stands');
});

test('a product whose garment lists no digital method keeps the method it has, and embroidery and screen print stay as they are', async () => {
  const [unlisted] = await t.db
    .insert(schema.products)
    .values({ storeId, blankCode: 'STNP000', printServiceCode: 'dtg', name: 'Unlisted tee', placement: front, baseCostCents: 1000, retailPriceCents: 3000 })
    .returning();
  const renamed = await products.updateProduct(storeId, unlisted.id, { name: 'Unlisted tee, renamed' });
  assert.ok(renamed.ok, renamed.ok ? '' : renamed.error);
  assert.equal(renamed.value.printServiceCode, 'dtg');
  assert.equal(renamed.note, undefined);

  await mark(cat.hoodie);
  const embroidered = await products.createProduct({ storeId, blankCode: cat.hoodie, printServiceCode: 'embroidery', placement: front, colours: [cat.black], sizes: ['M'] });
  assert.ok(embroidered.ok);
  const edit = await products.updateProduct(storeId, embroidered.value.id, { name: 'Embroidered hoodie' });
  assert.ok(edit.ok);
  assert.equal(edit.value.printServiceCode, 'embroidery', 'outside print prep: as it was');

  const backing = await products.createProduct({ storeId, blankCode: cat.hoodie, printServiceCode: 'screen_2c', forRun: true, placement: front, colours: [cat.black], sizes: ['M'], name: 'Bulk run' });
  assert.ok(backing.ok, backing.ok ? '' : backing.error);
  const kept = await products.updateProduct(storeId, backing.value.id, { name: 'Bulk run, renamed' });
  assert.ok(kept.ok);
  assert.equal(kept.value.printServiceCode, 'screen_2c', 'a run keeps the method it was quoted with');
});

test('the print area and product tools tell the artist when the method moved, and only then', async () => {
  const made = await newProduct(cat.tee);
  const id = made.value.id;
  const quiet = await productTools.updateProductTool.run(ctx, { productId: id, name: 'Quiet tee' });
  assert.equal(quiet.data.ok, true, quiet.data.error);
  assert.equal(quiet.data.note, undefined);
  assert.equal(quiet.ui?.cards?.some((c) => c.kind === 'notice'), false);

  await mark(cat.tee);
  const moved = await productTools.setPrintAreasTool.run(ctx, { productId: id, add: [{ position: 'back' }] });
  assert.equal(moved.data.ok, true, moved.data.error);
  assert.equal(moved.data.note, DTF_NOTE);
  assert.equal(moved.data.print, 'Printed DTF on this garment');
  const card = moved.ui?.cards?.find((c) => c.kind === 'product') as { printService: string };
  assert.equal(card.printService, 'Printed DTF on this garment');
  assert.equal((moved.ui?.cards?.find((c) => c.kind === 'notice') as { text: string }).text, DTF_NOTE);
});
