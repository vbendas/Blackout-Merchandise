import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import type { UploadOutcome } from '@/lib/services/prepress';
import { handleUploadDone, handleUploadUrl, type UploadDeps, type UploadTicket } from './upload-handlers';

const PACK = '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44';
const OTHER_PACK = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const NONCE = '0d9f7a42-aaaa-4bbb-8ccc-1234567890ab';
const KEY = `prepress-uploads/${PACK}/${NONCE}/MF-FIX.psd`;
const MAX = 10_000;

const owner: Actor = { userId: 'u-owner', role: 'admin' };
const prepressWork: Actor = { userId: 'u-work', role: 'staff', permissions: { prepress: 'work' } };
const prepressView: Actor = { userId: 'u-view', role: 'staff', permissions: { prepress: 'view' } };
const productionOnly: Actor = { userId: 'u-prod', role: 'staff', permissions: { production: 'manage' } };
const artist: Actor = { userId: 'u-artist', role: 'artist' };
const NOT_ALLOWED: Actor[] = [artist, prepressView, productionOnly, { ...prepressWork, suspended: true }];

const OUTCOME: UploadOutcome = { newPackId: 'pack-2', checks: [], needsReapproval: false, changes: [] };
const PSD_HEAD = Uint8Array.from([0x38, 0x42, 0x50, 0x53, 0, 1]);

interface Calls {
  createUploadUrl: Parameters<UploadDeps['createUploadUrl']>[0][];
  stat: string[];
  head: string[];
  removed: string[];
  uploaded: { actor: Actor; packId: string; key: string }[];
}

function harness(actor: Actor | null, over: Partial<UploadDeps> = {}) {
  const calls: Calls = { createUploadUrl: [], stat: [], head: [], removed: [], uploaded: [] };
  const deps: UploadDeps = {
    getActor: async () => actor,
    maxBytes: MAX,
    nonce: () => NONCE,
    createUploadUrl: async (input) => {
      calls.createUploadUrl.push(input);
      const ticket: UploadTicket = {
        url: `https://storage.example/${input.key}?sig=abc`,
        method: 'PUT',
        headers: { 'content-type': input.contentType },
        key: input.key,
        expiresAt: '2026-10-15T12:30:00.000Z',
      };
      return ticket;
    },
    statUpload: async (key) => {
      calls.stat.push(key);
      return { bytes: 5_000 };
    },
    readHead: async (key) => {
      calls.head.push(key);
      return PSD_HEAD;
    },
    removeUpload: async (key) => {
      calls.removed.push(key);
    },
    uploadCorrectedPsd: async (who, packId, key) => {
      calls.uploaded.push({ actor: who, packId, key });
      return { ok: true, value: OUTCOME };
    },
    ...over,
  };
  return { deps, calls };
}

/** A POST whose body only moves when it is read (highWaterMark 0), so a test can tell a refusal made before the body was touched. */
function post(payload: unknown, opts: { raw?: string } = {}): { req: Request; pulls: () => number } {
  const bytes = new TextEncoder().encode(opts.raw ?? JSON.stringify(payload));
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pulls += 1;
        if (pulls === 1) controller.enqueue(bytes);
        else controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  const req = new Request('http://localhost/api/prepress/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half' } as RequestInit);
  return { req, pulls: () => pulls };
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Who may ask (both routes)
// ---------------------------------------------------------------------------

for (const [name, handler] of [
  ['upload-url', (req: Request, packId: string, deps: UploadDeps) => handleUploadUrl(req, packId, deps)],
  ['upload-done', (req: Request, packId: string, deps: UploadDeps) => handleUploadDone(req, packId, deps)],
] as const) {
  test(`${name}: nobody signed in gets 401 and nothing is read or touched`, async () => {
    const h = harness(null);
    const sent = post({ filename: 'a.psd', size: 10, key: KEY });
    const res = await handler(sent.req, PACK, h.deps);
    assert.equal(res.status, 401);
    assert.equal((await json(res)).error, 'unauthorised');
    assert.equal(sent.pulls(), 0);
    assert.deepEqual(h.calls, { createUploadUrl: [], stat: [], head: [], removed: [], uploaded: [] });
  });

  test(`${name}: artists, view-only staff, staff without Pre-press and suspended staff get 403 before anything is read`, async () => {
    for (const actor of NOT_ALLOWED) {
      const h = harness(actor);
      const sent = post({ filename: 'a.psd', size: 10, key: KEY });
      const res = await handler(sent.req, PACK, h.deps);
      assert.equal(res.status, 403, `${actor.userId} should be refused`);
      assert.equal((await json(res)).error, 'forbidden');
      assert.equal(sent.pulls(), 0, `${actor.userId}: the body must stay unread`);
      assert.deepEqual(h.calls, { createUploadUrl: [], stat: [], head: [], removed: [], uploaded: [] }, `${actor.userId}: storage and the service must stay untouched`);
    }
  });

  test(`${name}: a pack id that is not an id is a 404`, async () => {
    const h = harness(owner);
    const sent = post({ filename: 'a.psd', size: 10, key: KEY });
    const res = await handler(sent.req, 'not-a-pack', h.deps);
    assert.equal(res.status, 404);
    assert.equal(sent.pulls(), 0);
  });

  test(`${name}: a body that is not small JSON is a 400`, async () => {
    const h = harness(owner);
    for (const raw of ['not json', '[1,2]', '"text"', 'null', '']) {
      const res = await handler(post(null, { raw }).req, PACK, h.deps);
      assert.equal(res.status, 400, JSON.stringify(raw));
      assert.equal((await json(res)).error, 'bad_request');
    }
    const huge = post(null, { raw: JSON.stringify({ filename: 'a.psd', size: 10, key: KEY, padding: 'x'.repeat(5000) }) });
    const res = await handler(huge.req, PACK, h.deps);
    assert.equal(res.status, 400);
    assert.deepEqual(h.calls, { createUploadUrl: [], stat: [], head: [], removed: [], uploaded: [] });
  });

  test(`${name}: every answer is uncached`, async () => {
    const h = harness(owner);
    const refused = await handler(post({}).req, PACK, h.deps);
    assert.equal(refused.headers.get('cache-control'), 'no-store');
  });
}

// ---------------------------------------------------------------------------
// Step 1: the signed URL
// ---------------------------------------------------------------------------

test('upload-url: Pre-press Work and the owner get a signed PUT for a key under this pack', async () => {
  for (const actor of [prepressWork, owner]) {
    const h = harness(actor);
    const res = await handleUploadUrl(post({ filename: 'MF-FIX.psd', size: 4_000 }).req, PACK, h.deps);
    assert.equal(res.status, 200, actor.userId);
    const body = await json(res);
    assert.deepEqual(body, {
      url: `https://storage.example/${KEY}?sig=abc`,
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream' },
      key: KEY,
      expiresAt: '2026-10-15T12:30:00.000Z',
    });
  }
});

test('upload-url: storage is asked, for this person, for a URL for exactly this file, for 30 minutes', async () => {
  const h = harness(prepressWork);
  await handleUploadUrl(post({ filename: 'MF-FIX.psd', size: 4_000 }).req, PACK, h.deps);
  assert.deepEqual(h.calls.createUploadUrl, [
    // maxBytes is this server's limit; contentLength is the size announced, which R2 holds the PUT to
    { actor: prepressWork, key: KEY, contentType: 'application/octet-stream', maxBytes: MAX, contentLength: 4_000, expiresIn: 1800 },
  ]);
});

test('upload-url: the key is made here from the pack, a fresh nonce and a storage-safe name', async () => {
  const h = harness(owner);
  const res = await handleUploadUrl(post({ filename: 'Café front (2).PSB', size: 100 }).req, PACK.toUpperCase(), h.deps);
  assert.equal(res.status, 200);
  assert.equal((await json(res)).key, `prepress-uploads/${PACK}/${NONCE}/Cafe-front-2.psb`);
});

test('upload-url: only the fields a browser needs go back, whatever storage returned', async () => {
  const h = harness(owner, {
    createUploadUrl: async (input) =>
      ({ url: 'https://storage.example/put', method: 'PUT', headers: {}, key: input.key, expiresAt: 1, accessKeySecret: 'hunter2', bucket: 'private' }) as unknown as UploadTicket,
  });
  const res = await handleUploadUrl(post({ filename: 'a.psd', size: 10 }).req, PACK, h.deps);
  assert.deepEqual(Object.keys(await json(res)).sort(), ['expiresAt', 'headers', 'key', 'method', 'url']);
});

test('upload-url: the browser’s own key or content type are never used', async () => {
  const h = harness(owner);
  await handleUploadUrl(post({ filename: 'a.psd', size: 10, key: 'print/other/secret.psd', contentType: 'text/html', maxBytes: 99 }).req, PACK, h.deps);
  assert.equal(h.calls.createUploadUrl[0].key, `prepress-uploads/${PACK}/${NONCE}/a.psd`);
  assert.equal(h.calls.createUploadUrl[0].contentType, 'application/octet-stream');
  assert.equal(h.calls.createUploadUrl[0].maxBytes, MAX);
  assert.equal(h.calls.createUploadUrl[0].contentLength, 10);
});

test('upload-url: a missing or odd filename or size is a 400', async () => {
  const h = harness(owner);
  for (const payload of [{}, { size: 10 }, { filename: 'a.psd' }, { filename: '', size: 10 }, { filename: 5, size: 10 }, { filename: 'a.psd', size: '10' }, { filename: 'a.psd', size: 1.5 }, { filename: 'a.psd', size: -1 }]) {
    const res = await handleUploadUrl(post(payload).req, PACK, h.deps);
    assert.equal(res.status, 400, JSON.stringify(payload));
    assert.equal((await json(res)).error, 'bad_request');
  }
  assert.equal(h.calls.createUploadUrl.length, 0);
});

test('upload-url: a name that is not .psd or .psb is a 415', async () => {
  const h = harness(owner);
  for (const filename of ['notes.txt', 'photo.png', '.psd', 'a.psd.exe']) {
    const res = await handleUploadUrl(post({ filename, size: 10 }).req, PACK, h.deps);
    assert.equal(res.status, 415, filename);
    assert.equal((await json(res)).error, 'not_a_psd');
  }
  assert.equal(h.calls.createUploadUrl.length, 0);
});

test('upload-url: an empty file is a 400', async () => {
  const h = harness(owner);
  const res = await handleUploadUrl(post({ filename: 'a.psd', size: 0 }).req, PACK, h.deps);
  assert.equal(res.status, 400);
  assert.equal((await json(res)).error, 'empty');
  assert.equal(h.calls.createUploadUrl.length, 0);
});

test('upload-url: a file over the limit is a 413 and no URL is made for it', async () => {
  const h = harness(owner);
  const res = await handleUploadUrl(post({ filename: 'a.psd', size: MAX + 1 }).req, PACK, h.deps);
  assert.equal(res.status, 413);
  assert.equal((await json(res)).error, 'too_large');
  assert.equal(h.calls.createUploadUrl.length, 0);
});

test('upload-url: a file exactly at the limit gets its URL', async () => {
  const h = harness(owner);
  const res = await handleUploadUrl(post({ filename: 'a.psd', size: MAX }).req, PACK, h.deps);
  assert.equal(res.status, 200);
  assert.equal(h.calls.createUploadUrl[0].contentLength, MAX);
});

test('upload-url: storage refusing the person is a 403', async () => {
  const h = harness(owner, {
    createUploadUrl: async () => {
      throw new PermissionError('prepress', 'work');
    },
  });
  const res = await handleUploadUrl(post({ filename: 'a.psd', size: 10 }).req, PACK, h.deps);
  assert.equal(res.status, 403);
  assert.equal((await json(res)).error, 'forbidden');
});

test('upload-url: storage failing is a 500 that says nothing of why', async () => {
  const h = harness(owner, {
    createUploadUrl: async () => {
      throw new Error('R2_SECRET_ACCESS_KEY is not set');
    },
  });
  const original = console.error;
  console.error = () => undefined;
  try {
    const res = await handleUploadUrl(post({ filename: 'a.psd', size: 10 }).req, PACK, h.deps);
    assert.equal(res.status, 500);
    assert.deepEqual(await json(res), { error: 'failed' });
  } finally {
    console.error = original;
  }
});

// ---------------------------------------------------------------------------
// Step 3: it is there
// ---------------------------------------------------------------------------

test('upload-done: the service gets this pack and the key, and the outcome comes back', async () => {
  for (const actor of [prepressWork, owner]) {
    const h = harness(actor);
    const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
    assert.equal(res.status, 200, actor.userId);
    assert.deepEqual(await json(res), { ok: true, outcome: OUTCOME });
    assert.deepEqual(h.calls.uploaded, [{ actor, packId: PACK, key: KEY }]);
    assert.deepEqual(h.calls.removed, []);
  }
});

test('upload-done: only a key made for this pack is taken, and nothing is touched for any other', async () => {
  const h = harness(owner);
  const keys: unknown[] = [
    `prepress-uploads/${OTHER_PACK}/${NONCE}/MF-FIX.psd`,
    `print/${OTHER_PACK}/v1/pack/DARKS.psd`,
    `prepress-uploads/${PACK}/${NONCE}/../../print/secret/DARKS.psd`,
    `prepress-uploads/${PACK}/${NONCE}/MF-FIX.png`,
    `prepress-uploads/${PACK}/${NONCE}/`,
    '../etc/passwd',
    '',
    42,
    null,
    { key: KEY },
  ];
  for (const key of keys) {
    const res = await handleUploadDone(post({ key }).req, PACK, h.deps);
    assert.equal(res.status, 400, JSON.stringify(key));
    assert.equal((await json(res)).error, 'bad_request');
  }
  assert.equal((await handleUploadDone(post({}).req, PACK, h.deps)).status, 400);
  assert.deepEqual(h.calls, { createUploadUrl: [], stat: [], head: [], removed: [], uploaded: [] });
});

test('upload-done: an upload that never arrived is a 400 and the service isn’t called', async () => {
  const h = harness(owner, { statUpload: async () => null });
  const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
  assert.equal(res.status, 400);
  assert.equal((await json(res)).error, 'incomplete');
  assert.deepEqual(h.calls.uploaded, []);
});

test('upload-done: an empty object is refused and removed', async () => {
  const h = harness(owner, { statUpload: async () => ({ bytes: 0 }) });
  const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
  assert.equal(res.status, 400);
  assert.equal((await json(res)).error, 'empty');
  assert.deepEqual(h.calls.removed, [KEY]);
  assert.deepEqual(h.calls.uploaded, []);
});

test('upload-done: an object over the limit is a 413, removed, and never reaches the service', async () => {
  const h = harness(owner, { statUpload: async () => ({ bytes: MAX + 1 }) });
  const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
  assert.equal(res.status, 413);
  assert.equal((await json(res)).error, 'too_large');
  assert.deepEqual(h.calls.removed, [KEY]);
  assert.deepEqual(h.calls.uploaded, []);
});

test('upload-done: an object exactly at the limit goes through', async () => {
  const h = harness(owner, { statUpload: async () => ({ bytes: MAX }) });
  const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
  assert.equal(res.status, 200);
});

test('upload-done: a stored file that is not a PSD is a 415, removed, and never reaches the service', async () => {
  for (const head of [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), Uint8Array.from([0x38, 0x42, 0x50]), Uint8Array.from([0x38, 0x42, 0x50, 0x53, 0, 3])]) {
    const h = harness(owner, { readHead: async () => head });
    const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
    assert.equal(res.status, 415, Array.from(head).join(','));
    assert.equal((await json(res)).error, 'not_a_psd');
    assert.deepEqual(h.calls.removed, [KEY]);
    assert.deepEqual(h.calls.uploaded, []);
  }
});

test('upload-done: a PSB (version 2) is taken', async () => {
  const h = harness(owner, { readHead: async () => Uint8Array.from([0x38, 0x42, 0x50, 0x53, 0, 2]) });
  const res = await handleUploadDone(post({ key: `prepress-uploads/${PACK}/${NONCE}/big.psb` }).req, PACK, h.deps);
  assert.equal(res.status, 200);
});

test('upload-done: an object that vanished between the size check and the read is a 400', async () => {
  const h = harness(owner, { readHead: async () => null });
  const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
  assert.equal(res.status, 400);
  assert.equal((await json(res)).error, 'incomplete');
  assert.deepEqual(h.calls.uploaded, []);
});

test('upload-done: a service refusal is a 422 with the service’s own words', async () => {
  const h = harness(owner, {
    uploadCorrectedPsd: async () => ({ ok: false, error: 'The file has 9 layers; this pack has 6 films.' }),
  });
  const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
  assert.equal(res.status, 422);
  assert.deepEqual(await json(res), { error: 'rejected', message: 'The file has 9 layers; this pack has 6 films.' });
  assert.deepEqual(h.calls.removed, [], 'a refusal by the service keeps the file for whoever looks into it');
});

test('upload-done: a service that throws is a 500 without its message', async () => {
  const h = harness(owner, {
    uploadCorrectedPsd: async () => {
      throw new Error('relation "production_packs" does not exist');
    },
  });
  const original = console.error;
  console.error = () => undefined;
  try {
    const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
    assert.equal(res.status, 500);
    assert.deepEqual(await json(res), { error: 'failed' });
  } finally {
    console.error = original;
  }
});

test('upload-done: a permission error from the service is a 403', async () => {
  const h = harness(owner, {
    uploadCorrectedPsd: async () => {
      throw new PermissionError('prepress', 'work');
    },
  });
  const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
  assert.equal(res.status, 403);
});

test('upload-done: storage failing while looking or reading is a 500', async () => {
  const original = console.error;
  console.error = () => undefined;
  try {
    for (const over of [
      { statUpload: async () => { throw new Error('storage down'); } },
      { readHead: async () => { throw new Error('storage down'); } },
    ] as Partial<UploadDeps>[]) {
      const h = harness(owner, over);
      const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
      assert.equal(res.status, 500);
      assert.deepEqual(h.calls.uploaded, []);
    }
  } finally {
    console.error = original;
  }
});

test('upload-done: a refused upload still answers when its removal fails', async () => {
  const h = harness(owner, {
    statUpload: async () => ({ bytes: MAX + 1 }),
    removeUpload: async () => {
      throw new Error('storage down');
    },
  });
  const original = console.error;
  console.error = () => undefined;
  try {
    const res = await handleUploadDone(post({ key: KEY }).req, PACK, h.deps);
    assert.equal(res.status, 413);
  } finally {
    console.error = original;
  }
});
