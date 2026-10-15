// Signed uploads (createUploadUrl): the R2 presigned PUT checked against a SigV4
// signer written from the spec (and the AWS PUT example), who may ask for a
// link, and the local one-time link with its PUT handler: expired, oversized,
// cut-off, used twice, wrong person. No network, no Clerk, no database.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';
import { handlePrintFileRequest, type PrintFilesSession } from '@/app/api/print-files/handler';
import { handlePrintFileUpload, type PrintUploadDeps } from '@/app/api/print-files/upload';
import { PermissionError, type Actor, type PermissionMap, type Role } from '@/lib/auth/permissions';
import {
  PrintStorageError,
  checkUploadToken,
  createLocalDriver,
  createR2Driver,
  createUploadUrl,
  getObject,
  openObject,
  presignObject,
  receiveUpload,
  setPrintStorageDriver,
  statObject,
  uploadPolicyFor,
  type CreateUploadUrlInput,
  type R2Config,
  type UploadUrl,
  UPLOAD_TOKEN_HEADER,
} from '@/lib/services/print-storage';
import { AWS_EXAMPLE, checkPresignedUrl, referenceSignature, sha256 } from '@/lib/services/test-sigv4';

const PACK = '0c6f2d3e-5a1b-4c7d-8e9f-a1b2c3d4e5f6';
const NONCE = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const TYPE = 'application/octet-stream';
/** the corrected-PSD key WP9 builds, and the other staff prefix */
const KEY = `prepress-uploads/${PACK}/${NONCE}/corrected.psd`;
const OTHER_KEY = `uploads/prepress/${PACK}/${NONCE}.psd`;
const DESIGN = '3f2b8c1e-7d4a-4e6b-9c1d-0a5b6c7d8e9f';

const person = (userId: string, role: Role, permissions: PermissionMap | null = null, suspended = false): Actor => ({ userId, role, permissions, suspended });
const prepressWork = person('staff-1', 'staff', { prepress: 'work' });
const owner = person('owner-1', 'admin');

// ---------------------------------------------------------------------------
// the signer, and aws4fetch, on the AWS PUT Object example
// ---------------------------------------------------------------------------

test('the AWS documentation PUT Object example: the reference signer and aws4fetch both reproduce it', async () => {
  const body = 'Welcome to Amazon S3.';
  const payloadHash = sha256(body);
  assert.equal(payloadHash, '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072');
  const date = 'Fri, 24 May 2013 00:00:00 GMT';
  const expected = '98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd';

  assert.equal(
    referenceSignature({
      ...AWS_EXAMPLE,
      method: 'PUT',
      path: '/test%24file.text',
      query: [],
      headers: { date, host: AWS_EXAMPLE.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': AWS_EXAMPLE.datetime, 'x-amz-storage-class': 'REDUCED_REDUNDANCY' },
      signedHeaders: ['date', 'host', 'x-amz-content-sha256', 'x-amz-date', 'x-amz-storage-class'],
      payloadHash,
    }),
    expected,
  );

  const aws = new AwsClient({ accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: AWS_EXAMPLE.secret, service: 's3', region: 'us-east-1' });
  const signed = await aws.sign('https://examplebucket.s3.amazonaws.com/test$file.text', {
    method: 'PUT',
    headers: { date, 'x-amz-storage-class': 'REDUCED_REDUNDANCY', 'x-amz-content-sha256': payloadHash },
    body,
    aws: { datetime: AWS_EXAMPLE.datetime },
  });
  assert.match(signed.headers.get('authorization') ?? '', new RegExp(`SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class, Signature=${expected}$`));
});

// ---------------------------------------------------------------------------
// R2: a presigned PUT
// ---------------------------------------------------------------------------

const R2: R2Config = {
  accountId: 'acct',
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'secretkeyexample',
  bucket: 'merchfrom-print',
  publicBucket: 'merchfrom-proofs',
  publicBaseUrl: 'https://proofs.example.com',
};
const NOW = new Date('2026-10-15T08:30:00Z');

function r2Driver() {
  const calls: string[] = [];
  const fetchStub = (async (input: Request | string | URL) => {
    calls.push(String(input instanceof Request ? input.url : input));
    return new Response(null, { status: 500 });
  }) as typeof fetch;
  return { driver: createR2Driver(R2, { fetch: fetchStub, now: () => NOW }), calls };
}

test('R2: the upload URL is a presigned PUT, bound to the content type, in the private bucket', async () => {
  const { driver, calls } = r2Driver();
  setPrintStorageDriver(driver);

  const ticket = await createUploadUrl({ actor: prepressWork, key: KEY, contentType: TYPE, maxBytes: 4_000, expiresIn: 1_800 });
  assert.equal(calls.length, 0, 'signing makes no request');
  assert.equal(ticket.method, 'PUT');
  assert.deepEqual(ticket.headers, { 'content-type': TYPE });
  assert.equal(ticket.key, KEY);
  assert.equal(ticket.expiresAt, '2026-10-15T09:00:00.000Z');

  const url = new URL(ticket.url);
  assert.equal(url.origin + url.pathname, `https://acct.r2.cloudflarestorage.com/merchfrom-print/${KEY}`, 'uploads are private: never the public bucket');
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.equal(url.searchParams.get('X-Amz-Credential'), 'AKIDEXAMPLE/20261015/auto/s3/aws4_request');
  assert.equal(url.searchParams.get('X-Amz-Date'), '20261015T083000Z');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '1800');

  // what the browser will send, run back through the signer
  const sent = checkPresignedUrl('PUT', ticket.url, ticket.headers, R2.secretAccessKey);
  assert.deepEqual(sent.signedHeaders, ['content-type', 'host']);
  assert.equal(sent.actual, sent.expected);
  assert.ok(!ticket.url.includes(R2.secretAccessKey));

  // another Content-Type, or the same URL used for another method, is no longer signed for
  const retyped = checkPresignedUrl('PUT', ticket.url, { 'content-type': 'text/html' }, R2.secretAccessKey);
  assert.notEqual(retyped.actual, retyped.expected);
  const asGet = checkPresignedUrl('GET', ticket.url, ticket.headers, R2.secretAccessKey);
  assert.notEqual(asGet.actual, asGet.expected);
});

test('R2: an exact size can be signed too, and then R2 refuses any other length', async () => {
  setPrintStorageDriver(r2Driver().driver);
  const ticket = await createUploadUrl({ actor: prepressWork, key: KEY, contentType: TYPE, maxBytes: 4_000, contentLength: 3_210 });
  assert.deepEqual(ticket.headers, { 'content-type': TYPE }, 'the browser sets Content-Length itself, so it is not among the headers to send');

  const exact = checkPresignedUrl('PUT', ticket.url, { ...ticket.headers, 'content-length': '3210' }, R2.secretAccessKey);
  assert.deepEqual(exact.signedHeaders, ['content-length', 'content-type', 'host']);
  assert.equal(exact.actual, exact.expected);
  const longer = checkPresignedUrl('PUT', ticket.url, { ...ticket.headers, 'content-length': '3211' }, R2.secretAccessKey);
  assert.notEqual(longer.actual, longer.expected);
});

test('the lifetime of a link defaults to 15 minutes and is held to 30 seconds .. 1 hour', async () => {
  const lifetimes: [number | undefined, number][] = [
    [undefined, 900],
    [Number.NaN, 900],
    [5, 30],
    [0, 30],
    [600, 600],
    [99_999, 3_600],
  ];
  setPrintStorageDriver(r2Driver().driver);
  for (const [asked, seconds] of lifetimes) {
    const ticket = await createUploadUrl({ actor: prepressWork, key: KEY, contentType: TYPE, maxBytes: 100, expiresIn: asked });
    assert.equal(new URL(ticket.url).searchParams.get('X-Amz-Expires'), String(seconds), `R2, asked for ${asked}`);
    assert.equal(Date.parse(ticket.expiresAt) - NOW.getTime(), seconds * 1000);
  }
  const now = Date.UTC(2026, 9, 15, 8, 30, 0);
  const lifeRoot = await mkdtemp(path.join(tmpdir(), 'uploads-life-'));
  try {
    setPrintStorageDriver(createLocalDriver(lifeRoot, { now: () => now, secret: 'a-test-secret-long-enough' }));
    for (const [asked, seconds] of lifetimes) {
      const ticket = await createUploadUrl({ actor: prepressWork, key: KEY, contentType: TYPE, maxBytes: 100, expiresIn: asked });
      assert.equal(Date.parse(ticket.expiresAt) - now, seconds * 1000, `local, asked for ${asked}`);
    }
  } finally {
    await rm(lifeRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// who may ask, and for what
// ---------------------------------------------------------------------------

test('only Pre-press Work gets a link, and the refusal comes before anything else is looked at', async () => {
  setPrintStorageDriver(r2Driver().driver);
  const base = { key: KEY, contentType: TYPE, maxBytes: 100 };

  for (const key of [KEY, OTHER_KEY]) {
    for (const allowed of [prepressWork, owner, person('staff-2', 'staff', { prepress: 'manage' })]) {
      assert.equal((await createUploadUrl({ ...base, key, actor: allowed })).key, key, `${allowed.userId} on ${key}`);
    }
  }
  const refused: [string, Actor][] = [
    ['view only', person('staff-3', 'staff', { prepress: 'view' })],
    ['another area', person('staff-4', 'staff', { production: 'manage', runs: 'work' })],
    ['no access', person('staff-5', 'staff', null)],
    ['an artist', person('artist-1', 'artist', { prepress: 'manage' })],
    ['suspended', person('staff-6', 'staff', { prepress: 'work' }, true)],
  ];
  for (const [why, actor] of refused) {
    await assert.rejects(() => createUploadUrl({ ...base, actor }), (err: unknown) => err instanceof PermissionError && err.area === 'prepress' && err.level === 'work', why);
  }
  // not even the shape of a good request is told to someone who may not ask
  await assert.rejects(() => createUploadUrl({ ...base, actor: person('artist-1', 'artist'), contentType: 'nonsense', maxBytes: -1 }), PermissionError);
});

test('only keys under the staff upload prefixes can be signed for', async () => {
  setPrintStorageDriver(r2Driver().driver);
  assert.deepEqual(uploadPolicyFor(KEY), { area: 'prepress', level: 'work' });
  assert.deepEqual(uploadPolicyFor(OTHER_KEY), { area: 'prepress', level: 'work' });

  const bad = [
    '',
    `print/${DESIGN}/v1/darks.psd`,
    'uploads/other/a.psd',
    'prepress-uploads',
    'prepress-uploads/',
    'uploads/prepress/',
    'prepress-uploads/../print/x/y.psd',
    'prepress-uploads/.hidden/a.psd',
    'prepress-uploads/a b.psd',
    `prepress-uploads/${'x'.repeat(600)}`,
  ];
  for (const key of bad) {
    assert.equal(uploadPolicyFor(key), null, JSON.stringify(key));
    await assert.rejects(
      () => createUploadUrl({ actor: owner, key, contentType: TYPE, maxBytes: 100 }),
      (err: unknown) => err instanceof PrintStorageError && err.code === 'invalid_key',
      JSON.stringify(key.slice(0, 40)),
    );
  }
});

test('the content type, the size limit and the exact size are checked', async () => {
  setPrintStorageDriver(r2Driver().driver);
  const ask = (more: Partial<CreateUploadUrlInput>) => createUploadUrl({ actor: owner, key: KEY, contentType: TYPE, maxBytes: 100, ...more });
  const invalid = (err: unknown) => err instanceof PrintStorageError && err.code === 'invalid_request';

  for (const contentType of ['', 'octet-stream', 'image/png; charset=utf-8', 'image/png\r\nx-evil: 1', 'a/b/c', ' image/png']) {
    await assert.rejects(() => ask({ contentType }), invalid, JSON.stringify(contentType));
  }
  for (const maxBytes of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 5 * 1024 ** 3]) {
    await assert.rejects(() => ask({ maxBytes }), invalid, `maxBytes ${maxBytes}`);
  }
  for (const contentLength of [0, -5, 1.5, 101, Number.NaN]) {
    await assert.rejects(() => ask({ contentLength }), invalid, `contentLength ${contentLength}`);
  }
  assert.equal((await ask({ contentLength: 100 })).key, KEY, 'the exact size may equal the limit');
  assert.equal((await ask({ contentType: 'image/vnd.adobe.photoshop' })).headers['content-type'], 'image/vnd.adobe.photoshop');
});

// ---------------------------------------------------------------------------
// local: the one-time link and its PUT handler
// ---------------------------------------------------------------------------

const START = Date.UTC(2026, 9, 15, 8, 30, 0);
const SECRET = 'a-test-secret-long-enough';
let clock = START;
let root: string;

const localDriver = () => createLocalDriver(root, { now: () => clock, secret: SECRET });

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'print-uploads-test-'));
});

beforeEach(() => {
  clock = START;
  setPrintStorageDriver(localDriver());
});

after(async () => {
  setPrintStorageDriver(null);
  await rm(root, { recursive: true, force: true });
});

const staffSession: PrintFilesSession = { userId: 'staff-1', role: 'staff', storeId: null };

function deps(session: PrintFilesSession = staffSession, permissions: PermissionMap | null = { prepress: 'work' }, suspended = false): PrintUploadDeps {
  return {
    getSession: async () => session,
    loadActor: async (userId, role) => ({ userId, role, permissions, suspended }),
    checkToken: checkUploadToken,
    receive: receiveUpload,
  };
}

const freshKey = () => `prepress-uploads/${PACK}/${randomUUID()}/corrected.psd`;
const mint = (more: Partial<CreateUploadUrlInput> = {}) =>
  createUploadUrl({ actor: prepressWork, key: freshKey(), contentType: TYPE, maxBytes: 16, expiresIn: 60, ...more });

/** the segments the route is given for a link's URL */
const segmentsOf = (ticket: UploadUrl) => new URL(ticket.url, 'http://localhost').pathname.slice('/api/print-files/'.length).split('/');

function viewStream(data: Buffer, chunk = 4): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= data.length) return controller.close();
      controller.enqueue(new Uint8Array(data.subarray(offset, offset + chunk)));
      offset += chunk;
    },
  });
}

/** what the browser sends: the headers it was told, plus the Content-Length it adds itself */
function putRequest(ticket: UploadUrl, body: Buffer | ReadableStream<Uint8Array>, headers: Record<string, string> = {}, path?: string): Request {
  const length: Record<string, string> = Buffer.isBuffer(body) ? { 'content-length': String(body.length) } : {};
  const init: RequestInit & { duplex?: 'half' } = {
    method: ticket.method,
    headers: { ...ticket.headers, ...length, ...headers },
    body: (Buffer.isBuffer(body) ? new Uint8Array(body) : body) as BodyInit,
  };
  if (!Buffer.isBuffer(body)) init.duplex = 'half';
  return new Request(`http://localhost${path ?? ticket.url}`, init);
}

/** the same PUT without the token header, or with another one */
function withToken(ticket: UploadUrl, token: string | null): UploadUrl {
  const { [UPLOAD_TOKEN_HEADER]: _own, ...rest } = ticket.headers;
  void _own;
  return { ...ticket, headers: token === null ? rest : { ...rest, [UPLOAD_TOKEN_HEADER]: token } };
}

const send = (ticket: UploadUrl, request: Request, d: PrintUploadDeps = deps()) => handlePrintFileUpload(request, segmentsOf(ticket), d);

async function filesIn(dir: string): Promise<string[]> {
  try {
    return await readdir(path.join(root, dir));
  } catch {
    return [];
  }
}

test('local: the browser PUTs to the link; the file lands private, hashed and ready to read', async () => {
  const ticket = await mint({ maxBytes: 1_024 });
  assert.equal(ticket.method, 'PUT');
  assert.deepEqual(Object.keys(ticket.headers).sort(), ['content-type', UPLOAD_TOKEN_HEADER]);
  assert.equal(ticket.headers['content-type'], TYPE);
  assert.match(ticket.headers[UPLOAD_TOKEN_HEADER], /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.equal(ticket.url, `/api/print-files/${ticket.key}`, 'the URL carries no secret: it would end up in logs');
  assert.equal(ticket.expiresAt, new Date(START + 60_000).toISOString());

  const data = Buffer.from('8BPS-fake-photoshop-bytes'.repeat(20));
  const res = await send(ticket, putRequest(ticket, data));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { key: ticket.key, bytes: data.length, sha256: sha256(data) });

  assert.deepEqual(await getObject(ticket.key), data);
  assert.deepEqual(await statObject(ticket.key), { key: ticket.key, visibility: 'private', contentType: TYPE, bytes: data.length, sha256: sha256(data) });
  const head = await openObject(ticket.key, { start: 0, end: 3 });
  assert.equal(Buffer.from(await new Response(head.stream).arrayBuffer()).toString(), '8BPS', 'the first bytes can be read as a range, as WP9 checks the signature');
  assert.deepEqual(await filesIn('.tmp'), [], 'no temp file left');
});

test('local: the link works once, also after a restart', async () => {
  const ticket = await mint({ maxBytes: 1_024 });
  const data = Buffer.from('first and only');
  assert.equal((await send(ticket, putRequest(ticket, data))).status, 200);

  const again = await send(ticket, putRequest(ticket, Buffer.from('second try')));
  assert.equal(again.status, 409);
  assert.deepEqual(await again.json(), { error: 'link_used' });
  assert.deepEqual(await getObject(ticket.key), data, 'the first file stands');

  setPrintStorageDriver(localDriver()); // a new process on the same folder
  assert.equal((await send(ticket, putRequest(ticket, Buffer.from('third try')))).status, 409);
});

test('local: two PUTs on one link at the same moment: one wins, the other is told it is used', async () => {
  const ticket = await mint({ maxBytes: 1_024 });
  const data = Buffer.from('x'.repeat(500));
  const answers = await Promise.all([send(ticket, putRequest(ticket, data)), send(ticket, putRequest(ticket, data))]);
  assert.deepEqual(answers.map((a) => a.status).sort(), [200, 409]);
  assert.deepEqual(await getObject(ticket.key), data);
});

test('local: an expired link is a 410 and writes nothing; the same link is fine before it expires', async () => {
  const ticket = await mint({ expiresIn: 60 });
  clock = START + 60_001;
  const late = await send(ticket, putRequest(ticket, Buffer.from('too late')));
  assert.equal(late.status, 410);
  assert.deepEqual(await late.json(), { error: 'expired' });
  assert.equal(await statObject(ticket.key), null);
  assert.deepEqual(await filesIn('.tmp'), []);

  clock = START + 60_000; // on the last millisecond it still works: it was the clock, not a used link
  assert.equal((await send(ticket, putRequest(ticket, Buffer.from('in time')))).status, 200);
});

test('local: an oversized file is a 413 before it is read, and the link is still good', async () => {
  const ticket = await mint({ maxBytes: 16 });
  const tooBig = await send(ticket, putRequest(ticket, Buffer.alloc(20, 7)));
  assert.equal(tooBig.status, 413);
  assert.deepEqual(await tooBig.json(), { error: 'too_large' });
  assert.equal(await statObject(ticket.key), null);

  assert.equal((await send(ticket, putRequest(ticket, Buffer.alloc(16, 7)))).status, 200, 'the link was not used up, and exactly the limit is allowed');
});

test('local: a body that outgrows the limit part way is stopped, whatever Content-Length said', async () => {
  const ticket = await mint({ maxBytes: 16 });
  // Content-Length claims 10 bytes, the stream carries 40
  const res = await send(ticket, putRequest(ticket, viewStream(Buffer.alloc(40, 1)), { 'content-length': '10' }));
  assert.equal(res.status, 413);
  assert.equal(await statObject(ticket.key), null);
  assert.deepEqual(await filesIn('.tmp'), [], 'the half-written file was removed');

  assert.equal((await send(ticket, putRequest(ticket, Buffer.alloc(10, 2)))).status, 200, 'and the link can be tried again');
  assert.equal((await statObject(ticket.key))?.bytes, 10);
});

test('local: a body shorter than its Content-Length was cut off on the way: refused, not stored', async () => {
  const ticket = await mint({ maxBytes: 64 });
  // proxy.ts hands a route only the first 10 MB of a bigger body: here 10 of 20 bytes arrive
  const res = await send(ticket, putRequest(ticket, viewStream(Buffer.alloc(10, 3)), { 'content-length': '20' }));
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'incomplete' });
  assert.equal(await statObject(ticket.key), null);
  assert.deepEqual(await filesIn('.tmp'), []);

  assert.equal((await send(ticket, putRequest(ticket, Buffer.alloc(20, 3)))).status, 200, 'the whole file, on the same link, is taken');
});

test('local: a link made for an exact size takes that size only', async () => {
  const ticket = await mint({ maxBytes: 64, contentLength: 12 });
  const wrong = await send(ticket, putRequest(ticket, Buffer.alloc(10, 1)));
  assert.equal(wrong.status, 400);
  assert.deepEqual(await wrong.json(), { error: 'size_mismatch' });
  assert.equal((await send(ticket, putRequest(ticket, Buffer.alloc(12, 1)))).status, 200);
});

test('local: the wrong type, no length and an empty file are refused before the link is used', async () => {
  const ticket = await mint({ maxBytes: 16 });
  const small = Buffer.alloc(10, 5);

  const wrongType = await send(ticket, putRequest(ticket, small, { 'content-type': 'text/html' }));
  assert.equal(wrongType.status, 415);
  assert.equal((await send(ticket, putRequest(ticket, small, { 'content-type': 'Application/Octet-Stream; x=1' }))).status, 200, 'case and parameters do not matter');
  const next = await mint({ maxBytes: 16 });

  const noLength = await send(next, putRequest(next, viewStream(small)));
  assert.equal(noLength.status, 411);
  assert.deepEqual(await noLength.json(), { error: 'length_required' });
  const empty = await send(next, putRequest(next, Buffer.alloc(0)));
  assert.equal(empty.status, 400);
  assert.deepEqual(await empty.json(), { error: 'empty' });
  assert.equal((await send(next, putRequest(next, small))).status, 200, 'none of those used the link up');
});

test('local: a token that was altered, made for another key, or missing is a 403', async () => {
  const ticket = await mint();
  const other = await mint();
  const token = ticket.headers[UPLOAD_TOKEN_HEADER];
  const altered = `${token[0] === 'e' ? 'f' : 'e'}${token.slice(1)}`;
  const body = Buffer.from('x');

  const forged = await send(ticket, putRequest(withToken(ticket, altered), body));
  assert.equal(forged.status, 403);
  assert.deepEqual(await forged.json(), { error: 'invalid_link' });
  assert.equal((await send(ticket, putRequest(withToken(ticket, null), body))).status, 403, 'no token');
  assert.equal((await send(ticket, putRequest(withToken(ticket, 'garbage'), body))).status, 403);
  assert.equal((await send(ticket, putRequest(withToken(ticket, `${token}.extra`), body))).status, 403);
  // a real token, on the path of another key
  const swapped = await handlePrintFileUpload(putRequest(other, body), segmentsOf(ticket), deps());
  assert.equal(swapped.status, 403);
  assert.equal(await statObject(ticket.key), null);
  assert.equal(await statObject(other.key), null);

  // a token signed with another secret is not ours
  setPrintStorageDriver(createLocalDriver(root, { now: () => clock, secret: 'another-secret-entirely' }));
  const foreign = await mint();
  setPrintStorageDriver(localDriver());
  assert.equal((await send(foreign, putRequest(foreign, body))).status, 403);
});

test('local: only the person the link was made for, still holding Pre-press Work, can use it', async () => {
  const ticket = await mint({ maxBytes: 64 });
  const data = Buffer.from('mine');

  const someoneElse: PrintFilesSession = { userId: 'staff-9', role: 'staff', storeId: null };
  for (const [why, d] of [
    ['another person', deps(someoneElse)],
    ['access cut to view since the link was made', deps(staffSession, { prepress: 'view' })],
    ['access removed', deps(staffSession, null)],
    ['suspended', deps(staffSession, { prepress: 'work' }, true)],
    ['signed in as an artist', deps({ userId: 'staff-1', role: 'artist', storeId: 's1' })],
  ] as const) {
    const res = await send(ticket, putRequest(ticket, data), d);
    assert.equal(res.status, 403, why);
    assert.deepEqual(await res.json(), { error: 'forbidden' });
  }
  assert.equal(await statObject(ticket.key), null);
  assert.equal((await send(ticket, putRequest(ticket, data))).status, 200, 'the right person, with the link still unused');
});

test('a PUT to anything but an upload key, or while R2 is the storage, is a 404', async () => {
  const ticket = await mint();
  for (const segments of [['print', DESIGN, 'v1', 'darks.psd'], ['uploads', 'other', 'a.psd'], ['prepress-uploads'], ['prepress-uploads', '..', 'a.psd']]) {
    const res = await handlePrintFileUpload(putRequest(ticket, Buffer.from('x')), segments, deps());
    assert.equal(res.status, 404, segments.join('/'));
  }

  setPrintStorageDriver(r2Driver().driver);
  const res = await send(ticket, putRequest(ticket, Buffer.from('x')));
  assert.equal(res.status, 404, 'with R2 the PUT never comes through the app');
  await assert.rejects(() => receiveUpload({ key: KEY, contentType: TYPE, maxBytes: 1, contentLength: null, userId: 'u', expiresAt: START, nonce: '0'.repeat(32) }, viewStream(Buffer.from('x')), 1), {
    code: 'config',
  });
});

test('a stored upload is never served by the GET route, to anyone', async () => {
  const ticket = await mint({ maxBytes: 64 });
  assert.equal((await send(ticket, putRequest(ticket, Buffer.from('a corrected psd')))).status, 200);

  const res = await handlePrintFileRequest(new Request(`http://localhost/api/print-files/${ticket.key}`), segmentsOf(ticket), {
    getSession: async () => ({ userId: 'owner-1', role: 'admin', storeId: null }),
    loadActor: async (userId, role) => ({ userId, role, permissions: null }),
    designStoreId: async () => null,
    stat: statObject,
    open: openObject,
    presign: presignObject,
  });
  assert.equal(res.status, 404);
});
