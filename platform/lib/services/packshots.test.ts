// Packshot loading: from PACKSHOT_BASE_URL (stubbed fetch), from a local public
// folder, and from the app's own origin; the print box lookup on PGlite; and a
// mockup rendered from either source comes out byte for byte the same.
import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { seedUser, setupTestDb, type TestDb } from '@/scripts/test/pglite';

let t: TestDb;
let publicDir: string;
let loader: typeof import('@/lib/services/packshots');
const realFetch = globalThis.fetch;

const FRONT = Buffer.from('front packshot bytes');
const BACK = Buffer.from('back packshot bytes');
const ENV_KEYS = ['PACKSHOT_BASE_URL', 'PACKSHOT_PUBLIC_DIR', 'NEXT_PUBLIC_APP_URL'] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

before(async () => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  publicDir = await mkdtemp(path.join(tmpdir(), 'packshots-test-'));
  await mkdir(path.join(publicDir, 'packshots'), { recursive: true });
  await mkdir(path.join(publicDir, 'dev'), { recursive: true });
  await writeFile(path.join(publicDir, 'packshots', 'PFM0_TEST1_C002.png'), FRONT);
  await writeFile(path.join(publicDir, 'packshots', 'PBM0_TEST1_C002.png'), BACK);
  await writeFile(path.join(publicDir, 'dev', 'design.png'), 'a design');

  t = await setupTestDb();
  const { schema } = await import('@/lib/db');
  await seedUser(t.db, { email: 'packshots@merchfrom.test' });
  await t.db.insert(schema.colours).values([
    { code: 'C002', name: 'Black', hex: '#111111' },
    { code: 'C001', name: 'White', hex: '#FFFFFF', isLight: true },
  ]);
  await t.db.insert(schema.blanks).values([
    { code: 'TEST1', name: 'T-shirt', type: 'T-shirts' },
    { code: 'TEST2', name: 'Trousers', type: 'Bottoms' },
    { code: 'TEST3', name: 'Mystery', type: 'Not a type we calibrated' },
  ]);
  await t.db.insert(schema.blankColours).values([
    { blankCode: 'TEST1', colourCode: 'C002', frontImageUrl: '/packshots/PFM0_TEST1_C002.png', backImageUrl: '/packshots/PBM0_TEST1_C002.png' },
    // white has a front shot only, and its file is missing from disk
    { blankCode: 'TEST1', colourCode: 'C001', frontImageUrl: '/packshots/PFM0_TEST1_C001.png', backImageUrl: null },
    { blankCode: 'TEST2', colourCode: 'C002', frontImageUrl: '/packshots/PFM0_TEST1_C002.png', backImageUrl: null },
    { blankCode: 'TEST3', colourCode: 'C002', frontImageUrl: '/packshots/PFM0_TEST1_C002.png', backImageUrl: null },
  ]);
  loader = await import('@/lib/services/packshots');
});

after(async () => {
  await t.close();
  await rm(publicDir, { recursive: true, force: true });
});

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.PACKSHOT_PUBLIC_DIR = publicDir;
  loader.clearPackshotCache();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

after(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function stubFetch(respond: (url: string, call: number) => Response | Promise<Response>): { urls: string[] } {
  const urls: string[] = [];
  globalThis.fetch = (async (input: Request | string | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    urls.push(url);
    return respond(url, urls.length - 1);
  }) as typeof fetch;
  return { urls };
}

const png = (bytes: Buffer) => new Response(new Uint8Array(bytes), { status: 200, headers: { 'content-type': 'image/png' } });

test('local fallback: packshots and other public files are read from the public folder', async () => {
  assert.deepEqual(await loader.readPublicAsset('/packshots/PFM0_TEST1_C002.png'), FRONT);
  assert.deepEqual(await loader.readPublicAsset('packshots/PBM0_TEST1_C002.png'), BACK, 'the leading slash is optional');
  assert.equal((await loader.readPublicAsset('/dev/design.png')).toString(), 'a design');
});

test('local fallback: a missing file says where it looked, and nothing escapes the folder', async () => {
  await assert.rejects(() => loader.readPublicAsset('/packshots/PFM0_NOPE_C002.png'), /is not on disk and no PACKSHOT_BASE_URL or NEXT_PUBLIC_APP_URL/);
  await assert.rejects(() => loader.readPublicAsset('/dev/nope.png'), /not in the public folder/);
  for (const bad of ['/packshots/../../etc/passwd', '/../secret', '/packshots/a\\b.png', '', '/', '/packshots//a.png', '/packshots/a\0.png']) {
    await assert.rejects(() => loader.readPublicAsset(bad), /Not a public asset path/, JSON.stringify(bad));
  }
});

test('PACKSHOT_BASE_URL: packshots come from there, are cached, and need no local file', async () => {
  process.env.PACKSHOT_BASE_URL = 'https://cdn.example.com/shots/';
  process.env.PACKSHOT_PUBLIC_DIR = path.join(publicDir, 'does-not-exist');
  const { urls } = stubFetch(() => png(FRONT));

  assert.deepEqual(await loader.readPublicAsset('/packshots/PFM0_TEST1_C002.png'), FRONT);
  assert.deepEqual(await loader.readPublicAsset('/packshots/PFM0_TEST1_C002.png'), FRONT);
  assert.deepEqual(urls, ['https://cdn.example.com/shots/PFM0_TEST1_C002.png'], 'the second read is from memory');

  await loader.readPublicAsset('/packshots/with space.webp');
  assert.equal(urls[1], 'https://cdn.example.com/shots/with%20space.webp');

  // other public files are not on the CDN
  await assert.rejects(() => loader.readPublicAsset('/dev/design.png'), /not in the public folder/);
  assert.equal(urls.length, 2);
});

test('PACKSHOT_BASE_URL: a 404 is final, a 5xx or a dropped connection is tried once more, a web page is refused', async () => {
  process.env.PACKSHOT_BASE_URL = 'https://cdn.example.com';

  const notFound = stubFetch(() => new Response('nope', { status: 404 }));
  await assert.rejects(() => loader.readPublicAsset('/packshots/a.png'), /Packshot not found \(404\): https:\/\/cdn\.example\.com\/a\.png/);
  assert.equal(notFound.urls.length, 1, 'a 404 is not retried');

  const flaky = stubFetch((_url, call) => (call === 0 ? new Response('busy', { status: 503 }) : png(FRONT)));
  assert.deepEqual(await loader.readPublicAsset('/packshots/b.png'), FRONT);
  assert.equal(flaky.urls.length, 2);

  const dropped = stubFetch((_url, call) => {
    if (call === 0) throw new TypeError('fetch failed');
    return png(BACK);
  });
  assert.deepEqual(await loader.readPublicAsset('/packshots/c.png'), BACK);
  assert.equal(dropped.urls.length, 2);

  const down = stubFetch(() => new Response('down', { status: 500 }));
  await assert.rejects(() => loader.readPublicAsset('/packshots/d.png'), /Could not fetch packshot https:\/\/cdn\.example\.com\/d\.png: status 500/);
  assert.equal(down.urls.length, 2);

  stubFetch(() => new Response('<html>Not Found</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
  await assert.rejects(() => loader.readPublicAsset('/packshots/e.png'), /came back as text\/html, not an image/);

  stubFetch(() => new Response(FRONT, { status: 200, headers: { 'content-type': 'binary/octet-stream' } }));
  assert.deepEqual(await loader.readPublicAsset('/packshots/f.png'), FRONT, 'storage that serves images as octet-stream is fine');
});

test('without a base URL and without the file, the app origin serves /packshots from the CDN', async () => {
  process.env.PACKSHOT_PUBLIC_DIR = path.join(publicDir, 'does-not-exist');
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
  const { urls } = stubFetch(() => png(FRONT));
  assert.deepEqual(await loader.readPublicAsset('/packshots/PFM0_X_C002.webp'), FRONT);
  assert.deepEqual(urls, ['https://app.example.com/packshots/PFM0_X_C002.webp']);

  // a file that is on disk never goes to the network
  process.env.PACKSHOT_PUBLIC_DIR = publicDir;
  assert.deepEqual(await loader.readPublicAsset('/packshots/PFM0_TEST1_C002.png'), FRONT);
  assert.equal(urls.length, 1);
});

test('the cache holds a bounded number of packshots', async () => {
  process.env.PACKSHOT_BASE_URL = 'https://cdn.example.com';
  const { urls } = stubFetch(() => png(Buffer.from('x')));
  for (let i = 0; i < 80; i++) await loader.readPublicAsset(`/packshots/p${i}.png`);
  const before = urls.length;
  await loader.readPublicAsset('/packshots/p79.png'); // recent: cached
  assert.equal(urls.length, before);
  await loader.readPublicAsset('/packshots/p0.png'); // oldest: evicted
  assert.equal(urls.length, before + 1);
});

test('loadPackshot: the photo for the side the position prints on, with its calibrated box', async () => {
  const front = await loader.loadPackshot('TEST1', 'C002', 'front_chest');
  // The stand-in bytes here are not a picture, so the photo's size is not known (a null, not a guess).
  assert.deepEqual(front, {
    image: FRONT,
    printBox: { x: 0.2976, y: 0.3465, w: 0.4039, h: 0.4 },
    position: 'front_chest',
    widthCm: 28,
    size: null,
  });

  const back = await loader.loadPackshot('TEST1', 'C002', 'back');
  assert.deepEqual(back, { image: BACK, printBox: { x: 0.2929, y: 0.2896, w: 0.4941, h: 0.526 }, position: 'back', widthCm: 32, size: null });

  const leg = await loader.loadPackshot('TEST2', 'C002', 'front_leg');
  assert.equal(leg?.widthCm, 12);
  assert.equal(leg?.position, 'front_leg');
});

test('loadPackshot: a real photo comes with its size, and a hoodie front with its pocket line, for the proof’s print box', async () => {
  const { schema } = await import('@/lib/db');
  const { HOODIE_POCKET_LINE_FRAC } = await import('@/lib/mockups/placements');
  const picture = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: '#888888' } }).png().toBuffer();
  await writeFile(path.join(publicDir, 'packshots', 'PFM0_HOOD_C002.png'), picture);
  await t.db.insert(schema.blanks).values({ code: 'HOOD1', name: 'Hoodie', type: 'Sweats & Hoodies' });
  await t.db.insert(schema.blankColours).values({ blankCode: 'HOOD1', colourCode: 'C002', frontImageUrl: '/packshots/PFM0_HOOD_C002.png', backImageUrl: '/packshots/PFM0_HOOD_C002.png' });

  const front = await loader.loadPackshot('HOOD1', 'C002', 'front_chest');
  assert.deepEqual(front?.size, { widthPx: 1200, heightPx: 1500 });
  assert.equal(front?.pocketLine, HOODIE_POCKET_LINE_FRAC);

  // The back of a hoodie has no pocket; nor does anything else.
  const back = await loader.loadPackshot('HOOD1', 'C002', 'back');
  assert.deepEqual(back?.size, { widthPx: 1200, heightPx: 1500 });
  assert.ok(back && !('pocketLine' in back), 'no pocket on the back');
  assert.equal((await loader.loadPackshot('TEST1', 'C002', 'front_chest'))?.pocketLine, undefined);
});

test('loadPackshot: null when there is no photo or no calibrated box, never a stand-in', async () => {
  assert.equal(await loader.loadPackshot('NOPE', 'C002', 'front_chest'), null, 'unknown blank');
  assert.equal(await loader.loadPackshot('TEST1', 'C999', 'front_chest'), null, 'colour the blank does not come in');
  assert.equal(await loader.loadPackshot('TEST1', 'C001', 'back'), null, 'no back photo for white: not the black one');
  assert.equal(await loader.loadPackshot('TEST1', 'C002', 'sleeve'), null, 'no calibrated sleeve box, and no fall back to the chest');
  assert.equal(await loader.loadPackshot('TEST1', 'C002', 'constructor'), null, 'not a position just because it is a property name');
  assert.equal(await loader.loadPackshot('TEST2', 'C002', 'front_chest'), null, 'trousers have no chest box');
  assert.equal(await loader.loadPackshot('TEST3', 'C002', 'front_chest'), null, 'a blank type with no table');
});

test('loadPackshot: a photo the database names but storage lacks is an error, not a silent skip', async () => {
  await assert.rejects(() => loader.loadPackshot('TEST1', 'C001', 'front_chest'), /PFM0_TEST1_C001\.png is not on disk/);

  process.env.PACKSHOT_BASE_URL = 'https://cdn.example.com';
  stubFetch(() => png(FRONT));
  const viaCdn = await loader.loadPackshot('TEST1', 'C001', 'front_chest');
  assert.deepEqual(viaCdn?.image, FRONT, 'and with a base URL it is fetched from there');
});

test('a mockup renders the same from the local folder and from the CDN, and not through a readFile of public/', async () => {
  // a real garment photo and a design with transparent margins
  const garment = await sharp({ create: { width: 1200, height: 1500, channels: 4, background: { r: 120, g: 120, b: 125, alpha: 1 } } }).png().toBuffer();
  const design = await sharp({ create: { width: 400, height: 300, channels: 4, background: { r: 230, g: 60, b: 90, alpha: 1 } } })
    .extend({ top: 40, bottom: 40, left: 60, right: 60, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const dir = await mkdtemp(path.join(tmpdir(), 'mockup-public-'));
  await mkdir(path.join(dir, 'packshots'), { recursive: true });
  await mkdir(path.join(dir, 'dev'), { recursive: true });
  await writeFile(path.join(dir, 'packshots', 'PFM0_TEST1_C002.png'), garment);
  await writeFile(path.join(dir, 'dev', 'design.png'), design);

  const stored: { data: Uint8Array; filename: string; folder: string; contentType: string }[] = [];
  const storagePath = require.resolve('@/lib/services/storage');
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
  try {
    const { renderDesignOnBlank } = await import('@/lib/services/mockups');
    const placement = { position: 'front_chest', widthCm: 28 };

    process.env.PACKSHOT_PUBLIC_DIR = dir;
    const fromDisk = await renderDesignOnBlank({ designUrl: '/dev/design.png', blankCode: 'TEST1', colourCode: 'C002', placement });
    assert.equal(fromDisk, 'https://stub.example/mockups/TEST1/C002-front_chest.webp');

    // the same packshot served by a CDN, with no local public folder at all
    process.env.PACKSHOT_PUBLIC_DIR = path.join(dir, 'gone');
    process.env.PACKSHOT_BASE_URL = 'https://cdn.example.com/packshots';
    loader.clearPackshotCache();
    // the design is an https URL in production, so the stub serves it as well
    const { urls } = stubFetch((url) => png(url.startsWith('https://designs.example.com/') ? design : garment));
    const fromCdn = await renderDesignOnBlank({ designUrl: 'https://designs.example.com/design.png', blankCode: 'TEST1', colourCode: 'C002', placement });
    assert.equal(fromCdn, fromDisk);
    assert.deepEqual(urls.filter((url) => url.includes('cdn.example.com')), ['https://cdn.example.com/packshots/PFM0_TEST1_C002.png']);

    assert.equal(stored.length, 2);
    assert.equal(stored[0].contentType, 'image/webp');
    const meta = await sharp(Buffer.from(stored[0].data)).metadata();
    assert.deepEqual([meta.format, meta.width], ['webp', 1200]);
    assert.equal(Buffer.compare(Buffer.from(stored[0].data), Buffer.from(stored[1].data)), 0, 'identical output from either source');
  } finally {
    delete require.cache[storagePath];
    await rm(dir, { recursive: true, force: true });
  }
});
