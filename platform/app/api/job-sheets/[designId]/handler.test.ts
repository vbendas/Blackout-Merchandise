// The permission gate and the answers of GET /api/job-sheets/<design id>, without Clerk or a
// database: who may open a sheet (Pre-press or Production View, or the owner), and what everyone else gets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PermissionError, type Actor } from '@/lib/auth/permissions';
import { handleJobSheetRequest, type JobSheetRouteDeps } from './handler';

const DESIGN = '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44';
const PDF = Buffer.from('%PDF-1.3 a job sheet');

const owner: Actor = { userId: 'u-owner', role: 'admin' };
const prepressView: Actor = { userId: 'u-prepress', role: 'staff', permissions: { prepress: 'view' } };
const productionView: Actor = { userId: 'u-production', role: 'staff', permissions: { production: 'view' } };
const productionManager: Actor = { userId: 'u-manager', role: 'staff', permissions: { production: 'manage', prepress: 'work' } };
const artist: Actor = { userId: 'u-artist', role: 'artist' };

function harness(actor: Actor | null, sheet: Awaited<ReturnType<JobSheetRouteDeps['getSheet']>> | Error = { bytes: PDF, filename: 'MF-UNDERWRITER-TEE-v3-job-sheet.pdf' }) {
  const asked: { actor: Actor; designId: string }[] = [];
  const deps: JobSheetRouteDeps = {
    getActor: async () => actor,
    getSheet: async (who, designId) => {
      asked.push({ actor: who, designId });
      if (sheet instanceof Error) throw sheet;
      return sheet;
    },
  };
  return { deps, asked };
}

const get = (id: string, deps: JobSheetRouteDeps, query = '') => handleJobSheetRequest(new Request(`https://merchfrom.test/api/job-sheets/${id}${query}`), id, deps);
const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

test('nobody signed in gets 401, and no sheet is made', async () => {
  const h = harness(null);
  const res = await get(DESIGN, h.deps);
  assert.equal(res.status, 401);
  assert.deepEqual(await json(res), { error: 'unauthorised' });
  assert.equal(h.asked.length, 0);
});

test('artists, staff with neither Pre-press nor Production, and suspended staff get 403, and no sheet is made', async () => {
  const refused: Actor[] = [
    artist,
    { userId: 'u-support', role: 'staff', permissions: { support: 'manage', shop_orders: 'manage', runs: 'manage', money: 'manage' } },
    { userId: 'u-nothing', role: 'staff', permissions: {} },
    { userId: 'u-none', role: 'staff', permissions: { prepress: 'none', production: 'none' } },
    { userId: 'u-null', role: 'staff', permissions: null },
    { ...prepressView, suspended: true },
    { ...productionManager, suspended: true },
  ];
  for (const actor of refused) {
    const h = harness(actor);
    const res = await get(DESIGN, h.deps);
    assert.equal(res.status, 403, actor.userId);
    assert.deepEqual(await json(res), { error: 'forbidden' }, actor.userId);
    assert.equal(h.asked.length, 0, `${actor.userId}: nothing was read`);
  }
});

test('the artist whose design it is gets no sheet either: it carries Pantone codes', async () => {
  const h = harness(artist);
  assert.equal((await get(DESIGN, h.deps)).status, 403);
  assert.equal(h.asked.length, 0);
});

test('Pre-press View, Production View and the owner each get the PDF, never cached', async () => {
  for (const actor of [prepressView, productionView, productionManager, owner]) {
    const h = harness(actor);
    const res = await get(DESIGN, h.deps);
    assert.equal(res.status, 200, actor.userId);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('content-length'), String(PDF.length));
    assert.match(res.headers.get('content-disposition') ?? '', /^inline; filename="MF-UNDERWRITER-TEE-v3-job-sheet\.pdf"/);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), PDF);
    assert.deepEqual(h.asked, [{ actor, designId: DESIGN }]);
  }
});

test('?download=1 saves the file instead of opening it', async () => {
  const res = await get(DESIGN, harness(owner).deps, '?download=1');
  assert.match(res.headers.get('content-disposition') ?? '', /^attachment; filename="MF-UNDERWRITER-TEE-v3-job-sheet\.pdf"/);
  assert.match((await get(DESIGN, harness(owner).deps, '?download=0')).headers.get('content-disposition') ?? '', /^inline/);
});

test('an id that is not a design id is a 404 after the access check; so is a design with no sheet', async () => {
  const h = harness(owner);
  for (const id of ['nope', '123', `${DESIGN}x`, '../etc/passwd']) assert.equal((await get(id, h.deps)).status, 404, id);
  assert.equal(h.asked.length, 0);
  // Someone without access learns nothing about whether an id is real.
  assert.equal((await get('nope', harness(artist).deps)).status, 403);
  const none = harness(owner, null);
  const res = await get(DESIGN, none.deps);
  assert.equal(res.status, 404);
  assert.deepEqual(await json(res), { error: 'not_found' });
});

test('the service refusing someone is a 403 as well, and a failure is a 500 that says nothing of why', async () => {
  const refused = await get(DESIGN, harness(prepressView, new PermissionError('prepress', 'view')).deps);
  assert.equal(refused.status, 403);

  const log = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    const res = await get(DESIGN, harness(owner, new Error('R2 said: secret detail')).deps);
    assert.equal(res.status, 500);
    assert.deepEqual(await json(res), { error: 'failed' });
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
    assert.equal(logged.length, 1, 'the cause is logged for us');
  } finally {
    console.error = log;
  }
});
