// The production stations' pages and actions: who gets in and who is sent away or refused (Production View to look, Production Work to
// change, the gate first and the input after), what each action hands the service, and that a service that fails or is not there
// is a message on the screen, never a crash. Two halves:
//  1. A scan of the source (TypeScript's parser) over app/station and components/station, whoever writes them next: every page and every
//     exported server action reaches a permission check before it touches anything, and no client component pulls server code into
//     the browser. (lib/admin/nav.test.ts does the same over app/(chat)/admin; ask it to scan app/station too.)
//  2. The pages and actions run for real against PGlite with the dev bypass, on the sample jobs of STATION_MOCK and on stand-ins for
//     the service.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { setupTestDb, type TestDb } from '../../scripts/test/pglite';
import type { StationJobDetail, StationJobSummary } from '@/lib/services/production-progress';

const ROOT = path.resolve(__dirname, '../..');
const STATION_DIR = path.join(ROOT, 'app/station');
const COMPONENTS_DIR = path.join(ROOT, 'components/station');

// ---------------------------------------------------------------------------
// 1. The source scan

const GATE = /^(requireStaffPage|requireStaffAction|requirePermission|can|run\w*Action)$/;
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

type Event = { kind: 'gate'; call: ts.CallExpression; name: string } | { kind: 'await'; ok: boolean; text: string };

/** The gates and awaits of a function body in the order they run (nested functions run later, except the callback handed to a gate wrapper). */
function events(body: ts.Node, sourceFile: ts.SourceFile): Event[] {
  const found: Event[] = [];
  function visit(node: ts.Node, inGate: boolean) {
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
      found.push({ kind: 'await', ok, text: node.getText(sourceFile).slice(0, 80) });
    }
    ts.forEachChild(node, (child) => visit(child, inGate));
  }
  ts.forEachChild(body, (child) => visit(child, false));
  return found;
}

function firstGate(body: ts.Node, sourceFile: ts.SourceFile): { gate?: ts.CallExpression; name?: string; problem?: string } {
  for (const event of events(body, sourceFile)) {
    if (event.kind === 'gate') return { gate: event.call, name: event.name };
    if (!event.ok) return { problem: `awaits \`${event.text}\` before any permission check` };
  }
  return { problem: 'has no permission check' };
}

function stringArgs(call: ts.CallExpression): (string | null)[] {
  return call.arguments.map((arg) => (ts.isStringLiteralLike(arg) ? arg.text : null));
}

function exportedFunctions(sourceFile: ts.SourceFile): ts.FunctionDeclaration[] {
  return sourceFile.statements.filter((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && !!ts.getModifiers(s)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

function defaultExport(sourceFile: ts.SourceFile): ts.FunctionDeclaration | null {
  return (
    exportedFunctions(sourceFile).find((fn) => ts.getModifiers(fn)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) ?? null
  );
}

const isUseServer = (sourceFile: ts.SourceFile) => {
  const first = sourceFile.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use server';
};
const isUseClient = (sourceFile: ts.SourceFile) => {
  const first = sourceFile.statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use client';
};

const stationFiles = walk(STATION_DIR);
const componentFiles = walk(COMPONENTS_DIR);

test('the station tree is where the scan expects it', () => {
  assert.ok(stationFiles.some((f) => f.endsWith(path.join('station', 'layout.tsx'))));
  assert.ok(stationFiles.some((f) => f.endsWith(path.join('station', 'page.tsx'))));
  assert.ok(stationFiles.some((f) => f.endsWith(path.join('station', 'actions.ts'))));
  assert.ok(stationFiles.some((f) => f.endsWith(path.join('job', '[jobId]', 'page.tsx'))));
});

test('every station page checks Production access before it reads anything', () => {
  const problems: string[] = [];
  const pages = stationFiles.filter((f) => path.basename(f) === 'page.tsx');
  assert.equal(pages.length, 2);
  for (const file of pages) {
    const sourceFile = parse(file);
    const fn = defaultExport(sourceFile);
    const name = path.relative(ROOT, file);
    if (!fn?.body) {
      problems.push(`${name}: no default export function`);
      continue;
    }
    const { gate, name: gateName, problem } = firstGate(fn.body, sourceFile);
    if (problem || !gate) {
      problems.push(`${name} ${problem}`);
      continue;
    }
    const [area, level] = stringArgs(gate);
    if (gateName !== 'requireStaffPage' || area !== 'production' || level !== 'view') problems.push(`${name}: the gate is ${gateName}(${area}, ${level}); a station page needs requireStaffPage('production', 'view')`);
  }
  assert.deepEqual(problems, []);
});

test('every station server action checks access first: Production View to look, Work to change, and nothing is read before it', () => {
  const problems: string[] = [];
  let actions = 0;
  for (const file of stationFiles) {
    const sourceFile = parse(file);
    if (!isUseServer(sourceFile)) continue;
    for (const fn of exportedFunctions(sourceFile)) {
      actions += 1;
      const name = `${path.relative(ROOT, file)}#${fn.name?.text}`;
      if (!fn.body) {
        problems.push(`${name}: no body`);
        continue;
      }
      const { gate, name: gateName, problem } = firstGate(fn.body, sourceFile);
      if (problem || !gate) {
        problems.push(`${name} ${problem}`);
        continue;
      }
      // The level it asks for: a refresh only looks, everything else changes something.
      const [level] = stringArgs(gate);
      const wanted = /^refresh/.test(fn.name?.text ?? '') ? 'view' : 'work';
      if (gateName === 'runStationAction' && level !== wanted) problems.push(`${name}: asks for ${level}, a ${wanted === 'view' ? 'read' : 'change'} needs ${wanted}`);
    }
  }
  assert.ok(actions >= 7, `found ${actions} actions`);
  assert.deepEqual(problems, []);
});

test('the one gate a station action runs in asks for the Production area, and the service is what writes', () => {
  const source = fs.readFileSync(path.join(STATION_DIR, 'actions.ts'), 'utf8');
  assert.match(source, /requireStaffAction\('production', level\)/);
  assert.doesNotMatch(source, /requireStaffAction\('(?!production)/, 'no other area');
  // no action logs or revalidates on its own: the service writes the activity log, and the screens keep their own numbers
  assert.doesNotMatch(source, /recordStaffActivity|revalidatePath/);
});

test('a route handler under app/station, if one is ever added, checks access too', () => {
  for (const file of stationFiles.filter((f) => path.basename(f) === 'route.ts')) {
    assert.match(fs.readFileSync(file, 'utf8'), /\b(requireStaffAction|requirePermission|can)\(/, path.relative(ROOT, file));
  }
});

test('the client components never pull server code into the browser: only types come from the services, the database and the session', () => {
  const problems: string[] = [];
  const SERVER = /^@\/(lib\/(services|db|auth$|tools|agent)|app\/station\/(data|mock-store))/;
  for (const file of [...componentFiles, ...stationFiles].filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))) {
    const sourceFile = parse(file);
    const client = isUseClient(sourceFile) || file.startsWith(COMPONENTS_DIR);
    if (!client || isUseServer(sourceFile)) continue;
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const from = statement.moduleSpecifier.text;
      if (!SERVER.test(from)) continue;
      const clause = statement.importClause;
      const typeOnly = clause?.isTypeOnly || (clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.every((e) => e.isTypeOnly));
      if (!typeOnly) problems.push(`${path.relative(ROOT, file)} imports ${from} as a value`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the layout, the loading, error and not-found screens read nothing: only pages and actions touch data', () => {
  for (const name of ['layout.tsx', 'loading.tsx', 'error.tsx', 'not-found.tsx']) {
    const text = fs.readFileSync(path.join(STATION_DIR, name), 'utf8');
    assert.doesNotMatch(text, /from '@\/lib\/(services|db|auth)|from '\.\/data'|from '\.\/mock-store'/, name);
  }
});

// ---------------------------------------------------------------------------
// 2. The pages and actions, run for real

(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage = AsyncLocalStorage;
(Module as unknown as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions['.css'] = (m) => {
  m.exports = {};
};
process.env.AUTH_DEV_BYPASS = '1';
delete process.env.AUTH_DEV_ROLE;
delete process.env.AUTH_DEV_EMAIL;
delete process.env.ADMIN_EMAILS;

let t: TestDb;
let auth: typeof import('@/lib/auth');
let actions: typeof import('./actions');
let data: typeof import('./data');
let mock: typeof import('./mock-store');
let devId: string;

before(async () => {
  t = await setupTestDb();
  auth = await import('@/lib/auth');
  actions = await import('./actions');
  data = await import('./data');
  mock = await import('./mock-store');
  devId = (await auth.requireUser()).user.id;
});

after(async () => {
  await t.close();
});

beforeEach(async () => {
  data.setStationApiForTests(null);
  delete process.env.STATION_MOCK;
  mock.resetMockStation();
  await setDev('artist');
});

async function setDev(role: 'artist' | 'staff' | 'admin', permissions: Record<string, string> = {}, suspended = false) {
  await t.db.update(schema.users).set({ role, suspendedAt: suspended ? new Date() : null }).where(eq(schema.users.id, devId));
  await t.db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, devId));
  const rows = Object.entries(permissions).map(([area, level]) => ({ userId: devId, area, level }));
  if (rows.length > 0) await t.db.insert(schema.staffPermissions).values(rows);
}

/** 'redirect:/path', 'not-found', or 'ok'. */
async function outcome(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return 'ok';
  } catch (err) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return `redirect:${digest.split(';')[2]}`;
    if (typeof digest === 'string' && digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;404')) return 'not-found';
    throw err;
  }
}

const UNDERWRITER = '00000000-0000-4000-8000-000000000001';
const THORNFIELD = '00000000-0000-4000-8000-000000000002';

/** Every action with arguments that are fine, for the gate to be the only thing that turns it away. */
function calls(): [string, () => Promise<{ ok: boolean; denied?: boolean; error?: string }>][] {
  return [
    ['refreshQueueAction', () => actions.refreshQueueAction([])],
    ['refreshJobAction', () => actions.refreshJobAction(UNDERWRITER)],
    ['adjustPrintedAction', () => actions.adjustPrintedAction(UNDERWRITER, 'l3', 1)],
    ['setPrintedAction', () => actions.setPrintedAction(UNDERWRITER, 'l3', 3)],
    ['setScreenStatusAction', () => actions.setScreenStatusAction(THORNFIELD, 'mock-pack-lights:3', 'screen_ready')],
    ['setStageAction', () => actions.setStageAction(UNDERWRITER, 'curing', true)],
    ['setHiddenAction', () => actions.setHiddenAction(UNDERWRITER, true)],
  ];
}
const READS = ['refreshQueueAction', 'refreshJobAction'];

test('an artist, an employee with no access, and an employee of other areas are refused every action: the gate comes before the input is read', async () => {
  process.env.STATION_MOCK = '1';
  for (const who of [
    () => setDev('artist'),
    () => setDev('staff'),
    () => setDev('staff', { support: 'manage', prepress: 'manage', shop_orders: 'manage', runs: 'manage' }),
  ]) {
    await who();
    for (const [name, call] of calls()) {
      const result = await call();
      assert.deepEqual([name, result.ok, result.denied], [name, false, true]);
    }
    // even with nonsense for arguments, the answer is the refusal, not "not understood": nothing was read before the gate
    for (const result of [
      await actions.adjustPrintedAction(undefined as never, null as never, 'x' as never),
      await actions.setStageAction(42 as never, {} as never),
      await actions.refreshJobAction(undefined as never),
    ]) {
      assert.equal(result.ok === false && result.denied, true);
    }
  }
  assert.equal((await mock.mockGetStationJob({ actor: { userId: 'x', role: 'admin' } }, UNDERWRITER)).ok && true, true);
  const job = await mock.mockGetStationJob({ actor: { userId: 'x', role: 'admin' } }, UNDERWRITER);
  assert.ok(job.ok && job.value.printed === 56, 'nothing was changed by anyone refused');
});

test('Production View may look and nothing more: the reads answer, every change is refused and changes nothing', async () => {
  process.env.STATION_MOCK = '1';
  await setDev('staff', { production: 'view' });
  for (const [name, call] of calls()) {
    const result = await call();
    if (READS.includes(name)) assert.equal(result.ok, true, name);
    else assert.deepEqual([name, result.ok, result.denied, result.error], [name, false, true, "You don't have Work access to Production."]);
  }
  const looked = await actions.refreshJobAction(UNDERWRITER);
  assert.ok(looked.ok);
  assert.deepEqual([looked.value.printed, looked.value.stage, looked.value.canWork], [56, 'printing', false]);
});

test('Production Work, and the owner, change what the station shows, and the numbers that come back are the service’s', async () => {
  process.env.STATION_MOCK = '1';
  for (const who of [() => setDev('staff', { production: 'work' }), () => setDev('admin')]) {
    await who();
    mock.resetMockStation();
    const added = await actions.adjustPrintedAction(UNDERWRITER, 'l3', 4);
    assert.ok(added.ok);
    assert.deepEqual([added.value.lines[2].printed, added.value.printed, added.value.canWork], [4, 60, true]);
    const set = await actions.setPrintedAction(UNDERWRITER, 'l3', 25);
    assert.ok(set.ok && set.value.lines[2].printed === 25);
    const screens = await actions.setScreenStatusAction(THORNFIELD, 'mock-pack-lights:3', 'screen_ready');
    assert.ok(screens.ok && screens.value.screens[2].status === 'screen_ready');
    const moved = await actions.setStageAction(UNDERWRITER, 'curing', true);
    assert.ok(moved.ok && moved.value.stage === 'curing');
    const hidden = await actions.setHiddenAction(UNDERWRITER, true);
    assert.ok(hidden.ok && hidden.value.hiddenFromBoard);
    const queue = await actions.refreshQueueAction([]);
    assert.ok(queue.ok && queue.value.jobs.length === 6);
  }
});

test('a refused move comes back as the service’s own words, to put on the screen; a held move can be forced', async () => {
  process.env.STATION_MOCK = '1';
  await setDev('staff', { production: 'work' });
  const held = await actions.setStageAction(UNDERWRITER, 'curing');
  assert.deepEqual(held, { ok: false, error: '56 of 160 pieces are printed. Count the rest first, or force the move.' });
  const forced = await actions.setStageAction(UNDERWRITER, 'curing', true);
  assert.ok(forced.ok);
  // Shipping is Production's step, with the tracking: not even a forced move gets a job there.
  const shipped = await actions.setStageAction(UNDERWRITER, 'shipped', true);
  assert.deepEqual(shipped, { ok: false, error: 'A job reads shipped once every order in it has shipped. Ship each order from Production, with its tracking.' });
  assert.deepEqual(await actions.setStageAction('nope', 'curing'), { ok: false, error: 'That job was not found. Go back to the list.' });
});

test('input that is not a station’s own is not understood, after the gate: ids, keys, whole numbers, statuses and stages', async () => {
  process.env.STATION_MOCK = '1';
  await setDev('staff', { production: 'work' });
  const bad = [
    await actions.adjustPrintedAction('', 'l1', 1),
    await actions.adjustPrintedAction(UNDERWRITER, '', 1),
    await actions.adjustPrintedAction(UNDERWRITER, 'l1', 1.5),
    await actions.adjustPrintedAction(UNDERWRITER, 'l1', Number.NaN),
    await actions.adjustPrintedAction(UNDERWRITER, 'l1', 1_000_000),
    await actions.adjustPrintedAction('x'.repeat(201), 'l1', 1),
    await actions.setPrintedAction(UNDERWRITER, 'l1', -1),
    await actions.setPrintedAction(UNDERWRITER, 'l1', 2.5),
    await actions.setPrintedAction(UNDERWRITER, 'l1', '5' as never),
    await actions.setScreenStatusAction(UNDERWRITER, 'mock-pack-darks:1', 'ready'),
    await actions.setScreenStatusAction(UNDERWRITER, '', 'waiting'),
    await actions.setStageAction(UNDERWRITER, 'done'),
    await actions.setStageAction(UNDERWRITER, ''),
    await actions.setHiddenAction(UNDERWRITER, 'yes' as never),
    await actions.refreshJobAction(''),
  ];
  for (const result of bad) assert.deepEqual(result, { ok: false, error: 'That change was not understood. Reload the job and try again.' });
  const job = await mock.mockGetStationJob({ actor: { userId: 'x', role: 'admin' } }, UNDERWRITER);
  assert.ok(job.ok && job.value.printed === 56, 'nothing reached the service');
});

test('what an action hands the service is the signed-in person, the ids as given and the whole number; force only when it is true', async () => {
  await setDev('staff', { production: 'work' });
  const seen: unknown[][] = [];
  const job = { jobId: 'job-1' } as StationJobDetail;
  const note = (name: string) => async (session: { actor: { userId: string } }, ...rest: unknown[]) => {
    seen.push([name, session.actor.userId, ...rest]);
    return { ok: true as const, value: job };
  };
  data.setStationApiForTests({
    listStationJobs: async () => ({ ok: true, value: [] }),
    getStationJob: note('get'),
    setPrintedCount: note('set'),
    adjustPrintedCount: note('adjust'),
    setScreenStatus: note('screen'),
    setJobStage: note('stage'),
    setHiddenFromBoard: note('hidden'),
  });
  await actions.refreshJobAction('job-1');
  await actions.adjustPrintedAction('job-1', 'line-1', -3);
  await actions.setPrintedAction('job-1', 'line-1', 12);
  await actions.setScreenStatusAction('job-1', 'pack:2', 'on_press');
  await actions.setStageAction('job-1', 'folding');
  await actions.setStageAction('job-1', 'folding', true);
  await actions.setStageAction('job-1', 'printing', 'yes' as never);
  await actions.setHiddenAction('job-1', false);
  assert.deepEqual(seen, [
    ['get', devId, 'job-1'],
    ['adjust', devId, 'job-1', 'line-1', -3],
    ['set', devId, 'job-1', 'line-1', 12],
    ['screen', devId, 'job-1', 'pack:2', 'on_press'],
    ['stage', devId, 'job-1', 'folding', { force: false }],
    ['stage', devId, 'job-1', 'folding', { force: true }],
    ['stage', devId, 'job-1', 'printing', { force: false }],
    ['hidden', devId, 'job-1', false],
  ]);
});

test('a service that throws or refuses is a message on the screen, not a crash; a refused permission says so', async () => {
  await setDev('staff', { production: 'work' });
  const { PermissionError } = await import('@/lib/auth/permissions');
  const logged: unknown[][] = [];
  const log = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    const failing = (error: Error) => async () => {
      throw error;
    };
    const boom = failing(new Error('connection reset by peer'));
    data.setStationApiForTests({
      listStationJobs: boom,
      getStationJob: failing(new PermissionError('production', 'view')),
      setPrintedCount: boom,
      adjustPrintedCount: async () => ({ ok: false, error: 'This job has shipped, so its counts are closed.' }),
      setScreenStatus: boom,
      setJobStage: boom,
      setHiddenFromBoard: boom,
    });
    assert.deepEqual(await actions.refreshQueueAction([]), { ok: false, error: 'Something went wrong. Try again.' }, 'what went wrong inside is not shown');
    assert.deepEqual(await actions.refreshJobAction('job-1'), { ok: false, error: "You don't have View access to Production.", denied: true });
    assert.deepEqual(await actions.adjustPrintedAction('job-1', 'l', 1), { ok: false, error: 'This job has shipped, so its counts are closed.' });
    assert.deepEqual(await actions.setStageAction('job-1', 'curing'), { ok: false, error: 'Something went wrong. Try again.' });
  } finally {
    console.error = log;
  }
  assert.ok(logged.some((entry) => String(entry.at(-1)).includes('connection reset by peer')), 'it is logged for whoever looks');
});

test('a paused employee is sent to their page by every action, as everywhere else', async () => {
  await setDev('staff', { production: 'work' }, true);
  for (const [name, call] of calls()) assert.equal(await outcome(call), 'redirect:/staff-invite/paused', name);
});

// -- the pages

type PageModule = { default: (props: never) => Promise<unknown> };
type Element = { props: Record<string, unknown>; type: unknown };

async function render(load: () => Promise<PageModule>, props: unknown): Promise<Element> {
  return (await (await load()).default(props as never)) as Element;
}
/** The words in a tree of elements (the ones written out in it, not what a component would draw). */
function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (node && typeof node === 'object' && 'props' in node) return textOf((node as Element).props.children);
  return '';
}
const queuePage = () => import('./page') as Promise<PageModule>;
const jobPage = () => import('./job/[jobId]/page') as Promise<PageModule>;
const search = (s?: string) => ({ searchParams: Promise.resolve(s ? { s } : {}) });
const jobParams = (jobId: string) => ({ params: Promise.resolve({ jobId }) });

test('each page: artists go to the Studio, staff without Production to /admin, the paused to their page, and Production View is let in', async () => {
  process.env.STATION_MOCK = '1';
  for (const [name, load, props] of [
    ['/station', queuePage, () => search()],
    ['/station/job/[jobId]', jobPage, () => jobParams(UNDERWRITER)],
  ] as const) {
    const run = () => load().then((mod) => mod.default(props() as never));
    await setDev('artist');
    assert.equal(await outcome(run), 'redirect:/studio', `${name} as an artist`);
    await setDev('staff');
    assert.equal(await outcome(run), 'redirect:/studio', `${name} as staff with no access at all`);
    await setDev('staff', { support: 'manage' });
    assert.equal(await outcome(run), 'redirect:/admin', `${name} as staff without Production`);
    await setDev('staff', { production: 'view' }, true);
    assert.equal(await outcome(run), 'redirect:/staff-invite/paused', `${name} as paused staff`);
    await setDev('staff', { production: 'view' });
    assert.equal(await outcome(run), 'ok', `${name} with Production View`);
    await setDev('admin');
    assert.equal(await outcome(run), 'ok', `${name} as the owner`);
  }
});

test('the queue page draws every job on the floor, for the station asked for; whether the person can change anything follows Production Work', async () => {
  process.env.STATION_MOCK = '1';
  await setDev('staff', { production: 'view' });
  const viewer = await render(queuePage, search());
  assert.deepEqual([viewer.props.station, viewer.props.canWork, viewer.props.adminHref], ['all', false, '/admin/production']);
  const initial = viewer.props.initial as { ok: true; value: { jobs: StationJobSummary[]; thumbs: Record<string, unknown> } };
  assert.equal(initial.ok, true);
  assert.equal(initial.value.jobs.length, 6, 'every station’s jobs: the screen filters, so the picker can count them');
  assert.equal(Object.keys(initial.value.thumbs).length, 6);

  await setDev('staff', { production: 'work' });
  assert.equal((await render(queuePage, search('dtg'))).props.station, 'dtg', '?s= names the station');
  assert.equal((await render(queuePage, search('screen'))).props.canWork, true);
  assert.equal((await render(queuePage, search('nonsense'))).props.station, 'all', 'anything else is all');
});

test('the queue page with a service that fails still draws: the screen shows the message and keeps trying', async () => {
  await setDev('staff', { production: 'view' });
  data.setStationApiForTests({ ...allFail('nothing here') });
  const log = console.error;
  console.error = () => undefined;
  try {
    const page = await render(queuePage, search());
    assert.deepEqual(page.props.initial, { ok: false, error: 'Something went wrong. Try again.' });
  } finally {
    console.error = log;
  }
});

function allFail(message: string) {
  const boom = async () => {
    throw new Error(message);
  };
  return { listStationJobs: boom, getStationJob: boom, setPrintedCount: boom, adjustPrintedCount: boom, setScreenStatus: boom, setJobStage: boom, setHiddenFromBoard: boom };
}

test('the job page opens a job with its job sheet; a job that is not there is a 404, and a service that fails is a page that says so', async () => {
  process.env.STATION_MOCK = '1';
  await setDev('staff', { production: 'view' });
  const page = await render(jobPage, jobParams(UNDERWRITER));
  const props = page.props as { job: StationJobDetail; view: { title: string; screenSets: unknown[] } | null; sheetProblem: string | null; adminHref: string };
  assert.deepEqual([props.job.designTitle, props.job.canWork, props.view?.title, props.view?.screenSets.length, props.sheetProblem, props.adminHref], ['Underwriter · v3', false, 'MF-UNDERWRITER · v3', 2, null, '/admin/production']);

  assert.equal(await outcome(() => jobPage().then((mod) => mod.default(jobParams('nope') as never))), 'not-found');

  delete process.env.STATION_MOCK;
  data.setStationApiForTests(allFail('database is down'));
  const log = console.error;
  console.error = () => undefined;
  try {
    const failed = await render(jobPage, jobParams(UNDERWRITER));
    const words = textOf(failed);
    assert.match(words, /This job did not open/);
    assert.match(words, /Something went wrong\. Try again\./);
    assert.match(words, /Try again/);
    assert.match(words, /Back to the queue/);
  } finally {
    console.error = log;
  }
});

test('the job page still opens a job whose job sheet cannot be read: the counts are what the floor needs', async () => {
  await setDev('staff', { production: 'work' });
  const job = { jobId: 'job-9', runNumber: 1009, designId: 'not-a-design-id', designTitle: 'Odd job', shopName: 'Shop', method: 'dtg', stage: 'queued', total: 5, printed: 0, updatedAt: '2026-10-16T09:00:00.000Z', hiddenFromBoard: false, flaggedLines: 0, lines: [], screens: [], jobSheetUrl: '/api/job-sheets/x', canWork: true } as StationJobDetail;
  data.setStationApiForTests({ ...allFail('unused'), getStationJob: async () => ({ ok: true, value: job }) });
  const page = await render(jobPage, jobParams('job-9'));
  const props = page.props as { job: StationJobDetail; view: unknown; sheetProblem: string | null };
  assert.deepEqual([props.job.jobId, props.view, props.sheetProblem], ['job-9', null, 'There is no job sheet for this design yet.']);
});

// -- the real service behind it (an empty floor: nothing to count, nothing to break)

test('on the real service an empty floor is an empty queue, and a job that is not there is a message the page turns into a 404', async () => {
  await setDev('staff', { production: 'view' });
  const session = await auth.requireUser();
  const queue = await data.loadQueue(session);
  assert.deepEqual(queue, { ok: true, value: { jobs: [], thumbs: {} } });
  const missing = await data.loadJob(session, '00000000-0000-4000-8000-0000000000aa');
  assert.equal(missing.ok, false);
  assert.match(missing.ok ? '' : missing.error, /not found/i);
  assert.equal(await outcome(() => jobPage().then((mod) => mod.default(jobParams('00000000-0000-4000-8000-0000000000aa') as never))), 'not-found');
  const viaAction = await actions.refreshQueueAction([]);
  assert.deepEqual(viaAction, { ok: true, value: { jobs: [], thumbs: {} } });
});

test('the queue asks for the proofs of the designs the screen does not have yet, and a list without its pictures is still a list', async () => {
  await setDev('staff', { production: 'view' });
  const session = await auth.requireUser();
  const summary = (jobId: string, designId: string): StationJobSummary => ({ jobId, runNumber: 1001, designId, designTitle: jobId, shopName: 's', method: 'screen', stage: 'queued', total: 1, printed: 0, updatedAt: '2026-10-16T09:00:00.000Z', hiddenFromBoard: false, flaggedLines: 0 });
  const jobs = [summary('a', '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44'), summary('b', '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a45'), summary('c', '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44')];
  data.setStationApiForTests({ ...allFail('unused'), listStationJobs: async () => ({ ok: true, value: jobs }) });
  const first = await data.loadQueue(session);
  assert.ok(first.ok);
  assert.deepEqual(Object.keys(first.value.thumbs).sort(), ['3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44', '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a45'], 'once for each design, though two jobs share one');
  assert.deepEqual(first.value.thumbs['3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44'], { screen: null, dtg_dtf: null }, 'no proof made yet');
  const again = await data.loadQueue(session, ['3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44']);
  assert.ok(again.ok);
  assert.deepEqual(Object.keys(again.value.thumbs), ['3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a45'], 'the one the screen already has is left out');
  const none = await data.loadQueue(session, ['3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a44', '3f2b6c1e-9d4a-4c1f-8a7e-0b5d2c9e1a45']);
  assert.ok(none.ok && Object.keys(none.value.thumbs).length === 0);

  // an actor who may not open job sheets gets the queue anyway (the proofs are a nicety)
  const log = console.error;
  console.error = () => undefined;
  try {
    const noAccess = await data.loadQueue({ ...session, actor: { ...session.actor, role: 'artist', permissions: null } });
    assert.ok(noAccess.ok);
    assert.deepEqual(noAccess.value.thumbs, {});
  } finally {
    console.error = log;
  }
});
