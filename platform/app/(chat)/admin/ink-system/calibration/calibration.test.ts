// The calibration page and its actions, run for real against PGlite with the dev bypass (as lib/admin/nav.test.ts
// does for the other admin pages, which scans this page and these actions too): who gets in, who is sent
// away, who is refused, what the page says to each, and what saving and resetting do.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import Module from 'node:module';
import { createElement as h, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { PermissionError } from '@/lib/auth/permissions';
import { dotGainFor } from '@/lib/print/calibration/curve';
import { LINEAR_DOT_GAIN } from '@/lib/print/engine/halftone';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';

// Next keeps each request's state in Node's AsyncLocalStorage, which its own server puts on globalThis before
// anything else loads; so does this test, before the first import of anything from Next (all below, in before()).
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage = AsyncLocalStorage;
// Pages import their stylesheets; Node has no use for them.
(Module as unknown as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions['.css'] = (m) => {
  m.exports = {};
};
process.env.AUTH_DEV_BYPASS = '1';
delete process.env.AUTH_DEV_ROLE;
delete process.env.AUTH_DEV_EMAIL;
delete process.env.ADMIN_EMAILS;

let t: TestDb;
let auth: typeof import('@/lib/auth');
let inkSystem: typeof import('@/lib/services/ink-system');
let workAsyncStorage: typeof import('next/dist/server/app-render/work-async-storage.external').workAsyncStorage;
let AppRouterContext: typeof import('next/dist/shared/lib/app-router-context.shared-runtime').AppRouterContext;
let devId: string;

before(async () => {
  ({ workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external'));
  ({ AppRouterContext } = await import('next/dist/shared/lib/app-router-context.shared-runtime'));
  t = await setupTestDb();
  auth = await import('@/lib/auth');
  inkSystem = await import('@/lib/services/ink-system');
  devId = (await auth.requireUser()).user.id;
});

after(async () => {
  await t.close();
});

beforeEach(async () => {
  await setDev('artist');
  await t.db.delete(schema.inkSystems);
  await t.db.delete(schema.staffActivity);
});

async function setDev(role: 'artist' | 'staff' | 'admin', permissions: Record<string, string> = {}, suspended = false) {
  await t.db.update(schema.users).set({ role, suspendedAt: suspended ? new Date() : null }).where(eq(schema.users.id, devId));
  await t.db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, devId));
  const rows = Object.entries(permissions).map(([area, level]) => ({ userId: devId, area, level }));
  if (rows.length > 0) await t.db.insert(schema.staffPermissions).values(rows);
}

/** 'redirect:/path', 'denied' (PermissionError) or 'ok'. */
async function outcome(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return 'ok';
  } catch (err) {
    if (err instanceof PermissionError) return 'denied';
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return `redirect:${digest.split(';')[2]}`;
    throw err;
  }
}

/** What an action answers: 'denied' for the refusal runPrepressAction words (it comes back as a result, not a throw), 'ok', or a redirect. */
async function answer(run: () => Promise<{ ok: boolean; error?: string }>): Promise<string> {
  try {
    const result = await run();
    if (result.ok) return 'ok';
    return /^You don't have Manage access to Pre-press\.$/.test(result.error ?? '') ? 'denied' : `error:${result.error}`;
  } catch (err) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return `redirect:${digest.split(';')[2]}`;
    throw err;
  }
}

/** Runs a server action as Next would, with a request store for revalidatePath. */
function inRequest<T>(run: () => Promise<T>): Promise<T> {
  return workAsyncStorage.run({ incrementalCache: {}, route: '/admin/ink-system/calibration', pendingRevalidatedTags: [] } as never, run);
}

type PageModule = { default: (props: never) => Promise<ReactNode> };
const loadPage = async () => (await import('@/app/(chat)/admin/ink-system/calibration/page')) as PageModule;
const loadActions = () => import('@/app/(chat)/admin/ink-system/calibration/actions');

/** The page as the browser's first paint: the client part needs a router, here a stand-in. */
async function pageHtml(): Promise<string> {
  const element = await (await loadPage()).default({} as never);
  const router = { refresh() {}, push() {}, replace() {}, back() {}, forward() {}, prefetch() {} };
  return renderToStaticMarkup(h(AppRouterContext.Provider, { value: router as never }, element));
}

const parabola = (peak: number) => (c: number) => c + 4 * peak * c * (1 - c);
const measurement = (over: Record<string, unknown> = {}) => ({
  method: 'scan',
  lpi: 55,
  angleDeg: 22.5,
  mesh: 230,
  points: Array.from({ length: 21 }, (_, i) => ({ input: i / 20, printed: parabola(0.18)(i / 20) })),
  ...over,
});

// ---------------------------------------------------------------------------
// The page

test('the page: artists go to the Studio, staff without Pre-press to /admin, the paused to their page, staff with View and the owner in', async () => {
  const mod = await loadPage();
  const render = () => mod.default({} as never);

  await setDev('artist');
  assert.equal(await outcome(render), 'redirect:/studio');
  await setDev('staff', { support: 'manage', production: 'manage' });
  assert.equal(await outcome(render), 'redirect:/admin');
  await setDev('staff', { prepress: 'manage' }, true);
  assert.equal(await outcome(render), 'redirect:/staff-invite/paused');
  await setDev('staff', { prepress: 'view' });
  assert.equal(await outcome(render), 'ok');
  await setDev('staff', { prepress: 'manage' });
  assert.equal(await outcome(render), 'ok');
  await setDev('admin');
  assert.equal(await outcome(render), 'ok');
});

test('a viewer sees what is in force and can download the chart, but is not offered the readings or the save', async () => {
  await setDev('staff', { prepress: 'view' });
  const html = await pageHtml();
  assert.match(html, /Dot gain calibration|Halftone dots print bigger than they are on the film/);
  assert.match(html, /Not calibrated yet\. Films are made with linear coverage/);
  assert.match(html, /Packs approved before a change keep their files\. New packs and re-runs use the new curve\./);
  assert.match(html, /href="\/api\/calibration\/chart\?format=psd&amp;lpi=55&amp;angle=22\.5&amp;mesh=230&amp;ppi=600&amp;films=underbase%2Cbase"/);
  assert.match(html, /href="\/api\/calibration\/chart\?format=pdf&amp;/);
  assert.match(html, /Needs Manage access to Pre-press|needs Manage access to Pre-press/);
  assert.doesNotMatch(html, /Choose a scan/);
  assert.doesNotMatch(html, /Save the calibration/);
  assert.doesNotMatch(html, /Reset to linear/);
});

test('a manager sees all four steps, and the save waits for a curve', async () => {
  await setDev('staff', { prepress: 'manage' });
  const html = await pageHtml();
  for (const phrase of ['1. Print the test chart', '2. Read the printed chart', '3. Check the curve', '4. Save', 'Choose a scan', 'Type values', 'Spectrophotometer', 'Read a scan to see the curve.', 'Save the calibration']) {
    assert.ok(html.includes(phrase), `the page should say "${phrase}"`);
  }
  // nothing to save yet
  assert.match(html, /<button type="button" class="pp-btn pp-btn-primary" disabled="">Save the calibration<\/button>/);
  assert.match(html, /Packs approved before keep their files\. Packs prepared from now on, and packs run again, use the new curve\./);
});

test('once a calibration is saved the page says so, shows what the film gets, and offers a reset to a manager only', async () => {
  await setDev('admin');
  const saved = await inRequest(async () => (await loadActions()).saveDotGainAction(measurement()));
  assert.ok(saved.ok, JSON.stringify(saved));

  const asOwner = await pageHtml();
  assert.match(asOwner, /Calibrated on [^,]+, \d\d:\d\d, from a scan, at 55 lpi, 22\.5° and mesh 230\. A 50% tint on the film prints as 68%\./);
  assert.match(asOwner, /The film gets/);
  assert.match(asOwner, /Reset to linear/);
  // the screen the next chart starts with is the one this was printed at
  assert.match(asOwner, /value="55"/);
  assert.match(asOwner, /Replace the calibration/);

  await setDev('staff', { prepress: 'view' });
  const asViewer = await pageHtml();
  assert.match(asViewer, /A 50% tint on the film prints as 68%/);
  assert.doesNotMatch(asViewer, /Reset to linear/);
});

// ---------------------------------------------------------------------------
// The actions

test('saving and resetting a calibration need Manage access to Pre-press, whatever the browser sends', async () => {
  const actions = await loadActions();
  const calls: [string, () => Promise<{ ok: boolean; error?: string }>][] = [
    ['saveDotGainAction', () => actions.saveDotGainAction(measurement())],
    ['resetDotGainAction', () => actions.resetDotGainAction()],
  ];
  for (const [name, call] of calls) {
    await setDev('artist');
    assert.equal(await answer(() => inRequest(call)), 'denied', `${name} as an artist`);
    for (const level of ['view', 'work']) {
      await setDev('staff', { prepress: level });
      assert.equal(await answer(() => inRequest(call)), 'denied', `${name} with Pre-press ${level}`);
    }
    await setDev('staff', { support: 'manage', production: 'manage', team: 'manage' });
    assert.equal(await answer(() => inRequest(call)), 'denied', `${name} in other areas`);
    await setDev('staff', { prepress: 'manage' }, true);
    assert.equal(await answer(() => inRequest(call)), 'redirect:/staff-invite/paused', `${name} paused`);
  }
  assert.equal((await t.db.select().from(schema.inkSystems)).length, 0, 'nothing was written by any of them');
  assert.equal((await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.area, 'prepress'))).filter((r) => r.action.startsWith('ink_system')).length, 0);
});

test('a manager saves a measurement: it is in the profile, the engine reads it, and the team log says who and what', async () => {
  const actions = await loadActions();
  await setDev('staff', { prepress: 'manage' });
  const saved = await inRequest(() => actions.saveDotGainAction(measurement({ method: 'manual' })));
  assert.ok(saved.ok, JSON.stringify(saved));

  const active = await inkSystem.getActiveInkSystem();
  assert.equal(active.profile.dotGain?.method, 'manual');
  assert.equal(active.profile.dotGain?.points.length, 19);
  assert.notEqual(dotGainFor(active.profile), LINEAR_DOT_GAIN);
  const log = await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.action, 'ink_system.dot_gain'));
  assert.equal(log.length, 1);
  assert.equal(log[0].actorId, devId);
  assert.equal(log[0].area, 'prepress');

  const reset = await inRequest(() => actions.resetDotGainAction());
  assert.ok(reset.ok);
  assert.equal((await inkSystem.getActiveInkSystem()).profile.dotGain, undefined);
  assert.equal((await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.action, 'ink_system.dot_gain_reset'))).length, 1);
});

test('a measurement that is not in shape, or is wrong, is refused in words and nothing is saved', async () => {
  const actions = await loadActions();
  await setDev('admin');
  const refusal = async (input: unknown) => {
    const r = await inRequest(() => actions.saveDotGainAction(input));
    return r.ok ? 'ok' : r.error;
  };
  assert.equal(await refusal(null), 'That measurement can’t be read.');
  assert.equal(await refusal('x'), 'That measurement can’t be read.');
  assert.equal(await refusal({ ...measurement(), extra: 1 }), 'That measurement can’t be read.');
  assert.match(await refusal(measurement({ method: 'guess' })), /how the chart was read/);
  assert.match(await refusal(measurement({ lpi: 'fine' })), /lines per inch, angle and mesh as numbers/);
  assert.match(await refusal(measurement({ points: 'many' })), /readings can’t be read/);
  assert.match(await refusal(measurement({ points: [{ input: 0.5 }] })), /isn’t a number/);
  assert.match(await refusal(measurement({ points: Array.from({ length: 70 }, (_, i) => ({ input: i / 70, printed: i / 70 })) })), /readings can’t be read/);
  // in shape, wrong in value: the service's words
  assert.match(await refusal(measurement({ points: [{ input: 0.5, printed: 0.7 }] })), /at least 3 readings/);
  assert.match(await refusal(measurement({ lpi: 5 })), /Lines per inch goes from 15 to 150/);
  assert.match(await refusal(measurement({ points: [{ input: 0.2, printed: 0.3 }, { input: 0.5, printed: 0.99 }, { input: 0.8, printed: 0.9 }] })), /further than a press moves a tone/);
  assert.equal((await t.db.select().from(schema.inkSystems)).length, 0);
});

test('editing the rest of the ink system, even from a page loaded before the calibration, keeps the calibration in force', async () => {
  const calibration = await loadActions();
  const ink = await import('@/app/(chat)/admin/ink-system/actions');
  await setDev('admin');
  // The form was loaded with no calibration, then one was saved on the other page ...
  const staleProfile = { ...DEFAULT_INK_SYSTEM, pressHeads: 10 };
  assert.ok((await inRequest(() => calibration.saveDotGainAction(measurement()))).ok);
  // ... and now the stale form is saved: the calibration must survive.
  const saved = await inRequest(() => ink.saveInkSystemAction(staleProfile));
  assert.ok(saved.ok, JSON.stringify(saved));
  const active = await inkSystem.getActiveInkSystem();
  assert.equal(active.profile.pressHeads, 10);
  assert.equal(active.profile.dotGain?.points.length, 19, 'the calibration is still in force');

  // And a form that carries an older calibration cannot put it back over a newer one.
  const older = { ...active.profile, dotGain: { ...active.profile.dotGain!, points: active.profile.dotGain!.points.map((p) => ({ ...p, printed: p.input })) } };
  assert.ok((await inRequest(() => ink.saveInkSystemAction({ ...older, pressHeads: 11 }))).ok);
  const after = await inkSystem.getActiveInkSystem();
  assert.equal(after.profile.pressHeads, 11);
  assert.deepEqual(after.profile.dotGain, active.profile.dotGain);
  // Nor can a form invent one.
  await inRequest(() => calibration.resetDotGainAction());
  assert.ok((await inRequest(() => ink.saveInkSystemAction({ ...older, pressHeads: 12 }))).ok);
  assert.equal((await inkSystem.getActiveInkSystem()).profile.dotGain, undefined);
});
