// The calibration routes, run with stand-ins for the session, storage and the print libraries: who gets what,
// what is refused in which words, that a scan is checked before it is read and removed afterwards, and that no
// route in app/api/calibration skips the access check.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Actor } from '@/lib/auth/permissions';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { scanSignature, scanUploadKey } from '@/lib/print/calibration/scan-upload';
import type { ChartSettings } from '@/lib/print/calibration/chart-layout';
import type { ScanReading } from '@/lib/print/calibration/scan';
import { STREAM_ABOVE_BYTES, handleChart, handleScan, handleScanUrl, type CalibrationDeps, type UploadUrlRequest } from './handlers';

// A failure is logged for the people who run the server, never sent to the browser; the tests read the log instead of printing it.
const logged: string[] = [];
const realError = console.error;
before(() => {
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(' '));
  };
});
after(() => {
  console.error = realError;
});

const owner: Actor = { userId: 'u-owner', role: 'admin' };
const manager: Actor = { userId: 'u-manager', role: 'staff', permissions: { prepress: 'manage' } };
const viewer: Actor = { userId: 'u-viewer', role: 'staff', permissions: { prepress: 'view' } };
const worker: Actor = { userId: 'u-worker', role: 'staff', permissions: { prepress: 'work' } };
const elsewhere: Actor = { userId: 'u-else', role: 'staff', permissions: { support: 'manage', production: 'manage' } };
const paused: Actor = { userId: 'u-paused', role: 'staff', permissions: { prepress: 'manage' }, suspended: true };
const artist: Actor = { userId: 'u-artist', role: 'artist' };

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('rest of the png')]);
const KEY = scanUploadKey('0f8fad5b-d9cb-469f-a165-70867728950e', 'scan 1.png');

const READING = { lpi: 55, angleDeg: 22.5, geometry: { dpi: 600 }, films: [], warnings: [], confidence: 'good' } as unknown as ScanReading;

class FakeScanError extends Error {
  readonly code = 'no_marks';
  constructor(message: string) {
    super(message);
    this.name = 'ScanError';
  }
}

interface Fakes {
  deps: CalibrationDeps;
  charts: { format: string; settings: ChartSettings }[];
  tickets: UploadUrlRequest[];
  removed: string[];
  reads: { lpi: number; angleDeg: number; bytes: number }[];
  objects: Map<string, Buffer>;
}

function fakes(actor: Actor | null, over: Partial<CalibrationDeps> = {}): Fakes {
  const objects = new Map<string, Buffer>();
  const out: Fakes = { deps: undefined as unknown as CalibrationDeps, charts: [], tickets: [], removed: [], reads: [], objects };
  out.deps = {
    getActor: async () => actor,
    getInks: async () => ({ ...DEFAULT_INK_SYSTEM, mesh: { ...DEFAULT_INK_SYSTEM.mesh, halftone: 255 } }),
    buildChart: async (format, settings) => {
      out.charts.push({ format, settings });
      return { bytes: Buffer.from(`chart:${format}`), name: `chart-${format}.${format}`, contentType: format === 'pdf' ? 'application/pdf' : 'image/vnd.adobe.photoshop' };
    },
    maxScanBytes: 1000,
    nonce: () => '0f8fad5b-d9cb-469f-a165-70867728950e',
    createUploadUrl: async (input) => {
      out.tickets.push(input);
      return { url: `https://storage.test/${input.key}`, method: 'PUT', headers: { 'content-type': input.contentType }, key: input.key, expiresAt: '2026-10-15T12:00:00.000Z' };
    },
    statUpload: async (key) => {
      const hit = objects.get(key);
      return hit ? { bytes: hit.length } : null;
    },
    readHead: async (key, length) => objects.get(key)?.subarray(0, length) ?? null,
    readUpload: async (key) => objects.get(key) ?? null,
    removeUpload: async (key) => {
      out.removed.push(key);
      objects.delete(key);
    },
    readScan: async (bytes, settings) => {
      out.reads.push({ ...settings, bytes: bytes.length });
      return READING;
    },
    ...over,
  };
  return out;
}

const post = (body: unknown) => new Request('http://app.test/api/calibration/x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
const get = (query: string) => new Request(`http://app.test/api/calibration/chart?${query}`);
const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Who may

test('the chart is for anyone with Pre-press View; everyone else is turned away before anything is made', async () => {
  for (const [who, actor, status] of [
    ['nobody', null, 401],
    ['an artist', artist, 403],
    ['staff in other areas', elsewhere, 403],
    ['a paused manager', paused, 403],
  ] as const) {
    const f = fakes(actor);
    const res = await handleChart(get('format=pdf'), f.deps);
    assert.equal(res.status, status, who);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
    assert.equal(f.charts.length, 0, `${who}: nothing was made`);
  }
  for (const actor of [viewer, worker, manager, owner]) assert.equal((await handleChart(get('format=pdf'), fakes(actor).deps)).status, 200);
  // the refusal is about the chart, not a scan
  const refused = (await (await handleChart(get('format=pdf'), fakes(artist).deps)).json()) as { message: string };
  assert.equal(refused.message, 'The test chart needs View access to Pre-press. Ask the owner.');
});

test('a scan is for Pre-press Manage only: a link to put it on, and reading it', async () => {
  for (const [who, actor, status] of [
    ['nobody', null, 401],
    ['an artist', artist, 403],
    ['a viewer', viewer, 403],
    ['a worker', worker, 403],
    ['staff in other areas', elsewhere, 403],
    ['a paused manager', paused, 403],
  ] as const) {
    const a = fakes(actor);
    assert.equal((await handleScanUrl(post({ filename: 'scan.png', size: 10 }), a.deps)).status, status, `${who}: link`);
    assert.equal(a.tickets.length, 0);
    const b = fakes(actor);
    b.objects.set(KEY, PNG);
    assert.equal((await handleScan(post({ key: KEY, lpi: 55, angleDeg: 22.5 }), b.deps)).status, status, `${who}: read`);
    assert.equal(b.reads.length, 0);
    assert.equal(b.removed.length, 0, `${who}: a refused request leaves the object alone`);
  }
  for (const actor of [manager, owner]) {
    assert.equal((await handleScanUrl(post({ filename: 'scan.png', size: 10 }), fakes(actor).deps)).status, 200);
    const f = fakes(actor);
    f.objects.set(KEY, PNG);
    assert.equal((await handleScan(post({ key: KEY, lpi: 55, angleDeg: 22.5 }), f.deps)).status, 200);
  }
});

// ---------------------------------------------------------------------------
// The chart

test('the chart asks for a format, takes the screen from the query, and defaults to the house screen and the ink system’s mesh', async () => {
  const f = fakes(manager);
  const none = await handleChart(get(''), f.deps);
  assert.equal(none.status, 400);
  assert.match(String((await json(none)).message), /format=psd/);
  assert.equal((await handleChart(get('format=zip'), f.deps)).status, 400);

  const plain = await handleChart(get('format=psd'), f.deps);
  assert.equal(plain.status, 200);
  assert.deepEqual(f.charts[0], { format: 'psd', settings: { lpi: 55, angleDeg: 22.5, ppi: 600, mesh: 255, dot: 'round', films: ['underbase', 'base'] } });

  const custom = await handleChart(get('format=pdf&lpi=45&angle=45&mesh=305&films=highlight,base&ppi=300'), f.deps);
  assert.equal(custom.status, 200);
  assert.deepEqual(f.charts[1], { format: 'pdf', settings: { lpi: 45, angleDeg: 45, ppi: 300, mesh: 305, dot: 'round', films: ['base', 'highlight'] } });
});

test('the chart answers the file, named, typed and never cached', async () => {
  const res = await handleChart(get('format=psd'), fakes(viewer).deps);
  assert.equal(res.headers.get('content-type'), 'image/vnd.adobe.photoshop');
  assert.match(res.headers.get('content-disposition') ?? '', /^attachment; filename="chart-psd\.psd"/);
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(Buffer.from(await res.arrayBuffer()).toString(), 'chart:psd');
  assert.equal(res.headers.get('content-length'), String('chart:psd'.length));
});

test('a big chart goes out as a stream, whole and in order, and a small one as it is', async () => {
  const big = Buffer.alloc(STREAM_ABOVE_BYTES * 3 + 12345);
  for (let i = 0; i < big.length; i++) big[i] = (i * 31 + (i >> 8)) & 0xff;
  const f = fakes(viewer, { buildChart: async (format) => ({ bytes: big, name: `big.${format}`, contentType: 'image/vnd.adobe.photoshop' }) });
  const res = await handleChart(get('format=psd'), f.deps);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-length'), null, 'a stream does not promise a length');
  assert.equal(res.headers.get('content-type'), 'image/vnd.adobe.photoshop');
  assert.match(res.headers.get('content-disposition') ?? '', /^attachment; filename="big\.psd"/);
  const got = Buffer.from(await res.arrayBuffer());
  assert.equal(got.length, big.length);
  assert.ok(got.equals(big), 'every byte, in order');

  const small = await handleChart(get('format=pdf'), fakes(viewer).deps);
  assert.equal(small.headers.get('content-length'), String('chart:pdf'.length));
});

test('a chart with a screen that makes no sense is refused in words', async () => {
  const bad = async (query: string) => {
    const res = await handleChart(get(query), fakes(manager).deps);
    assert.equal(res.status, 400, query);
    return String((await json(res)).message);
  };
  assert.match(await bad('format=psd&lpi=5'), /Lines per inch goes from 15 to 150/);
  assert.match(await bad('format=psd&lpi=abc'), /needs a number/);
  assert.match(await bad('format=psd&angle=400'), /angle goes from 0 to 180/);
  assert.match(await bad('format=psd&ppi=100'), /resolution goes from 300 to 1200/);
  assert.match(await bad('format=psd&lpi=140&ppi=600'), /too fine to image/);
  assert.match(await bad('format=psd&films=magenta'), /Pick the films/);
});

test('a chart that cannot be made is a plain failure, not a stack trace', async () => {
  const f = fakes(manager, {
    buildChart: async () => {
      throw new Error('sharp exploded: /secret/path');
    },
  });
  const res = await handleChart(get('format=pdf'), f.deps);
  assert.equal(res.status, 500);
  const body = await json(res);
  assert.equal(body.error, 'failed');
  assert.ok(!JSON.stringify(body).includes('secret'));
  assert.ok(logged.some((line) => line.includes('making the chart failed') && line.includes('sharp exploded')), 'the cause is in the server log');
});

// ---------------------------------------------------------------------------
// A place for the scan

test('a link is made for a scan of the right kind, under a key the server chose, for the size announced', async () => {
  const f = fakes(manager);
  const res = await handleScanUrl(post({ filename: 'Chart ../scan (1).TIFF', size: 900 }), f.deps);
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.key, 'uploads/prepress/calibration/0f8fad5b-d9cb-469f-a165-70867728950e/scan-1.tiff');
  assert.equal(body.url, `https://storage.test/${String(body.key)}`);
  assert.equal(body.method, 'PUT');
  assert.deepEqual(Object.keys(body).sort(), ['expiresAt', 'headers', 'key', 'method', 'url']);
  assert.equal(f.tickets.length, 1);
  assert.deepEqual({ ...f.tickets[0], actor: undefined }, { actor: undefined, key: body.key, contentType: 'application/octet-stream', maxBytes: 1000, contentLength: 900, expiresIn: 900 });
  assert.equal(f.tickets[0].actor.userId, 'u-manager');
});

test('what cannot be a scan is refused before a link is made', async () => {
  const refused = async (body: unknown) => {
    const f = fakes(manager);
    const res = await handleScanUrl(post(body), f.deps);
    assert.equal(f.tickets.length, 0);
    return [res.status, (await json(res)).error];
  };
  assert.deepEqual(await refused({ filename: 'corrected.psd', size: 10 }), [415, 'not_an_image']);
  assert.deepEqual(await refused({ filename: 'scan.pdf', size: 10 }), [415, 'not_an_image']);
  assert.deepEqual(await refused({ filename: 'scan.png', size: 0 }), [400, 'empty']);
  assert.deepEqual(await refused({ filename: 'scan.png', size: 1001 }), [413, 'too_large']);
  assert.deepEqual(await refused({ filename: 'scan.png', size: -4 }), [400, 'bad_request']);
  assert.deepEqual(await refused({ filename: 'scan.png', size: 1.5 }), [400, 'bad_request']);
  assert.deepEqual(await refused({ filename: 7, size: 10 }), [400, 'bad_request']);
  assert.deepEqual(await refused({ filename: 'scan.png' }), [400, 'bad_request']);
  assert.deepEqual(await refused('not json'), [400, 'bad_request']);
  assert.deepEqual(await refused([]), [400, 'bad_request']);
  assert.deepEqual(await refused('x'.repeat(5000)), [400, 'bad_request'], 'a body past the cap is not read');
});

test('a link that storage refuses is a failure the person is told about, not a crash', async () => {
  const f = fakes(manager, {
    createUploadUrl: async () => {
      throw new Error('R2 is down');
    },
  });
  assert.equal((await handleScanUrl(post({ filename: 'scan.png', size: 10 }), f.deps)).status, 500);
});

// ---------------------------------------------------------------------------
// Reading it

test('a scan in storage is read at the screen it was printed with, the answer is the reading, and the file is removed', async () => {
  const f = fakes(manager);
  f.objects.set(KEY, PNG);
  const res = await handleScan(post({ key: KEY, lpi: 45, angleDeg: 15 }), f.deps);
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.ok, true);
  assert.deepEqual(body.reading, JSON.parse(JSON.stringify(READING)));
  assert.deepEqual(f.reads, [{ lpi: 45, angleDeg: 15, bytes: PNG.length }]);
  assert.deepEqual(f.removed, [KEY]);
  assert.equal(f.objects.size, 0);
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
});

test('only a key the scan-url route made can be read, and the screen has to make sense', async () => {
  for (const key of ['uploads/prepress/calibration/not-a-nonce/scan.png', 'prepress-uploads/pack/nonce/corrected.psd', 'print/design/v1/original.png', '../etc/passwd', `${KEY}/more`, 'uploads/prepress/calibration/0f8fad5b-d9cb-469f-a165-70867728950e/scan.psd', 7]) {
    const f = fakes(manager);
    f.objects.set(String(key), PNG);
    const res = await handleScan(post({ key, lpi: 55, angleDeg: 22.5 }), f.deps);
    assert.equal(res.status, 400, String(key));
    assert.equal(f.reads.length, 0);
    assert.equal(f.removed.length, 0, 'an object that is not ours is not touched');
  }
  const f = fakes(manager);
  f.objects.set(KEY, PNG);
  assert.match(String((await json(await handleScan(post({ key: KEY, lpi: 2, angleDeg: 22.5 }), f.deps))).message), /Lines per inch/);
  assert.match(String((await json(await handleScan(post({ key: KEY, lpi: 55, angleDeg: 999 }), f.deps))).message), /angle/);
  assert.equal(f.reads.length, 0);
});

test('a scan that did not arrive, that is empty, too big or not an image is refused before it is read, and cleared away', async () => {
  const missing = fakes(manager);
  const gone = await handleScan(post({ key: KEY, lpi: 55, angleDeg: 22.5 }), missing.deps);
  assert.deepEqual([gone.status, (await json(gone)).error], [400, 'incomplete']);

  const cases: [string, Buffer, number, string][] = [
    ['empty', Buffer.alloc(0), 400, 'empty'],
    ['too big', Buffer.concat([PNG, Buffer.alloc(2000)]), 413, 'too_large'],
    ['a Photoshop file renamed .png', Buffer.from('8BPS\u0000\u0001 and so on'), 415, 'not_an_image'],
    ['text', Buffer.from('<html>not a scan</html>'), 415, 'not_an_image'],
  ];
  for (const [name, bytes, status, code] of cases) {
    const f = fakes(manager);
    f.objects.set(KEY, bytes);
    const res = await handleScan(post({ key: KEY, lpi: 55, angleDeg: 22.5 }), f.deps);
    assert.deepEqual([res.status, (await json(res)).error], [status, code], name);
    assert.equal(f.reads.length, 0, `${name}: not read`);
    assert.deepEqual(f.removed, [KEY], `${name}: cleared away`);
  }
});

test('a scan the reader cannot use comes back in the reader’s own words, and is cleared away', async () => {
  const f = fakes(manager, {
    readScan: async () => {
      throw new FakeScanError('Could not find the four corner squares of the chart in this scan.');
    },
  });
  f.objects.set(KEY, PNG);
  const res = await handleScan(post({ key: KEY, lpi: 55, angleDeg: 22.5 }), f.deps);
  assert.equal(res.status, 422);
  assert.deepEqual(await json(res), { error: 'unreadable', message: 'Could not find the four corner squares of the chart in this scan.' });
  assert.deepEqual(f.removed, [KEY]);
});

test('an unexpected failure while reading is a plain failure that leaks nothing, and the file is still cleared away', async () => {
  const f = fakes(manager, {
    readScan: async () => {
      throw new Error('out of memory at /srv/app/sharp.node');
    },
  });
  f.objects.set(KEY, PNG);
  const res = await handleScan(post({ key: KEY, lpi: 55, angleDeg: 22.5 }), f.deps);
  assert.equal(res.status, 500);
  assert.ok(!JSON.stringify(await json(res)).includes('/srv/app'));
  assert.deepEqual(f.removed, [KEY]);
  assert.ok(logged.some((line) => line.includes('reading the chart failed') && line.includes('out of memory')), 'the cause is in the server log');
});

test('a failure to remove the scan afterwards does not change the answer', async () => {
  const f = fakes(manager, {
    removeUpload: async () => {
      throw new Error('storage hiccup');
    },
  });
  f.objects.set(KEY, PNG);
  assert.equal((await handleScan(post({ key: KEY, lpi: 55, angleDeg: 22.5 }), f.deps)).status, 200);
});

test('file signatures: png, jpeg and tiff, either byte order', () => {
  assert.equal(scanSignature(PNG), 'png');
  assert.equal(scanSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])), 'jpeg');
  assert.equal(scanSignature(Uint8Array.from([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0])), 'tiff');
  assert.equal(scanSignature(Uint8Array.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8])), 'tiff');
  assert.equal(scanSignature(Uint8Array.from([0x38, 0x42, 0x50, 0x53, 0, 1])), null);
  assert.equal(scanSignature(Uint8Array.from([0x89, 0x50])), null);
});

// ---------------------------------------------------------------------------
// No route skips the check

const ROOT = path.resolve(__dirname, '../../..');
const ROUTES = path.join(ROOT, 'app/api/calibration');

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) routeFiles(full, out);
    else if (entry.name === 'route.ts') out.push(full);
  }
  return out;
}

/** A module's source plus the modules it imports by relative path, two levels deep: a route hands its work to a handler module, and the check sits there. */
function sourceWithImports(file: string, depth = 2, seen = new Set<string>()): string {
  if (seen.has(file) || !fs.existsSync(file)) return '';
  seen.add(file);
  const text = fs.readFileSync(file, 'utf8');
  if (depth === 0) return text;
  const imported = [...text.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => path.resolve(path.dirname(file), m[1]));
  const files = imported.flatMap((base) => [`${base}.ts`, path.join(base, 'index.ts')]).filter((f) => fs.existsSync(f));
  return [text, ...files.map((f) => sourceWithImports(f, depth - 1, seen))].join('\n');
}

test('every route in app/api/calibration reaches an access check, as the admin gate test demands of the other admin routes', () => {
  const routes = routeFiles(ROUTES);
  assert.deepEqual(routes.map((r) => path.relative(ROUTES, r)).sort(), ['chart/route.ts', 'scan-url/route.ts', 'scan/route.ts']);
  for (const route of routes) {
    const source = sourceWithImports(route);
    assert.match(source, /\bcan\(actor, 'prepress', level\)/, `${path.relative(ROOT, route)} reaches the Pre-press check`);
    // and it takes the actor from the session, never from the request
    assert.doesNotMatch(fs.readFileSync(route, 'utf8'), /headers\.get\(['"]x-/i);
  }
  // the handlers check before they read anything from the request: the first await of each is the check
  const handlers = fs.readFileSync(path.join(ROUTES, 'handlers.ts'), 'utf8');
  for (const name of ['handleChart', 'handleScanUrl', 'handleScan']) {
    const body = handlers.slice(handlers.indexOf(`export async function ${name}(`));
    const firstAwait = body.indexOf('await ');
    assert.ok(body.slice(firstAwait, firstAwait + 40).startsWith('await authorise('), `${name} authorises first`);
  }
});
