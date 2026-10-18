/**
 * Product/quote/proof service smoke test — calls the services directly (no
 * agent loop, no HTTP) against the smoke user/store from agent-smoke.ts, so
 * it exercises the create -> price -> proof -> approve -> publish -> archive
 * state machine end to end without needing ANTHROPIC_API_KEY.
 *
 * Run with: `AGENT_MOCK=1 npx tsx scripts/products-smoke.ts` (from `platform/`).
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (`lib/db.ts` calls `neon()` at module scope) — every value import
 * below is a dynamic `import()` inside `main()`, after `config()` has run.
 */

import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
process.env.AGENT_MOCK = process.env.AGENT_MOCK ?? '1';

const HOODIE_BLANK = 'STSU177'; // 'Cruiser 2.0' — has dtg, C002, sizes S-XXL in the seed
const PRINT_SERVICE = 'dtg'; // shop products print DTG/DTF only (screen print is for runs)
const COLOUR = 'C002'; // Black
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function eur(cents: number | null | undefined): string {
  return cents == null ? 'n/a' : `€${(cents / 100).toFixed(2)}`;
}

async function main() {
  const { eq } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { createProduct, getProduct, setPrice, publishProduct, archiveProduct } = await import('../lib/services/products');
  const { quoteFor } = await import('../lib/services/quotes');

  async function ensureSmokeUser() {
    const clerkId = 'smoke-test';
    const existing = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.users)
      .values({ clerkId, email: 'smoke@blackoutmerch.test', displayName: 'Smoke Test', role: 'artist' })
      .returning();
    return created;
  }

  async function ensureSmokeStore(userId: string) {
    const existing = await db.select().from(schema.artistStores).where(eq(schema.artistStores.artistId, userId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.artistStores)
      .values({ artistId: userId, slug: 'smoke-shop', name: 'Smoke Shop', country: 'ES', currency: 'EUR', locale: 'en' })
      .returning();
    return created;
  }

  const user = await ensureSmokeUser();
  const store = await ensureSmokeStore(user.id);
  console.log(`Smoke store: ${store.name} (${store.id})`);

  // -- quote --------------------------------------------------------------
  console.log('\n=== get_quote ===');
  const quote = await quoteFor({ blankCode: HOODIE_BLANK, printServiceCode: PRINT_SERVICE, qty: 1 });
  if (!quote) throw new Error(`No base cost seeded for ${HOODIE_BLANK}/${PRINT_SERVICE} — check the seed.`);
  console.log(`unitBaseCostCents=${quote.unitBaseCostCents} (${eur(quote.unitBaseCostCents)}), breaks=${JSON.stringify(quote.breaks)}`);

  const quote50 = await quoteFor({ blankCode: HOODIE_BLANK, printServiceCode: PRINT_SERVICE, qty: 50 });
  console.log(`qty=50 -> unit=${eur(quote50?.unitBaseCostCents)}, total=${eur(quote50?.totalCents)}`);

  // -- create ---------------------------------------------------------------
  console.log('\n=== create_product ===');
  const created = await createProduct({
    storeId: store.id,
    blankCode: HOODIE_BLANK,
    printServiceCode: PRINT_SERVICE,
    placement: { position: 'front_chest', widthCm: 28 },
    colours: [COLOUR],
    sizes: SIZES,
    name: 'Smoke Test Hoodie',
  });
  if (!created.ok) throw new Error(`create_product failed: ${created.error}`);
  let product = created.value;
  console.log(`product ${product.id} status=${product.status} baseCostCents=${product.baseCostCents} (${eur(product.baseCostCents)})`);
  console.log(`colours=${JSON.stringify(product.colours.map((c) => ({ code: c.code, mockupUrl: c.mockupUrl })))}`);

  // -- validation guardrails (expected failures) -----------------------------
  console.log('\n=== validation guardrails ===');
  const badColour = await createProduct({
    storeId: store.id,
    blankCode: HOODIE_BLANK,
    printServiceCode: PRINT_SERVICE,
    placement: { position: 'front_chest', widthCm: 28 },
    colours: ['ZZZZZ'],
    sizes: SIZES,
  });
  console.log(`invalid colour -> ok=${badColour.ok}${badColour.ok ? '' : `, error="${badColour.error}"`}`);

  // -- price ------------------------------------------------------------------
  console.log('\n=== set_price ===');
  const tooLow = await setPrice(store.id, product.id, (product.baseCostCents ?? 0) + 50);
  console.log(`price below minimum -> ok=${tooLow.ok}${tooLow.ok ? '' : `, error="${tooLow.error}"`}`);

  const priced = await setPrice(store.id, product.id, 3500);
  if (!priced.ok) throw new Error(`set_price failed: ${priced.error}`);
  console.log(`retailPriceCents=${priced.value.retailPriceCents} (${eur(priced.value.retailPriceCents)}), marginCents=${priced.value.marginCents} (${eur(priced.value.marginCents)})`);

  // A shop product has no proof of its own: its design's approval replaces it (Print-Prep-Plan section 7), and it
  // goes from draft straight to live.
  product = (await getProduct(store.id, product.id))!;
  console.log(`product status (a draft: no proof step): ${product.status}`);

  // -- publish (expect it to fail closed: the design has no approval, and there is no Stripe account) ------
  console.log('\n=== publish_product (expect it to fail closed) ===');
  const publishAttempt = await publishProduct(store.id, product.id);
  console.log(`publish -> ok=${publishAttempt.ok}${publishAttempt.ok ? '' : `, error="${publishAttempt.error}"`}`);
  if (publishAttempt.ok) {
    console.error('FAILED: expected publish to fail closed without an approved design and a stripe_accounts row.');
    process.exitCode = 1;
  }

  product = (await getProduct(store.id, product.id))!;
  console.log(`product status after failed publish (should be unchanged): ${product.status}`);

  // -- archive ------------------------------------------------------------------
  console.log('\n=== archive_product ===');
  const archived = await archiveProduct(store.id, product.id);
  if (!archived.ok) throw new Error(`archive_product failed: ${archived.error}`);
  console.log(`product status after archive: ${archived.value.status}`);

  const reArchive = await archiveProduct(store.id, product.id);
  console.log(`re-archiving an archived product -> ok=${reArchive.ok}`);

  console.log('\nSmoke test passed.');
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
