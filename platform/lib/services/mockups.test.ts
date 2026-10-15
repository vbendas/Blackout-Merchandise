// Mockups for a position the garment cannot take (a sleeve): placements.ts now
// throws UnknownPositionError for it instead of quietly using the default spot.
// The mockup service answers in plain words (tryRender...), renders and saves
// nothing, and the throwing forms keep throwing the class the mockup tool
// catches. Also: a product with no saved position gets the garment's own usual
// spot, not a bare front_chest that trousers and bags would now refuse.
import { after, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { UnknownPositionError } from '@/lib/mockups/placements';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';

let t: TestDb;
let publicDir: string;
let mockups: typeof import('@/lib/services/mockups');
let storeId: string;
let designId: string;
const stored: { data: Uint8Array; filename: string; folder: string; contentType: string }[] = [];
const ENV_KEYS = ['PACKSHOT_BASE_URL', 'PACKSHOT_PUBLIC_DIR', 'NEXT_PUBLIC_APP_URL'] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
const storagePath = require.resolve('@/lib/services/storage');

before(async () => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  for (const key of ENV_KEYS) delete process.env[key];

  // a real garment photo and a design with transparent margins, in a public/ of their own
  publicDir = await mkdtemp(path.join(tmpdir(), 'mockups-test-'));
  await mkdir(path.join(publicDir, 'packshots'), { recursive: true });
  await mkdir(path.join(publicDir, 'dev'), { recursive: true });
  const garment = await sharp({ create: { width: 1200, height: 1500, channels: 4, background: { r: 120, g: 120, b: 125, alpha: 1 } } }).png().toBuffer();
  await writeFile(path.join(publicDir, 'packshots', 'front.png'), garment);
  await writeFile(path.join(publicDir, 'packshots', 'back.png'), garment);
  const design = await sharp({ create: { width: 400, height: 300, channels: 4, background: { r: 230, g: 60, b: 90, alpha: 1 } } })
    .extend({ top: 40, bottom: 40, left: 60, right: 60, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(path.join(publicDir, 'dev', 'design.png'), design);
  process.env.PACKSHOT_PUBLIC_DIR = publicDir;

  // the render ends in putFile (fal storage): record it instead
  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: {
      putFile: async (input: (typeof stored)[number]) => {
        stored.push(input);
        return { url: `https://stub.example/${input.folder}/${input.filename}`, key: input.filename, contentType: input.contentType, bytes: input.data.byteLength };
      },
    },
  } as unknown as NodeModule;

  t = await setupTestDb();
  ({ storeId } = await seedUser(t.db, { email: 'mockups@merchfrom.test', withStore: true }).then((u) => ({ storeId: u.storeId! })));
  await t.db.insert(schema.printServices).values({ code: 'dtg', name: 'DTG' });
  await t.db.insert(schema.colours).values([
    { code: 'C001', name: 'White', hex: '#F0F0F0', isLight: true },
    { code: 'C002', name: 'Black', hex: '#141416' },
  ]);
  await t.db.insert(schema.blanks).values([
    { code: 'TEE', name: 'T-shirt', type: 'T-shirts' },
    { code: 'TROUSERS', name: 'Trousers', type: 'Bottoms' },
    { code: 'BAG', name: 'Tote', type: 'Bags & Accessories' },
    { code: 'ODD', name: 'Something new', type: 'A type with no calibrated table' },
  ]);
  for (const blankCode of ['TEE', 'TROUSERS', 'BAG', 'ODD']) {
    for (const colourCode of ['C001', 'C002']) {
      await t.db.insert(schema.blankColours).values({ blankCode, colourCode, frontImageUrl: '/packshots/front.png', backImageUrl: '/packshots/back.png' });
    }
  }
  const [design_] = await t.db.insert(schema.designs).values({ storeId, source: 'upload', originalUrl: '/dev/design.png' }).returning();
  designId = design_.id;

  mockups = await import('@/lib/services/mockups');
});

beforeEach(() => {
  stored.length = 0;
});

after(async () => {
  delete require.cache[storagePath];
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  await t.close();
  await rm(publicDir, { recursive: true, force: true });
});

async function productFor(blankCode: string, placement: unknown, colours: { code: string; mockupUrl?: string }[] = [{ code: 'C001' }, { code: 'C002' }]): Promise<string> {
  const [product] = await t.db
    .insert(schema.products)
    .values({ storeId, designId, blankCode, printServiceCode: 'dtg', name: `${blankCode} product`, placement })
    .returning();
  for (const colour of colours) {
    await t.db.insert(schema.productColours).values({ productId: product.id, colourCode: colour.code, mockupUrl: colour.mockupUrl ?? null });
  }
  return product.id;
}

async function savedMockups(productId: string): Promise<Record<string, string | null>> {
  const rows = await t.db.select().from(schema.productColours).where(eq(schema.productColours.productId, productId));
  return Object.fromEntries(rows.map((r) => [r.colourCode, r.mockupUrl]));
}

const on = (blankCode: string, position: string) => ({ designUrl: '/dev/design.png', blankCode, colourCode: 'C001', placement: { position, widthCm: 8 } });

// -- one design on one blank --------------------------------------------------------

test('a sleeve is answered in plain words, with the positions the garment takes: no throw, nothing rendered', async () => {
  const result = await mockups.tryRenderDesignOnBlank(on('TEE', 'sleeve'));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /Sleeve prints are not supported yet/);
  assert.ok(result.positions.length > 0 && result.positions.includes('front_chest') && !result.positions.includes('sleeve'));
  for (const position of result.positions) assert.ok(result.error.includes(position), `the message names ${position}`);
  assert.equal(stored.length, 0, 'nothing was drawn, on the chest or anywhere else');
});

test('any position the garment has no box for is refused the same way', async () => {
  for (const position of ['nonsense', 'constructor', 'toString', '', 'front_leg']) {
    const result = await mockups.tryRenderDesignOnBlank(on('TEE', position));
    assert.equal(result.ok, false, JSON.stringify(position));
  }
  const trousers = await mockups.tryRenderDesignOnBlank(on('TROUSERS', 'front_chest'));
  assert.equal(trousers.ok, false, 'trousers have no chest');
  assert.equal(stored.length, 0);
});

test('the throwing form still throws UnknownPositionError, the class the mockup tool catches', async () => {
  await assert.rejects(
    () => mockups.renderDesignOnBlank(on('TEE', 'sleeve')),
    (err: unknown) => err instanceof UnknownPositionError && err.position === 'sleeve' && err.blankType === 'T-shirts' && err.available.includes('front_chest'),
  );
  assert.equal(stored.length, 0);
});

test('a position the garment takes renders in both forms', async () => {
  const tried = await mockups.tryRenderDesignOnBlank(on('TEE', 'front_chest'));
  assert.deepEqual(tried, { ok: true, value: { url: 'https://stub.example/mockups/TEE/C001-front_chest.webp' } });
  const url = await mockups.renderDesignOnBlank(on('TEE', 'back'));
  assert.equal(url, 'https://stub.example/mockups/TEE/C001-back.webp');
  assert.equal(stored.length, 2);
  const meta = await sharp(Buffer.from(stored[0].data)).metadata();
  assert.deepEqual([meta.format, meta.width], ['webp', 1200]);
});

test('a garment type with no calibrated table still gets the plain packshot and a note, not a refusal', async () => {
  mock.method(console, 'warn', () => undefined); // the service logs this degrade; not wanted in the test output
  const result = await mockups.tryRenderDesignOnBlank(on('ODD', 'front_chest'));
  mock.restoreAll();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.url, '/packshots/front.png');
  assert.match(result.value.note ?? '', /No calibrated print area for A type with no calibrated table\/front_chest/);
  assert.equal(stored.length, 0);
});

// -- a product's saved placement ----------------------------------------------------

test('a product saved with a sleeve: a plain error, nothing rendered, no mockup URL touched', async () => {
  const id = await productFor('TEE', { position: 'sleeve', widthCm: 8 }, [{ code: 'C001', mockupUrl: 'https://old.example/c001.webp' }, { code: 'C002' }]);

  const result = await mockups.tryRenderProductMockups(id);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /Sleeve prints are not supported yet/);
  assert.ok(result.positions.includes('front_chest'));

  assert.deepEqual(await savedMockups(id), { C001: 'https://old.example/c001.webp', C002: null });
  assert.equal(stored.length, 0);
  await assert.rejects(() => mockups.renderProductMockups(id), UnknownPositionError);
  assert.deepEqual(await savedMockups(id), { C001: 'https://old.example/c001.webp', C002: null });
});

test('what is already rendered is returned as it was, unless a re-render is asked for', async () => {
  const id = await productFor('TEE', { position: 'sleeve', widthCm: 8 }, [{ code: 'C001', mockupUrl: 'https://old.example/c001.webp' }, { code: 'C002', mockupUrl: 'https://old.example/c002.webp' }]);
  const cached = await mockups.tryRenderProductMockups(id);
  assert.deepEqual(cached, {
    ok: true,
    value: [
      { colourCode: 'C001', url: 'https://old.example/c001.webp' },
      { colourCode: 'C002', url: 'https://old.example/c002.webp' },
    ],
  });
  assert.equal((await mockups.tryRenderProductMockups(id, true)).ok, false, 'forcing a render brings the refusal');
  assert.equal(stored.length, 0);
});

test('a product with a placement the garment takes renders every colour and saves the URLs', async () => {
  const id = await productFor('TEE', { position: 'front_chest', widthCm: 28 });
  const result = await mockups.tryRenderProductMockups(id);
  assert.deepEqual(result, {
    ok: true,
    value: [
      { colourCode: 'C001', url: 'https://stub.example/mockups/TEE/C001-front_chest.webp' },
      { colourCode: 'C002', url: 'https://stub.example/mockups/TEE/C002-front_chest.webp' },
    ],
  });
  assert.deepEqual(await savedMockups(id), { C001: 'https://stub.example/mockups/TEE/C001-front_chest.webp', C002: 'https://stub.example/mockups/TEE/C002-front_chest.webp' });
  assert.equal((await mockups.renderProductMockups(id)).length, 2, 'the throwing form agrees');
});

test("a product with no saved position gets the garment's own usual spot, not a chest it does not have", async () => {
  const cases: [string, unknown, string][] = [
    ['TEE', null, 'front_chest'],
    ['TROUSERS', null, 'front_leg'],
    ['BAG', {}, 'centre'],
    ['TROUSERS', { widthCm: 12 }, 'front_leg'],
    ['TEE', { position: 'back' }, 'back'],
    ['TEE', { position: '  ', widthCm: 0 }, 'front_chest'],
  ];
  for (const [blankCode, placement, position] of cases) {
    stored.length = 0;
    const id = await productFor(blankCode, placement, [{ code: 'C001' }]);
    const result = await mockups.tryRenderProductMockups(id);
    assert.equal(result.ok, true, `${blankCode} ${JSON.stringify(placement)}`);
    assert.equal(stored[0].filename, `C001-${position}.webp`, `${blankCode} ${JSON.stringify(placement)}`);
  }
});

// -- a moved print: the mockup and the proof put it at the same height -----------------------

/** The first row where the print's red shows, as a fraction of the picture's height. */
async function printTop(image: Buffer): Promise<number> {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i] > data[i + 1] + 60) return y / info.height;
    }
  }
  throw new Error('no print in the picture');
}

test('a print a product moved is at the same height in the mockup and in the proof the artist approves', async () => {
  const { resolvePrintArea, pocketLineFraction } = await import('@/lib/mockups/placements');
  const { printBoxFor } = await import('@/lib/print/pipeline');
  const { DEFAULT_RECIPE } = await import('@/lib/print/defaults');
  const { prepareDtg, renderDtgProof } = await import('@/lib/print/engine');
  const { WHITE, drawArt } = await import('@/lib/print/engine/testing');
  await t.db.insert(schema.blanks).values({ code: 'HOODIE', name: 'Hoodie', type: 'Sweats & Hoodies' });
  await t.db.insert(schema.blankColours).values({ blankCode: 'HOODIE', colourCode: 'C001', frontImageUrl: '/packshots/front.png', backImageUrl: '/packshots/back.png' });
  const photo = await sharp(path.join(publicDir, 'packshots', 'front.png')).png().toBuffer();

  const heightOf = async (blankCode: string, blankType: string, offsetYcm: number | undefined): Promise<{ mockup: number; proof: number }> => {
    const widthCm = 8;
    // The mockup of the design (8 cm wide, moved by the offset).
    stored.length = 0;
    await mockups.renderDesignOnBlank({ designUrl: '/dev/design.png', blankCode, colourCode: 'C001', placement: { position: 'front_chest', widthCm, ...(offsetYcm === undefined ? {} : { offsetYcm }) } });
    const mockup = await printTop(Buffer.from(stored[0].data));

    // The proof of the same print: the box the pipeline gives the engine for that placement, on the same photo.
    const { area } = resolvePrintArea(blankType, 'front_chest')!;
    const placement = { position: 'front_chest', widthMm: widthCm * 10, ...(offsetYcm === undefined ? {} : { offsetYMm: offsetYcm * 10 }) };
    const printBox = printBoxFor({ printBox: { x: area.x, y: area.y, w: area.w, h: area.h }, widthCm: area.widthCm, size: { widthPx: 1200, heightPx: 1500 }, pocketLine: pocketLineFraction(blankType, area) }, placement);
    const art = drawArt(400, 300, [{ kind: 'rect', x: 0, y: 0, w: 400, h: 300, colour: [215, 38, 61] }]);
    const { layers } = await prepareDtg({ art, placement, garments: [WHITE], recipe: DEFAULT_RECIPE });
    const proof = await renderDtgProof(layers[0], { garment: WHITE, placement, packshot: { image: photo, printBox } });
    return { mockup, proof: await printTop(proof.image) };
  };

  // Within a few photo pixels (the pictures are webp, drawn on their own pixel grids): 3 of 1500.
  const same = (a: number, b: number) => Math.abs(a - b) <= 3 / 1500;
  for (const [blankCode, blankType] of [['TEE', 'T-shirts'], ['HOODIE', 'Sweats & Hoodies']] as const) {
    const standard = await heightOf(blankCode, blankType, undefined);
    assert.ok(same(standard.mockup, standard.proof), `${blankCode}: unmoved, the mockup is at ${standard.mockup} and the proof at ${standard.proof}`);

    // 3 cm lower: both move down by 3 cm at the box's own scale (28 cm across 0.4 of a 1200 px photo is about 17 px a cm).
    const lower = await heightOf(blankCode, blankType, 3);
    assert.ok(same(lower.mockup, lower.proof), `${blankCode}: 3 cm lower, the mockup is at ${lower.mockup} and the proof at ${lower.proof}`);
    assert.ok(lower.proof - standard.proof > 40 / 1500, `${blankCode}: the proof moved down (${standard.proof} to ${lower.proof})`);
    assert.ok(Math.abs(lower.proof - standard.proof - (3 * 17.3) / 1500) < 4 / 1500, `${blankCode}: by about 3 cm`);

    // 2 cm higher.
    const higher = await heightOf(blankCode, blankType, -2);
    assert.ok(same(higher.mockup, higher.proof), `${blankCode}: 2 cm higher, the mockup is at ${higher.mockup} and the proof at ${higher.proof}`);
    assert.ok(standard.proof - higher.proof > 25 / 1500, `${blankCode}: the proof moved up`);
  }
});
