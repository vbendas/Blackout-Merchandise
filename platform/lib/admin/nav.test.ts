// Every admin page, server action and admin API route checks the caller's
// access itself (Print-Prep-Plan section 9, risks: "a test fails if any admin
// page or action skips the check"). Two halves:
//  1. A scan of the source (TypeScript's parser) over app/(chat)/admin/** and
//     the admin API routes, whoever wrote them: each page and each exported
//     server action reaches a permission check before it touches any data,
//     and each page's check names the same area and level as its sidebar
//     entry in lib/admin/nav.ts.
//  2. The pages and actions this package owns, run for real against PGlite
//     with the dev bypass: who gets in, who is sent away, who is refused.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '../../scripts/test/pglite';
import { PermissionError } from '@/lib/auth/permissions';
import { ADMIN_NAV, adminNavFor, firstAdminHref } from './nav';

const ROOT = path.resolve(__dirname, '../..');
const ADMIN_DIR = path.join(ROOT, 'app/(chat)/admin');
const ADMIN_API_DIRS = ['app/api/prepress', 'app/api/admin', 'app/api/calibration'].map((dir) => path.join(ROOT, dir));

// ---------------------------------------------------------------------------
// 1. The source scan

/** Calls that check access: the gates in lib/auth.ts, the checks in
 * lib/auth/permissions.ts, and action wrappers named run…Action (which take
 * the level and check before running the work they're given). */
const GATE = /^(requireStaffPage|requireStaffAction|requirePermission|can|run\w*Action)$/;
/** What may be awaited before the check: reading who is asking, and the route's params. */
const LOADER = /^(require|get|load)\w*(User|Session|Actor)$/;
const ROUTE_INPUT = /^(params|searchParams)$/;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function calleeName(call: ts.CallExpression): string | null {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return null;
}

function stringArgs(call: ts.CallExpression): (string | null)[] {
  return call.arguments.map((arg) => (ts.isStringLiteralLike(arg) ? arg.text : null));
}

type Event = { kind: 'gate'; call: ts.CallExpression; name: string } | { kind: 'await'; ok: boolean; text: string; pos: number };

/** The gates and awaits of a function body in the order they run, leaving
 * out nested functions (they run later, if at all), except the callback
 * handed to a gate wrapper, which runs after its check. */
function events(body: ts.Node, sourceFile: ts.SourceFile): Event[] {
  const found: Event[] = [];
  function visit(node: ts.Node, inGate: boolean) {
    // `await requireStaffAction(...)` is the gate itself, not an await before it.
    if (ts.isAwaitExpression(node) && ts.isCallExpression(node.expression) && GATE.test(calleeName(node.expression) ?? '')) {
      visit(node.expression, inGate);
      return;
    }
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name && GATE.test(name)) {
        found.push({ kind: 'gate', call: node, name });
        node.arguments.forEach((arg) => visit(arg, true));
        return;
      }
    }
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) && !inGate) return;
    if (ts.isAwaitExpression(node)) {
      const target = node.expression;
      let ok = false;
      if (ts.isCallExpression(target)) ok = LOADER.test(calleeName(target) ?? '');
      else if (ts.isIdentifier(target)) ok = ROUTE_INPUT.test(target.text);
      else if (ts.isPropertyAccessExpression(target)) ok = ROUTE_INPUT.test(target.name.text);
      found.push({ kind: 'await', ok, text: node.getText(sourceFile).slice(0, 80), pos: node.getStart(sourceFile) });
    }
    ts.forEachChild(node, (child) => visit(child, inGate));
  }
  ts.forEachChild(body, (child) => visit(child, false));
  return found;
}

/** The first gate, provided nothing but who-is-asking is awaited before it. */
function firstGate(body: ts.Node, sourceFile: ts.SourceFile): { gate?: ts.CallExpression; name?: string; problem?: string } {
  for (const event of events(body, sourceFile)) {
    if (event.kind === 'gate') return { gate: event.call, name: event.name };
    if (!event.ok) return { problem: `awaits \`${event.text}\` before any permission check` };
  }
  return { problem: 'has no permission check' };
}

/** The area and level a gate call asks for. */
function gateAccess(name: string, call: ts.CallExpression): { area: string | null; level: string } {
  const args = stringArgs(call);
  if (name === 'requireStaffPage' || name === 'requireStaffAction') return { area: args[0], level: args[1] ?? 'view' };
  if (name === 'requirePermission' || name === 'can') return { area: args[1], level: args[2] ?? 'view' };
  return { area: null, level: args[0] ?? 'view' };
}

function defaultExport(sourceFile: ts.SourceFile): ts.FunctionDeclaration | null {
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement)) {
      const mods = ts.getModifiers(statement)?.map((m) => m.kind) ?? [];
      if (mods.includes(ts.SyntaxKind.ExportKeyword) && mods.includes(ts.SyntaxKind.DefaultKeyword)) return statement;
    }
  }
  return null;
}

function isUseServer(sourceFile: ts.SourceFile): boolean {
  const first = sourceFile.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use server';
}

function exportedFunctions(sourceFile: ts.SourceFile): ts.FunctionDeclaration[] {
  return sourceFile.statements.filter(
    (s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && !!ts.getModifiers(s)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
  );
}

/** '/admin/prepress/[packId]' for app/(chat)/admin/prepress/[packId]/page.tsx. */
function routeOf(file: string): string {
  return path.relative(path.join(ROOT, 'app/(chat)'), path.dirname(file)).split(path.sep).filter((s) => !/^\(.*\)$/.test(s)).reduce((acc, s) => `${acc}/${s}`, '');
}

const adminFiles = walk(ADMIN_DIR);

test('the admin tree is where the scan expects it', () => {
  assert.ok(adminFiles.some((file) => file.endsWith(path.join('admin', 'layout.tsx'))));
  assert.ok(adminFiles.some((file) => file.endsWith(path.join('production', 'page.tsx'))));
});

test('every admin page checks access before it reads anything', () => {
  const problems: string[] = [];
  for (const file of adminFiles.filter((f) => path.basename(f) === 'page.tsx')) {
    const sourceFile = parse(file);
    const fn = defaultExport(sourceFile);
    const route = routeOf(file);
    if (!fn?.body) {
      problems.push(`${route}: no default export function`);
      continue;
    }
    if (route === '/admin') {
      // The index only redirects, to a page this person may open.
      const text = fn.body.getText(sourceFile);
      if (!text.includes('requireUser(') || !text.includes('firstAdminHref(')) problems.push('/admin: must send people to firstAdminHref(actor)');
      continue;
    }
    const { problem } = firstGate(fn.body, sourceFile);
    if (problem) problems.push(`${route} ${problem}`);
  }
  assert.deepEqual(problems, []);
});

test('each sidebar page asks for the same area and level as its sidebar entry', () => {
  const problems: string[] = [];
  const checked: string[] = [];
  for (const entry of ADMIN_NAV) {
    // Admin pages live under app/(chat); the production stations (/station) are an app of their own under app/.
    const file = [path.join(ROOT, 'app/(chat)', entry.href, 'page.tsx'), path.join(ROOT, 'app', entry.href, 'page.tsx')].find((candidate) => fs.existsSync(candidate));
    if (!file) continue; // a page still being built elsewhere
    checked.push(entry.href);
    const sourceFile = parse(file);
    const fn = defaultExport(sourceFile);
    const found = fn?.body ? firstGate(fn.body, sourceFile) : { problem: 'no page function' };
    if (!found.gate || !found.name) {
      problems.push(`${entry.href}: ${found.problem}`);
      continue;
    }
    const access = gateAccess(found.name, found.gate);
    if (access.area !== entry.area || access.level !== (entry.level ?? 'view')) {
      problems.push(`${entry.href}: page asks for ${access.area}:${access.level}, sidebar says ${entry.area}:${entry.level ?? 'view'}`);
    }
  }
  assert.deepEqual(problems, []);
  assert.ok(checked.includes('/station'), 'the Stations entry is checked against app/station/page.tsx');
});

test('every admin server action checks access before anything else', () => {
  const problems: string[] = [];
  let actions = 0;
  for (const file of adminFiles) {
    const sourceFile = parse(file);
    if (!isUseServer(sourceFile)) continue;
    for (const fn of exportedFunctions(sourceFile)) {
      actions += 1;
      const name = `${path.relative(ROOT, file)}#${fn.name?.text}`;
      if (!fn.body) {
        problems.push(`${name}: no body`);
        continue;
      }
      const { problem } = firstGate(fn.body, sourceFile);
      if (problem) problems.push(`${name} ${problem}`);
    }
  }
  assert.ok(actions >= 12, `found ${actions} actions`);
  assert.deepEqual(problems, []);
});

test('the admin layout keeps out anyone without admin access', () => {
  const text = fs.readFileSync(path.join(ADMIN_DIR, 'layout.tsx'), 'utf8');
  assert.match(text, /requireUser\(/);
  assert.match(text, /hasAnyAdminAccess\(/);
  assert.match(text, /adminNavFor\(/);
});

/** A module's source plus the modules it imports by relative path, two
 * levels deep: a route often hands its work to a handler module (testable
 * without Next), and the check sits there. */
function sourceWithImports(file: string, depth = 2, seen = new Set<string>()): string {
  if (seen.has(file) || !fs.existsSync(file)) return '';
  seen.add(file);
  const text = fs.readFileSync(file, 'utf8');
  if (depth === 0) return text;
  const imported = [...text.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => path.resolve(path.dirname(file), m[1]));
  const files = imported.flatMap((base) => [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]).filter((f) => fs.existsSync(f));
  return [text, ...files.map((f) => sourceWithImports(f, depth - 1, seen))].join('\n');
}

test('every admin API route checks access', () => {
  const problems: string[] = [];
  let routes = 0;
  for (const dir of ADMIN_API_DIRS) {
    for (const file of walk(dir).filter((f) => path.basename(f) === 'route.ts')) {
      routes += 1;
      if (!/\b(requireStaffAction|requirePermission|can)\(/.test(sourceWithImports(file))) problems.push(path.relative(ROOT, file));
    }
  }
  assert.ok(routes > 0, 'found the pre-press routes');
  assert.deepEqual(problems, []);
});

test('the sidebar lists only what can() allows', () => {
  assert.deepEqual(adminNavFor({ role: 'artist' }), []);
  assert.deepEqual(adminNavFor({ role: 'staff', permissions: { prepress: 'manage' }, suspended: true }), []);
  assert.deepEqual(
    adminNavFor({ role: 'staff', permissions: { prepress: 'work' } }).map((e) => e.href),
    ['/admin/prepress', '/admin/ink-system'],
  );
  assert.ok(!adminNavFor({ role: 'staff', permissions: { prepress: 'manage', production: 'manage', money: 'manage' } }).some((e) => e.area === 'team'));
  assert.deepEqual(adminNavFor({ role: 'admin' }).map((e) => e.href), ADMIN_NAV.map((e) => e.href));
  assert.equal(firstAdminHref({ role: 'staff', permissions: { production: 'view' } }), '/admin/production');
  assert.equal(firstAdminHref({ role: 'staff', permissions: { support: 'work' } }), null);
});

// ---------------------------------------------------------------------------
// 2. This package's pages and actions, run for real

// Next keeps each request's state in Node's AsyncLocalStorage, which its own
// server puts on globalThis before anything else loads; so does this test,
// before the first import of anything from Next (all imported below, in before()).
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
let team: typeof import('@/lib/services/team');
let workAsyncStorage: typeof import('next/dist/server/app-render/work-async-storage.external').workAsyncStorage;
let devId: string;

before(async () => {
  ({ workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external'));
  t = await setupTestDb();
  auth = await import('@/lib/auth');
  team = await import('@/lib/services/team');
  team.setTeamGatewaysForTests({
    sendEmail: async () => ({ ok: true, id: 'test' }),
    revokeSessions: async () => {},
    ensureSignInAccount: async () => {},
  });
  devId = (await auth.requireUser()).user.id;
});

after(async () => {
  team.setTeamGatewaysForTests();
  await t.close();
});

beforeEach(async () => {
  await setDev('artist');
});

async function setDev(role: 'artist' | 'staff' | 'admin', permissions: Record<string, string> = {}, suspended = false) {
  await t.db.update(schema.users).set({ role, suspendedAt: suspended ? new Date() : null }).where(eq(schema.users.id, devId));
  await t.db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, devId));
  const rows = Object.entries(permissions).map(([area, level]) => ({ userId: devId, area, level }));
  if (rows.length > 0) await t.db.insert(schema.staffPermissions).values(rows);
}

/** 'redirect:/path', 'not-found', 'denied' (PermissionError) or 'ok'. */
async function outcome(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return 'ok';
  } catch (err) {
    if (err instanceof PermissionError) return 'denied';
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return `redirect:${digest.split(';')[2]}`;
    if (typeof digest === 'string' && digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;404')) return 'not-found';
    throw err;
  }
}

/** Runs a server action as Next would, with a request store for revalidatePath. */
function inRequest<T>(run: () => Promise<T>): Promise<T> {
  return workAsyncStorage.run({ incrementalCache: {}, route: '/admin', pendingRevalidatedTags: [] } as never, run);
}

type PageModule = { default: (props: never) => Promise<unknown> };
const ID = '00000000-0000-4000-8000-000000000000';
const PAGES: { name: string; load: () => Promise<PageModule>; area: string; level: string; props: () => unknown }[] = [
  { name: '/admin/production', load: () => import('@/app/(chat)/admin/production/page'), area: 'production', level: 'view', props: () => ({}) },
  { name: '/admin/supplier', load: () => import('@/app/(chat)/admin/supplier/page'), area: 'production', level: 'view', props: () => ({}) },
  { name: '/admin/team', load: () => import('@/app/(chat)/admin/team/page'), area: 'team', level: 'manage', props: () => ({}) },
  { name: '/admin/team/invites', load: () => import('@/app/(chat)/admin/team/invites/page'), area: 'team', level: 'manage', props: () => ({}) },
  { name: '/admin/team/invite', load: () => import('@/app/(chat)/admin/team/invite/page'), area: 'team', level: 'manage', props: () => ({}) },
  {
    name: '/admin/team/activity',
    load: () => import('@/app/(chat)/admin/team/activity/page'),
    area: 'team',
    level: 'manage',
    props: () => ({ searchParams: Promise.resolve({}) }),
  },
  {
    name: '/admin/team/[userId]',
    load: () => import('@/app/(chat)/admin/team/[userId]/page'),
    area: 'team',
    level: 'manage',
    props: () => ({ params: Promise.resolve({ userId: devId }) }),
  },
];

test('each page: artists go to the Studio, staff without the area to /admin, the paused to their page', async () => {
  for (const page of PAGES) {
    const mod = await page.load();
    const render = () => mod.default(page.props() as never);

    await setDev('artist');
    assert.equal(await outcome(render), 'redirect:/studio', `${page.name} as an artist`);

    await setDev('staff', { support: 'manage' });
    assert.equal(await outcome(render), 'redirect:/admin', `${page.name} as staff without ${page.area}`);

    await setDev('staff', { [page.area]: page.level }, true);
    assert.equal(await outcome(render), 'redirect:/staff-invite/paused', `${page.name} as paused staff`);

    await setDev('staff', page.area === 'team' ? { prepress: 'manage', production: 'manage', money: 'manage' } : { [page.area]: page.level });
    assert.equal(await outcome(render), page.area === 'team' ? 'redirect:/admin' : 'ok', `${page.name} as staff with ${page.area}:${page.level}`);

    await setDev('admin');
    assert.equal(await outcome(render), 'ok', `${page.name} as the owner`);
  }
});

test('a person page 404s for someone not on the team', async () => {
  await setDev('admin');
  const mod = (await import('@/app/(chat)/admin/team/[userId]/page')) as PageModule;
  assert.equal(await outcome(() => mod.default({ params: Promise.resolve({ userId: ID }) } as never)), 'not-found');
  assert.equal(await outcome(() => mod.default({ params: Promise.resolve({ userId: 'nope' }) } as never)), 'not-found');
});

test('/admin opens the first page this person may see, or the Studio', async () => {
  const mod = (await import('@/app/(chat)/admin/page')) as PageModule;
  await setDev('admin');
  assert.equal(await outcome(() => mod.default({} as never)), `redirect:${ADMIN_NAV[0].href}`);
  await setDev('staff', { production: 'view' });
  assert.equal(await outcome(() => mod.default({} as never)), 'redirect:/admin/production');
  await setDev('staff', { support: 'work' });
  assert.equal(await outcome(() => mod.default({} as never)), 'redirect:/studio');
});

test('the admin layout lets in anyone with an admin area and no one else', async () => {
  const mod = (await import('@/app/(chat)/admin/layout')) as { default: (props: { children: unknown }) => Promise<unknown> };
  const render = () => mod.default({ children: null });
  await setDev('artist');
  assert.equal(await outcome(render), 'redirect:/studio');
  await setDev('staff');
  assert.equal(await outcome(render), 'redirect:/studio');
  await setDev('staff', { support: 'view' });
  assert.equal(await outcome(render), 'ok');
});

test('production and supplier actions need Production Work, and record what they did', async () => {
  const actions = await import('@/app/(chat)/admin/actions');
  const { storeId } = await seedUser(t.db, { email: 'shop-for-actions@blackoutmerch.test', withStore: true });
  const [order] = await t.db.insert(schema.orders).values({ storeId: storeId!, status: 'paid', totalAmount: 2500, productionStatus: 'packed' }).returning();
  const calls: [string, () => Promise<unknown>][] = [
    ['advanceProductionAction', () => actions.advanceProductionAction(order.id)],
    ['setTrackingAction', () => actions.setTrackingAction(order.id, 'DHL', 'JD0001')],
    ['draftSupplierOrderAction', () => actions.draftSupplierOrderAction()],
    ['placeSupplierOrderAction', () => actions.placeSupplierOrderAction(ID)],
    ['receiveSupplierOrderAction', () => actions.receiveSupplierOrderAction(ID)],
  ];
  for (const [name, call] of calls) {
    await setDev('artist');
    assert.equal(await outcome(() => inRequest(call)), 'denied', `${name} as an artist`);
    await setDev('staff', { production: 'view', prepress: 'manage' });
    assert.equal(await outcome(() => inRequest(call)), 'denied', `${name} with Production View`);
    await setDev('staff', { production: 'work' }, true);
    assert.equal(await outcome(() => inRequest(call)), 'redirect:/staff-invite/paused', `${name} paused`);
  }

  await setDev('staff', { production: 'work' });
  const tracked = await inRequest(() => actions.setTrackingAction(order.id, 'DHL', 'JD0001'));
  assert.deepEqual(tracked, {});
  const missing = await inRequest(() => actions.placeSupplierOrderAction('not-an-id'));
  assert.ok(missing.error);
  const log = await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.itemId, order.id));
  assert.ok(log.some((row) => row.action === 'production.tracking' && row.actorId === devId));
});

test('team actions are the owner’s alone', async () => {
  const actions = await import('@/app/(chat)/admin/team/actions');
  const calls: [string, () => Promise<unknown>][] = [
    ['inviteStaffAction', () => actions.inviteStaffAction({ email: 'gate@blackoutmerch.test', permissions: { prepress: 'view' } })],
    ['resendInviteAction', () => actions.resendInviteAction(ID)],
    ['revokeInviteAction', () => actions.revokeInviteAction(ID)],
    ['saveMemberAction', () => actions.saveMemberAction(ID, { permissions: { prepress: 'manage' } })],
    ['setSuspendedAction', () => actions.setSuspendedAction(ID, true)],
    ['setOwnerAction', () => actions.setOwnerAction(ID, true)],
    ['removeMemberAction', () => actions.removeMemberAction(ID)],
  ];
  for (const [name, call] of calls) {
    await setDev('artist');
    assert.equal(await outcome(() => inRequest(call)), 'denied', `${name} as an artist`);
    // Even an employee with every other area at Manage can't touch the team.
    await setDev('staff', { prepress: 'manage', production: 'manage', shop_orders: 'manage', runs: 'manage', support: 'manage', applications: 'manage', shops: 'manage', catalogue: 'manage', money: 'manage', team: 'manage' });
    assert.equal(await outcome(() => inRequest(call)), 'denied', `${name} as staff`);
  }

  await setDev('admin');
  const invited = await inRequest(() => actions.inviteStaffAction({ email: 'gate@blackoutmerch.test', title: 'Printer', permissions: { prepress: 'work' } }));
  assert.ok(invited.acceptUrl?.includes('/staff-invite?token='), JSON.stringify(invited));
  const bad = await inRequest(() => actions.saveMemberAction('not-an-id', { permissions: {} }));
  assert.ok(bad.error);
});
