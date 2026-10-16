// /admin/pricing and its save action, run for real against PGlite with the dev bypass, the way
// lib/admin/nav.test.ts runs the other admin pages: who gets in, who is sent away, who is refused.
// Reading takes Catalogue and pricing "View"; saving takes "Manage" (Print-Prep-Plan section 9).
// nav.test.ts also scans this page and action for their checks, whoever wrote them.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import Module from 'node:module';
import { and, eq } from 'drizzle-orm';
import { renderToStaticMarkup } from 'react-dom/server';
import * as schema from '@db/schema';
import { setupTestDb, type TestDb } from '@/scripts/test/pglite';
import { PermissionError } from '@/lib/auth/permissions';
import { ADMIN_NAV, adminNavFor } from '@/lib/admin/nav';
import { defaultScreenPriceTable } from '@/lib/pricing/screen-print';

// Next keeps each request's state in Node's AsyncLocalStorage, which its own server puts on
// globalThis before anything else loads; so does this test, before the first import from Next.
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
let pricing: typeof import('@/lib/services/pricing-admin');
let actions: typeof import('./actions');
let workAsyncStorage: typeof import('next/dist/server/app-render/work-async-storage.external').workAsyncStorage;
let devId: string;

before(async () => {
  ({ workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external'));
  t = await setupTestDb();
  auth = await import('@/lib/auth');
  pricing = await import('@/lib/services/pricing-admin');
  actions = await import('./actions');
  devId = (await auth.requireUser()).user.id;
});

after(async () => {
  await t.close();
});

beforeEach(async () => {
  await t.db.delete(schema.appSettings);
  await t.db.delete(schema.staffActivity);
  await setDev('artist');
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

/** Runs a server action as Next would, with a request store for revalidatePath. */
function inRequest<T>(run: () => Promise<T>): Promise<T> {
  return workAsyncStorage.run({ incrementalCache: {}, route: '/admin/pricing', pendingRevalidatedTags: [] } as never, run);
}

type PageModule = { default: () => Promise<Parameters<typeof renderToStaticMarkup>[0]> };
const page = async () => (await import('./page')) as PageModule;

// -- the sidebar ------------------------------------------------------------------------------

test('Pricing is a sidebar entry for Catalogue and pricing View, and for no one without it', () => {
  const entry = ADMIN_NAV.find((e) => e.href === '/admin/pricing');
  assert.deepEqual(entry, { href: '/admin/pricing', label: 'Pricing', area: 'catalogue' });
  assert.ok(adminNavFor({ role: 'admin' }).some((e) => e.href === '/admin/pricing'));
  assert.ok(adminNavFor({ role: 'staff', permissions: { catalogue: 'view' } }).some((e) => e.href === '/admin/pricing'));
  assert.ok(adminNavFor({ role: 'staff', permissions: { catalogue: 'manage' } }).some((e) => e.href === '/admin/pricing'));
  assert.ok(!adminNavFor({ role: 'staff', permissions: { prepress: 'manage', production: 'manage', money: 'manage' } }).some((e) => e.href === '/admin/pricing'));
  assert.ok(!adminNavFor({ role: 'staff', permissions: { catalogue: 'view' }, suspended: true }).some((e) => e.href === '/admin/pricing'));
  assert.ok(!adminNavFor({ role: 'artist' }).some((e) => e.href === '/admin/pricing'));
});

// -- the page ---------------------------------------------------------------------------------

test('the page: artists go to the Studio, staff without the area to /admin, the paused to their page', async () => {
  const mod = await page();
  const render = () => mod.default();

  await setDev('artist');
  assert.equal(await outcome(render), 'redirect:/studio');

  await setDev('staff', { support: 'manage', prepress: 'manage' });
  assert.equal(await outcome(render), 'redirect:/admin');

  await setDev('staff', { catalogue: 'view' }, true);
  assert.equal(await outcome(render), 'redirect:/staff-invite/paused');

  await setDev('staff', { catalogue: 'none' });
  assert.equal(await outcome(render), 'redirect:/studio', 'no area at all: nothing to send them to in the admin');

  await setDev('staff', { catalogue: 'view' });
  assert.equal(await outcome(render), 'ok');
  await setDev('staff', { catalogue: 'manage' });
  assert.equal(await outcome(render), 'ok');
  await setDev('admin');
  assert.equal(await outcome(render), 'ok');
});

test('the owner sees the editor, with the placeholder marked until a table is saved', async () => {
  await setDev('admin');
  const html = renderToStaticMarkup(await (await page()).default());
  assert.match(html, />Pricing</);
  assert.match(html, /Placeholder prices/);
  assert.match(html, /1 screen €3\.50, 2 screens €5\.20, 3 screens €6\.90/);
  assert.match(html, /Fixed rule/);
  assert.match(html, /Each screen above 8 adds €1 per piece, up to 15 screens/);
  assert.match(html, /9 screens add €1, 12 add €4, 15 add €7/);
  assert.match(html, /Nothing has been saved yet/);
  // boxes to edit, a way to save
  assert.match(html, /<input[^>]*aria-label="Price per piece in euros, 1 screen, 1 pieces or more"[^>]*value="3\.50"/);
  assert.match(html, /Save prices/);
  assert.match(html, /Add a tier/);
  assert.match(html, /Add a quantity break/);
  // the example prices show the fixed charge from the 9th screen
  assert.match(html, /Example prices/);
  assert.match(html, /\+€7/);
  assert.doesNotMatch(html, /pantone/i);
});

test('a saved table is not marked as a placeholder, and the page says when it was saved', async () => {
  await setDev('admin');
  const owner = { userId: devId, role: 'admin' as const };
  const saved = await pricing.setScreenPriceTable(owner, { ...defaultScreenPriceTable(), marginPercent: 41 });
  assert.ok(saved.ok);
  const html = renderToStaticMarkup(await (await page()).default());
  assert.doesNotMatch(html, /Placeholder prices/);
  assert.doesNotMatch(html, /Nothing has been saved yet/);
  assert.match(html, /Last saved /);
  assert.match(html, /<input[^>]*aria-label="Margin, percent"[^>]*value="41"/);
});

test('someone who can only read sees the numbers, with no box to change them and no save', async () => {
  await setDev('staff', { catalogue: 'view' });
  const html = renderToStaticMarkup(await (await page()).default());
  assert.match(html, /Print price per piece/);
  assert.match(html, /3\.50/);
  assert.doesNotMatch(html, /<input/);
  assert.doesNotMatch(html, /Save prices/);
  assert.doesNotMatch(html, /Add a tier/);
  assert.match(html, /You can read these prices\. Changing them needs Manage access to Catalogue and pricing\./);
});

test('an employee\'s page view goes to the activity log; the owner\'s does not', async () => {
  await setDev('staff', { catalogue: 'view' });
  await page().then((mod) => mod.default());
  const views = await t.db.select().from(schema.staffActivity).where(and(eq(schema.staffActivity.actorId, devId), eq(schema.staffActivity.action, 'page.view')));
  assert.equal(views.length, 1);
  assert.equal(views[0].area, 'catalogue');
  assert.equal(views[0].itemId, '/admin/pricing');

  await t.db.delete(schema.staffActivity);
  await setDev('admin');
  await page().then((mod) => mod.default());
  assert.deepEqual(await t.db.select().from(schema.staffActivity), []);
});

// -- the action ---------------------------------------------------------------------------------

const table = () => ({ ...defaultScreenPriceTable(), marginPercent: 33 });

test('saving the table needs Catalogue and pricing Manage: everyone else is refused and nothing is written', async () => {
  const save = () => inRequest(() => actions.saveScreenPriceTableAction(table()));
  const written = async () => (await t.db.select().from(schema.appSettings).where(eq(schema.appSettings.key, 'screen_print_price_table'))).length;

  await setDev('artist');
  assert.equal(await outcome(save), 'denied', 'an artist');
  await setDev('staff', { catalogue: 'view', prepress: 'manage' });
  assert.equal(await outcome(save), 'denied', 'Catalogue and pricing View');
  await setDev('staff', { catalogue: 'work', production: 'manage' });
  assert.equal(await outcome(save), 'denied', 'Catalogue and pricing Work');
  await setDev('staff', { prepress: 'manage', production: 'manage', shop_orders: 'manage', runs: 'manage', money: 'manage' });
  assert.equal(await outcome(save), 'denied', 'every other area at Manage');
  await setDev('staff', { catalogue: 'manage' }, true);
  assert.equal(await outcome(save), 'redirect:/staff-invite/paused', 'paused');
  assert.equal(await written(), 0);

  await setDev('staff', { catalogue: 'manage' });
  assert.equal(await outcome(save), 'ok');
  assert.equal(await written(), 1);
});

test('the check comes before the input is looked at: a refused caller learns nothing about the table', async () => {
  await setDev('staff', { catalogue: 'view' });
  // not even a table: the refusal comes first, as a throw, never a validation message
  assert.equal(await outcome(() => inRequest(() => actions.saveScreenPriceTableAction('not a table'))), 'denied');
  assert.equal(await outcome(() => inRequest(() => actions.saveScreenPriceTableAction(undefined))), 'denied');
});

test('a saved table is the one runs are quoted from, and the change is in the activity log', async () => {
  await setDev('staff', { catalogue: 'manage' });
  const result = await inRequest(() => actions.saveScreenPriceTableAction(table()));
  assert.equal(result.ok, true);
  assert.ok(result.ok && result.updatedAt);
  const state = await pricing.getScreenPriceTableState();
  assert.equal(state.placeholder, false);
  assert.equal(state.table.marginPercent, 33);

  const log = await t.db.select().from(schema.staffActivity).where(and(eq(schema.staffActivity.actorId, devId), eq(schema.staffActivity.action, 'pricing.screen_table')));
  assert.equal(log.length, 1);
  assert.equal(log[0].area, 'catalogue');
  assert.equal(log[0].itemType, 'pricing');
});

test('the owner can save too; a wrong table comes back as a message and a box, never as a thrown error', async () => {
  await setDev('admin');
  assert.equal((await inRequest(() => actions.saveScreenPriceTableAction(table()))).ok, true);

  const wrong = await inRequest(() => actions.saveScreenPriceTableAction({ ...table(), marginPercent: -4 }));
  assert.deepEqual(wrong, { ok: false, error: 'The margin runs from 0 to 300 percent.', field: 'margin' });
  const backwards = await inRequest(() =>
    actions.saveScreenPriceTableAction({ ...table(), tiers: [{ fromScreens: 1, printCents: [400, 300, 200, 100] }, { fromScreens: 3, printCents: [100, 100, 100, 100] }] }),
  );
  assert.equal(backwards.ok, false);
  assert.equal(!backwards.ok && backwards.field, 'tiers.1.cells.0');
  assert.equal((await pricing.getScreenPriceTable()).marginPercent, 33, 'the earlier save stands');

  const nothing = await inRequest(() => actions.saveScreenPriceTableAction(null));
  assert.deepEqual(nothing, { ok: false, error: 'The price table is missing.', field: undefined });
});
