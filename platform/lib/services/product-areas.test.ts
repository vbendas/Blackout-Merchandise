// Products carry a list of print areas (owner decision, 16 Oct 2026): at most one front, one back and the sleeves,
// each with its own design and no bigger than 40 x 54 cm, portrait (a sleeve: its own size). The base cost is podPrice() for those areas
// and follows them; the price never goes below it. Migration 0005 copies the old single placement into the list.
// PGlite only (scripts/test/pglite.ts): nothing here touches Neon.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { seedTestCatalogue, type TEST_CATALOGUE } from '@/lib/services/test-catalogue';
import {
  SLEEVE_PRINTS,
  SLEEVE_PRINT_MAX_CM,
  areaSide,
  checkPlacementPosition,
  checkPrintAreas,
  defaultAreaWidthCm,
  positionsFor,
  productAreasOf,
  sleeveKindFor,
  sortAreas,
} from '@/lib/mockups/placements';
import { MAX_DESIGN_CM } from '@/lib/print/defaults';
import { placementKind } from '@/lib/pricing/pod-table';
import { PRODUCTS } from '@/lib/catalog/products';
import { typeFor } from '@/lib/catalog/catalog-filters';

let t: TestDb;
let cat: typeof TEST_CATALOGUE;
let products: typeof import('@/lib/services/products');
let pod: typeof import('@/lib/pricing/pod');
let bulk: typeof import('@/lib/services/bulk');
let storeId: string;
let otherStoreId: string;
let front: string;
let back: string;
let tall: string;
let foreign: string;

const TANK = 'STTM961';
const shipTo = { name: 'Ana Artist', line1: 'Carrer de Mallorca 1', city: 'Barcelona', postcode: '08001', country: 'ES' };

async function design(store: string, widthPx: number, heightPx: number): Promise<string> {
  const [row] = await t.db.insert(schema.designs).values({ storeId: store, source: 'upload', originalUrl: `https://art.test/${widthPx}x${heightPx}.png`, widthPx, heightPx }).returning();
  return row.id;
}

before(async () => {
  t = await setupTestDb();
  cat = await seedTestCatalogue(t.db);
  // A tank top: a T-shirt with no sleeves.
  await t.db.insert(schema.blanks).values({ code: TANK, name: 'Tank', type: 'T-shirts' });
  await t.db.insert(schema.blankColours).values({ blankCode: TANK, colourCode: cat.black });
  await t.db.insert(schema.blankSizes).values({ blankCode: TANK, size: 'M' });
  await t.db.insert(schema.blankPrintServices).values({ blankCode: TANK, printServiceCode: 'dtg' });
  await t.db.insert(schema.baseCosts).values({ blankCode: TANK, printServiceCode: 'dtg', qtyFrom: 1, garmentCostCents: 600, printCostCents: 600, marginCents: 360 });

  products = await import('@/lib/services/products');
  pod = await import('@/lib/pricing/pod');
  bulk = await import('@/lib/services/bulk');
  bulk.runHooks.notify = async () => {};
  bulk.runHooks.markPacksNeededForOrder = async () => {};
  storeId = (await seedUser(t.db, { email: 'areas@blackoutmerch.test', withStore: true })).storeId!;
  otherStoreId = (await seedUser(t.db, { email: 'areas-other@blackoutmerch.test', withStore: true })).storeId!;
  front = await design(storeId, 1000, 1200);
  back = await design(storeId, 1000, 1000);
  tall = await design(storeId, 1000, 2000);
  foreign = await design(otherStoreId, 1000, 1000);
});

after(async () => {
  await t.close();
});

// -- the migration ----------------------------------------------------------------------------

test('migration 0005 copies a product\'s one placement and its design into the list of areas; the old column stays as a fallback', async () => {
  // A database as it was before 0005: the migrations up to 0004 only.
  const source = path.resolve(__dirname, '../../drizzle');
  const before0005 = await mkdtemp(path.join(tmpdir(), 'areas-migration-'));
  try {
    await mkdir(path.join(before0005, 'meta'), { recursive: true });
    const journal = JSON.parse(await readFile(path.join(source, 'meta', '_journal.json'), 'utf8')) as { entries: { idx: number; tag: string }[] };
    const old = journal.entries.filter((e) => e.idx <= 4);
    assert.equal(old.length, 5, 'migrations 0000 to 0004');
    for (const entry of old) await copyFile(path.join(source, `${entry.tag}.sql`), path.join(before0005, `${entry.tag}.sql`));
    await writeFile(path.join(before0005, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries: old }));

    const client = new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: before0005 });
    const columns = await client.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'products'");
    assert.ok(!columns.rows.some((c) => c.column_name === 'placements'), 'no list before 0005');

    // Rows as the app wrote them before: one placement and the design.
    await client.exec(`
      insert into users (id, clerk_id, email, role) values ('00000000-0000-4000-8000-000000000001', 'm', 'm@blackoutmerch.test', 'artist');
      insert into artist_stores (id, artist_id, slug, name) values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'm', 'm');
      insert into designs (id, store_id, source) values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'upload');
      insert into blanks (code, name, type) values ('STTU169', 'Tee', 'T-shirts');
      insert into print_services (code, name) values ('dtg', 'DTG');
      insert into products (id, store_id, design_id, blank_code, print_service_code, name, placement) values
        ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'STTU169', 'dtg', 'Moved', '{"position":"back","widthCm":32,"offsetYcm":2}'),
        ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', null, 'STTU169', 'dtg', 'No design', '{"position":"front_chest","widthCm":28}'),
        ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'STTU169', 'dtg', 'Nothing saved', null);
    `);

    // Then 0005, as db:migrate applies it to Neon.
    await migrate(db, { migrationsFolder: source });
    const rows = await db.select().from(schema.products);
    const byName = new Map(rows.map((r) => [r.name, r]));
    assert.deepEqual(byName.get('Moved')?.placements, [{ position: 'back', widthCm: 32, offsetYcm: 2, designId: '00000000-0000-4000-8000-000000000003' }]);
    assert.deepEqual(byName.get('No design')?.placements, [{ position: 'front_chest', widthCm: 28, designId: null }]);
    assert.equal(byName.get('Nothing saved')?.placements, null, 'nothing to copy: read through the fallback');
    // the old column is left as it was
    assert.deepEqual(byName.get('Moved')?.placement, { position: 'back', widthCm: 32, offsetYcm: 2 });
    for (const row of rows) assert.equal(row.baseCostLines, null);

    // Read back: the list, or (nothing copied) the old column, or the caller's usual spot, with the product's design.
    assert.deepEqual(productAreasOf(byName.get('Moved')!), [{ position: 'back', widthCm: 32, offsetYcm: 2, designId: '00000000-0000-4000-8000-000000000003' }]);
    assert.deepEqual(productAreasOf(byName.get('Nothing saved')!, { position: 'front_chest', widthCm: 28 }), [{ position: 'front_chest', widthCm: 28, designId: '00000000-0000-4000-8000-000000000003' }]);
    assert.deepEqual(productAreasOf({ placements: null, placement: { position: 'centre', widthCm: 24 }, designId: 'd' }), [{ position: 'centre', widthCm: 24, designId: 'd' }], 'a row 0005 never saw reads its old placement');
    assert.deepEqual(productAreasOf({ placements: [], placement: null, designId: null }), []);

    // Run again by hand (a second db:migrate on a database whose journal was lost, say): nothing fails and nothing moves.
    // A product that has its list since (an area added) keeps it; the old column never wins over the list.
    const edited = [{ position: 'back', widthCm: 32, offsetYcm: 2, designId: '00000000-0000-4000-8000-000000000003' }, { position: 'sleeve_left', widthCm: 8, designId: '00000000-0000-4000-8000-000000000003' }];
    await db.update(schema.products).set({ placements: edited }).where(eq(schema.products.name, 'Moved'));
    const statements = (await readFile(path.join(source, '0005_products_print_areas.sql'), 'utf8')).split('--> statement-breakpoint');
    for (const statement of statements) await client.exec(statement);
    const again = new Map((await db.select().from(schema.products)).map((r) => [r.name, r]));
    assert.deepEqual(again.get('Moved')?.placements, edited);
    assert.deepEqual(again.get('No design')?.placements, [{ position: 'front_chest', widthCm: 28, designId: null }]);
    assert.equal(again.get('Nothing saved')?.placements, null);
    await client.close();
  } finally {
    await rm(before0005, { recursive: true, force: true });
  }
});

test('areas are read front first, then the back, then the left and the right sleeve; an area that names no design prints the product\'s', () => {
  const areas = productAreasOf({
    designId: 'main',
    placements: [
      { position: 'sleeve_right', widthCm: 8, designId: 'logo' },
      { position: 'back', widthCm: 32, designId: 'back-art' },
      { position: 'sleeve_left', widthCm: 8 },
      { position: 'front_chest', widthCm: 28, designId: 'main', offsetYcm: 0 },
    ],
  });
  assert.deepEqual(areas.map((a) => `${a.position}:${a.designId}`), ['front_chest:main', 'back:back-art', 'sleeve_left:main', 'sleeve_right:logo']);
  assert.equal(areas[0].offsetYcm, undefined, 'no offset at the standard position');
  assert.deepEqual(sortAreas([{ position: 'back' }, { position: 'front_full' }]).map((a) => a.position), ['front_full', 'back']);
});

// -- the rules ------------------------------------------------------------------------------------

test('sleeves are offered only on garments with sleeves, by the catalogue', () => {
  const byCode = new Map(PRODUCTS.map((p) => [p.code, p]));
  for (const [code, kind] of Object.entries(SLEEVE_PRINTS)) {
    assert.ok(byCode.has(code), `${code} is in the catalogue`);
    assert.ok(['T-shirts', 'Polos', 'Sweats & Hoodies', 'Jackets'].includes(typeFor(code)), `${code} is ${typeFor(code)}`);
    assert.ok(kind === 'short' || kind === 'long');
  }
  // never on tank tops, gilets, bags, caps, beanies or bottoms
  for (const code of ['STTM961', 'STTW962', 'STTW963', 'STJM189', 'STJM235', 'STJU249', 'STJU250', 'STAU116', 'STAU771', 'STAU772', 'STAU893', 'STBU070', 'STBU157']) {
    assert.equal(sleeveKindFor(code), null, code);
  }
  for (const product of PRODUCTS) {
    const type = typeFor(product.code);
    if (type === 'Bags & Accessories' || type === 'Bottoms') assert.equal(sleeveKindFor(product.code), null, `${product.code} (${type})`);
    if (/tank|gilet|vest|body warmer|sleeveless/i.test(`${product.name} ${product.code}`)) assert.equal(sleeveKindFor(product.code), null, product.code);
  }
  assert.equal(sleeveKindFor('STTU169'), 'short');
  assert.equal(sleeveKindFor('STTU199'), 'long', 'a long-sleeve tee');
  assert.equal(sleeveKindFor('STSU177'), 'long', 'a hoodie');
  assert.equal(sleeveKindFor('sttu169'), 'short', 'codes are read in any case');
  assert.deepEqual(SLEEVE_PRINT_MAX_CM, { short: { widthCm: 10, heightCm: 10 }, long: { widthCm: 8, heightCm: 40 } });

  assert.deepEqual(positionsFor({ code: 'STTU169', type: 'T-shirts' }), ['front_chest', 'front_full', 'front_left_chest', 'back', 'sleeve_left', 'sleeve_right']);
  assert.deepEqual(positionsFor({ code: TANK, type: 'T-shirts' }), ['front_chest', 'front_full', 'front_left_chest', 'back']);
  assert.deepEqual(checkPlacementPosition('T-shirts', 'sleeve_left', 'STTU169'), { ok: true, position: 'sleeve_left' });
  const tank = checkPlacementPosition('T-shirts', 'sleeve_left', TANK);
  assert.equal(tank.ok, false);
  if (!tank.ok) assert.match(tank.error, /^This garment has no sleeves to print on\. T-shirts take: front_chest, front_full, front_left_chest, back\.$/);
});

test('a side is what pricing calls it: placementKind and areaSide agree on every position', () => {
  for (const position of ['front_chest', 'front_full', 'front_left_chest', 'centre', 'front_leg', 'back', 'sleeve_left', 'sleeve_right']) {
    assert.equal(areaSide(position), placementKind(position), position);
  }
});

test('the area rules: one front, one back, sleeves where there are sleeves, each at most 40 x 54 cm (a sleeve its own size)', () => {
  const tee = { code: 'STTU169', type: 'T-shirts' };
  const hoodie = { code: 'STSU177', type: 'Sweats & Hoodies' };
  const ok = (blank: typeof tee, areas: Parameters<typeof checkPrintAreas>[1]) => checkPrintAreas(blank, areas);
  const refused = (blank: typeof tee, areas: Parameters<typeof checkPrintAreas>[1]) => {
    const result = checkPrintAreas(blank, areas);
    assert.equal(result.ok, false, JSON.stringify(areas));
    return result.ok ? '' : result.error;
  };

  assert.deepEqual(ok(tee, [{ position: 'front_chest', widthCm: 28 }, { position: 'back', widthCm: 32 }, { position: 'sleeve_left', widthCm: 8 }, { position: 'sleeve_right', widthCm: 8 }]), { ok: true });
  assert.deepEqual(ok(tee, [{ position: 'back', widthCm: 32 }]), { ok: true }, 'a back alone');
  assert.deepEqual(ok(tee, [{ position: 'sleeve_left', widthCm: 8 }]), { ok: true }, 'a sleeve alone');
  assert.match(refused(tee, []), /a product prints at least one area/);
  assert.match(refused(tee, [{ position: 'front_chest', widthCm: 28 }, { position: 'front_left_chest', widthCm: 10 }]), /^A product has one front print, and front chest and left chest are all on the front\. Keep one of them\.$/);
  assert.match(refused(tee, [{ position: 'back', widthCm: 30 }, { position: 'back', widthCm: 20 }]), /each position once: there are two back prints/);
  assert.match(refused({ code: TANK, type: 'T-shirts' }, [{ position: 'sleeve_left', widthCm: 8 }]), /This garment has no sleeves to print on/);
  assert.match(refused({ code: 'STAU771', type: 'Bags & Accessories' }, [{ position: 'sleeve_left', widthCm: 8 }]), /no sleeves to print on/);
  assert.match(refused({ code: 'STBU070', type: 'Bottoms' }, [{ position: 'front_leg', widthCm: 12 }, { position: 'sleeve_right', widthCm: 8 }]), /no sleeves to print on/);

  // 40 x 54 cm, portrait, in width and in height: what an A2 film holds with its reg marks and ink margin
  assert.deepEqual(ok(tee, [{ position: 'front_full', widthCm: MAX_DESIGN_CM.widthCm, heightCm: MAX_DESIGN_CM.heightCm }]), { ok: true }, 'exactly 40 x 54');
  assert.match(refused(tee, [{ position: 'front_full', widthCm: 41 }]), /^A print area can be at most 40 × 54 cm, so the reg marks and ink margin fit an A2 film: the front print would be 41 cm wide\. Make it narrower\.$/);
  assert.match(refused(tee, [{ position: 'back', widthCm: 38, heightCm: 54.1 }]), /at most 40 × 54 cm, so the reg marks and ink margin fit an A2 film: the back print would be 38 × 54\.1 cm/);
  assert.match(refused(tee, [{ position: 'front_full', widthCm: 54, heightCm: 40 }]), /at most 40 × 54 cm.*would be 54 × 40 cm/, 'landscape is refused');
  assert.match(refused(tee, [{ position: 'front_chest', widthCm: 1.5 }]), /at least 2 cm wide/);

  // sleeves: short 10 x 10, long 8 x 40
  assert.deepEqual(ok(tee, [{ position: 'sleeve_left', widthCm: 10, heightCm: 10 }]), { ok: true });
  assert.match(refused(tee, [{ position: 'sleeve_left', widthCm: 10, heightCm: 12 }]), /^A short-sleeve print can be at most 10 × 10 cm: the left sleeve print would be 10 × 12 cm\. Make it narrower\.$/);
  assert.deepEqual(ok(hoodie, [{ position: 'sleeve_right', widthCm: 8, heightCm: 40 }]), { ok: true });
  assert.match(refused(hoodie, [{ position: 'sleeve_right', widthCm: 9, heightCm: 20 }]), /A long-sleeve print can be at most 8 × 40 cm/);

  // the usual width fits the art: a tall logo on a short sleeve is narrowed so its height fits
  assert.equal(defaultAreaWidthCm(tee, 'sleeve_left'), 10);
  assert.equal(defaultAreaWidthCm(tee, 'sleeve_left', 2), 5);
  assert.equal(defaultAreaWidthCm(hoodie, 'sleeve_left', 6), 6.6);
  assert.equal(defaultAreaWidthCm(tee, 'front_chest', 1.2), 28);
  assert.equal(defaultAreaWidthCm(tee, 'front_full', 1.6), 33.7, 'narrowed so the height stays within 54 cm');
});

test('a product is made with several print areas, each with its own design, and the rules are kept', async () => {
  const made = await products.createProduct({
    storeId,
    designId: front,
    blankCode: cat.tee,
    printServiceCode: 'dtg',
    areas: [{ position: 'sleeve_left', widthCm: 8 }, { position: 'back', designId: back }, { position: 'front_chest', widthCm: 28 }],
    colours: [cat.black],
    sizes: ['M'],
    name: 'Three areas tee',
  });
  assert.ok(made.ok, made.ok ? '' : made.error);
  const detail = made.value;
  assert.deepEqual(detail.areas.map((a) => [a.position, a.label, a.widthCm, a.heightCm, a.designId, a.sleeve]), [
    ['front_chest', 'Front chest', 28, 33.6, front, false],
    ['back', 'Back', 32, 32, back, false],
    ['sleeve_left', 'Left sleeve', 8, 9.6, front, true],
  ]);
  assert.equal(detail.designId, front, 'the main design is the front\'s');
  assert.deepEqual(detail.placement, { position: 'front_chest', widthCm: 28 });
  assert.deepEqual(detail.addableAreas, ['sleeve_right']);

  // written to the list, never to the old column
  const [row] = await t.db.select().from(schema.products).where(eq(schema.products.id, detail.id));
  assert.equal(row.placement, null);
  assert.deepEqual(row.placements, [
    { position: 'front_chest', widthCm: 28, designId: front },
    { position: 'back', widthCm: 32, designId: back },
    { position: 'sleeve_left', widthCm: 8, designId: front },
  ]);

  const refusals: [Parameters<typeof products.createProduct>[0]['areas'], RegExp, string?][] = [
    [[{ position: 'front_chest' }, { position: 'front_full' }], /A product has one front print/],
    [[{ position: 'sleeve_left' }], /no sleeves to print on/, TANK],
    [[{ position: 'back', widthCm: 45 }], /at most 40 × 54 cm, so the reg marks and ink margin fit an A2 film: the back print would be 45 × 54 cm/],
    [[{ position: 'front_full', widthCm: 38, designId: tall }], /at most 40 × 54 cm, so the reg marks and ink margin fit an A2 film: the front print would be 38 × 76 cm/],
    [[{ position: 'sleeve_left', widthCm: 9, designId: tall }], /A short-sleeve print can be at most 10 × 10 cm: the left sleeve print would be 9 × 18 cm/],
    [[{ position: 'back', designId: foreign }], /^Design not found for this shop\.$/],
  ];
  for (const [areas, error, blankCode] of refusals) {
    const result = await products.createProduct({ storeId, designId: front, blankCode: blankCode ?? cat.tee, printServiceCode: 'dtg', areas, colours: [cat.black], sizes: ['M'] });
    assert.equal(result.ok, false, JSON.stringify(areas));
    if (!result.ok) assert.match(result.error, error);
  }

  // a sleeve with no width given is the widest that fits the art
  const tallSleeve = await products.createProduct({ storeId, designId: tall, blankCode: cat.tee, printServiceCode: 'dtg', areas: [{ position: 'sleeve_right' }], colours: [cat.black], sizes: ['M'] });
  assert.ok(tallSleeve.ok, tallSleeve.ok ? '' : tallSleeve.error);
  assert.deepEqual(tallSleeve.value.areas.map((a) => [a.widthCm, a.heightCm]), [[5, 10]]);
});

// -- the price ------------------------------------------------------------------------------------

test('the base cost is podPrice for the areas, and follows them as they change', async () => {
  const shopPrice = async (positions: string[]) => (await pod.podPrice(cat.tee, positions.map((position) => ({ position, widthCm: 10 })), 'dtg'))!;
  const made = await products.createProduct({ storeId, designId: front, blankCode: cat.tee, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, colours: [cat.black], sizes: ['M'] });
  assert.ok(made.ok, made.ok ? '' : made.error);
  const id = made.value.id;
  const one = await shopPrice(['front_chest']);
  assert.equal(made.value.baseCostCents, one.totalCents);
  assert.deepEqual(made.value.baseCostLines.map((l) => l.key), ['base']);

  const steps: { edit: Parameters<typeof products.editProductAreas>[2]; positions: string[]; keys: string[] }[] = [
    { edit: { add: [{ position: 'back', designId: back }] }, positions: ['front_chest', 'back'], keys: ['base', 'second_main_print'] },
    { edit: { add: [{ position: 'sleeve_left' }, { position: 'sleeve_right' }] }, positions: ['front_chest', 'back', 'sleeve_left', 'sleeve_right'], keys: ['base', 'second_main_print', 'sleeves'] },
    { edit: { remove: ['back'] }, positions: ['front_chest', 'sleeve_left', 'sleeve_right'], keys: ['base', 'sleeves'] },
    { edit: { remove: ['sleeve_left', 'sleeve_right'] }, positions: ['front_chest'], keys: ['base'] },
  ];
  for (const step of steps) {
    const changed = await products.editProductAreas(storeId, id, step.edit);
    assert.ok(changed.ok, changed.ok ? '' : changed.error);
    const expected = await shopPrice(step.positions);
    assert.deepEqual(changed.value.areas.map((a) => a.position), step.positions);
    assert.equal(changed.value.baseCostCents, expected.totalCents, JSON.stringify(step.edit));
    assert.deepEqual(changed.value.baseCostLines.map((l) => l.key), step.keys);
    const [row] = await t.db.select().from(schema.products).where(eq(schema.products.id, id));
    assert.equal(row.baseCostCents, expected.totalCents, 'the snapshot the checkout charges the fee from');
  }

  // what the artist reads
  const both = await products.editProductAreas(storeId, id, { add: [{ position: 'back' }, { position: 'sleeve_left' }] });
  assert.ok(both.ok, both.ok ? '' : both.error);
  const lines = both.value.baseCostLines;
  assert.match(products.describeBaseCost(lines, both.value.baseCostCents!), /^Garment with one print €\d+\.\d\d · Front and back \+€1\.00 · Sleeve prints \+€2\.00 · Base €\d+\.\d\d$/);
  assert.equal(both.value.areas.find((a) => a.position === 'back')?.designId, front, 'an added area prints the product\'s design unless told otherwise');

  // moving the main area through update_product's placement keeps the others
  const moved = await products.updateProduct(storeId, id, { placement: { position: 'front_full', widthCm: 36 } });
  assert.ok(moved.ok, moved.ok ? '' : moved.error);
  // (the sleeve took the widest print its art fits: 10 cm tall at the art's 1.2 aspect is 8.3 cm wide)
  assert.deepEqual(moved.value.areas.map((a) => `${a.position}:${a.widthCm}`), ['front_full:36', 'back:32', 'sleeve_left:8.3']);
  assert.equal(moved.value.baseCostCents, both.value.baseCostCents, 'the same sides cost the same');

  // moving an area down keeps its width and its design
  const lower = await products.editProductAreas(storeId, id, { add: [{ position: 'back', offsetYcm: 2 }] });
  assert.ok(lower.ok, lower.ok ? '' : lower.error);
  const movedBack = lower.value.areas.find((a) => a.position === 'back');
  assert.deepEqual([movedBack?.widthCm, movedBack?.offsetYcm, movedBack?.designId], [32, 2, front]);

  const missing = await products.editProductAreas(storeId, id, { remove: ['sleeve_right'] });
  assert.deepEqual(missing, { ok: false, error: `${moved.value.name} has no right sleeve print to remove.` });
  const none = await products.editProductAreas(storeId, id, { remove: ['front_full', 'back', 'sleeve_left'] });
  assert.equal(none.ok, false);
  if (!none.ok) assert.match(none.error, /keep at least one print area/);
});

test('the price never goes below the base cost: a change that would lift the base past it asks for a new price and changes nothing', async () => {
  const made = await products.createProduct({ storeId, designId: front, blankCode: cat.tee, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, colours: [cat.black], sizes: ['M'] });
  assert.ok(made.ok, made.ok ? '' : made.error);
  const id = made.value.id;
  const base = made.value.baseCostCents!;

  const below = await products.setPrice(storeId, id, base + 99);
  assert.equal(below.ok, false, 'a price under the base cost plus €1 is refused');
  const priced = await products.setPrice(storeId, id, base + 100);
  assert.ok(priced.ok, priced.ok ? '' : priced.error);

  // a back print adds €1 to the base: the €1 margin would go
  const refused = await products.editProductAreas(storeId, id, { add: [{ position: 'back', designId: back }] });
  assert.equal(refused.ok, false);
  if (refused.ok) return;
  const withBack = (await pod.podPrice(cat.tee, [{ position: 'front_chest', widthCm: 28 }, { position: 'back', widthCm: 32 }]))!.totalCents;
  assert.deepEqual(refused.priceNeeded, {
    baseCostCents: withBack,
    minRetailCents: withBack + 100,
    retailPriceCents: base + 100,
    lines: (await pod.podPrice(cat.tee, [{ position: 'front_chest', widthCm: 28 }, { position: 'back', widthCm: 32 }]))!.lines.map((l) => ({ key: l.key, label: l.label, cents: l.cents })),
  });
  assert.match(refused.error, /^With these print areas the base cost is €\d+\.\d\d \(Garment with one print .+ · Front and back \+€1\.00 · Base .+\), above what your price of €\d+\.\d\d allows\. Set a new price of at least €\d+\.\d\d with the change\.$/);
  const [unchanged] = await t.db.select().from(schema.products).where(eq(schema.products.id, id));
  assert.equal(unchanged.baseCostCents, base, 'nothing was written');
  assert.equal((unchanged.placements as unknown[]).length, 1);

  const tooLow = await products.editProductAreas(storeId, id, { add: [{ position: 'back', designId: back }], retailPriceCents: withBack + 50 });
  assert.equal(tooLow.ok, false, 'a new price must clear the new base too');

  const done = await products.editProductAreas(storeId, id, { add: [{ position: 'back', designId: back }], retailPriceCents: withBack + 100 });
  assert.ok(done.ok, done.ok ? '' : done.error);
  assert.equal(done.value.baseCostCents, withBack);
  assert.equal(done.value.retailPriceCents, withBack + 100);
  assert.equal(done.value.marginCents, 100);

  // an edit that changes no area never trips over the price
  const renamed = await products.updateProduct(storeId, id, { name: 'Renamed' });
  assert.ok(renamed.ok, renamed.ok ? '' : renamed.error);
});

// -- runs -------------------------------------------------------------------------------------------

test('a run of a product prints its areas: the first as the line\'s placement, the others as its extra positions, each with its design', async () => {
  const made = await products.createProduct({
    storeId,
    designId: front,
    blankCode: cat.tee,
    printServiceCode: 'dtg',
    areas: [{ position: 'front_chest', widthCm: 28 }, { position: 'back', designId: back }, { position: 'sleeve_left', widthCm: 8 }],
    colours: [cat.black],
    sizes: ['M'],
  });
  assert.ok(made.ok, made.ok ? '' : made.error);

  const run = await bulk.createBulkQuote({ storeId, shipTo, lines: [{ productId: made.value.id, colourCode: cat.black, sizes: { M: 30 } }] });
  assert.ok(run.ok, run.ok ? '' : run.error);
  const line = run.value.lines[0];
  assert.deepEqual(line.placement, { position: 'front_chest', widthCm: 28 });
  assert.deepEqual(line.extraPlacements, [
    { position: 'back', widthCm: 32, designId: back },
    { position: 'sleeve_left', widthCm: 8, designId: front },
  ]);
  // DTG/DTF: the run's price for the garment with one print, plus the shop's extras for the other areas
  const single = await bulk.createBulkQuote({ storeId, shipTo, lines: [{ blankCode: cat.tee, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, colourCode: cat.black, sizes: { M: 30 } }] });
  assert.ok(single.ok, single.ok ? '' : single.error);
  const extras = (await pod.podPrice(cat.tee, [{ position: 'front_chest', widthCm: 28 }, { position: 'back', widthCm: 32 }, { position: 'sleeve_left', widthCm: 8 }]))!.lines.filter((l) => l.key !== 'base');
  assert.equal(line.unitCents, single.value.lines[0].unitCents + extras.reduce((sum, l) => sum + l.cents, 0));

  // a run of another shop's design in an extra position is refused
  const sneaky = await bulk.createBulkQuote({
    storeId,
    shipTo,
    lines: [{ blankCode: cat.tee, printServiceCode: 'dtg', designId: front, placement: { position: 'front_chest', widthCm: 28 }, extraPlacements: [{ position: 'back', widthCm: 30, designId: foreign }], colourCode: cat.black, sizes: { M: 30 } }],
  });
  assert.deepEqual(sneaky, { ok: false, error: 'Design not found for this shop.' });
});

// -- the artist's tools ------------------------------------------------------------------------------

test('set_print_areas tells the artist the new base price and margin, asks for a price when needed, and get_quote gives the shop breakdown', async () => {
  const { setPrintAreasTool, getQuoteTool } = await import('@/lib/tools/products');
  const { randomUUID } = await import('node:crypto');
  const [owner] = await t.db.select({ artistId: schema.artistStores.artistId }).from(schema.artistStores).where(eq(schema.artistStores.id, storeId));
  const ctx = { userId: owner.artistId, clerkId: 'clerk-areas', role: 'artist' as const, storeId, conversationId: randomUUID(), idempotencyKey: 'k', locale: 'en' };

  const made = await products.createProduct({ storeId, designId: front, blankCode: cat.hoodie, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, colours: [cat.black], sizes: ['M'], name: 'Tool hoodie' });
  assert.ok(made.ok, made.ok ? '' : made.error);
  const productId = made.value.id;

  const added = await setPrintAreasTool.run(ctx, { productId, add: [{ position: 'back', designId: back }, { position: 'sleeve_left' }] });
  assert.equal(added.data.ok, true, added.data.error);
  assert.match(added.data.basePrice ?? '', /^Garment with one print €\d+\.\d\d · Front and back \+€1\.00 · Sleeve prints \+€2\.00 · Base €\d+\.\d\d$/);
  assert.deepEqual(added.data.printAreas?.map((a) => a.position), ['front_chest', 'back', 'sleeve_left']);
  assert.deepEqual(added.data.canAdd, ['sleeve_right']);
  const card = added.ui?.cards?.[0];
  assert.equal(card?.kind, 'product');
  if (card?.kind === 'product') {
    assert.deepEqual(card.areas?.map((a) => `${a.label}: ${a.size}`), ['Front chest: 28 × 33.6 cm', 'Back: 32 × 32 cm', 'Left sleeve: 8 × 9.6 cm'], 'a long sleeve: 8 cm wide');
    assert.deepEqual(card.priceLines?.map((l) => l.label), ['Garment with one print', 'Front and back', 'Sleeve prints']);
  }

  // priced at the base plus €1, a further area would cross it: nothing changes, and the lowest price that works comes back
  await products.setPrice(storeId, productId, added.data.baseCostCents! + 100);
  const unchanged = await setPrintAreasTool.run(ctx, { productId, remove: ['back'] });
  assert.equal(unchanged.data.ok, true, 'removing an area only lowers the base');
  assert.equal(unchanged.data.marginCents, 200);
  const crossing = await setPrintAreasTool.run(ctx, { productId, add: [{ position: 'back', designId: back }], remove: [] });
  assert.equal(crossing.data.ok, true, 'back to the base it was priced at: the €1 margin holds');
  await products.setPrice(storeId, productId, crossing.data.baseCostCents! + 100);
  const front2 = await setPrintAreasTool.run(ctx, { productId, remove: ['front_chest'], add: [{ position: 'front_full', widthCm: 30 }] });
  assert.equal(front2.data.ok, true, 'the same sides cost the same');
  const removedSleeve = await setPrintAreasTool.run(ctx, { productId, remove: ['sleeve_left'] });
  assert.equal(removedSleeve.data.ok, true);
  await products.setPrice(storeId, productId, removedSleeve.data.baseCostCents! + 100);
  const needsPrice = await setPrintAreasTool.run(ctx, { productId, add: [{ position: 'sleeve_right' }] });
  assert.equal(needsPrice.data.ok, false);
  assert.equal(needsPrice.data.newPriceNeeded?.minRetailCents, removedSleeve.data.baseCostCents! + 200 + 100);
  assert.match(needsPrice.data.newPriceNeeded?.basePrice ?? '', /Sleeve prints \+€2\.00/);
  assert.equal(needsPrice.ui?.next?.[0]?.label, `Price it at €${Math.ceil((removedSleeve.data.baseCostCents! + 300) / 100)}`);
  const withPrice = await setPrintAreasTool.run(ctx, { productId, add: [{ position: 'sleeve_right' }], retailCents: removedSleeve.data.baseCostCents! + 300 });
  assert.equal(withPrice.data.ok, true, withPrice.data.error);
  assert.equal(withPrice.data.marginCents, 100);

  // a shop product's price: its areas, from podPrice through quoteFor's shop path
  const quoted = await getQuoteTool.run(ctx, { productId, qty: 1 });
  assert.equal(quoted.data.ok, true, quoted.data.error);
  assert.equal(quoted.data.unitBaseCostCents, withPrice.data.baseCostCents);
  assert.match(quoted.data.basePrice ?? '', /Front and back \+€1\.00 · Sleeve prints \+€2\.00/);
  assert.equal(quoted.data.marginCents, 100);
  const byPositions = await getQuoteTool.run(ctx, { blankCode: cat.tee, positions: ['front_chest', 'sleeve_left'], qty: 1, retailCents: 3000 });
  assert.equal(byPositions.data.ok, true, byPositions.data.error);
  assert.match(byPositions.data.basePrice ?? '', /^Garment with one print €\d+\.\d\d · Sleeve prints \+€2\.00 · Base €\d+\.\d\d$/);
  // a run stays a run
  const run = await getQuoteTool.run(ctx, { productId, qty: 40 });
  assert.equal(run.data.basePrice, undefined);
  assert.ok((run.data.breaks?.length ?? 0) > 1, 'quantity breaks');
});

test('a price that comes with an area change needs a base cost to clear, as set_price does', async () => {
  const made = await products.createProduct({ storeId, designId: front, blankCode: cat.tee, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, colours: [cat.black], sizes: ['M'] });
  assert.ok(made.ok, made.ok ? '' : made.error);
  // a row from before base costs were kept
  await t.db.update(schema.products).set({ baseCostCents: null }).where(eq(schema.products.id, made.value.id));
  const lowered = await products.updateProduct(storeId, made.value.id, { retailPriceCents: 150 });
  assert.deepEqual(lowered, { ok: false, error: 'This product has no base cost snapshot yet.' });
  const [row] = await t.db.select().from(schema.products).where(eq(schema.products.id, made.value.id));
  assert.equal(row.retailPriceCents, null, 'nothing was written');
});

test('a shop quote by positions keeps the product rules and takes the method a new product of the garment would', async () => {
  const tank = await products.quoteProductAreas(TANK, null, [{ position: 'front_chest' }, { position: 'sleeve_left' }], { check: true });
  assert.equal(tank.ok, false);
  if (!tank.ok) assert.match(tank.error, /no sleeves/);
  const twoFronts = await products.quoteProductAreas(cat.tee, null, [{ position: 'front_chest' }, { position: 'front_full' }], { check: true });
  assert.equal(twoFronts.ok, false);
  if (!twoFronts.ok) assert.match(twoFronts.error, /one front print/);

  // a jacket has no DTG: it is quoted as DTF, with its extras
  const jacket = await products.quoteProductAreas(cat.jacket, null, [{ position: 'front_chest' }, { position: 'back' }], { check: true });
  assert.ok(jacket.ok, jacket.ok ? '' : jacket.error);
  assert.equal(jacket.value.printServiceCode, 'dtf');
  assert.deepEqual(jacket.value.lines.map((l) => l.key), ['base', 'second_main_print']);
  const tee = await products.quoteProductAreas(cat.tee, null, [{ position: 'front_chest' }], { check: true });
  assert.ok(tee.ok && tee.value.printServiceCode === 'dtg');

  // a 'dtg' the garment can't take is corrected to the garment's own method, with a note: never an error
  const dtgJacket = await products.quoteProductAreas(cat.jacket, 'dtg', [{ position: 'front_chest' }]);
  assert.ok(dtgJacket.ok, dtgJacket.ok ? '' : dtgJacket.error);
  assert.equal(dtgJacket.value.printServiceCode, 'dtf');
  assert.equal(dtgJacket.value.note, "Printed DTF on this garment, since DTG isn't ideal for it.");
  // a method nothing offers, and screen print (runs only), are refused in words
  const laser = await products.quoteProductAreas(cat.jacket, 'laser', [{ position: 'front_chest' }]);
  assert.equal(laser.ok, false);
  if (!laser.ok) assert.match(laser.error, /isn't offered/);
  const screen = await products.quoteProductAreas(cat.tee, 'screen_2c', [{ position: 'front_chest' }]);
  assert.equal(screen.ok, false);
  if (!screen.ok) assert.match(screen.error, /for runs/);
});

test('a run line prints only its own shop\'s art at every position, the main one included', async () => {
  const refused = await bulk.createBulkQuote({
    storeId,
    shipTo,
    lines: [{ blankCode: cat.tee, printServiceCode: 'dtg', designId: front, placement: { position: 'front_chest', widthCm: 28, designId: foreign }, colourCode: cat.black, sizes: { M: 10 } }],
  });
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.error, /Design not found for this shop/);
  const nonsense = await bulk.createBulkQuote({
    storeId,
    shipTo,
    lines: [{ blankCode: cat.tee, printServiceCode: 'dtg', designId: front, placement: { position: 'front_chest', widthCm: 28 }, extraPlacements: [{ position: 'back', widthCm: 28, designId: 'not-a-design' }], colourCode: cat.black, sizes: { M: 10 } }],
  });
  assert.equal(nonsense.ok, false, 'something that is not a design id is refused, not sent to the database');
});

test('a sale pays the shop the base cost with every extra: the Stripe fee and the artist\'s payout follow the print areas', async () => {
  const { buildCheckout } = await import('@/lib/services/checkout');
  const made = await products.createProduct({
    storeId,
    designId: front,
    blankCode: cat.tee,
    printServiceCode: 'dtg',
    areas: [{ position: 'front_chest' }, { position: 'back', designId: back }, { position: 'sleeve_left' }],
    colours: [cat.black],
    sizes: ['M'],
    name: 'Three-area tee',
  });
  assert.ok(made.ok, made.ok ? '' : made.error);
  const base = made.value.baseCostCents!;
  const one = (await pod.podPrice(cat.tee, [{ position: 'front_chest', widthCm: 28 }]))!.totalCents;
  assert.equal(base, one + 100 + 200, 'the garment with one print, +€1 front and back, +€2 for the sleeve');
  assert.ok((await products.setPrice(storeId, made.value.id, base + 1000)).ok);

  // live in a published shop with payouts on (the artwork gate is print-areas.test.ts's)
  await t.db.update(schema.products).set({ status: 'live' }).where(eq(schema.products.id, made.value.id));
  const [store] = await t.db.update(schema.artistStores).set({ isPublished: true }).where(eq(schema.artistStores.id, storeId)).returning();
  await t.db.insert(schema.stripeAccounts).values({ storeId, accountId: 'acct_areas', chargesEnabled: true, payoutsEnabled: true });
  if (!(await t.db.select().from(schema.shippingZones)).length) await t.db.insert(schema.shippingZones).values({ name: 'Spain', countries: ['ES'], flatCents: 495 });

  const checkout = await buildCheckout({ storeSlug: store.slug, lines: [{ productId: made.value.id, colourCode: cat.black, size: 'M', qty: 2 }], country: 'ES', email: 'fan@blackoutmerch.test' });
  assert.ok(checkout.ok, checkout.ok ? '' : checkout.error);
  const [order] = await t.db.select().from(schema.orders).where(eq(schema.orders.stripeCheckoutSessionId, checkout.value.sessionId));
  assert.ok(order.shippingCents > 0);
  assert.equal(order.applicationFeeCents, base * 2 + order.shippingCents, 'the shop keeps the base cost of each piece, extras included, and the shipping');
  assert.equal(order.transferCents, 1000 * 2, 'the artist gets the margin, nothing more');
  const [item] = await t.db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  assert.equal(item.unitBaseCostCents, base);
});

test('print areas are the owning shop\'s to change, and no one sets a base cost: it is always the shop price for the areas', async () => {
  const made = await products.createProduct({ storeId, designId: front, blankCode: cat.tee, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, colours: [cat.black], sizes: ['M'] });
  assert.ok(made.ok, made.ok ? '' : made.error);
  const id = made.value.id;
  const [before] = await t.db.select().from(schema.products).where(eq(schema.products.id, id));

  // another shop can't see it, let alone change it
  assert.deepEqual(await products.editProductAreas(otherStoreId, id, { add: [{ position: 'back' }] }), { ok: false, error: 'Product not found for this shop.' });
  assert.deepEqual(await products.updateProduct(otherStoreId, id, { areas: [{ position: 'back' }], retailPriceCents: 100 }), { ok: false, error: 'Product not found for this shop.' });
  const { setPrintAreasTool, createProductTool, updateProductTool, setPriceTool } = await import('@/lib/tools/products');
  const { randomUUID } = await import('node:crypto');
  const [other] = await t.db.select({ artistId: schema.artistStores.artistId }).from(schema.artistStores).where(eq(schema.artistStores.id, otherStoreId));
  const theirCtx = { userId: other.artistId, clerkId: 'clerk-other', role: 'artist' as const, storeId: otherStoreId, conversationId: randomUUID(), idempotencyKey: 'k', locale: 'en' };
  const viaTool = await setPrintAreasTool.run(theirCtx, { productId: id, add: [{ position: 'back' }] });
  assert.equal(viaTool.data.ok, false);
  const [after] = await t.db.select().from(schema.products).where(eq(schema.products.id, id));
  assert.deepEqual([after.placements, after.baseCostCents, after.retailPriceCents], [before.placements, before.baseCostCents, before.retailPriceCents]);

  // the artist's tools take no base cost at all: a call that names one is refused before it runs
  assert.equal(setPrintAreasTool.input.safeParse({ productId: id, add: [{ position: 'back' }], baseCostCents: 1 }).success, false);
  assert.equal(createProductTool.input.safeParse({ blankCode: cat.tee, printServiceCode: 'dtg', placement: { position: 'front_chest', widthCm: 28 }, colours: [cat.black], sizes: ['M'], baseCostCents: 1 }).success, false);
  assert.equal(updateProductTool.input.safeParse({ productId: id, baseCostCents: 1 }).success, false);
  assert.equal(setPriceTool.input.safeParse({ productId: id, retailCents: 5000, baseCostCents: 1 }).success, false);
});
