// Print storage: the local driver round trip, driver selection, URLs, and R2
// request signing against a stubbed fetch (no network). The R2 requests are
// checked with a SigV4 signer written here from the AWS spec and proven on the
// two examples in the AWS documentation, so the test does not just trust
// aws4fetch to agree with itself.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  PrintStorageError,
  contentDisposition,
  createLocalDriver,
  createR2Driver,
  deleteObject,
  getObject,
  isValidKey,
  objectUrl,
  openObject,
  parsePrintFilePath,
  presignObject,
  printKey,
  putObject,
  readR2Config,
  selectDriver,
  setPrintStorageDriver,
  statObject,
  type R2Config,
} from '@/lib/services/print-storage';
import { AWS_EXAMPLE, referenceSignature, sha256 } from '@/lib/services/test-sigv4';

let root: string;

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'print-storage-test-'));
});

after(async () => {
  setPrintStorageDriver(null);
  await rm(root, { recursive: true, force: true });
});

const DESIGN = '3f2b8c1e-7d4a-4e6b-9c1d-0a5b6c7d8e9f';

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

// ---------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------

test('printKey makes every part safe and never yields a dot segment', () => {
  assert.equal(printKey(DESIGN, 2, 'screens darks.psd'), `print/${DESIGN}/v2/screens-darks.psd`);
  assert.equal(printKey(DESIGN, 1, 'proofs', 'C002/front chest.webp'), `print/${DESIGN}/v1/proofs/C002-front-chest.webp`);
  assert.equal(printKey(DESIGN, 1, '..', '.hidden'), `print/${DESIGN}/v1/_/hidden`);
  assert.equal(printKey(DESIGN, 1, '...'), `print/${DESIGN}/v1/_`);
  assert.ok(isValidKey(printKey(DESIGN, 1, '../../etc/passwd')));
});

test('keys that could leave the storage folder are refused everywhere', async () => {
  setPrintStorageDriver(createLocalDriver(root));
  const bad = ['', '/print/a', 'print//a', 'print/../a', '../a', 'print/.hidden', 'print/a\\b', 'print/a b', 'print/a\0b', `print/${'x'.repeat(600)}`, '.meta/print/a.json'];
  for (const key of bad) {
    assert.equal(isValidKey(key), false, JSON.stringify(key));
    await assert.rejects(() => getObject(key), (err: unknown) => err instanceof PrintStorageError && err.code === 'invalid_key');
    await assert.rejects(() => statObject(key), { code: 'invalid_key' });
    await assert.rejects(() => openObject(key), { code: 'invalid_key' });
    await assert.rejects(() => deleteObject(key), { code: 'invalid_key' });
    await assert.rejects(() => putObject({ key, data: Buffer.from('x'), contentType: 'text/plain', visibility: 'private' }), { code: 'invalid_key' });
    await assert.rejects(() => objectUrl(key, 'private'), { code: 'invalid_key' });
  }
});

test('parsePrintFilePath accepts only print/<design uuid>/...', () => {
  assert.deepEqual(parsePrintFilePath(['print', DESIGN.toUpperCase(), 'v1', 'a.webp']), { key: `print/${DESIGN.toUpperCase()}/v1/a.webp`, designId: DESIGN });
  assert.equal(parsePrintFilePath(['print', DESIGN]), null);
  assert.equal(parsePrintFilePath(['other', DESIGN, 'v1', 'a']), null);
  assert.equal(parsePrintFilePath(['print', 'not-a-uuid', 'v1', 'a']), null);
  assert.equal(parsePrintFilePath(['print', DESIGN, '..', 'a']), null);
});

// ---------------------------------------------------------------------------
// the local driver
// ---------------------------------------------------------------------------

test('local driver: put, stat, get, stream, range, delete', async () => {
  const dir = await mkdtemp(path.join(root, 'local-'));
  setPrintStorageDriver(createLocalDriver(dir));
  const key = printKey(DESIGN, 1, 'darks.psd');
  const data = Buffer.from('0123456789abcdefghij');

  const stored = await putObject({ key, data, contentType: 'image/vnd.adobe.photoshop', visibility: 'private' });
  assert.deepEqual(stored, {
    key,
    visibility: 'private',
    contentType: 'image/vnd.adobe.photoshop',
    bytes: 20,
    sha256: createHash('sha256').update(data).digest('hex'),
  });

  assert.deepEqual(await statObject(key), {
    key,
    visibility: 'private',
    contentType: 'image/vnd.adobe.photoshop',
    bytes: 20,
    sha256: stored.sha256,
  });
  assert.deepEqual(await getObject(key), data);

  const whole = await openObject(key);
  assert.deepEqual(whole.range, { start: 0, end: 19 });
  assert.deepEqual(await readAll(whole.stream), data);

  const slice = await openObject(key, { start: 5, end: 9 });
  assert.deepEqual(slice.range, { start: 5, end: 9 });
  assert.equal((await readAll(slice.stream)).toString(), '56789');
  const tail = await openObject(key, { start: 15, end: 999 });
  assert.deepEqual(tail.range, { start: 15, end: 19 });
  assert.equal((await readAll(tail.stream)).toString(), 'fghij');

  await deleteObject(key);
  assert.equal(await statObject(key), null);
  await assert.rejects(() => getObject(key), { code: 'not_found' });
  await assert.rejects(() => openObject(key), { code: 'not_found' });
  await deleteObject(key); // deleting what is gone is fine
});

test('local driver: overwrite replaces the file and leaves no temp files behind', async () => {
  const dir = await mkdtemp(path.join(root, 'local-'));
  setPrintStorageDriver(createLocalDriver(dir));
  const key = printKey(DESIGN, 3, 'proof.webp');
  await putObject({ key, data: Buffer.from('first'), contentType: 'image/webp', visibility: 'public' });
  const second = await putObject({ key, data: Buffer.from('second one'), contentType: 'image/png', visibility: 'private' });

  assert.equal((await getObject(key)).toString(), 'second one');
  const info = await statObject(key);
  assert.equal(info?.contentType, 'image/png');
  assert.equal(info?.visibility, 'private');
  assert.equal(info?.sha256, second.sha256);
  assert.deepEqual(await readdir(path.join(dir, '.tmp')), []);
});

test('local driver: an empty file streams as nothing, and a hand-dropped file reads as private', async () => {
  const dir = await mkdtemp(path.join(root, 'local-'));
  setPrintStorageDriver(createLocalDriver(dir));
  const empty = printKey(DESIGN, 1, 'empty.bin');
  await putObject({ key: empty, data: new Uint8Array(0), contentType: 'application/octet-stream', visibility: 'private' });
  const opened = await openObject(empty);
  assert.equal((await readAll(opened.stream)).length, 0);

  const dropped = printKey(DESIGN, 1, 'by-hand.psd');
  await mkdir(path.join(dir, 'print', DESIGN, 'v1'), { recursive: true });
  await writeFile(path.join(dir, ...dropped.split('/')), 'dropped in');
  assert.deepEqual(await statObject(dropped), {
    key: dropped,
    visibility: 'private',
    contentType: 'application/octet-stream',
    bytes: 10,
    sha256: null,
  });
  // a folder is not an object
  assert.equal(await statObject(`print/${DESIGN}/v1`), null);
  await assert.rejects(() => getObject(`print/${DESIGN}/v1`), { code: 'not_found' });
});

// ---------------------------------------------------------------------------
// selecting the driver from the environment
// ---------------------------------------------------------------------------

const R2_ENV = { R2_ACCOUNT_ID: 'acct', R2_ACCESS_KEY_ID: 'AKID', R2_SECRET_ACCESS_KEY: 'secret', R2_BUCKET: 'print' };

test('driver selection: local without R2, r2 with it, and clear errors otherwise', () => {
  assert.equal(selectDriver({}).name, 'local');
  assert.equal(selectDriver({ PRINT_STORAGE_DRIVER: 'local', ...R2_ENV }).name, 'local');
  assert.equal(selectDriver(R2_ENV).name, 'r2');
  assert.equal(selectDriver({ PRINT_STORAGE_DRIVER: ' R2 ', ...R2_ENV }).name, 'r2');
  assert.equal(selectDriver({ PRINT_STORAGE: 'r2', ...R2_ENV }).name, 'r2', 'PRINT_STORAGE is an alias');

  assert.throws(
    () => selectDriver({ PRINT_STORAGE_DRIVER: 'r2', R2_ACCOUNT_ID: 'acct' }),
    (err: unknown) => err instanceof PrintStorageError && err.code === 'config' && /R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET/.test(err.message),
  );
  assert.throws(() => selectDriver({ PRINT_STORAGE_DRIVER: 's3' }), { code: 'config' });
});

test('driver selection: production never falls back to a container disk by accident', () => {
  assert.throws(() => selectDriver({ NODE_ENV: 'production' }), (err: unknown) => err instanceof PrintStorageError && err.code === 'config');
  assert.equal(selectDriver({ NODE_ENV: 'production', PRINT_STORAGE_DRIVER: 'local', PRINT_STORAGE_DIR: root }).name, 'local');
  assert.equal(selectDriver({ NODE_ENV: 'production', ...R2_ENV }).name, 'r2');
});

test('driver selection: PRINT_STORAGE_DIR sets the local root', async () => {
  const dir = await mkdtemp(path.join(root, 'env-'));
  const driver = selectDriver({ PRINT_STORAGE_DIR: dir });
  await driver.put({ key: `print/${DESIGN}/v1/x.txt`, data: Buffer.from('x'), contentType: 'text/plain', visibility: 'private', sha256: 'abc' });
  assert.deepEqual(await readdir(path.join(dir, 'print', DESIGN, 'v1')), ['x.txt']);
});

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

const R2: R2Config = {
  accountId: 'acct',
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'secretkeyexample',
  bucket: 'blackoutmerch-print',
  publicBucket: null,
  publicBaseUrl: null,
};

test('objectUrl: the route for local files and for private ones, the public domain for public R2 files', async () => {
  const key = printKey(DESIGN, 1, 'proofs', 'C002.webp');

  setPrintStorageDriver(createLocalDriver(root));
  assert.equal(await objectUrl(key, 'public'), `/api/print-files/${key}`);
  assert.equal(await objectUrl(key, 'private', { download: 'My art v1.psd' }), `/api/print-files/${key}?download=My+art+v1.psd`);
  assert.equal(await objectUrl(key, 'private', { expiresInSeconds: 300.4 }), `/api/print-files/${key}?ttl=300`);

  setPrintStorageDriver(createR2Driver({ ...R2, publicBucket: 'blackoutmerch-proofs', publicBaseUrl: 'https://proofs.example.com/' }));
  assert.equal(await objectUrl(key, 'public'), `https://proofs.example.com/${key}`);
  assert.equal(await objectUrl(key, 'private'), `/api/print-files/${key}`, 'private objects never get a public URL');
  assert.equal(await objectUrl(key, 'public', { download: 'a.webp' }), `/api/print-files/${key}?download=a.webp`, 'a download name needs the route');

  // One bucket behind a public domain would expose the PSDs, so the base URL
  // is ignored unless the public files have a bucket of their own.
  setPrintStorageDriver(createR2Driver({ ...R2, publicBaseUrl: 'https://proofs.example.com' }));
  assert.equal(await objectUrl(key, 'public'), `/api/print-files/${key}`);
});

test('a public bucket that is the private bucket is refused, and never gets a public URL', async () => {
  const key = printKey(DESIGN, 1, 'proofs', 'C002.webp');
  const sameBucket = { ...R2_ENV, R2_PUBLIC_BUCKET: ' print ', R2_PUBLIC_BASE_URL: 'https://proofs.example.com' };
  assert.throws(
    () => readR2Config(sameBucket),
    (err: unknown) => err instanceof PrintStorageError && err.code === 'config' && /R2_PUBLIC_BUCKET is R2_BUCKET/.test(err.message),
  );
  assert.throws(() => selectDriver(sameBucket), { code: 'config' });
  assert.throws(() => selectDriver({ ...R2_ENV, R2_PUBLIC_BUCKET: 'print' }), { code: 'config' }, 'with or without a public domain');
  assert.equal(readR2Config({ ...R2_ENV, R2_PUBLIC_BUCKET: 'print-proofs' }).publicBucket, 'print-proofs');

  // A config made by hand gets no public URL either: that domain would serve
  // the private bucket, so every key, PSDs included, goes through the route.
  setPrintStorageDriver(createR2Driver({ ...R2, publicBucket: R2.bucket, publicBaseUrl: 'https://proofs.example.com' }));
  assert.equal(await objectUrl(key, 'public'), `/api/print-files/${key}`);
  assert.equal(await objectUrl(printKey(DESIGN, 1, 'darks.psd'), 'private'), `/api/print-files/${printKey(DESIGN, 1, 'darks.psd')}`);
});

test('contentDisposition keeps an ASCII fallback and the UTF-8 name', () => {
  assert.equal(contentDisposition('plate 1.psd'), `attachment; filename="plate 1.psd"; filename*=UTF-8''plate%201.psd`);
  assert.equal(contentDisposition('Camiseta "Año".psd', 'inline'), `inline; filename="Camiseta _A_o_.psd"; filename*=UTF-8''Camiseta%20%22A%C3%B1o%22.psd`);
  assert.ok(!contentDisposition('a\r\nb: c').includes('\n'));
});

// ---------------------------------------------------------------------------
// R2, with a stubbed fetch and a SigV4 signer written from the spec
// ---------------------------------------------------------------------------

test('the reference signer reproduces the two examples in the AWS documentation', () => {
  const emptyHash = sha256('');
  assert.equal(
    referenceSignature({
      ...AWS_EXAMPLE,
      method: 'GET',
      path: '/test.txt',
      query: [],
      headers: { host: AWS_EXAMPLE.host, range: 'bytes=0-9', 'x-amz-content-sha256': emptyHash, 'x-amz-date': AWS_EXAMPLE.datetime },
      signedHeaders: ['host', 'range', 'x-amz-content-sha256', 'x-amz-date'],
      payloadHash: emptyHash,
    }),
    'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
  );
  assert.equal(
    referenceSignature({
      ...AWS_EXAMPLE,
      method: 'GET',
      path: '/test.txt',
      query: [
        ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
        ['X-Amz-Credential', 'AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request'],
        ['X-Amz-Date', AWS_EXAMPLE.datetime],
        ['X-Amz-Expires', '86400'],
        ['X-Amz-SignedHeaders', 'host'],
      ],
      headers: { host: AWS_EXAMPLE.host },
      signedHeaders: ['host'],
      payloadHash: 'UNSIGNED-PAYLOAD',
    }),
    'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
  );
});

interface Call {
  method: string;
  url: string;
  headers: Headers;
  body: Buffer | null;
}

function stubFetch(respond: (call: Call, index: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = async (input: Request | string | URL, init?: RequestInit): Promise<Response> => {
    const req = input instanceof Request ? input : new Request(input, init);
    const call: Call = {
      method: req.method,
      url: req.url,
      headers: new Headers(req.headers),
      body: req.body ? Buffer.from(await req.clone().arrayBuffer()) : null,
    };
    calls.push(call);
    return respond(call, calls.length - 1);
  };
  return { fetch: fn as typeof fetch, calls };
}

const NOW = new Date('2026-10-15T08:30:00Z');
const DATETIME = '20261015T083000Z';

/** Recomputes the signature of a captured request and returns it with the one
 * the request carries. */
function checkHeaderSignature(call: Call, cfg: R2Config): { expected: string; actual: string; credential: string } {
  const auth = call.headers.get('authorization') ?? '';
  const parts = Object.fromEntries(auth.replace('AWS4-HMAC-SHA256 ', '').split(', ').map((p) => p.split('=') as [string, string]));
  const url = new URL(call.url);
  const signedHeaders = parts.SignedHeaders.split(';');
  const headers: Record<string, string> = {};
  for (const name of signedHeaders) headers[name] = name === 'host' ? url.host : (call.headers.get(name) ?? '');
  return {
    expected: referenceSignature({
      method: call.method,
      host: url.host,
      path: url.pathname,
      query: [...url.searchParams],
      headers,
      signedHeaders,
      payloadHash: call.headers.get('x-amz-content-sha256') ?? '',
      secret: cfg.secretAccessKey,
      region: 'auto',
      service: 's3',
      datetime: call.headers.get('x-amz-date') ?? '',
    }),
    actual: parts.Signature,
    credential: parts.Credential,
  };
}

const noSleep = async () => undefined;

test('R2: a put is one signed PUT with the body, type and metadata', async () => {
  const { fetch, calls } = stubFetch(() => new Response(null, { status: 200, headers: { etag: '"abc"' } }));
  setPrintStorageDriver(createR2Driver(R2, { fetch, now: () => NOW, sleep: noSleep }));
  const key = printKey(DESIGN, 1, 'darks.psd');
  const data = Buffer.from('PSD bytes '.repeat(1000));

  const stored = await putObject({ key, data, contentType: 'image/vnd.adobe.photoshop', visibility: 'private' });
  assert.equal(stored.sha256, sha256(data));
  assert.equal(calls.length, 1);

  const [call] = calls;
  assert.equal(call.method, 'PUT');
  assert.equal(call.url, `https://acct.r2.cloudflarestorage.com/blackoutmerch-print/${key}`);
  assert.deepEqual(call.body, data);
  assert.equal(call.headers.get('content-type'), 'image/vnd.adobe.photoshop');
  assert.equal(call.headers.get('x-amz-meta-visibility'), 'private');
  assert.equal(call.headers.get('x-amz-meta-sha256'), stored.sha256);
  assert.equal(call.headers.get('x-amz-content-sha256'), 'UNSIGNED-PAYLOAD', 'a big body is never hashed for signing');
  assert.equal(call.headers.get('x-amz-date'), DATETIME);

  const { expected, actual, credential } = checkHeaderSignature(call, R2);
  assert.equal(credential, 'AKIDEXAMPLE/20261015/auto/s3/aws4_request');
  assert.equal(actual, expected);
  assert.ok(!JSON.stringify([...call.headers]).includes(R2.secretAccessKey), 'the secret never goes on the wire');
  assert.equal(call.headers.get('content-length'), String(data.length), 'R2 needs a Content-Length, not chunked encoding');
  assert.match(call.headers.get('authorization') ?? '', /SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-meta-sha256;x-amz-meta-visibility,/);
});

test('R2: a body of several chunks arrives whole, and an empty one is sent without a body', async () => {
  const { fetch, calls } = stubFetch(() => new Response(null, { status: 200 }));
  setPrintStorageDriver(createR2Driver(R2, { fetch, now: () => NOW, sleep: noSleep }));
  // 9 MiB is two and a bit of the 4 MiB chunks the upload is cut into
  const big = Buffer.alloc(9 * 1024 * 1024 + 123);
  for (let i = 0; i < big.length; i += 997) big[i] = i % 251;
  await putObject({ key: printKey(DESIGN, 1, 'big.psd'), data: big, contentType: 'image/vnd.adobe.photoshop', visibility: 'private' });
  assert.equal(calls[0].headers.get('content-length'), String(big.length));
  assert.equal(Buffer.compare(calls[0].body ?? Buffer.alloc(0), big), 0);

  await putObject({ key: printKey(DESIGN, 1, 'empty.bin'), data: new Uint8Array(0), contentType: 'application/octet-stream', visibility: 'private' });
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].body, null);
  assert.ok(['0', null].includes(calls[1].headers.get('content-length')));
  const { expected, actual } = checkHeaderSignature(calls[1], R2);
  assert.equal(actual, expected);
});

test('R2: get, head, delete and ranged reads are signed requests too', async () => {
  const body = Buffer.from('hello object');
  const { fetch, calls } = stubFetch((call) => {
    if (call.method === 'DELETE') return new Response(null, { status: 204 });
    const headers = { 'content-type': 'image/png', 'x-amz-meta-visibility': 'private', 'x-amz-meta-sha256': 'deadbeef' };
    if (call.method === 'HEAD') return new Response(null, { status: 200, headers: { ...headers, 'content-length': String(body.length) } });
    if (call.headers.get('range')) {
      return new Response(body.subarray(6, 12), { status: 206, headers: { ...headers, 'content-length': '6', 'content-range': `bytes 6-11/${body.length}` } });
    }
    return new Response(body, { status: 200, headers });
  });
  setPrintStorageDriver(createR2Driver(R2, { fetch, now: () => NOW, sleep: noSleep }));
  const key = printKey(DESIGN, 1, 'a.png');

  assert.deepEqual(await getObject(key), body);
  assert.deepEqual(await statObject(key), { key, visibility: 'private', contentType: 'image/png', bytes: body.length, sha256: 'deadbeef' });
  const ranged = await openObject(key, { start: 6, end: 11 });
  assert.equal((await readAll(ranged.stream)).toString(), 'object');
  assert.deepEqual(ranged.range, { start: 6, end: 11 });
  assert.equal(ranged.info.bytes, body.length, 'the size is the object, not the slice');
  await deleteObject(key);

  assert.deepEqual(calls.map((c) => c.method), ['GET', 'HEAD', 'GET', 'DELETE']);
  assert.equal(calls[2].headers.get('range'), 'bytes=6-11');
  for (const call of calls) {
    const { expected, actual } = checkHeaderSignature(call, R2);
    assert.equal(actual, expected, `${call.method} signature`);
  }
});

test('R2: a download that comes up short or long is an error, never a damaged file', async () => {
  const body = Buffer.from('0123456789');
  const serve = (declared: number) => stubFetch(() => new Response(new Uint8Array(body), { status: 200, headers: { 'content-length': String(declared) } }));
  const key = printKey(DESIGN, 1, 'cut.psd');

  setPrintStorageDriver(createR2Driver(R2, { fetch: serve(10).fetch, now: () => NOW, sleep: noSleep }));
  assert.deepEqual(await getObject(key), body);

  setPrintStorageDriver(createR2Driver(R2, { fetch: serve(25).fetch, now: () => NOW, sleep: noSleep }));
  await assert.rejects(() => getObject(key), { code: 'upstream', message: 'R2 get was cut short: 10 of 25 bytes.' });
  setPrintStorageDriver(createR2Driver(R2, { fetch: serve(4).fetch, now: () => NOW, sleep: noSleep }));
  await assert.rejects(() => getObject(key), { code: 'upstream', message: 'R2 get returned more than its Content-Length.' });

  // a connection that drops mid-body
  const dropping = stubFetch(
    () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
            controller.error(new TypeError('terminated'));
          },
        }),
        { status: 200, headers: { 'content-length': '10' } },
      ),
  );
  setPrintStorageDriver(createR2Driver(R2, { fetch: dropping.fetch, now: () => NOW, sleep: noSleep }));
  await assert.rejects(() => getObject(key), { code: 'upstream', message: 'R2 get was interrupted: terminated' });

  // no Content-Length (chunked reply), or an empty object: read it the plain way
  const chunked = stubFetch(() => new Response(new Uint8Array(body), { status: 200 }));
  setPrintStorageDriver(createR2Driver(R2, { fetch: chunked.fetch, now: () => NOW, sleep: noSleep }));
  assert.deepEqual(await getObject(key), body);
});

test('R2: a missing object is not_found, other failures say what R2 said', async () => {
  const { fetch } = stubFetch((call) => {
    if (call.url.includes('missing')) return new Response('<Error><Code>NoSuchKey</Code></Error>', { status: 404 });
    return new Response('<Error><Code>AccessDenied</Code><Message>nope</Message></Error>', { status: 403 });
  });
  setPrintStorageDriver(createR2Driver(R2, { fetch, now: () => NOW, sleep: noSleep }));

  await assert.rejects(() => getObject(printKey(DESIGN, 1, 'missing.psd')), { code: 'not_found' });
  assert.equal(await statObject(printKey(DESIGN, 1, 'missing.psd')), null);
  await assert.rejects(() => openObject(printKey(DESIGN, 1, 'missing.psd')), { code: 'not_found' });
  await assert.rejects(
    () => getObject(printKey(DESIGN, 1, 'secret.psd')),
    (err: unknown) => err instanceof PrintStorageError && err.code === 'upstream' && err.message === 'R2 get failed: 403 AccessDenied',
  );
  await assert.rejects(
    () => putObject({ key: printKey(DESIGN, 1, 'denied.psd'), data: Buffer.from('x'), contentType: 'text/plain', visibility: 'private' }),
    { code: 'upstream' },
  );
});

test('R2: 5xx and network errors are retried with backoff, then reported', async () => {
  const sleeps: number[] = [];
  const key = printKey(DESIGN, 1, 'flaky.psd');

  const flaky = stubFetch((_call, index) => {
    if (index === 0) return new Response('busy', { status: 503 });
    if (index === 1) throw new TypeError('fetch failed');
    return new Response(null, { status: 200 });
  });
  setPrintStorageDriver(createR2Driver(R2, { fetch: flaky.fetch, now: () => NOW, sleep: async (ms) => void sleeps.push(ms) }));
  await putObject({ key, data: Buffer.from('payload'), contentType: 'text/plain', visibility: 'private' });
  assert.equal(flaky.calls.length, 3);
  assert.equal(sleeps.length, 2);
  assert.ok(sleeps[1] > sleeps[0] * 0.5, 'the wait grows');
  assert.ok(flaky.calls.every((c) => c.body?.toString() === 'payload'), 'every attempt carries the whole body');

  const dead = stubFetch(() => new Response('down', { status: 500 }));
  setPrintStorageDriver(createR2Driver(R2, { fetch: dead.fetch, now: () => NOW, sleep: noSleep }));
  await assert.rejects(() => getObject(key), { code: 'upstream', message: 'R2 GET failed: 500' });
  assert.equal(dead.calls.length, 4, 'four attempts in all');

  const throwing = stubFetch(() => {
    throw new TypeError('getaddrinfo ENOTFOUND');
  });
  setPrintStorageDriver(createR2Driver(R2, { fetch: throwing.fetch, now: () => NOW, sleep: noSleep }));
  await assert.rejects(() => deleteObject(key), (err: unknown) => err instanceof PrintStorageError && /could not be reached/.test(err.message));
});

test('R2: the timeout is for the answer to start, not for a download that is still coming', async () => {
  const key = printKey(DESIGN, 1, 'slow.psd');

  // R2 never answers: abandoned after the wait, retried, then reported
  let attempts = 0;
  const hang = ((_input: Request | string | URL, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      attempts++;
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })) as typeof fetch;
  setPrintStorageDriver(createR2Driver(R2, { fetch: hang, now: () => NOW, sleep: noSleep, timeoutMs: 15 }));
  await assert.rejects(() => statObject(key), (err: unknown) => err instanceof PrintStorageError && /could not be reached: no answer after 1 s/.test(err.message));
  assert.equal(attempts, 4);

  // headers arrive at once, the body trickles in for longer than the wait
  const trickle = () =>
    new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const piece of ['one ', 'two ', 'three']) {
            await new Promise((resolve) => setTimeout(resolve, 30));
            controller.enqueue(new TextEncoder().encode(piece));
          }
          controller.close();
        },
      }),
      { status: 200, headers: { 'content-length': '13' } },
    );
  const slowBody = stubFetch(trickle);
  setPrintStorageDriver(createR2Driver(R2, { fetch: slowBody.fetch, now: () => NOW, sleep: noSleep, timeoutMs: 15 }));
  assert.equal((await getObject(key)).toString(), 'one two three');
  const opened = await openObject(key);
  assert.equal((await readAll(opened.stream)).toString(), 'one two three');
});

test('R2: refuses a body past the single-upload limit before sending anything', async () => {
  const { fetch, calls } = stubFetch(() => new Response(null, { status: 200 }));
  const driver = createR2Driver(R2, { fetch, now: () => NOW, sleep: noSleep });
  await assert.rejects(
    () => driver.put({ key: printKey(DESIGN, 1, 'huge.psb'), data: { byteLength: 5 * 1024 ** 3 } as Uint8Array, contentType: 'x/y', visibility: 'private', sha256: 'x' }),
    { code: 'too_large' },
  );
  assert.equal(calls.length, 0);
});

test('R2: public files go to the public bucket, and reads look in both', async () => {
  const cfg: R2Config = { ...R2, publicBucket: 'blackoutmerch-proofs', publicBaseUrl: 'https://proofs.example.com' };
  const store = new Map<string, { body: Buffer; type: string; visibility: string }>();
  const { fetch, calls } = stubFetch(async (call) => {
    const url = new URL(call.url);
    const id = url.pathname; // /<bucket>/<key>
    if (call.method === 'PUT') {
      store.set(id, { body: call.body ?? Buffer.alloc(0), type: call.headers.get('content-type') ?? '', visibility: call.headers.get('x-amz-meta-visibility') ?? '' });
      return new Response(null, { status: 200 });
    }
    const found = store.get(id);
    if (call.method === 'DELETE') {
      store.delete(id);
      return new Response(null, { status: 204 });
    }
    if (!found) return new Response('<Error><Code>NoSuchKey</Code></Error>', { status: 404 });
    return new Response(call.method === 'HEAD' ? null : new Uint8Array(found.body), {
      status: 200,
      headers: { 'content-type': found.type, 'content-length': String(found.body.length), 'x-amz-meta-visibility': found.visibility },
    });
  });
  setPrintStorageDriver(createR2Driver(cfg, { fetch, now: () => NOW, sleep: noSleep }));

  const proof = printKey(DESIGN, 1, 'proof.webp');
  const psd = printKey(DESIGN, 1, 'darks.psd');
  await putObject({ key: proof, data: Buffer.from('webp'), contentType: 'image/webp', visibility: 'public' });
  await putObject({ key: psd, data: Buffer.from('psd'), contentType: 'image/vnd.adobe.photoshop', visibility: 'private' });
  assert.deepEqual([...store.keys()].sort(), [`/blackoutmerch-print/${psd}`, `/blackoutmerch-proofs/${proof}`]);

  assert.equal((await getObject(proof)).toString(), 'webp');
  assert.equal((await getObject(psd)).toString(), 'psd');
  assert.equal((await statObject(proof))?.visibility, 'public');
  assert.equal((await statObject(psd))?.visibility, 'private');
  assert.equal(await statObject(printKey(DESIGN, 1, 'nope.webp')), null);

  calls.length = 0;
  await getObject(psd);
  assert.equal(calls.length, 1, 'a private file is found on the first look');

  await deleteObject(proof);
  assert.equal(store.size, 1);
  assert.equal(await statObject(proof), null);
});

test('R2: presigned URLs carry the expiry, the download name and a signature that checks out', async () => {
  const { fetch, calls } = stubFetch(() => new Response(null, { status: 500 }));
  setPrintStorageDriver(createR2Driver(R2, { fetch, now: () => NOW, sleep: noSleep }));
  const key = printKey(DESIGN, 1, 'darks.psd');

  const signed = await presignObject(key, 'private', { expiresInSeconds: 90, download: 'Underwriter v1 darks.psd' });
  assert.ok(signed);
  assert.equal(calls.length, 0, 'signing makes no request');

  const url = new URL(signed);
  assert.equal(url.origin + url.pathname, `https://acct.r2.cloudflarestorage.com/blackoutmerch-print/${key}`);
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.equal(url.searchParams.get('X-Amz-Credential'), 'AKIDEXAMPLE/20261015/auto/s3/aws4_request');
  assert.equal(url.searchParams.get('X-Amz-Date'), DATETIME);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '90');
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'host');
  assert.equal(url.searchParams.get('response-content-disposition'), contentDisposition('Underwriter v1 darks.psd'));

  const query = [...url.searchParams].filter(([name]) => name !== 'X-Amz-Signature');
  assert.equal(
    url.searchParams.get('X-Amz-Signature'),
    referenceSignature({
      method: 'GET',
      host: url.host,
      path: url.pathname,
      query,
      headers: { host: url.host },
      signedHeaders: ['host'],
      payloadHash: 'UNSIGNED-PAYLOAD',
      secret: R2.secretAccessKey,
      region: 'auto',
      service: 's3',
      datetime: DATETIME,
    }),
  );

  const clamped = new URL((await presignObject(key, 'private', { expiresInSeconds: 99999999 }))!);
  assert.equal(clamped.searchParams.get('X-Amz-Expires'), '604800', 'S3 allows at most 7 days');
  assert.equal(new URL((await presignObject(key, 'private', { expiresInSeconds: 0 }))!).searchParams.get('X-Amz-Expires'), '1');
  assert.ok(!signed.includes(R2.secretAccessKey));

  setPrintStorageDriver(createLocalDriver(root));
  assert.equal(await presignObject(key, 'private', { expiresInSeconds: 60 }), null, 'local storage has nothing to sign');
});

test('R2: an EU or custom endpoint replaces the default host', async () => {
  const { fetch, calls } = stubFetch(() => new Response(null, { status: 200 }));
  const driver = createR2Driver({ ...R2, endpoint: 'https://acct.eu.r2.cloudflarestorage.com/' }, { fetch, now: () => NOW, sleep: noSleep });
  setPrintStorageDriver(driver);
  await putObject({ key: printKey(DESIGN, 1, 'a.txt'), data: Buffer.from('a'), contentType: 'text/plain', visibility: 'private' });
  assert.ok(calls[0].url.startsWith('https://acct.eu.r2.cloudflarestorage.com/blackoutmerch-print/print/'));
  const { expected, actual } = checkHeaderSignature(calls[0], R2);
  assert.equal(actual, expected);
});
