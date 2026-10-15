import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Actor } from '@/lib/auth/permissions';
import type { PackTab } from '@/lib/services/prepress';
import { handlePackStatus, type StatusDeps } from './pack-status';

const PACK = '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44';

const owner: Actor = { userId: 'u-owner', role: 'admin' };
const prepressView: Actor = { userId: 'u-view', role: 'staff', permissions: { prepress: 'view' } };
const productionOnly: Actor = { userId: 'u-prod', role: 'staff', permissions: { production: 'manage' } };
const artist: Actor = { userId: 'u-artist', role: 'artist' };

const tab = (packId: string, current: boolean): PackTab => ({ packId, label: 'Screen · Darks · 6', technique: 'screen', current });

function harness(actor: Actor | null, detail: Awaited<ReturnType<StatusDeps['getPackDetail']>>) {
  const asked: { actor: Actor; packId: string }[] = [];
  const deps: StatusDeps = {
    getActor: async () => actor,
    getPackDetail: async (who, packId) => {
      asked.push({ actor: who, packId });
      return detail;
    },
  };
  return { deps, asked };
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

test('nobody signed in gets 401, and the pack is never read', async () => {
  const h = harness(null, { buildStatus: 'ready', tabs: [] });
  const res = await handlePackStatus(PACK, h.deps);
  assert.equal(res.status, 401);
  assert.equal(h.asked.length, 0);
});

test('artists and staff without Pre-press get 403, and the pack is never read', async () => {
  for (const actor of [artist, productionOnly, { ...prepressView, suspended: true }]) {
    const h = harness(actor, { buildStatus: 'ready', tabs: [] });
    const res = await handlePackStatus(PACK, h.deps);
    assert.equal(res.status, 403, actor.userId);
    assert.equal(h.asked.length, 0, actor.userId);
  }
});

test('View access is enough to ask: the answer is only a state', async () => {
  for (const actor of [prepressView, owner]) {
    const h = harness(actor, { buildStatus: 'building', tabs: [] });
    const res = await handlePackStatus(PACK, h.deps);
    assert.equal(res.status, 200, actor.userId);
    assert.deepEqual(await json(res), { buildStatus: 'building', replaced: false });
    assert.deepEqual(h.asked, [{ actor, packId: PACK }]);
  }
});

test('a pack that is not an id is a 404, and no such pack is a 404', async () => {
  const h = harness(owner, null);
  assert.equal((await handlePackStatus('nope', h.deps)).status, 404);
  assert.equal(h.asked.length, 0);
  assert.equal((await handlePackStatus(PACK, h.deps)).status, 404);
});

test('a built pack that is not among its own tabs is reported as replaced', async () => {
  const current = harness(owner, { buildStatus: 'ready', tabs: [tab(PACK, true), tab('other', false)] });
  assert.deepEqual(await json(await handlePackStatus(PACK, current.deps)), { buildStatus: 'ready', replaced: false });

  // `current` marks the tab of the pack being looked at, so the newer pack's own tab is not it
  const replaced = harness(owner, { buildStatus: 'ready', tabs: [tab('newer', false)] });
  assert.deepEqual(await json(await handlePackStatus(PACK, replaced.deps)), { buildStatus: 'ready', replaced: true });
});

test('a pack still building is not "replaced" though it is in no tab', async () => {
  const h = harness(owner, { buildStatus: 'building', tabs: [tab('other', false)] });
  assert.deepEqual(await json(await handlePackStatus(PACK, h.deps)), { buildStatus: 'building', replaced: false });
});

test('a service that throws is a 500 without its message, and the answer is uncached', async () => {
  const deps: StatusDeps = {
    getActor: async () => owner,
    getPackDetail: async () => {
      throw new Error('relation "production_packs" does not exist');
    },
  };
  const original = console.error;
  console.error = () => undefined;
  try {
    const res = await handlePackStatus(PACK, deps);
    assert.equal(res.status, 500);
    assert.deepEqual(await json(res), { error: 'failed' });
    assert.equal(res.headers.get('cache-control'), 'no-store');
  } finally {
    console.error = original;
  }
});
