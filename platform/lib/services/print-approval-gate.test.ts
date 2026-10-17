// Publishing waits on the design's approval (Print-Prep-Plan section 7, owner decision of 15 Oct): a product goes
// live only when its design's current version has an approval covering its blank, every enabled colour and its
// print position and width. That one approval replaces the per-product proof, so a draft is published with no
// proof at all. The real pipeline on PGlite, with the fake engine, pack, storage and queue.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { bootstrapPrint, GARMENTS, type Harness } from '@/lib/print/test-support';
import type { PrintPlacement } from '@/lib/print/types';

let h: Harness;
let products: typeof import('@/lib/services/products');
let proofs: typeof import('@/lib/services/proofs');

const BLACK = GARMENTS.black.code;
const NAVY = GARMENTS.navy.code;
const WHITE = GARMENTS.white.code;
const ALL = [BLACK, NAVY, WHITE];

before(async () => {
  h = await bootstrapPrint();
  products = await import('@/lib/services/products');
  proofs = await import('@/lib/services/proofs');
  // Payouts are connected, so a publish asks about nothing but what these tests are about.
  await h.db.insert(schema.stripeAccounts).values({ storeId: h.artist.storeId, accountId: 'acct_test', chargesEnabled: true, payoutsEnabled: true });
});

after(async () => {
  await h.close();
});

// -- helpers --------------------------------------------------------------------

interface ProductOpts {
  colours?: string[];
  placement?: { position: string; widthCm: number };
  name?: string;
  service?: string;
  status?: 'draft' | 'proof_pending' | 'live' | 'archived';
  blankCode?: string;
  /** a proof the product already has, from before shop products stopped needing one; none by default */
  proof?: 'pending' | 'approved' | 'changes_requested';
}

/** A product that only the artwork stands in the way of: a draft with a price and the shop's payouts connected.
 * It has no proof: a shop product doesn't need one. */
async function product(designId: string | null, opts: ProductOpts = {}): Promise<string> {
  const [row] = await h.db
    .insert(schema.products)
    .values({
      storeId: h.artist.storeId,
      designId,
      blankCode: opts.blankCode ?? 'STTU169',
      printServiceCode: opts.service ?? 'dtg',
      name: opts.name ?? 'Underwriter tee',
      placement: opts.placement ?? { position: 'front_chest', widthCm: 28 },
      baseCostCents: 1500,
      retailPriceCents: 3500,
      status: opts.status ?? 'draft',
    })
    .returning({ id: schema.products.id });
  // A mockup is already there, so nothing is rendered when a colour is added.
  await h.db.insert(schema.productColours).values((opts.colours ?? ALL).map((colourCode) => ({ productId: row.id, colourCode, mockupUrl: 'https://img.test/mockup.webp' })));
  if (opts.proof) await h.db.insert(schema.proofs).values({ productId: row.id, version: 1, status: opts.proof });
  return row.id;
}

const publish = (productId: string) => products.publishProduct(h.artist.storeId, productId);
const statusOf = async (productId: string) => (await h.db.select().from(schema.products).where(eq(schema.products.id, productId)))[0].status;
const coloursOf = async (productId: string) =>
  (await h.db.select().from(schema.productColours).where(eq(schema.productColours.productId, productId))).map((r) => r.colourCode).sort();

/** Prepares some colours at a position, as the artist's prepare_print does, and runs the job as the worker would. */
async function prepare(designId: string, drop: { colours?: string[]; position?: string; widthMm?: number; blankCode?: string } = {}) {
  const queued = await h.printPrep.preparePrint({
    ...h.drop(designId),
    blankCode: drop.blankCode ?? 'STTU169',
    garmentCodes: drop.colours ?? ALL,
    placements: [{ position: drop.position ?? 'front_chest', widthMm: drop.widthMm ?? 280 }],
  });
  assert.ok(queued.ok, queued.ok ? '' : queued.error);
  await h.runJob(queued.value.jobId);
  return queued.value.designVersionId;
}

async function approve(designId: string) {
  const version = await h.printPrep.latestVersion(designId);
  assert.ok(version, 'prepared first');
  const result = await h.printPrep.approveDesign({ storeId: h.artist.storeId, userId: h.artist.userId, designId, versionId: version.id });
  assert.ok(result.ok, result.ok ? '' : result.error);
}

const revoke = (designId: string) => h.printPrep.revokeApproval({ user: { id: h.artist.userId }, store: { id: h.artist.storeId } }, designId);

/** The refusal of a publish: its sentence, the reason and the step it points to. */
async function refusal(productId: string) {
  const result = await publish(productId);
  assert.equal(result.ok, false, 'it was published');
  if (result.ok) throw new Error('unreachable');
  return { error: result.error, reason: result.approval?.reason, step: result.approval?.step?.kind, approval: result.approval };
}

// -- the rule -------------------------------------------------------------------------

test('a product with no design cannot be published', async () => {
  const id = await product(null);
  const refused = await refusal(id);
  assert.equal(refused.reason, 'no_design');
  assert.equal(refused.step, 'design');
  assert.equal(refused.error, 'Underwriter tee has no artwork yet, so there is nothing to approve. Make a new product from your artwork and approve that.');
  assert.equal(refused.approval?.prepare, null, 'there is nothing to prepare without a design');
  assert.equal(await statusOf(id), 'draft', 'and it stays where it was');
});

test('a design nobody has prepared cannot be published: the next step is to prepare the print files', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  const refused = await refusal(id);
  assert.equal(refused.reason, 'not_prepared');
  assert.equal(refused.step, 'prepare');
  assert.equal(refused.error, "The print files don't cover the Underwriter tee yet. Prepare them and approve the artwork first.");
  // What prepare_print needs, for the assistant: the blank, every colour on the product and the print position.
  assert.deepEqual(refused.approval?.prepare, { productId: id, designId, blankCode: 'STTU169', colourCodes: ALL, position: 'front_chest', widthCm: 28 });
  assert.equal(refused.approval?.step?.prompt, 'Prepare the print files for Underwriter tee');
  assert.equal(await statusOf(id), 'draft');
});

test('print files nobody has approved cannot be published: Approve the artwork first', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId);
  const refused = await refusal(id);
  assert.equal(refused.reason, 'not_approved');
  assert.equal(refused.step, 'approve');
  assert.equal(refused.error, 'Approve the artwork for the Underwriter tee first.');
  assert.equal(await statusOf(id), 'draft');
});

test('print files that are still being made are said to be on the way', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  const queued = await h.printPrep.preparePrint(h.drop(designId));
  assert.ok(queued.ok);
  const refused = await refusal(id);
  assert.equal(refused.reason, 'preparing');
  assert.equal(refused.error, "The print files for the Underwriter tee are still being prepared. Approve the artwork once they're ready.");
  assert.equal(refused.step, 'approve', 'the approval page shows the progress');

  // Finished, they wait for the artist.
  await h.runJob(queued.value.jobId);
  assert.equal((await refusal(id)).reason, 'not_approved');
});

test('a design whose approval covers the product publishes it', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId);
  await approve(designId);

  const result = await publish(id);
  assert.ok(result.ok, result.ok ? '' : result.error);
  assert.equal(result.value.status, 'live');
  assert.equal(await statusOf(id), 'live');

  // The approval is the design's: a second product on the same garment, colours and print is covered too.
  const second = await product(designId, { name: 'Underwriter longsleeve' });
  assert.ok((await publish(second)).ok);
});

test('an undone approval blocks publishing again, and a new approval lifts it', async () => {
  const { designId } = await h.newDesign();
  const first = await product(designId);
  const second = await product(designId, { name: 'Underwriter longsleeve' });
  await prepare(designId);
  await approve(designId);
  assert.ok((await publish(first)).ok);

  assert.deepEqual(await revoke(designId), { ok: true, value: null });
  const refused = await refusal(second);
  assert.equal(refused.reason, 'withdrawn');
  assert.equal(refused.step, 'approve');
  assert.equal(refused.error, 'Approve the artwork for the Underwriter longsleeve first. Your earlier approval was withdrawn.');
  assert.equal(await statusOf(second), 'draft');
  // A product that is already live is not taken down: nothing unpublishes automatically.
  assert.equal(await statusOf(first), 'live');

  await approve(designId);
  assert.ok((await publish(second)).ok);
});

test('a colour the print files do not include blocks the publish, and the sentence names it', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  // Prepared and approved for Black and French Navy only; the product also has White.
  await prepare(designId, { colours: [BLACK, NAVY] });
  await approve(designId);

  const refused = await refusal(id);
  assert.equal(refused.reason, 'not_prepared');
  assert.equal(refused.step, 'prepare');
  assert.equal(refused.error, "The print files don't cover the White Underwriter tee yet. Prepare them and approve the artwork first.");
  assert.deepEqual(refused.approval?.missingColours, ['White']);
  assert.deepEqual(refused.approval?.prepare?.colourCodes, ALL, 'the files are prepared for every colour on the product');

  // Prepared for White too, but the approval was given before: it does not include it.
  await prepare(designId, { colours: [WHITE] });
  const unapproved = await refusal(id);
  assert.equal(unapproved.reason, 'not_covered');
  assert.equal(unapproved.step, 'approve');
  assert.equal(unapproved.error, "Approve the artwork for the White Underwriter tee first. Your earlier approval doesn't include it.");

  await approve(designId);
  assert.ok((await publish(id)).ok);
});

test('a product with fewer colours is covered by an approval of more', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { colours: [NAVY] });
  await prepare(designId);
  await approve(designId);
  assert.ok((await publish(id)).ok);
});

test('another print width or position blocks the publish until it is prepared and approved', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);

  const wider = await product(designId, { placement: { position: 'front_chest', widthCm: 30 } });
  const refusedWidth = await refusal(wider);
  assert.equal(refusedWidth.reason, 'not_prepared');
  assert.equal(refusedWidth.error, "The print files don't cover the Underwriter tee yet. Prepare them and approve the artwork first.");
  assert.deepEqual(refusedWidth.approval?.prepare, { productId: wider, designId, blankCode: 'STTU169', colourCodes: ALL, position: 'front_chest', widthCm: 30 });

  const back = await product(designId, { name: 'Underwriter tee, back print', placement: { position: 'back', widthCm: 32 } });
  assert.equal((await refusal(back)).reason, 'not_prepared');

  // The back is prepared, then approved: it covers the back and still the front.
  await prepare(designId, { position: 'back', widthMm: 320 });
  assert.equal((await refusal(back)).reason, 'not_covered');
  await approve(designId);
  assert.ok((await publish(back)).ok);
  assert.equal((await refusal(wider)).reason, 'not_prepared', 'but not a width nobody prepared');
  const front = await product(designId);
  assert.ok((await publish(front)).ok, 'and the front is still covered');
});

test('an approval of one garment does not cover another that uses the same design', async () => {
  const { designId } = await h.newDesign();
  await h.db.insert(schema.blanks).values({ code: 'STSU177', name: 'Hoodie', type: 'Sweats & Hoodies' });
  await h.db.insert(schema.blankColours).values({ blankCode: 'STSU177', colourCode: BLACK });
  await prepare(designId);
  await approve(designId);

  const hoodie = await product(designId, { name: 'Underwriter hoodie', blankCode: 'STSU177', colours: [BLACK] });
  const refused = await refusal(hoodie);
  assert.equal(refused.reason, 'not_prepared');
  assert.equal(refused.error, "The print files don't cover the Underwriter hoodie yet. Prepare them and approve the artwork first.");
  assert.equal(refused.approval?.prepare?.blankCode, 'STSU177');

  await prepare(designId, { blankCode: 'STSU177', colours: [BLACK] });
  await approve(designId);
  assert.ok((await publish(hoodie)).ok);
});

test('new artwork needs a new approval: the old one is of the earlier version', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  await prepare(designId);
  await approve(designId);

  h.fakes.setArt(designId, Buffer.from('the artwork, redrawn'));
  await prepare(designId);
  const refused = await refusal(id);
  assert.equal(refused.reason, 'newer_version');
  assert.equal(refused.error, 'Approve the artwork for the Underwriter tee first. The artwork changed since you last approved it.');

  await approve(designId);
  assert.ok((await publish(id)).ok);
});

test('the status, the price and the payouts are still asked, after the artwork', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);

  // A product that is already live, or archived, is not published again.
  const live = await product(designId, { status: 'live' });
  assert.deepEqual(await publish(live), { ok: false, error: 'This product is already live.' });
  const archived = await product(designId, { status: 'archived' });
  assert.deepEqual(await publish(archived), { ok: false, error: 'This product is archived and can no longer be published.' });

  // With nothing approved the artwork is said first, before the price.
  const other = await h.newDesign();
  const unpriced = await product(other.designId);
  await h.db.update(schema.products).set({ retailPriceCents: null }).where(eq(schema.products.id, unpriced));
  assert.equal((await refusal(unpriced)).reason, 'not_prepared');

  const priced = await product(designId);
  await h.db.update(schema.products).set({ retailPriceCents: null }).where(eq(schema.products.id, priced));
  const noPrice = await publish(priced);
  assert.deepEqual(noPrice, { ok: false, error: 'Set a retail price (at least €1 above the base cost) before publishing.' });

  await h.db.update(schema.stripeAccounts).set({ payoutsEnabled: false }).where(eq(schema.stripeAccounts.storeId, h.artist.storeId));
  try {
    const noPayouts = await publish(await product(designId));
    assert.equal(noPayouts.ok, false);
    assert.match(noPayouts.ok ? '' : noPayouts.error, /Stripe payouts are connected/);
  } finally {
    await h.db.update(schema.stripeAccounts).set({ payoutsEnabled: true }).where(eq(schema.stripeAccounts.storeId, h.artist.storeId));
  }
});

// -- no proof of its own ------------------------------------------------------------------

test('a shop product needs no proof: with the artwork approved, a draft with no proof publishes', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);
  const id = await product(designId);
  assert.equal((await h.db.select().from(schema.proofs).where(eq(schema.proofs.productId, id))).length, 0, 'there is no proof of any kind');
  assert.equal(await statusOf(id), 'draft');

  const checked = await products.checkPublishable(h.artist.storeId, id);
  assert.ok(checked.ok, checked.ok ? '' : checked.error);
  const result = await publish(id);
  assert.ok(result.ok, result.ok ? '' : result.error);
  assert.equal(result.value.status, 'live', 'straight from draft to live');
  assert.equal((await h.db.select().from(schema.proofs).where(eq(schema.proofs.productId, id))).length, 0, 'and publishing made no proof');
});

test('a draft goes live printed the way its garment does now: marked "Print with DTF" since it was made, it publishes as DTF', async () => {
  const pricing = await import('@/lib/services/pricing-admin');
  // the harness lists no print services for its tee: DTG and DTF, as the catalogue gives a T-shirt
  await h.db.insert(schema.printServices).values({ code: 'dtf', name: 'DTF' });
  await h.db.insert(schema.blankPrintServices).values(['dtg', 'dtf'].map((printServiceCode) => ({ blankCode: 'STTU169', printServiceCode })));
  try {
    const { designId } = await h.newDesign();
    await prepare(designId);
    await approve(designId);
    const untouched = await product(designId);
    const marked = await product(designId, { name: 'Underwriter tee, marked' });

    // nothing is marked: the tee prints DTG, a draft stays as it was and publishes with nothing to say
    const plain = await publish(untouched);
    assert.ok(plain.ok, plain.ok ? '' : plain.error);
    assert.equal(plain.value.printServiceCode, 'dtg');
    assert.equal(plain.note, undefined);

    // the owner marks the tee while a draft is waiting: publishing moves the draft to DTF, and says so
    assert.ok((await pricing.setPodPrices(h.owner, { dtfInstead: { STTU169: true } })).ok);
    assert.equal((await h.db.select().from(schema.products).where(eq(schema.products.id, marked)))[0].printServiceCode, 'dtg', 'nothing moves before the publish');
    const checked = await products.checkPublishable(h.artist.storeId, marked);
    assert.ok(checked.ok, checked.ok ? '' : checked.error);
    assert.deepEqual(checked.follow, { code: 'dtf', note: "Printed DTF on this garment, since DTG isn't ideal for it." });
    const result = await publish(marked);
    assert.ok(result.ok, result.ok ? '' : result.error);
    assert.equal(result.value.status, 'live');
    assert.equal(result.value.printServiceCode, 'dtf');
    assert.equal(result.value.printServiceName, 'DTF');
    assert.equal(result.note, "Printed DTF on this garment, since DTG isn't ideal for it.");
    assert.equal((await h.db.select().from(schema.products).where(eq(schema.products.id, marked)))[0].printServiceCode, 'dtf', 'stored');

    // a product made DTF that publishes with the mark still on has nothing to move
    const already = await product(designId, { name: 'Underwriter tee, made as DTF', service: 'dtf' });
    const same = await publish(already);
    assert.ok(same.ok, same.ok ? '' : same.error);
    assert.equal(same.note, undefined);
  } finally {
    await h.db.delete(schema.appSettings).where(eq(schema.appSettings.key, 'pod_price_table'));
    await h.db.delete(schema.blankPrintServices).where(eq(schema.blankPrintServices.blankCode, 'STTU169'));
  }
});

test('without the artwork approval a draft with an approved proof still cannot go live: the proof is not the gate', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { proof: 'approved' });
  assert.equal((await refusal(id)).reason, 'not_prepared');
  await prepare(designId);
  assert.equal((await refusal(id)).reason, 'not_approved');
  await approve(designId);
  assert.ok((await publish(id)).ok);
});

test('a proof a product has from before is neither asked nor read: pending, sent back or approved, the artwork decides', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);
  for (const proof of ['pending', 'changes_requested', 'approved'] as const) {
    const id = await product(designId, { proof, status: proof === 'approved' ? 'draft' : 'proof_pending' });
    const result = await publish(id);
    assert.ok(result.ok, `${proof}: ${result.ok ? '' : result.error}`);
    assert.equal(result.value.status, 'live', proof);
    // The row is left as it was, and still reads.
    const [row] = await h.db.select().from(schema.proofs).where(eq(schema.proofs.productId, id));
    assert.equal(row.status, proof, 'nothing was migrated');
    assert.equal((await proofs.getLatestProof(h.artist.storeId, id))?.status, proof);
  }
});

test('a product that was already waiting on a proof (proof_pending) goes live on the artwork alone', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { status: 'proof_pending' });
  assert.equal((await refusal(id)).reason, 'not_prepared');
  await prepare(designId);
  await approve(designId);
  assert.ok((await publish(id)).ok);
  assert.equal(await statusOf(id), 'live');
});

test('the status machine goes draft to live; proof_pending is no longer entered', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  assert.deepEqual(await products.transition(id, 'proof_pending'), { ok: false, error: `Can't move a product from "draft" to "proof_pending".` });
  assert.equal(await statusOf(id), 'draft');
  // Products already there still have their ways out.
  const waiting = await product(designId, { status: 'proof_pending' });
  assert.deepEqual(await products.transition(waiting, 'draft'), { ok: true, value: 'draft' });
});

test('a run-only print method is refused before anything is said about the artwork', async () => {
  await h.db.update(schema.printServices).set({ availableInShop: false }).where(eq(schema.printServices.code, 'screen_2c'));
  const { designId } = await h.newDesign();
  const id = await product(designId, { service: 'screen_2c' });
  const result = await publish(id);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? '' : result.error, "Screen print, 2 colours is for runs, so this product can't go to your shop. Shop products print DTG or DTF.");
  assert.equal(result.ok ? undefined : result.approval, undefined);
  assert.equal(await statusOf(id), 'draft');
});

test('a product that prints with no print file to make (embroidery) has nothing to approve', async () => {
  await h.db.update(schema.printServices).set({ availableInShop: true }).where(eq(schema.printServices.code, 'embroidery'));
  const { designId } = await h.newDesign();
  const id = await product(designId, { service: 'embroidery' });
  const result = await publish(id);
  assert.ok(result.ok, result.ok ? '' : result.error);
  assert.equal(await statusOf(id), 'live');
});

// -- live products ------------------------------------------------------------------

test('a live product stays live when its approval is withdrawn, and harmless edits still go through', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { colours: [BLACK, NAVY] });
  await prepare(designId);
  await approve(designId);
  assert.ok((await publish(id)).ok);

  assert.deepEqual(await revoke(designId), { ok: true, value: null });
  assert.equal(await statusOf(id), 'live');

  const storeId = h.artist.storeId;
  const renamed = await products.updateProduct(storeId, id, { name: 'Underwriter tee, new name', description: 'Heavy cotton.' });
  assert.ok(renamed.ok, renamed.ok ? '' : renamed.error);
  const fewer = await products.updateProduct(storeId, id, { colours: [BLACK] });
  assert.ok(fewer.ok, 'taking a colour away puts nothing new in front of fans');
  assert.deepEqual(await coloursOf(id), [BLACK]);
  const same = await products.updateProduct(storeId, id, { colours: [BLACK], placement: { position: 'front_chest', widthCm: 28 } });
  assert.ok(same.ok, 'the same colours and print add nothing');
});

test('adding a colour to a live product needs the approval to cover it', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { colours: [BLACK] });
  await prepare(designId, { colours: [BLACK] });
  await approve(designId);
  assert.ok((await publish(id)).ok);

  const storeId = h.artist.storeId;
  const refused = await products.updateProduct(storeId, id, { colours: [BLACK, NAVY] });
  assert.equal(refused.ok, false);
  if (refused.ok) throw new Error('unreachable');
  assert.equal(refused.error, "The print files don't cover the French Navy Underwriter tee yet. Prepare them and approve the artwork first.");
  assert.equal(refused.approval?.reason, 'not_prepared');
  assert.deepEqual(await coloursOf(id), [BLACK], 'nothing was written');

  await prepare(designId, { colours: [NAVY] });
  const unapproved = await products.updateProduct(storeId, id, { colours: [BLACK, NAVY] });
  assert.equal(unapproved.ok, false);
  assert.equal(unapproved.ok ? '' : unapproved.error, "Approve the artwork for the French Navy Underwriter tee first. Your earlier approval doesn't include it.");
  assert.deepEqual(await coloursOf(id), [BLACK]);

  await approve(designId);
  const allowed = await products.updateProduct(storeId, id, { colours: [BLACK, NAVY] });
  assert.ok(allowed.ok, allowed.ok ? '' : allowed.error);
  assert.deepEqual(await coloursOf(id), [BLACK, NAVY].sort());
  assert.equal(await statusOf(id), 'live');
});

test('moving the print on a live product needs the approval to cover every colour at the new place', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { colours: [BLACK, NAVY] });
  await prepare(designId);
  await approve(designId);
  assert.ok((await publish(id)).ok);

  const storeId = h.artist.storeId;
  const refused = await products.updateProduct(storeId, id, { placement: { position: 'back', widthCm: 32 } });
  assert.equal(refused.ok, false);
  assert.equal(refused.ok ? '' : refused.error, "The print files don't cover the Underwriter tee yet. Prepare them and approve the artwork first.");
  const [row] = await h.db.select().from(schema.products).where(eq(schema.products.id, id));
  assert.deepEqual(row.placement, { position: 'front_chest', widthCm: 28 }, 'the print stayed where it was');

  await prepare(designId, { colours: [BLACK, NAVY], position: 'back', widthMm: 320 });
  await approve(designId);
  const moved = await products.updateProduct(storeId, id, { placement: { position: 'back', widthCm: 32 } });
  assert.ok(moved.ok, moved.ok ? '' : moved.error);
});

test('a product that is not live can be edited freely: the artwork is asked when it is published', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { colours: [BLACK] });
  const storeId = h.artist.storeId;
  const edited = await products.updateProduct(storeId, id, { colours: [BLACK, NAVY, WHITE], placement: { position: 'back', widthCm: 32 } });
  assert.ok(edited.ok, edited.ok ? '' : edited.error);
  assert.equal((await refusal(id)).reason, 'not_prepared');
});

// -- the helper -------------------------------------------------------------------------

test('approvalCoverage says what is covered and what each colour waits on', async () => {
  const { designId } = await h.newDesign();
  const front: PrintPlacement = { position: 'front_chest', widthMm: 280 };
  const ask = (colours: string[], placement: PrintPlacement = front, blankCode = 'STTU169') => h.printPrep.approvalCoverage(designId, { blankCode, colours, placement });

  // Nothing prepared: every colour waits on its print files.
  assert.deepEqual(await ask([BLACK, WHITE]), {
    covered: false,
    reason: 'not_prepared',
    asked: 2,
    missing: [
      { code: BLACK, name: 'Black', step: 'prepare' },
      { code: WHITE, name: 'White', step: 'prepare' },
    ],
  });

  // Prepared: they wait on the approval instead.
  await prepare(designId, { colours: [BLACK, NAVY] });
  const unapproved = await ask([BLACK, NAVY, WHITE]);
  assert.equal(unapproved.reason, 'not_prepared');
  assert.deepEqual(unapproved.missing.map((m) => [m.code, m.step]), [[BLACK, 'approve'], [NAVY, 'approve'], [WHITE, 'prepare']]);
  assert.deepEqual((await ask([BLACK])).missing, [{ code: BLACK, name: 'Black', step: 'approve' }]);

  await approve(designId);
  assert.deepEqual(await ask([BLACK, NAVY]), { covered: true, reason: null, asked: 2, missing: [] });
  assert.equal((await ask([BLACK, NAVY], { position: 'front_chest', widthMm: 281 })).covered, false, 'a width a millimetre off is another print');
  assert.equal((await ask([BLACK, NAVY], { ...front, offsetYMm: 0 })).covered, true, 'no offset and a zero offset are the same place');
  assert.equal((await ask([BLACK, NAVY], { ...front, offsetYMm: 30 })).covered, false, 'a print lower on the chest is another print');
  assert.equal((await ask([BLACK, NAVY], front, 'STSU177')).covered, false);

  // With no colours named it asks about the print position alone.
  assert.equal((await ask([])).covered, true);
  const back: PrintPlacement = { position: 'back', widthMm: 320 };
  assert.deepEqual(await ask([], back), { covered: false, reason: 'not_prepared', asked: 0, missing: [] });
  const queued = await h.printPrep.preparePrint({ ...h.drop(designId), placements: [back] });
  assert.ok(queued.ok);
  assert.equal((await ask([], back)).reason, 'preparing', 'and a job on that position is on the way');
  assert.equal((await ask([], { position: 'front_chest', widthMm: 300 })).reason, 'not_prepared', 'but not a job for another position');
});

test('the coverage helper reads only: asking changes nothing', async () => {
  const { designId } = await h.newDesign();
  await prepare(designId);
  await approve(designId);
  const count = async () => ({
    approvals: (await h.db.select().from(schema.designApprovals)).length,
    packs: (await h.db.select().from(schema.productionPacks)).length,
    jobs: (await h.db.select().from(schema.printJobs)).length,
    versions: (await h.db.select().from(schema.designVersions)).length,
  });
  const before = await count();
  await h.printPrep.approvalCoverage(designId, { blankCode: 'STTU169', colours: ALL, placement: { position: 'front_chest', widthMm: 280 } });
  await h.printPrep.approvalCoverage(designId, { blankCode: 'STTU169', colours: ALL, placement: { position: 'back', widthMm: 320 } });
  await h.printPrep.productApproval(h.artist.storeId, await product(designId));
  assert.deepEqual(await count(), before);
});

test('productApproval is for the shop that owns the product', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId);
  assert.equal((await h.printPrep.productApproval(h.artist.storeId, id))?.reason, 'not_prepared');
  assert.equal(await h.printPrep.productApproval(h.artist.storeId, 'not-a-uuid'), null);
  assert.equal(await h.printPrep.productApproval('5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11', id), null);
});

test('PRINT_MOCK=1 covers everything, like the other mocked approval calls', async () => {
  const { designId } = await h.newDesign();
  process.env.PRINT_MOCK = '1';
  try {
    const mocked = await h.printPrep.approvalCoverage(designId, { blankCode: 'STTU169', colours: ALL, placement: { position: 'front_chest', widthMm: 280 } });
    assert.deepEqual(mocked, { covered: true, reason: null, asked: 3, missing: [] });
  } finally {
    delete process.env.PRINT_MOCK;
  }
  assert.equal((await h.printPrep.approvalCoverage(designId, { blankCode: 'STTU169', colours: ALL, placement: { position: 'front_chest', widthMm: 280 } })).covered, false);
});

test('the sentences name the product and its colours, and never a Pantone code', async () => {
  const { designId } = await h.newDesign();
  const id = await product(designId, { name: 'Tour tee, back print' });
  await prepare(designId);
  // Pre-press has entered a code for one ink: it stays in the admin.
  const [darks] = (await h.packs((await h.printPrep.latestVersion(designId))?.id)).filter((p) => p.screenSetKey === 'darks');
  const assigned = await h.pantone.assignPantone(h.owner, { packId: darks.id, plateIndex: 2, code: '237 c' });
  assert.ok(assigned.ok);

  const refused = await refusal(id);
  const everything = JSON.stringify(refused);
  assert.doesNotMatch(everything, /pantone|237/i);
  assert.equal(refused.error, 'Approve the artwork for the Tour tee, back print first.');
});
