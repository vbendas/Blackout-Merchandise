// The browser's three-step upload, run in Node with a fake fetch (the two small
// routes) and a fake XMLHttpRequest (the PUT to storage).
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { sendCorrectedPsd, type UploadProgress } from './upload-client';
import { parseUploadNotice } from './upload-notice';
import { UPLOAD_ERRORS } from './rules';

const PACK = '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44';
const KEY = `prepress-uploads/${PACK}/0d9f7a42-aaaa-4bbb-8ccc-1234567890ab/fix.psd`;
const OUTCOME = { newPackId: 'pack-2', checks: [], needsReapproval: true, changes: ['Ink 3 changed.'] };

type Plan = { status: number } | 'error';

class FakeXhr {
  static puts: FakeXhr[] = [];
  static plan: Plan = { status: 200 };
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: unknown = null;
  status = 0;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }
  send(body: File) {
    this.body = body;
    FakeXhr.puts.push(this);
    queueMicrotask(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: body.size / 2, total: body.size });
      this.upload.onprogress?.({ lengthComputable: true, loaded: body.size, total: body.size });
      if (FakeXhr.plan === 'error') {
        this.onerror?.();
      } else {
        this.status = FakeXhr.plan.status;
        this.onload?.();
      }
    });
  }
}

interface Posted {
  url: string;
  body: unknown;
}
let posts: Posted[] = [];
let replies: Array<{ status: number; json?: unknown; text?: string } | 'throw'> = [];

const realFetch = globalThis.fetch;
const realXhr = (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest;

beforeEach(() => {
  posts = [];
  replies = [];
  FakeXhr.puts = [];
  FakeXhr.plan = { status: 200 };
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXhr;
  globalThis.fetch = (async (url: string, init?: { body?: string }) => {
    posts.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    const reply = replies.shift();
    if (!reply || reply === 'throw') throw new TypeError('network down');
    return new Response(reply.text ?? JSON.stringify(reply.json ?? {}), { status: reply.status, headers: { 'content-type': reply.json !== undefined ? 'application/json' : 'text/plain' } });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = realXhr;
});

const ticket = { url: 'https://storage.example/put?sig=1', method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'x-amz-meta-pack': 'p', 'Content-Length': '999', Host: 'storage.example' }, key: KEY, expiresAt: '2026-10-15T12:30:00.000Z' };
const file = () => new File([new Uint8Array(1000)], 'fix.psd');

test('a file goes up in three steps: a URL, the PUT, then "it is there"', async () => {
  replies = [{ status: 200, json: ticket }, { status: 200, json: { ok: true, outcome: OUTCOME } }];
  const progress: UploadProgress[] = [];
  const result = await sendCorrectedPsd(PACK, file(), (p) => progress.push(p));

  assert.deepEqual(result, { ok: true, outcome: OUTCOME });
  assert.deepEqual(posts, [
    { url: `/api/prepress/${PACK}/upload-url`, body: { filename: 'fix.psd', size: 1000 } },
    { url: `/api/prepress/${PACK}/upload-done`, body: { key: KEY } },
  ]);
  assert.equal(FakeXhr.puts.length, 1);
  assert.equal(FakeXhr.puts[0].method, 'PUT');
  assert.equal(FakeXhr.puts[0].url, ticket.url);
  assert.deepEqual(progress, [
    { loaded: 500, total: 1000 },
    { loaded: 1000, total: 1000 },
  ]);
});

test('the PUT carries the signed headers, less the ones a browser sets itself', async () => {
  replies = [{ status: 200, json: ticket }, { status: 200, json: { ok: true, outcome: OUTCOME } }];
  await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.deepEqual(FakeXhr.puts[0].headers, { 'content-type': 'application/octet-stream', 'x-amz-meta-pack': 'p' });
});

test('a PUT with no content type in its signature says one plainly', async () => {
  replies = [{ status: 200, json: { ...ticket, headers: {} } }, { status: 200, json: { ok: true, outcome: OUTCOME } }];
  await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.deepEqual(FakeXhr.puts[0].headers, { 'content-type': 'application/octet-stream' });
});

test('the file itself is what is sent to storage, and only there', async () => {
  replies = [{ status: 200, json: ticket }, { status: 200, json: { ok: true, outcome: OUTCOME } }];
  const sent = file();
  await sendCorrectedPsd(PACK, sent, () => undefined);
  assert.equal(FakeXhr.puts[0].body, sent);
  assert.ok(posts.every((post) => JSON.stringify(post.body).length < 500), 'the app’s own requests stay small');
});

test('a refused URL request stops there, in the route’s words', async () => {
  replies = [{ status: 403, json: { error: 'forbidden' } }];
  const result = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.deepEqual(result, { ok: false, code: 'forbidden', message: UPLOAD_ERRORS.forbidden });
  assert.equal(FakeXhr.puts.length, 0);
  assert.equal(posts.length, 1);
});

test('a gateway’s 413 with no JSON is still "too large"', async () => {
  replies = [{ status: 413, text: 'Request Entity Too Large' }];
  const result = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'too_large');
});

test('a ticket that isn’t a usable PUT fails without sending anything', async () => {
  for (const odd of [{}, { ...ticket, method: 'POST' }, { ...ticket, url: '' }, { ...ticket, key: '' }]) {
    FakeXhr.puts = [];
    replies = [{ status: 200, json: odd }];
    const result = await sendCorrectedPsd(PACK, file(), () => undefined);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'failed');
    assert.equal(FakeXhr.puts.length, 0);
  }
});

test('storage refusing the PUT is a storage failure, and "it is there" is never sent', async () => {
  replies = [{ status: 200, json: ticket }];
  FakeXhr.plan = { status: 403 };
  const result = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.deepEqual(result, { ok: false, code: 'storage', message: UPLOAD_ERRORS.storage });
  assert.equal(posts.length, 1);
});

test('storage being unreachable is a storage failure too', async () => {
  replies = [{ status: 200, json: ticket }];
  FakeXhr.plan = 'error';
  const result = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.equal(result.ok === false && result.code, 'storage');
});

test('our own route being unreachable is a network failure', async () => {
  replies = ['throw'];
  const first = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.equal(first.ok === false && first.code, 'network');

  replies = [{ status: 200, json: ticket }, 'throw'];
  const second = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.equal(second.ok === false && second.code, 'network');
});

test('the service refusing the file comes back in its own words', async () => {
  replies = [{ status: 200, json: ticket }, { status: 422, json: { error: 'rejected', message: 'The file has 9 layers; this pack has 6 films.' } }];
  const result = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.deepEqual(result, { ok: false, code: 'rejected', message: 'The file has 9 layers; this pack has 6 films.' });
});

test('an answer that says ok with no outcome is a failure, not a success', async () => {
  replies = [{ status: 200, json: ticket }, { status: 200, json: { ok: true } }];
  const result = await sendCorrectedPsd(PACK, file(), () => undefined);
  assert.equal(result.ok === false && result.code, 'failed');
});

test('the pack id is encoded into the route', async () => {
  replies = [{ status: 404, json: { error: 'not_found' } }];
  await sendCorrectedPsd('a b/c', file(), () => undefined);
  assert.equal(posts[0].url, '/api/prepress/a%20b%2Fc/upload-url');
});

// ---------------------------------------------------------------------------
// The notice that travels to the new pack
// ---------------------------------------------------------------------------

const notice = (over: Record<string, unknown> = {}) => JSON.stringify({ packId: 'pack-2', filename: 'fix.psd', needsReapproval: true, changes: ['Ink 3 changed.'], ...over });

test('a stored notice is read for the pack it belongs to', () => {
  assert.deepEqual(parseUploadNotice(notice(), 'pack-2'), { packId: 'pack-2', filename: 'fix.psd', needsReapproval: true, changes: ['Ink 3 changed.'] });
});

test('another pack, nothing stored or a damaged notice shows nothing', () => {
  assert.equal(parseUploadNotice(notice(), 'pack-9'), null);
  assert.equal(parseUploadNotice(null, 'pack-2'), null);
  assert.equal(parseUploadNotice('', 'pack-2'), null);
  assert.equal(parseUploadNotice('{not json', 'pack-2'), null);
  assert.equal(parseUploadNotice('null', 'pack-2'), null);
  assert.equal(parseUploadNotice(notice({ filename: 5 }), 'pack-2'), null);
});

test('only a true re-approval counts, and only text is kept in the change list', () => {
  assert.equal(parseUploadNotice(notice({ needsReapproval: 'yes' }), 'pack-2')?.needsReapproval, false);
  assert.deepEqual(parseUploadNotice(notice({ changes: ['a', 3, null, 'b'] }), 'pack-2')?.changes, ['a', 'b']);
  assert.deepEqual(parseUploadNotice(notice({ changes: 'a' }), 'pack-2')?.changes, []);
});
