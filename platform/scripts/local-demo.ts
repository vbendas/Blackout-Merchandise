/**
 * Local demo: builds a persistent local database of the print-prep build, with real data from the real
 * engine, so the Studio and admin pages can be opened in a browser without Neon (whose shared database
 * doesn't have the new tables). Development only, and it never touches Neon, R2, fal or any other
 * service.
 *
 * What it makes, at LOCAL_DB_DIR (a PGlite database) and PRINT_STORAGE_DIR (the print files):
 *   - every migration applied, the whole blank catalogue (scripts/seed.ts) and the ink system (seed-print.ts);
 *   - the people (lib/dev/identities.ts): the owner, an artist with the Underwriter shop, and three employees
 *     on the Pre-press, Production and Support presets;
 *   - shop prices (lib/pricing/pod-table.ts) for a few garments, the rest left on their placeholders: the
 *     Classic tee at 17 euros, other tees, a hoodie, a sweatshirt and a tote (SHOP_PRICES). No garment has a DTF
 *     price of its own, so DTF costs what DTG does ("Same as DTG" in /admin/pricing); the tote has no DTG, so it
 *     prints DTF, and no garment is marked "Print with DTF" yet;
 *   - two designs run through the real pipeline (engine, pack writers, checks, the job queue) on black, French
 *     Navy and white T-shirts, front chest 28 cm: the Underwriter (scripts/fixtures/print/test_design.png) and
 *     a flat three-colour logo (flat-logo-3c.png), left in these states:
 *       Underwriter     approved by the artist, every pack approved by pre-press (with Pantone codes), two
 *                       live shop products, a queued shop order, a shipped one, a screen-printed run on the
 *                       press, and its job sheet;
 *       Sunset star     ready for the artist to approve, a screen run paid and waiting for pre-press: that
 *                       pack has two inks with Pantone codes and one without (the entry box shows), and
 *                       one draft product that can't be published until the artwork is approved;
 *   - a shop product with three print areas, the Underwriter tour tee (black and French Navy): the Underwriter
 *     on the front, a different design on the back (riso-2-colour.png, approved by the artist) and the Sunset
 *     star on the left sleeve. Its base price reads "Garment with one print 17.00 + Front and back 1.00 + Sleeve
 *     prints 2.00 = 20.00", priced at 39 euros. It stays a draft: the sleeve's design waits for the artist, so
 *     publishing names the left sleeve print, and the Sunset star's approval page shows two print areas, the
 *     sleeve as its flat, true-size proof. Approve the Sunset star, then publish the tour tee.
 *   - the production stations (/station) worked as Production (Marc) works them, through the same services:
 *       the Underwriter run   on the press: 56 of 160 printed, the darks screens on the press and the lights
 *                             screens still being made (one ready, one film printed, the rest waiting), so the move
 *                             to printing was forced and is in the activity log; the order moved to printing itself;
 *       the Underwriter shop  sale (Jordi's): a DTG job queued; the earlier sale shipped, so its job reads shipped;
 *       a second shop         Low Tide, with its own artist and lettering: a DTG run of 40 white tees, every piece
 *                             counted and the job in curing;
 *     and the website's "On the press" board (/api/public/on-the-press): the Underwriter shop opted in, so its
 *     rows carry its name; Low Tide did not, so its row reads "Private". Every job has its own number from 1001
 *     (production_jobs.run_number, given by the database in the order the jobs are made), which the stations show as
 *     "No. 1001" and the board's rows carry as `run`.
 *
 * Orders, products, runs and approvals go through the real services (checkout and the mock Stripe,
 * quotes and proofs, the publishing gate), the same calls the app makes. Running it takes a few minutes
 * and a few GB of memory and disk.
 *
 * From platform/:
 *   npm run demo:local                 build (does nothing if a demo is already built there)
 *   npm run demo:local -- --reset      wipe both folders and build again
 * Folders: LOCAL_DB_DIR and PRINT_STORAGE_DIR, default platform/.local-demo/db and .../print-storage
 * (gitignored). --reset only deletes folders it made (a .local-demo path, or a marker it wrote).
 *
 * Then, with the build finished (the database takes one process at a time, so the build must not run
 * beside the dev server):
 *   LOCAL_DB_DIR=<db> PRINT_STORAGE_DRIVER=local PRINT_STORAGE_DIR=<print files> AUTH_DEV_BYPASS=1 \
 *     NEXT_PUBLIC_APP_URL=http://localhost:3030 npx next dev --webpack -p 3030
 * and open http://localhost:3030/dev.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assignSampleCodes, drainPrintQueue, type LeaveOut } from './print-run-helpers';

const PLATFORM = path.resolve(__dirname, '..');
const ROOT = path.join(PLATFORM, '.local-demo');
const MARKER = '.local-demo-folder';

const BLANK = 'STTU169'; // T-shirt, "Creator 2.0"
const PLACEMENT = { position: 'front_chest', widthCm: 28 };
const BLACK = 'C002';
const NAVY = 'C727';
const WHITE = 'C001';
const GARMENTS = [BLACK, NAVY, WHITE];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const SHIP_TO = { name: 'Underwriter', line1: 'Carrer de Provença 288', city: 'Barcelona', postcode: '08008', country: 'ES' };

/** Shop prices for a few garments, in cents (Admin -> Pricing -> Shop products): what a shop product costs the artist with
 * one print area up to A2, before the extras (+1 euro front and back, +2 euros once for sleeves). Every other garment stays
 * on its placeholder, its one-print DTG base cost. No garment sets a DTF price, so DTF costs the same as DTG (the box says
 * "Same as DTG"); the tote has no DTG, so it prints DTF. */
const SHOP_PRICES: Record<string, { cents: number; dtfCents?: number }> = {
  STTU169: { cents: 1700 }, // Classic tee: the demo's T-shirt
  STTW172: { cents: 1700 }, // Women's classic tee
  STTU170: { cents: 1600 }, // Light tee
  STTU788: { cents: 2100 }, // Heavy tee
  STTU199: { cents: 2200 }, // Long-sleeve tee
  STSU177: { cents: 3400 }, // Heavy hoodie
  STSU178: { cents: 3000 }, // Heavy sweatshirt
  STAU760: { cents: 1200 }, // Classic tote bag (DTF)
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function must<T>(result: Result<T>, what: string): T {
  if (!result.ok) throw new Error(`${what}: ${result.error}`);
  return result.value;
}

const started = Date.now();
function log(line: string): void {
  console.log(`[demo ${((Date.now() - started) / 1000).toFixed(0).padStart(4)} s] ${line}`);
}

// ---------------------------------------------------------------------------
// Folders and environment

interface Folders {
  db: string;
  storage: string;
}

function folders(): Folders {
  return {
    db: path.resolve(process.env.LOCAL_DB_DIR?.trim() || path.join(ROOT, 'db')),
    storage: path.resolve(process.env.PRINT_STORAGE_DIR?.trim() || path.join(ROOT, 'print-storage')),
  };
}

async function isEmptyOrMissing(dir: string): Promise<boolean> {
  try {
    return (await readdir(dir)).length === 0;
  } catch {
    return true;
  }
}

/** A folder this script may delete: it holds nothing, is under a .local-demo folder, or carries the marker
 * a previous build wrote beside it. Anything else is somebody's folder and is left alone. */
async function mayWipe(dir: string): Promise<boolean> {
  if (await isEmptyOrMissing(dir)) return true;
  if (dir.split(path.sep).includes('.local-demo')) return true;
  return existsSync(`${dir}${MARKER}`);
}

/** Everything the build runs on is local. The script loads no .env file; what the shell exports for real
 * services is blanked as well, so a stray key can't reach anything. */
function pinEnvironment({ db, storage }: Folders): void {
  if (process.env.NODE_ENV === 'production') throw new Error('The local demo is for development: NODE_ENV is production.');
  process.env.LOCAL_DB_DIR = db;
  process.env.PRINT_STORAGE_DRIVER = 'local';
  process.env.PRINT_STORAGE_DIR = storage;
  for (const name of [
    'DATABASE_URL',
    'FAL_API_KEY',
    'ANTHROPIC_API_KEY',
    'ELEVENLABS_API_KEY',
    'RESEND_API_KEY',
    'DISCORD_BOT_TOKEN',
    'VERCEL_TOKEN',
    'STRIPE_SECRET_KEY',
    'CLERK_SECRET_KEY',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
  ]) {
    process.env[name] = '';
  }
  process.env.STRIPE_MOCK = '1';
  process.env.AGENT_MOCK = '1';
  delete process.env.PRINT_MOCK;
  delete process.env.PACKSHOT_BASE_URL;
}

// ---------------------------------------------------------------------------
// The build

interface ArtSpec {
  key: 'underwriter' | 'sunset-star' | 'tour-back' | 'low-tide';
  file: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('npm run demo:local [-- --reset]   builds the local demo database; --reset wipes and rebuilds it. See the top of scripts/local-demo.ts.');
    return;
  }
  const reset = args.includes('--reset');
  const dirs = folders();
  const builtFile = path.join(path.dirname(dirs.db), 'built.json');

  // The database takes one process at a time: not while the dev server (or another build) has it open, and
  // above all not before a --reset deletes it from under that process.
  const { assertNotLockedByAnother, lockFileFor } = await import('../lib/dev/local-db');
  assertNotLockedByAnother(lockFileFor(dirs.db));

  if (reset) {
    for (const dir of [dirs.db, dirs.storage]) {
      if (!(await mayWipe(dir))) throw new Error(`${dir} is not empty and isn't a demo folder (no .local-demo in its path, no marker): not deleting it. Empty it yourself, or point LOCAL_DB_DIR and PRINT_STORAGE_DIR at demo folders.`);
    }
    await rm(dirs.db, { recursive: true, force: true });
    await rm(`${dirs.db}.lock`, { force: true });
    await rm(dirs.storage, { recursive: true, force: true });
    await rm(builtFile, { force: true });
    log('wiped the demo folders');
  } else if (existsSync(builtFile)) {
    console.log(`A demo is already built at ${dirs.db} (${builtFile}). Run with --reset to wipe it and build again.`);
    return;
  } else if (!(await isEmptyOrMissing(dirs.db)) || !(await isEmptyOrMissing(dirs.storage))) {
    throw new Error(`${dirs.db} or ${dirs.storage} already holds files, but no finished build is recorded: a build did not finish. Run with --reset.`);
  }

  pinEnvironment(dirs);
  await mkdir(path.dirname(dirs.db), { recursive: true });
  await mkdir(dirs.storage, { recursive: true });
  // The marker a later --reset needs to be sure these folders are ours.
  await writeFile(`${dirs.db}${MARKER}`, 'made by npm run demo:local\n');
  await writeFile(`${dirs.storage}${MARKER}`, 'made by npm run demo:local\n');

  const { openDemoDatabase } = await import('./local-demo-db');
  const demo = await openDemoDatabase();
  try {
    log(`database ready at ${demo.dir}`);
    const summary = await build(demo.db);
    await writeFile(builtFile, JSON.stringify({ builtAt: new Date().toISOString(), ...summary }, null, 2));
    log('done');
    console.log('\nBuilt. Start the dev server (stop it before building again):');
    console.log(
      `  cd ${PLATFORM} && LOCAL_DB_DIR=${dirs.db} PRINT_STORAGE_DRIVER=local PRINT_STORAGE_DIR=${dirs.storage} AUTH_DEV_BYPASS=1 NEXT_PUBLIC_APP_URL=http://localhost:3030 npx next dev --webpack -p 3030`,
    );
    console.log('Then open http://localhost:3030/dev');
  } finally {
    await demo.close();
  }
}

async function build(db: import('./seed-print').SeedDb): Promise<Record<string, unknown>> {
  const { eq, and } = await import('drizzle-orm');
  const sharp = (await import('sharp')).default;
  const { schema } = await import('../lib/db');
  const { seedCatalogue } = await import('./seed');
  const { seedInkSystem } = await import('./seed-print');
  const { DEV_IDENTITIES } = await import('../lib/dev/identities');
  const { PRESETS, normalisePermissions } = await import('../lib/auth/permissions');
  const storage = await import('../lib/services/print-storage');
  const { loadActor, recordStaffActivity } = await import('../lib/services/team');
  const pipeline = await import('../lib/print/pipeline');
  const printPrep = await import('../lib/services/print-prep');
  const prepress = await import('../lib/services/prepress');
  const products = await import('../lib/services/products');
  const bulk = await import('../lib/services/bulk');
  const { buildCheckout, buildBulkCheckout } = await import('../lib/services/checkout');
  const { getStripeGateway } = await import('../lib/services/stripe');
  const orders = await import('../lib/services/orders');
  const production = await import('../lib/services/production');
  const jobSheets = await import('../lib/services/job-sheets');

  // -- the catalogue and the ink system ------------------------------------
  const counts = await seedCatalogue(db, () => undefined);
  log(`catalogue seeded: ${counts.blanks} blanks, ${counts.colours} colours, ${counts.base_costs} base costs`);
  const ink = await seedInkSystem(db);
  log(`ink system ${ink.action}`);

  // -- the people -----------------------------------------------------------
  const userIds = new Map<string, string>();
  for (const identity of DEV_IDENTITIES) {
    const [row] = await db
      .insert(schema.users)
      .values({ clerkId: identity.clerkId, email: identity.email, displayName: identity.displayName, role: identity.role, staffTitle: identity.title ?? null })
      .returning({ id: schema.users.id });
    userIds.set(identity.key, row.id);
    if (identity.preset) {
      const permissions = normalisePermissions(PRESETS[identity.preset].permissions);
      await db.insert(schema.staffPermissions).values(Object.entries(permissions).map(([area, level]) => ({ userId: row.id, area, level: level as string, updatedBy: userIds.get('owner') ?? null })));
    }
  }
  const idOf = (key: string): string => {
    const id = userIds.get(key);
    if (!id) throw new Error(`No ${key} user.`);
    return id;
  };
  const owner = await loadActor(idOf('owner'), 'admin');
  const ines = await loadActor(idOf('prepress'), 'staff');
  const marc = await loadActor(idOf('production'), 'staff');
  log('people made: owner, artist, pre-press, production, support');

  // -- shop prices: a few garments set by the owner, the rest on their placeholders ---------------
  const pricing = await import('../lib/services/pricing-admin');
  const seeded = new Set((await db.select({ code: schema.blanks.code }).from(schema.blanks)).map((r) => r.code));
  const priced = Object.fromEntries(Object.entries(SHOP_PRICES).filter(([code]) => seeded.has(code)));
  if (!priced[BLANK]) throw new Error(`The ${BLANK} is not in the seeded catalogue: the demo's T-shirt needs its shop price.`);
  must(await pricing.setPodPrices(owner, { garments: priced }), 'save the shop prices');
  log(`shop prices set for ${Object.keys(priced).length} garments (${BLANK} at ${(priced[BLANK].cents / 100).toFixed(2)} euros); every other garment is a placeholder`);

  // -- the artist's shop ------------------------------------------------------
  const [store] = await db
    .insert(schema.artistStores)
    .values({
      artistId: idOf('artist'),
      slug: 'underwriter',
      name: 'Underwriter',
      isPublished: true,
      publishedAt: new Date(),
      country: 'ES',
      currency: 'EUR',
      about: 'Underwriter: heavy music from Barcelona. Every piece is printed in Barcelona on organic cotton.',
    })
    .returning();
  // A connected Stripe account for the mock gateway: payouts show as ready, and products can be published.
  await db.insert(schema.stripeAccounts).values({ storeId: store.id, accountId: 'acct_demo_local', chargesEnabled: true, payoutsEnabled: true, requirements: [], lastSyncedAt: new Date() });
  const artistId = idOf('artist');

  const blankSizes = (await db.select({ size: schema.blankSizes.size }).from(schema.blankSizes).where(eq(schema.blankSizes.blankCode, BLANK))).map((r) => r.size);
  const sizes = SIZES.filter((s) => blankSizes.includes(s));
  if (sizes.length === 0) throw new Error(`The ${BLANK} has none of the sizes ${SIZES.join(', ')} in the catalogue.`);

  // -- the designs: art in print storage, named by the route that serves it ----------
  async function addDesign(spec: ArtSpec, storeId: string = store.id): Promise<string> {
    const bytes = await readFile(path.join(__dirname, 'fixtures', 'print', spec.file));
    const meta = await sharp(bytes).metadata();
    const id = randomUUID();
    const key = `print/${id}/source/original.png`;
    await storage.putObject({ key, data: bytes, contentType: 'image/png', visibility: 'public' });
    const url = storage.routeUrl(key);
    const widthPx = meta.width ?? 0;
    await db.insert(schema.designs).values({
      id,
      storeId,
      source: 'upload',
      originalUrl: url,
      printUrl: url,
      previewUrl: url,
      widthPx,
      heightPx: meta.height ?? 0,
      dpiAtPrint: Math.round(widthPx / (PLACEMENT.widthCm / 2.54)),
      hasAlpha: Boolean(meta.hasAlpha),
      readiness: 'ready',
    });
    return id;
  }
  const underwriter = await addDesign({ key: 'underwriter', file: 'test_design.png' });
  const sunset = await addDesign({ key: 'sunset-star', file: 'flat-logo-3c.png' });
  log('designs added');

  // Products first: a design is named after its first product, and the packs carry that name.
  async function addProduct(designId: string, name: string, colours: string[], priceCents: number): Promise<string> {
    const product = must(
      await products.createProduct({ storeId: store.id, designId, blankCode: BLANK, printServiceCode: 'dtg', placement: PLACEMENT, colours, sizes, name }),
      `create "${name}"`,
    );
    must(await products.setPrice(store.id, product.id, priceCents), `price "${name}"`);
    return product.id;
  }
  const tee = await addProduct(underwriter, 'Underwriter tee', [BLACK, NAVY], 3400);
  const teeWhite = await addProduct(underwriter, 'Underwriter tee (white)', [WHITE], 3400);
  // A draft: its artwork isn't approved, so the publishing gate won't let it go live yet.
  const sunsetTee = await addProduct(sunset, 'Sunset star tee', GARMENTS, 3200);

  const placements = [{ position: PLACEMENT.position, widthMm: PLACEMENT.widthCm * 10 }];
  async function prepare(designId: string, name: string): Promise<void> {
    must(await printPrep.preparePrint({ storeId: store.id, userId: artistId, designId, blankCode: BLANK, garmentCodes: GARMENTS, placements }), `prepare ${name}`);
    log(`${name}: the engine is running...`);
    await drainPrintQueue('local-demo', (line) => log(`${name}: ${line}`));
  }

  /** Pre-press types a Pantone code for each colour ink of these packs (all but those `leaveOut` picks), runs the
   * file rewrites that queues, and returns how many inks have a code now. */
  async function typeCodes(packs: { id: string }[], leaveOut?: LeaveOut, offset = 0): Promise<number> {
    const { assigned } = await assignSampleCodes(ines, packs, { leaveOut, offset });
    await drainPrintQueue('local-demo', (line) => log(`pantone: ${line}`));
    return assigned.length;
  }

  // =========================================================================
  // Underwriter: approved by the artist, every pack approved by pre-press
  // =========================================================================
  await prepare(underwriter, 'Underwriter');
  const viewA = await printPrep.getApprovalView({ storeId: store.id, designId: underwriter });
  if (!viewA?.canApprove) throw new Error('The Underwriter is not ready for the artist to approve.');
  must(await printPrep.approveDesign({ storeId: store.id, userId: artistId, designId: underwriter, versionId: viewA.versionId }), 'the artist approves the Underwriter');
  log('Underwriter: approved by the artist');

  const versionA = viewA.versionId;
  const coded = await typeCodes(await pipeline.loadCurrentPacks(versionA));
  log(`Underwriter: ${coded} inks have a Pantone code`);
  for (const pack of await pipeline.loadCurrentPacks(versionA)) must(await prepress.approvePack(ines, pack.id), `pre-press approves pack ${pack.id}`);
  log('Underwriter: every pack approved by pre-press');

  // Live products: through the real publishing gate, which the artist's approval now opens.
  for (const productId of [tee, teeWhite]) must(await products.publishProduct(store.id, productId), 'publish a product');
  // Each colour's picture is the DTG proof of the design on that garment, from the engine.
  const approved = await printPrep.getApprovalView({ storeId: store.id, designId: underwriter });
  for (const proof of (approved?.proofs ?? []).filter((p) => p.technique === 'dtg_dtf')) {
    await db
      .update(schema.productColours)
      .set({ mockupUrl: proof.url })
      .where(and(eq(schema.productColours.colourCode, proof.garmentCode), eq(schema.productColours.productId, proof.garmentCode === WHITE ? teeWhite : tee)));
  }
  log('Underwriter: two products live');

  // Orders and runs, the way the app takes them: checkout on the mock Stripe, then paid.
  const gateway = getStripeGateway();
  async function shopOrder(lines: { productId: string; colourCode: string; size: string; qty: number }[], email: string): Promise<string> {
    const checkout = must(await buildCheckout({ storeSlug: store.slug, lines, country: 'ES', email }), 'checkout');
    const paid = must(await orders.markPaid(checkout.sessionId, await gateway.retrieveCheckoutSession(checkout.sessionId)), 'pay the order');
    return paid.id;
  }
  // The earlier sale has shipped; the new one is queued.
  const shipped = await shopOrder(
    [
      { productId: tee, colourCode: NAVY, size: 'L', qty: 1 },
      { productId: teeWhite, colourCode: WHITE, size: 'M', qty: 1 },
    ],
    'maria@merchfrom.test',
  );
  for (const step of ['printing', 'packed'] as const) must(await production.advance(shipped, step), `order to ${step}`);
  must(await production.advance(shipped, 'shipped', { carrier: 'Correos', code: 'PQ4829173650ES', url: 'https://www.correos.es' }), 'order to shipped');
  await recordStaffActivity(marc, { area: 'production', action: 'production.advance', itemType: 'order', itemId: shipped, detail: { to: 'shipped', summary: 'Moved an order to shipped' } });
  await shopOrder(
    [
      { productId: tee, colourCode: BLACK, size: 'M', qty: 2 },
      { productId: tee, colourCode: BLACK, size: 'L', qty: 1 },
      { productId: tee, colourCode: NAVY, size: 'S', qty: 1 },
      { productId: teeWhite, colourCode: WHITE, size: 'M', qty: 1 },
    ],
    'jordi@merchfrom.test',
  );
  log('Underwriter: a shipped shop order and a queued one');

  /** A paid screen-print run of shop products, the way the app takes one: quote, proof, the artist's OK,
   * checkout on the mock Stripe, paid. Each line prints its product by screen print, whatever the product
   * itself prints with. */
  async function run(lines: { productId: string; colourCode: string; sizes: Record<string, number> }[]): Promise<{ bulkOrderId: string; orderId: string }> {
    const quote = must(
      await bulk.createBulkQuote({
        storeId: store.id,
        shipTo: SHIP_TO,
        lines: lines.map((line) => ({ productId: line.productId, printServiceCode: 'screen_3c', colourCode: line.colourCode, sizes: line.sizes })),
      }),
      'quote the run',
    );
    const proof = must(await bulk.submitBulkProof(store.id, quote.id), 'submit the run proof');
    must(await bulk.approveBulkProof(store.id, proof.id, artistId), 'approve the run proof');
    const checkout = must(await buildBulkCheckout(store.id, quote.id), 'run checkout');
    const paid = must(await bulk.markBulkPaid(checkout.sessionId, await gateway.retrieveCheckoutSession(checkout.sessionId)), 'pay the run');
    if (!paid.orderId) throw new Error('The paid run has no order.');
    return { bulkOrderId: quote.id, orderId: paid.orderId };
  }
  const runA = await run([
    { productId: tee, colourCode: BLACK, sizes: { S: 10, M: 30, L: 30, XL: 10 } },
    { productId: tee, colourCode: NAVY, sizes: { M: 20, L: 20 } },
    { productId: teeWhite, colourCode: WHITE, sizes: { M: 15, L: 15, XL: 10 } },
  ]);
  log('Underwriter: a screen-printed run of 160 paid');

  // -- the production stations, worked as Production works them (the same services as the iPads' actions) ------------
  const progress = await import('../lib/services/production-progress');
  const asMarc = { actor: marc };
  /** The job at the stations that prints this design by this method (the payment and approval hooks made it). */
  async function stationJob(designId: string, method: 'screen' | 'dtg' | 'dtf') {
    await progress.syncProductionJobs();
    const listed = must(await progress.listStationJobs(asMarc, 'all'), 'list the station jobs');
    const found = listed.find((job) => job.designId === designId && job.method === method);
    if (!found) throw new Error(`No ${method} job for design ${designId} at the stations.`);
    return must(await progress.getStationJob(asMarc, found.jobId), 'open a station job');
  }

  // The run on the press: the darks screens (black and French Navy) are on it, the lights (white) are still being made.
  // (Should the engine ever make one set only, its first half is on the press and the rest is being made.)
  let press = await stationJob(underwriter, 'screen');
  if (press.screens.length < 2) throw new Error('The Underwriter run has too few screens to show in mixed states.');
  const setNames = new Set(press.screens.map((screen) => screen.setName));
  const beingMade = setNames.has('Lights') && setNames.size > 1 ? press.screens.filter((screen) => screen.setName === 'Lights') : press.screens.slice(Math.ceil(press.screens.length / 2));
  for (const screen of press.screens.filter((s) => !beingMade.includes(s))) press = must(await progress.setScreenStatus(asMarc, press.jobId, screen.key, 'on_press'), 'a darks screen on the press');
  const madeStates = ['screen_ready', 'film_printed'] as const;
  for (const [i, screen] of beingMade.entries()) {
    if (madeStates[i]) press = must(await progress.setScreenStatus(asMarc, press.jobId, screen.key, madeStates[i]), 'a lights screen being made');
  }
  // The darks print while the lights screens are made: a forced move, which the activity log keeps.
  press = must(await progress.setJobStage(asMarc, press.jobId, 'printing', { force: true }), 'the run goes on the press');
  // Counted tap by tap, as the press runs: black S and M all printed, 16 of the 20 French Navy M (56 of 160).
  const lineOf = (colourName: string, size: string) => {
    const line = press.lines.find((l) => l.colourName === colourName && l.size === size);
    if (!line) throw new Error(`The press job has no ${colourName} ${size} line.`);
    return line;
  };
  const taps: [string, string, number[]][] = [
    ['Black', 'S', [5, 5]],
    ['Black', 'M', [10, 10, 10]],
    ['French Navy', 'M', [10, 6]],
  ];
  for (const [colourName, size, counts] of taps) {
    for (const n of counts) press = must(await progress.adjustPrintedCount(asMarc, press.jobId, lineOf(colourName, size).key, n), `count ${colourName} ${size}`);
  }
  if (press.printed !== 56 || press.total !== 160 || press.stage !== 'printing') throw new Error(`The press job reads ${press.printed} of ${press.total} (${press.stage}), not 56 of 160 printing.`);
  const [runOrder] = await db.select({ status: schema.orders.productionStatus }).from(schema.orders).where(eq(schema.orders.id, runA.orderId));
  if (runOrder?.status !== 'printing') throw new Error(`The run's order is ${runOrder?.status}, not printing: its first printed piece moves it.`);
  log(`Underwriter: the run on the press, ${press.printed} of ${press.total} printed, ${press.screensReady} of ${press.screensTotal} screens ready (darks on the press, lights being made)`);

  // Jordi's sale: a DTG job waiting at the DTG station. The earlier sale shipped, so its job reads shipped (on the board for 48 h).
  const queuedDtg = await stationJob(underwriter, 'dtg');
  if (queuedDtg.stage !== 'queued') throw new Error(`The Underwriter DTG job is ${queuedDtg.stage}, not queued.`);
  log(`Underwriter: a DTG job queued, ${queuedDtg.total} pieces`);

  const sheetA = await jobSheets.getDesignJobSheet(owner, underwriter);
  if (!sheetA) throw new Error('The Underwriter has no job sheet.');
  log(`Underwriter: job sheet ready (${(sheetA.bytes.length / 1024).toFixed(0)} KB)`);

  // =========================================================================
  // Sunset star: ready for the artist, a run waiting in pre-press
  // =========================================================================
  await prepare(sunset, 'Sunset star');
  const viewB = await printPrep.getApprovalView({ storeId: store.id, designId: sunset });
  if (!viewB?.canApprove) throw new Error('The Sunset star is not ready for the artist to approve.');
  const packsB = await pipeline.loadCurrentPacks(viewB.versionId);
  const darks = packsB.find((p) => p.technique === 'screen' && p.screenSetKey === 'darks');
  if (!darks) throw new Error('The Sunset star has no darks pack.');
  // Pre-press has started on the darks pack: every colour ink but the last has its code.
  const colourInks = (pipeline.storedManifest(darks)?.inks ?? []).filter((i) => i.role === 'ink');
  if (colourInks.length < 2) throw new Error('The Sunset star darks pack has too few colour inks to leave one without a code.');
  const lastInk = Math.max(...colourInks.map((i) => i.index));
  const codedB = await typeCodes([darks], (target, inkRow) => target.plateIndex === lastInk && inkRow.role === 'ink', 3);
  log(`Sunset star: ${codedB} of ${colourInks.length} colour inks have a Pantone code on the darks pack`);

  // A paid screen run on black: its pack (darks) joins the pre-press queue and waits there.
  const runB = await run([{ productId: sunsetTee, colourCode: BLACK, sizes: { S: 12, M: 24, L: 24, XL: 12 } }]);
  log('Sunset star: a run on black paid, its pack waiting in pre-press');

  const sheetB = await jobSheets.getDesignJobSheet(owner, sunset);
  if (!sheetB) throw new Error('The Sunset star has no job sheet.');

  // =========================================================================
  // Underwriter tour tee: a front, a back of another design and a sleeve print
  // =========================================================================
  // The front is the Underwriter (approved), the back a design of its own (approved here) and the left sleeve the
  // Sunset star, which still waits for the artist: the tee stays a draft until it is approved (the publishing gate,
  // area by area), and the Sunset star's approval page shows two print areas, the sleeve as its flat proof.
  const tourBack = await addDesign({ key: 'tour-back', file: 'riso-2-colour.png' });
  const tourTee = must(
    await products.createProduct({
      storeId: store.id,
      blankCode: BLANK,
      printServiceCode: 'dtg',
      areas: [
        { position: 'front_chest', widthCm: PLACEMENT.widthCm, designId: underwriter },
        { position: 'back', widthCm: 30, designId: tourBack },
        // the widest print the short sleeve takes for the art's shape (lib/mockups/placements.ts)
        { position: 'sleeve_left', designId: sunset },
      ],
      colours: [BLACK, NAVY],
      sizes,
      name: 'Underwriter tour tee',
    }),
    'create "Underwriter tour tee"',
  );
  const tourBase = products.describeBaseCost(tourTee.baseCostLines, tourTee.baseCostCents ?? 0);
  const tourExpected = priced[BLANK].cents + 100 + 200;
  if (tourTee.baseCostCents !== tourExpected || tourTee.baseCostLines.map((l) => l.key).join(',') !== 'base,second_main_print,sleeves') {
    throw new Error(`The tour tee's base price is ${tourBase}, not the T-shirt's shop price plus 1 euro (front and back) and 2 euros (sleeves).`);
  }
  must(await products.setPrice(store.id, tourTee.id, 3900), 'price "Underwriter tour tee"');
  log(`Underwriter tour tee: ${tourBase}; priced at 39.00 euros`);

  // Every area's print files, one job per design; the Underwriter's front is already made, so it isn't made again.
  const preparedTour = must(await printPrep.preparePrintForProduct({ storeId: store.id, userId: artistId, productId: tourTee.id }), 'prepare the tour tee');
  for (const area of preparedTour.prepared) log(`tour tee: ${area.positions.join(' + ')} ${area.alreadyPrepared ? 'already prepared' : 'being prepared'}`);
  await drainPrintQueue('local-demo', (line) => log(`tour tee: ${line}`));

  // The back's design: approved by the artist. The Sunset star (the sleeve) is left for the owner to approve.
  const backView = await printPrep.getApprovalView({ storeId: store.id, designId: tourBack });
  if (!backView?.canApprove) throw new Error('The tour back print is not ready for the artist to approve.');
  must(await printPrep.approveDesign({ storeId: store.id, userId: artistId, designId: tourBack, versionId: backView.versionId }), 'the artist approves the tour back print');
  const sleeveView = await printPrep.getApprovalView({ storeId: store.id, designId: sunset });
  const sleeveArea = sleeveView?.areas?.find((a) => a.position === 'sleeve_left');
  const sleeveProofs = (sleeveView?.proofs ?? []).filter((p) => p.flat).length;
  log(`Sunset star: ${sleeveView?.areas?.length ?? 0} print areas on its approval page; left sleeve ${sleeveArea?.size ?? '?'}, ${sleeveProofs} flat sleeve proofs`);
  const tourGate = await products.checkPublishable(store.id, tourTee.id);
  log(`Underwriter tour tee: ${tourGate.ok ? 'publishable' : `a draft: ${tourGate.error}`}`);

  // Each colour's pictures: the Underwriter's DTG proof for the front, the back print's for the back. The sleeve's
  // picture is its flat proof, which the product reads from the Sunset star's print files.
  const frontView = await printPrep.getApprovalView({ storeId: store.id, designId: underwriter });
  const dtgProof = (view: typeof frontView, code: string) => view?.proofs.find((p) => p.technique === 'dtg_dtf' && p.garmentCode === code && !p.flat)?.url;
  for (const code of [BLACK, NAVY]) {
    const front = dtgProof(frontView, code);
    const back = dtgProof(backView, code);
    if (!front) continue;
    await db
      .update(schema.productColours)
      .set({ mockupUrl: front, mockupViews: { front, ...(back ? { back } : {}) } })
      .where(and(eq(schema.productColours.productId, tourTee.id), eq(schema.productColours.colourCode, code)));
  }
  log('Underwriter tour tee: front and back pictures from the proofs');

  // =========================================================================
  // Low Tide: a second shop, a DTG run printed and curing, "Private" on the board
  // =========================================================================
  const [lowTideArtist] = await db
    .insert(schema.users)
    .values({ clerkId: 'demo:low-tide', email: 'lowtide@merchfrom.test', displayName: 'Mar Puig', role: 'artist' })
    .returning({ id: schema.users.id });
  const [lowTide] = await db
    .insert(schema.artistStores)
    .values({ artistId: lowTideArtist.id, slug: 'low-tide', name: 'Low Tide', isPublished: true, publishedAt: new Date(), country: 'ES', currency: 'EUR', about: 'Low Tide: surf rock from the coast north of Barcelona.' })
    .returning();
  await db.insert(schema.stripeAccounts).values({ storeId: lowTide.id, accountId: 'acct_demo_low_tide', chargesEnabled: true, payoutsEnabled: true, requirements: [], lastSyncedAt: new Date() });
  // The lettering is near-black, so on a black tee nothing would print (and the set would block approval): white tees only.
  const lowTideArt = await addDesign({ key: 'low-tide', file: 'lettering-1c.png' }, lowTide.id);
  const lowTideTee = must(
    await products.createProduct({ storeId: lowTide.id, designId: lowTideArt, blankCode: BLANK, printServiceCode: 'dtg', placement: PLACEMENT, colours: [WHITE], sizes, name: 'Low Tide lettering tee' }),
    'create "Low Tide lettering tee"',
  );
  must(await printPrep.preparePrint({ storeId: lowTide.id, userId: lowTideArtist.id, designId: lowTideArt, blankCode: BLANK, garmentCodes: [WHITE], placements }), 'prepare the Low Tide lettering');
  log('Low Tide: the engine is running...');
  await drainPrintQueue('local-demo', (line) => log(`Low Tide: ${line}`));
  const lowTideView = await printPrep.getApprovalView({ storeId: lowTide.id, designId: lowTideArt });
  if (!lowTideView?.canApprove) throw new Error('The Low Tide lettering is not ready for its artist to approve.');
  must(await printPrep.approveDesign({ storeId: lowTide.id, userId: lowTideArtist.id, designId: lowTideArt, versionId: lowTideView.versionId }), 'Low Tide approves its lettering');
  const lowTideDtg = (await pipeline.loadCurrentPacks(lowTideView.versionId)).find((pack) => pack.technique === 'dtg_dtf');
  if (!lowTideDtg) throw new Error('The Low Tide lettering has no DTG/DTF files.');
  must(await prepress.approvePack(ines, lowTideDtg.id), 'pre-press approves the Low Tide DTG files');

  // The run: 40 white tees printed DTG, quoted, proofed, approved and paid as an artist does it.
  const lowTideQuote = must(
    await bulk.createBulkQuote({
      storeId: lowTide.id,
      shipTo: { name: 'Low Tide', line1: 'Passeig Maritim 12', city: 'Mataro', postcode: '08301', country: 'ES' },
      lines: [{ productId: lowTideTee.id, printServiceCode: 'dtg', colourCode: WHITE, sizes: { S: 10, M: 15, L: 10, XL: 5 } }],
    }),
    'quote the Low Tide run',
  );
  const lowTideProof = must(await bulk.submitBulkProof(lowTide.id, lowTideQuote.id), 'submit the Low Tide proof');
  must(await bulk.approveBulkProof(lowTide.id, lowTideProof.id, lowTideArtist.id), 'Low Tide approves its proof');
  const lowTideCheckout = must(await buildBulkCheckout(lowTide.id, lowTideQuote.id), 'Low Tide checkout');
  const lowTidePaid = must(await bulk.markBulkPaid(lowTideCheckout.sessionId, await gateway.retrieveCheckoutSession(lowTideCheckout.sessionId)), 'pay the Low Tide run');

  // At the DTG station: every piece printed, then into curing (all printed, so no force).
  let curing = await stationJob(lowTideArt, 'dtg');
  for (const line of curing.lines) curing = must(await progress.setPrintedCount(asMarc, curing.jobId, line.key, line.total), 'count a Low Tide line');
  curing = must(await progress.setJobStage(asMarc, curing.jobId, 'curing'), 'the Low Tide run into curing');
  if (curing.stage !== 'curing' || curing.printed !== curing.total) throw new Error(`The Low Tide job reads ${curing.printed} of ${curing.total} (${curing.stage}), not every piece in curing.`);
  log(`Low Tide: a DTG run of ${curing.total} printed and curing`);

  // -- the website's board: the Underwriter shop opted in, Low Tide did not ---------------------------------------------
  const stores = await import('../lib/services/stores');
  if (!(await stores.setPressBoardOptIn(store.id, true))) throw new Error('The Underwriter shop could not opt in to the press board.');
  const board = await progress.onThePressFeed();
  for (const row of board) log(`press board: No. ${row.run} · ${row.client} · ${row.piece} · ${row.printed}/${row.total} · ${row.ink} · ${row.stage}`);
  // Every job has its own number, from 1001 (the database gives it; a fresh build numbers its jobs in the order they were made).
  if (new Set(board.map((row) => row.run)).size !== board.length || board.some((row) => !Number.isInteger(row.run) || row.run < 1001)) {
    throw new Error(`The press board's rows do not each carry their own number from 1001: ${board.map((row) => row.run).join(', ')}.`);
  }
  if (!board.some((row) => row.client === store.name && row.stage === 'ON THE PRESS')) throw new Error('The press board does not show the Underwriter run on the press by name.');
  if (!board.some((row) => row.client === 'Private' && row.stage === 'CURING')) throw new Error('The press board does not show the Low Tide run as Private, curing.');

  // -- what the build left ----------------------------------------------------
  const packRows = await db.select().from(schema.productionPacks);
  const byAudit: Record<string, number> = {};
  for (const pack of packRows) byAudit[pack.auditStatus] = (byAudit[pack.auditStatus] ?? 0) + 1;
  return {
    store: { slug: store.slug, id: store.id },
    designs: { underwriter, sunset },
    packsByAudit: byAudit,
    waitingPack: darks.id,
    runs: { underwriter: runA, sunset: runB },
    jobSheets: { underwriter: sheetA.filename, sunset: sheetB.filename },
    shopPrices: priced,
    tourTee: { id: tourTee.id, basePrice: tourBase, retailCents: 3900, designs: { front: underwriter, back: tourBack, sleeveLeft: sunset }, publishable: tourGate.ok },
    stations: {
      onThePress: { jobId: press.jobId, printed: press.printed, total: press.total, screensReady: press.screensReady, screensTotal: press.screensTotal },
      dtgQueued: { jobId: queuedDtg.jobId, total: queuedDtg.total },
      curing: { jobId: curing.jobId, shop: lowTide.slug, total: curing.total, run: lowTidePaid.id },
    },
    pressBoard: board.map((row) => `No. ${row.run} · ${row.client} · ${row.piece} · ${row.printed}/${row.total} · ${row.stage}`),
  };
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
