// The run tool on PGlite: the print method a line names is the one the run
// gets (screen print, or digital, which is the garment's own method), including on a line that leans on a default
// product or blank.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { seedTestCatalogue, type TEST_CATALOGUE } from '@/lib/services/test-catalogue';
import type { ToolContext } from '@/lib/tools/types';

process.env.FAL_API_KEY = '';

let t: TestDb;
let tools: typeof import('@/lib/tools/bulk');
let bulk: typeof import('@/lib/services/bulk');
let products: typeof import('@/lib/services/products');
let cat: typeof TEST_CATALOGUE;
let ctx: ToolContext;
let storeId: string;

const shipTo = { name: 'Ana Artist', line1: 'Carrer de Mallorca 1', city: 'Barcelona', postcode: '08001', country: 'ES' };

before(async () => {
  t = await setupTestDb();
  cat = await seedTestCatalogue(t.db);
  tools = await import('@/lib/tools/bulk');
  bulk = await import('@/lib/services/bulk');
  products = await import('@/lib/services/products');
  const user = await seedUser(t.db, { email: 'artist@merchfrom.test', withStore: true });
  storeId = user.storeId!;
  ctx = { userId: user.userId, clerkId: 'clerk-artist', role: 'artist', storeId, conversationId: randomUUID(), idempotencyKey: 'k', locale: 'en' };
});

after(async () => {
  await t.close();
});

async function methodsOfRun(result: Awaited<ReturnType<typeof tools.createBulkQuoteTool.run>>): Promise<string[]> {
  assert.equal(result.data.ok, true, result.data.error);
  const card = result.ui?.cards?.find((c) => c.kind === 'bulk_quote') as { bulkOrderId: string } | undefined;
  assert.ok(card);
  const run = await bulk.getBulkOrder(storeId, card.bulkOrderId);
  return run!.lines.map((l) => l.printServiceCode);
}

test('a line that names only its method keeps it, whatever the default blank would print with', async () => {
  // no product, no blank: the demo hoodie stands in, and its default is screen_1c
  const dtg = await tools.createBulkQuoteTool.run(ctx, { lines: [{ printServiceCode: 'dtg', colourCode: cat.black, sizes: { M: 30 } }], shipTo });
  assert.deepEqual(await methodsOfRun(dtg), ['dtg']);

  const bare = await tools.createBulkQuoteTool.run(ctx, { lines: [{ colourCode: cat.black, sizes: { M: 30 } }], shipTo });
  assert.deepEqual(await methodsOfRun(bare), ['screen_1c']);
});

test('a run of a DTG shop product, quoted as screen print through the tool', async () => {
  const made = await products.createProduct({
    storeId,
    blankCode: cat.tee,
    printServiceCode: 'dtg',
    placement: { position: 'front_chest', widthCm: 28 },
    colours: [cat.black],
    sizes: ['M'],
  });
  assert.ok(made.ok, made.ok ? '' : made.error);

  const screen = await tools.createBulkQuoteTool.run(ctx, { lines: [{ productId: made.value.id, printServiceCode: 'screen_2c', colourCode: cat.black, sizes: { M: 40 } }], shipTo });
  assert.deepEqual(await methodsOfRun(screen), ['screen_2c']);

  const asSold = await tools.createBulkQuoteTool.run(ctx, { lines: [{ productId: made.value.id, colourCode: cat.black, sizes: { M: 40 } }], shipTo });
  assert.deepEqual(await methodsOfRun(asSold), ['dtg']);
});

test('a refused method reads in plain words, without codes in brackets or the word bulk', async () => {
  const result = await tools.createBulkQuoteTool.run(ctx, { lines: [{ blankCode: cat.tee, printServiceCode: 'embroidery', placement: { position: 'front_chest', widthCm: 28 }, colourCode: cat.black, sizes: { M: 5 } }], shipTo });
  assert.equal(result.data.ok, false);
  assert.match(result.data.error ?? '', /"embroidery" isn't offered on/);
  assert.match(result.data.error ?? '', /screen_1c \(Screen print \(1 colour\)\)/);
  assert.match(result.data.error ?? '', /digital \(Direct-to-garment print\)/);
  assert.doesNotMatch(result.data.error ?? '', /\(STTU169\)/);
});

test('a digital line is the garment\'s method, and a dtg or dtf that disagrees is corrected with a note, never an error', async () => {
  // shorts have no DTG: digital is DTF, and a 'dtg' asked for is corrected
  const place = { position: 'front_leg', widthCm: 12 };
  const digital = await tools.createBulkQuoteTool.run(ctx, { lines: [{ blankCode: cat.shorts, printServiceCode: 'digital', placement: place, colourCode: cat.black, sizes: { M: 30 } }], shipTo });
  assert.deepEqual(await methodsOfRun(digital), ['dtf']);
  assert.equal(digital.data.note, undefined, 'nothing to correct');

  const dtg = await tools.createBulkQuoteTool.run(ctx, { lines: [{ blankCode: cat.shorts, printServiceCode: 'dtg', placement: place, colourCode: cat.black, sizes: { M: 30 } }], shipTo });
  assert.deepEqual(await methodsOfRun(dtg), ['dtf']);
  assert.equal(dtg.data.note, "Printed DTF on this garment, since DTG isn't ideal for it.");
  const notice = dtg.ui?.cards?.find((c) => c.kind === 'notice' && c.id.startsWith('bulk_method_')) as { text: string } | undefined;
  assert.equal(notice?.text, dtg.data.note, 'the artist sees the note too');

  // the tee prints DTG: 'digital' and a 'dtf' that disagrees both give DTG
  const tee = { blankCode: cat.tee, placement: { position: 'front_chest', widthCm: 28 }, colourCode: cat.black, sizes: { M: 30 } };
  assert.deepEqual(await methodsOfRun(await tools.createBulkQuoteTool.run(ctx, { lines: [{ ...tee, printServiceCode: 'digital' }], shipTo })), ['dtg']);
  const dtf = await tools.createBulkQuoteTool.run(ctx, { lines: [{ ...tee, printServiceCode: 'dtf' }], shipTo });
  assert.deepEqual(await methodsOfRun(dtf), ['dtg']);
  assert.equal(dtf.data.note, 'Printed DTG on this garment.');
});
