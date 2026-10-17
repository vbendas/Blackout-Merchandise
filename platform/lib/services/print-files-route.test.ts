// The rules behind /api/print-files/[...key]: who may read what, streaming,
// ranges, caching headers, and the redirect to a presigned R2 URL. The handler
// takes its session, database lookup and storage as arguments, so this runs
// with no Clerk and no database.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handlePrintFileRequest, parseRange, type PrintFilesDeps, type PrintFilesSession } from '@/app/api/print-files/handler';
import type { Actor, PermissionMap, Role } from '@/lib/auth/permissions';
import {
  createLocalDriver,
  createR2Driver,
  openObject,
  presignObject,
  printKey,
  putObject,
  setPrintStorageDriver,
  statObject,
} from '@/lib/services/print-storage';

const DESIGN = '3f2b8c1e-7d4a-4e6b-9c1d-0a5b6c7d8e9f';
const OTHER_DESIGN = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const PSD = printKey(DESIGN, 1, 'darks.psd');
const PROOF = printKey(DESIGN, 1, 'proof.webp');
const PSD_BYTES = Buffer.from('0123456789abcdefghij');
const PROOF_BYTES = Buffer.from('RIFF-fake-webp');

let root: string;

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'print-files-test-'));
  setPrintStorageDriver(createLocalDriver(root));
  await putObject({ key: PSD, data: PSD_BYTES, contentType: 'image/vnd.adobe.photoshop', visibility: 'private' });
  await putObject({ key: PROOF, data: PROOF_BYTES, contentType: 'image/webp', visibility: 'public' });
  await putObject({ key: printKey(OTHER_DESIGN, 1, 'proof.webp'), data: PROOF_BYTES, contentType: 'image/webp', visibility: 'public' });
});

after(async () => {
  setPrintStorageDriver(null);
  await rm(root, { recursive: true, force: true });
});

const people = {
  prepressStaff: { session: { userId: 'staff-1', role: 'staff', storeId: null }, permissions: { prepress: 'view' } },
  owner: { session: { userId: 'owner-1', role: 'admin', storeId: null }, permissions: null },
  productionStaff: { session: { userId: 'staff-2', role: 'staff', storeId: null }, permissions: { production: 'work' } },
  suspendedStaff: { session: { userId: 'staff-3', role: 'staff', storeId: null }, permissions: { prepress: 'manage' }, suspended: true },
  artist: { session: { userId: 'artist-1', role: 'artist', storeId: 'store-1' }, permissions: null },
  otherArtist: { session: { userId: 'artist-2', role: 'artist', storeId: 'store-2' }, permissions: null },
  artistWithoutShop: { session: { userId: 'artist-3', role: 'artist', storeId: null }, permissions: null },
} satisfies Record<string, { session: PrintFilesSession; permissions: PermissionMap | null; suspended?: boolean }>;

function depsFor(who: keyof typeof people, overrides: Partial<PrintFilesDeps> = {}): PrintFilesDeps {
  const person = people[who];
  const suspended = 'suspended' in person && person.suspended;
  return {
    getSession: async () => person.session,
    loadActor: async (userId: string, role: Role): Promise<Actor> => ({ userId, role, permissions: person.permissions, suspended: suspended || false }),
    // the design belongs to store-1
    designStoreId: async (designId) => (designId === DESIGN ? 'store-1' : null),
    stat: statObject,
    open: openObject,
    presign: presignObject,
    ...overrides,
  };
}

function get(key: string, who: keyof typeof people, init: RequestInit = {}, overrides: Partial<PrintFilesDeps> = {}, query = ''): Promise<Response> {
  const request = new Request(`http://localhost/api/print-files/${key}${query}`, init);
  return handlePrintFileRequest(request, key.split('/'), depsFor(who, overrides));
}

async function body(res: Response): Promise<Buffer> {
  return Buffer.from(await res.arrayBuffer());
}

test('Pre-press staff and the owner can read private files, with safe download headers', async () => {
  for (const who of ['prepressStaff', 'owner'] as const) {
    const res = await get(PSD, who);
    assert.equal(res.status, 200, who);
    assert.deepEqual(await body(res), PSD_BYTES);
    assert.equal(res.headers.get('content-type'), 'image/vnd.adobe.photoshop');
    assert.equal(res.headers.get('content-length'), '20');
    assert.equal(res.headers.get('content-disposition'), `attachment; filename="darks.psd"; filename*=UTF-8''darks.psd`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('accept-ranges'), 'bytes');
    assert.match(res.headers.get('cache-control') ?? '', /private/);
    assert.match(res.headers.get('cache-control') ?? '', /no-transform/);
    assert.match(res.headers.get('etag') ?? '', /^"[0-9a-f]{64}"$/);
  }
});

test('staff without Pre-press access get 403, suspended staff too', async () => {
  for (const who of ['productionStaff', 'suspendedStaff'] as const) {
    const res = await get(PSD, who);
    assert.equal(res.status, 403, who);
    assert.deepEqual(await res.json(), { error: 'forbidden' });
  }
});

test('Production staff read the public files of every design (the stations show the proofs), never a private one', async () => {
  for (const key of [PROOF, printKey(OTHER_DESIGN, 1, 'proof.webp')]) {
    const res = await get(key, 'productionStaff');
    assert.equal(res.status, 200, key);
    assert.deepEqual(await body(res), PROOF_BYTES);
  }
  assert.equal((await get(PSD, 'productionStaff')).status, 403, 'the PSD is pre-press’s');
  assert.equal((await get(printKey(DESIGN, 1, 'nope.webp'), 'productionStaff')).status, 404);
  assert.equal((await get(PROOF, 'suspendedStaff')).status, 403, 'a paused employee reads nothing');
});

test('an artist reads the public files of their own designs and nothing else', async () => {
  const proof = await get(PROOF, 'artist');
  assert.equal(proof.status, 200);
  assert.deepEqual(await body(proof), PROOF_BYTES);
  assert.equal(proof.headers.get('content-disposition'), `inline; filename="proof.webp"; filename*=UTF-8''proof.webp`);

  // their own PSD is a production file: not theirs to download
  assert.equal((await get(PSD, 'artist')).status, 404);
  // someone else's design, a shop-less artist, and a design that does not exist
  assert.equal((await get(PROOF, 'otherArtist')).status, 404);
  assert.equal((await get(PROOF, 'artistWithoutShop')).status, 404);
  assert.equal((await get(printKey(OTHER_DESIGN, 1, 'proof.webp'), 'artist')).status, 404);
  // staff can read every design's files
  assert.equal((await get(printKey(OTHER_DESIGN, 1, 'proof.webp'), 'prepressStaff')).status, 200);
});

test('only images a browser can show and PDFs open in the tab; anything that could carry script downloads', async () => {
  const cases: [string, string, 'inline' | 'attachment'][] = [
    ['a.png', 'image/png', 'inline'],
    ['a.avif', 'image/avif', 'inline'],
    ['sheet.pdf', 'application/pdf', 'inline'],
    ['logo.svg', 'image/svg+xml', 'attachment'],
    ['page.html', 'text/html', 'attachment'],
    ['darks.psd', 'image/vnd.adobe.photoshop', 'attachment'],
    ['pack.json', 'application/json', 'attachment'],
  ];
  for (const [name, type, expected] of cases) {
    const key = printKey(DESIGN, 1, 'types', name);
    await putObject({ key, data: Buffer.from('x'), contentType: type, visibility: 'public' });
    const res = await get(key, 'owner');
    assert.ok((res.headers.get('content-disposition') ?? '').startsWith(`${expected};`), `${type} is ${expected}`);
  }
});

test('a missing file is 404 for everyone', async () => {
  const key = printKey(DESIGN, 1, 'nope.psd');
  assert.equal((await get(key, 'owner')).status, 404);
  assert.equal((await get(key, 'artist')).status, 404);
});

test('paths that are not print/<design>/... are 404 before anyone is asked who they are', async () => {
  let asked = false;
  const trap = { getSession: async () => ((asked = true), people.owner.session) };
  for (const segments of [
    ['print', DESIGN],
    ['print', 'not-a-uuid', 'v1', 'a.psd'],
    ['secrets', DESIGN, 'a'],
    ['print', DESIGN, '..', 'a'],
    ['print', DESIGN, '.meta', 'a'],
    ['print', DESIGN, 'v1', 'a b.psd'],
  ]) {
    const res = await handlePrintFileRequest(new Request('http://localhost/api/print-files/x'), segments, depsFor('owner', trap));
    assert.equal(res.status, 404, segments.join('/'));
  }
  assert.equal(asked, false);
});

test('ranges: a slice, an open end, a suffix, and an unsatisfiable one', async () => {
  const slice = await get(PSD, 'owner', { headers: { range: 'bytes=2-5' } });
  assert.equal(slice.status, 206);
  assert.equal((await body(slice)).toString(), '2345');
  assert.equal(slice.headers.get('content-range'), 'bytes 2-5/20');
  assert.equal(slice.headers.get('content-length'), '4');

  const open = await get(PSD, 'owner', { headers: { range: 'bytes=15-' } });
  assert.equal((await body(open)).toString(), 'fghij');
  assert.equal(open.headers.get('content-range'), 'bytes 15-19/20');

  const suffix = await get(PSD, 'owner', { headers: { range: 'bytes=-3' } });
  assert.equal((await body(suffix)).toString(), 'hij');
  assert.equal(suffix.headers.get('content-range'), 'bytes 17-19/20');

  const past = await get(PSD, 'owner', { headers: { range: 'bytes=40-50' } });
  assert.equal(past.status, 416);
  assert.equal(past.headers.get('content-range'), 'bytes */20');

  const several = await get(PSD, 'owner', { headers: { range: 'bytes=0-1,5-6' } });
  assert.equal(several.status, 200, 'several ranges are served whole');
  assert.deepEqual(await body(several), PSD_BYTES);
});

test('parseRange covers the forms a browser sends', () => {
  assert.deepEqual(parseRange('bytes=0-0', 10), { start: 0, end: 0 });
  assert.deepEqual(parseRange('bytes=5-100', 10), { start: 5, end: 9 });
  assert.deepEqual(parseRange('bytes=-100', 10), { start: 0, end: 9 });
  assert.equal(parseRange('bytes=-0', 10), 'unsatisfiable');
  assert.equal(parseRange('bytes=10-', 10), 'unsatisfiable');
  assert.equal(parseRange('bytes=7-3', 10), 'unsatisfiable');
  assert.equal(parseRange('bytes=0-1', 0), 'unsatisfiable');
  assert.equal(parseRange('bytes=-', 10), null);
  assert.equal(parseRange('items=0-1', 10), null);
  assert.equal(parseRange(null, 10), null);
});

test('an unchanged file is a 304 on If-None-Match, and a range ignores it', async () => {
  const first = await get(PSD, 'owner');
  const etag = first.headers.get('etag')!;
  const again = await get(PSD, 'owner', { headers: { 'if-none-match': etag } });
  assert.equal(again.status, 304);
  assert.equal((await body(again)).length, 0);
  assert.equal((await get(PSD, 'owner', { headers: { 'if-none-match': '"something-else"' } })).status, 200);
  assert.equal((await get(PSD, 'owner', { headers: { 'if-none-match': etag, range: 'bytes=0-1' } })).status, 206);
});

test('?download names the file, and HEAD sends the headers without the body', async () => {
  const named = await get(PSD, 'owner', {}, {}, '?download=Underwriter%20v1%20%E2%80%93%20darks.psd');
  assert.match(named.headers.get('content-disposition') ?? '', /^attachment; filename="Underwriter v1 _ darks\.psd"; filename\*=UTF-8''Underwriter%20v1%20%E2%80%93%20darks\.psd$/);

  const head = await get(PSD, 'owner', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '20');
  assert.equal((await body(head)).length, 0);
});

/** R2 with a stubbed fetch: statObject asks R2 (HEAD), and it says the PSD is
 * private and everything else public. Signing makes no request. */
function stubR2() {
  return createR2Driver(
    { accountId: 'acct', accessKeyId: 'AKID', secretAccessKey: 'secret', bucket: 'print', publicBucket: null, publicBaseUrl: null },
    {
      now: () => new Date('2026-10-15T08:30:00Z'),
      fetch: (async (input: Request | string | URL) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        const isPsd = url.pathname.endsWith('darks.psd');
        return new Response(null, {
          status: 200,
          headers: {
            'content-type': isPsd ? 'image/vnd.adobe.photoshop' : 'image/webp',
            'content-length': '10',
            'x-amz-meta-visibility': isPsd ? 'private' : 'public',
          },
        });
      }) as typeof fetch,
    },
  );
}

/** X-Amz-Expires of the presigned URL a request is redirected to. */
async function redirectSeconds(key: string, who: keyof typeof people, query = ''): Promise<string | null> {
  const res = await get(key, who, {}, {}, query);
  assert.equal(res.status, 302, `${who} ${query}`);
  return new URL(res.headers.get('location')!).searchParams.get('X-Amz-Expires');
}

test('R2 answers with a short redirect to a presigned URL, after the same checks', async () => {
  setPrintStorageDriver(stubR2());
  try {
    const res = await get(PSD, 'prepressStaff', {}, {}, '?download=darks.psd&ttl=300');
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
    const target = new URL(res.headers.get('location')!);
    assert.equal(target.host, 'acct.r2.cloudflarestorage.com');
    assert.equal(target.pathname, `/print/${PSD}`);
    assert.equal(target.searchParams.get('X-Amz-Expires'), '60', 'a private file’s link lives a minute, whatever ttl asks');
    assert.ok(target.searchParams.get('response-content-disposition')?.includes('darks.psd'));

    // no redirect for anyone who may not read it
    assert.equal((await get(PSD, 'artist')).status, 404);
    assert.equal((await get(PSD, 'productionStaff')).status, 403);
    // an artist's own public proof is redirected too
    assert.equal((await get(PROOF, 'artist')).status, 302);
  } finally {
    setPrintStorageDriver(createLocalDriver(root));
  }
});

test('?ttl stretches the redirect to a public file within 30 s to an hour, and never a private file’s', async () => {
  setPrintStorageDriver(stubR2());
  try {
    for (const query of ['', '?ttl=1', '?ttl=300', '?ttl=3600', '?ttl=999999', '?ttl=abc']) {
      assert.equal(await redirectSeconds(PSD, 'owner', query), '60', `private ${query}`);
      assert.equal(await redirectSeconds(PSD, 'prepressStaff', query), '60', `private ${query}`);
    }

    assert.equal(await redirectSeconds(PROOF, 'owner'), '60', 'a minute by default');
    assert.equal(await redirectSeconds(PROOF, 'artist', '?ttl=300'), '300');
    assert.equal(await redirectSeconds(PROOF, 'owner', '?ttl=1'), '30');
    assert.equal(await redirectSeconds(PROOF, 'owner', '?ttl=999999'), '3600');
    assert.equal(await redirectSeconds(PROOF, 'owner', '?ttl=abc'), '60');
  } finally {
    setPrintStorageDriver(createLocalDriver(root));
  }
});
