// Ownership and position checks on the mockup tools, on PGlite. The renderers
// (mockupIo) are stubs that record their calls: a refused call must never
// reach them, and a call that passes must.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { seedTestCatalogue, type TEST_CATALOGUE } from '@/lib/services/test-catalogue';
import type { ToolContext, ToolResult } from '@/lib/tools/types';

process.env.FAL_API_KEY = '';

let t: TestDb;
let tools: typeof import('@/lib/tools/mockups');
let cat: typeof TEST_CATALOGUE;
const a = {} as { ctx: ToolContext; storeId: string; designId: string; productId: string; boundProductId: string };
const b = {} as { ctx: ToolContext; storeId: string; designId: string; productId: string };

const calls = { renderProduct: [] as string[], renderOnBlank: [] as { blankCode: string; colourCode: string; position: string; designUrl: string }[], designUrl: [] as string[] };

function ctxFor(userId: string, storeId: string | null): ToolContext {
  return { userId, clerkId: `clerk-${userId}`, role: 'artist', storeId, conversationId: 'c1', idempotencyKey: 'k1', locale: 'en' };
}

async function shopWithProduct(email: string) {
  const user = await seedUser(t.db, { email, withStore: true });
  const [design] = await t.db.insert(schema.designs).values({ storeId: user.storeId!, source: 'upload', originalUrl: `https://art.test/${email}.png` }).returning();
  const [product] = await t.db
    .insert(schema.products)
    .values({ storeId: user.storeId!, designId: design.id, blankCode: cat.tee, printServiceCode: 'dtg', name: `${email} tee`, placement: { position: 'front_chest', widthCm: 28 } })
    .returning();
  await t.db.insert(schema.productColours).values({ productId: product.id, colourCode: cat.black });
  return { ctx: ctxFor(user.userId, user.storeId), storeId: user.storeId!, designId: design.id, productId: product.id };
}

before(async () => {
  t = await setupTestDb();
  cat = await seedTestCatalogue(t.db);
  tools = await import('@/lib/tools/mockups');

  Object.assign(a, await shopWithProduct('a@merchfrom.test'));
  Object.assign(b, await shopWithProduct('b@merchfrom.test'));

  // a product of shop A whose design belongs to shop B: a state the services never create, refused anyway
  const [bound] = await t.db
    .insert(schema.products)
    .values({ storeId: a.storeId, designId: b.designId, blankCode: cat.tee, printServiceCode: 'dtg', name: 'crossed tee', placement: { position: 'front_chest', widthCm: 28 } })
    .returning();
  a.boundProductId = bound.id;

  tools.mockupIo.renderProductMockups = async (productId) => {
    calls.renderProduct.push(productId);
    return [{ colourCode: cat.black, url: 'https://mockups.test/black.webp' }];
  };
  tools.mockupIo.getDesignImageUrl = async (designId) => {
    calls.designUrl.push(designId);
    return `https://art.test/${designId}.png`;
  };
  tools.mockupIo.renderDesignOnBlank = async (input) => {
    calls.renderOnBlank.push({ blankCode: input.blankCode, colourCode: input.colourCode, position: input.placement.position, designUrl: input.designUrl });
    return `https://mockups.test/${input.colourCode}.webp`;
  };
});

beforeEach(() => {
  calls.renderProduct.length = 0;
  calls.renderOnBlank.length = 0;
  calls.designUrl.length = 0;
});

after(async () => {
  await t.close();
});

const noticeText = (result: ToolResult<unknown>) => (result.ui?.cards?.[0] as { text: string }).text;

// -- render_mockups ------------------------------------------------------------------------

test("render_mockups renders the caller's own product", async () => {
  const result = await tools.renderMockupsTool.run(a.ctx, { productId: a.productId });
  assert.deepEqual(result.data, { found: true, productId: a.productId, rendered: 1, colours: [cat.black] });
  assert.deepEqual(calls.renderProduct, [a.productId]);
});

test("render_mockups refuses another shop's product, exactly as if it did not exist", async () => {
  const theirs = await tools.renderMockupsTool.run(a.ctx, { productId: b.productId });
  const missing = await tools.renderMockupsTool.run(a.ctx, { productId: '00000000-0000-4000-8000-000000000000' });
  assert.deepEqual(theirs.data, { found: false, error: 'not_found' });
  assert.deepEqual(missing.data, theirs.data);
  assert.match(noticeText(theirs), /No product found with id /);
  assert.equal(calls.renderProduct.length, 0, 'nothing was rendered');
});

test("render_mockups refuses a product whose design is not in the caller's shop", async () => {
  const result = await tools.renderMockupsTool.run(a.ctx, { productId: a.boundProductId });
  assert.deepEqual(result.data, { found: false, error: 'not_found' });
  assert.match(noticeText(result), /was not found in your shop/);
  assert.equal(calls.renderProduct.length, 0);
});

test('render_mockups needs a shop', async () => {
  const result = await tools.renderMockupsTool.run(ctxFor(a.ctx.userId, null), { productId: a.productId });
  assert.deepEqual(result.data, { found: false, error: 'no_store' });
  assert.equal(calls.renderProduct.length, 0);
});

test('render_mockups says so when a saved placement is one the garment cannot take', async () => {
  const [sleeveTee] = await t.db
    .insert(schema.products)
    .values({ storeId: a.storeId, designId: a.designId, blankCode: cat.tee, printServiceCode: 'dtg', name: 'sleeve tee', placement: { position: 'sleeve', widthCm: 8 } })
    .returning();
  const result = await tools.renderMockupsTool.run(a.ctx, { productId: sleeveTee.id });
  assert.equal(result.data.found, true);
  assert.match(result.data.error ?? '', /"sleeve" is not a print position for T-shirts\. Say which sleeve: sleeve_left or sleeve_right\. T-shirts take: front_chest/);
  assert.equal(calls.renderProduct.length, 0, 'it is not moved to the chest and rendered');
});

// -- preview_on_blank ------------------------------------------------------------------------

test("preview_on_blank previews the caller's own design on each colour", async () => {
  const result = await tools.previewOnBlankTool.run(a.ctx, { designId: a.designId, blankCode: cat.tee, colourCodes: [cat.black, cat.white] });
  assert.deepEqual(result.data, { found: true, blankCode: cat.tee, colours: [cat.black, cat.white] });
  assert.deepEqual(
    calls.renderOnBlank.map((c) => [c.colourCode, c.position]),
    [[cat.black, 'front_chest'], [cat.white, 'front_chest']],
  );
  assert.equal(calls.renderOnBlank[0].designUrl, `https://art.test/${a.designId}.png`);
});

test("preview_on_blank refuses another shop's design before it reads or renders anything", async () => {
  const result = await tools.previewOnBlankTool.run(a.ctx, { designId: b.designId, blankCode: cat.tee, colourCodes: [cat.black] });
  assert.deepEqual(result.data, { found: false, error: 'not_found' });
  assert.match(noticeText(result), /No design found with id /);
  assert.equal(calls.designUrl.length, 0, "the other shop's art was never looked up");
  assert.equal(calls.renderOnBlank.length, 0);

  const missing = await tools.previewOnBlankTool.run(a.ctx, { designId: '00000000-0000-4000-8000-000000000000', blankCode: cat.tee, colourCodes: [cat.black] });
  assert.deepEqual(missing.data, result.data, 'it reads like a design that does not exist');
});

test('preview_on_blank needs a shop', async () => {
  const result = await tools.previewOnBlankTool.run(ctxFor(a.ctx.userId, null), { designId: a.designId, blankCode: cat.tee, colourCodes: [cat.black] });
  assert.deepEqual(result.data, { found: false, error: 'no_store' });
  assert.equal(calls.renderOnBlank.length, 0);
});

test('preview_on_blank refuses a sleeve and lists the positions the garment takes', async () => {
  const result = await tools.previewOnBlankTool.run(a.ctx, { designId: a.designId, blankCode: cat.tee, colourCodes: [cat.black], position: 'sleeve' });
  assert.equal(result.data.found, true);
  assert.match(result.data.error ?? '', /"sleeve" is not a print position for T-shirts\. T-shirts take: front_chest, front_full, front_left_chest, back\./);
  assert.equal(noticeText(result), result.data.error);
  // a real sleeve has no photo to preview on: it is drawn flat with the product's other pictures
  const left = await tools.previewOnBlankTool.run(a.ctx, { designId: a.designId, blankCode: cat.tee, colourCodes: [cat.black], position: 'sleeve_left' });
  assert.match(left.data.error ?? '', /A sleeve print has no garment photo to go on/);
  assert.equal(calls.renderOnBlank.length, 0, 'it is not moved to the chest and rendered');
});

test("preview_on_blank's usual spot is the garment's own: trousers print on the leg", async () => {
  const result = await tools.previewOnBlankTool.run(a.ctx, { designId: a.designId, blankCode: cat.shorts, colourCodes: [cat.black] });
  assert.equal(result.data.found, true);
  assert.equal(result.data.error, undefined);
  assert.deepEqual(calls.renderOnBlank.map((c) => c.position), ['front_leg']);

  const chest = await tools.previewOnBlankTool.run(a.ctx, { designId: a.designId, blankCode: cat.shorts, colourCodes: [cat.black], position: 'front_chest' });
  assert.match(chest.data.error ?? '', /Bottoms take: front_leg, back/);
  assert.equal(calls.renderOnBlank.length, 1);
});

test('preview_on_blank answers for a blank that does not exist instead of throwing', async () => {
  const result = await tools.previewOnBlankTool.run(a.ctx, { designId: a.designId, blankCode: 'STXX000', colourCodes: [cat.black] });
  assert.equal(result.data.error, 'unknown_blank');
  assert.match(noticeText(result), /No blank found with code STXX000/);
  assert.equal(calls.renderOnBlank.length, 0);
});
