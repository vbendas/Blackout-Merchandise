// Local demo mode (lib/dev/local-demo.ts, local-db.ts and the branch in lib/db.ts): when it applies, that it
// is a real persistent database in UTC, that a second process is refused, and that production can neither use
// it nor carry the setting.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { localDemoDir, localDemoOn } from './local-demo';
import { closeLocalDb, lockFileFor, openLocalDb, takeLock } from './local-db';

const PLATFORM = path.resolve(__dirname, '../..');
const scratch = mkdtempSync(path.join(tmpdir(), 'mf-local-demo-test-'));
const saved = { DATABASE_URL: process.env.DATABASE_URL, PRINT_STORAGE_DRIVER: process.env.PRINT_STORAGE_DRIVER, PRINT_STORAGE_DIR: process.env.PRINT_STORAGE_DIR };

after(async () => {
  await closeLocalDb();
  rmSync(scratch, { recursive: true, force: true });
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('local demo mode is off unless LOCAL_DB_DIR names a folder', () => {
  assert.equal(localDemoDir({}), null);
  assert.equal(localDemoDir({ LOCAL_DB_DIR: '' }), null);
  assert.equal(localDemoDir({ LOCAL_DB_DIR: '   ' }), null);
  assert.equal(localDemoOn({}), false);
  // as configured: the opener (lib/dev/local-db.ts) resolves it
  assert.equal(localDemoDir({ LOCAL_DB_DIR: ' some/folder ', NODE_ENV: 'development' }), 'some/folder');
  assert.equal(localDemoDir({ LOCAL_DB_DIR: '/abs/folder' }), '/abs/folder');
  assert.equal(localDemoOn({ LOCAL_DB_DIR: '/abs/folder' }), true);
});

test('a LOCAL_DB_DIR in production is an error, not something to ignore; production without it is untouched', () => {
  assert.throws(() => localDemoDir({ LOCAL_DB_DIR: '/abs/folder', NODE_ENV: 'production' }), /development-only/);
  assert.throws(() => localDemoOn({ LOCAL_DB_DIR: '/abs/folder', NODE_ENV: 'production' }), /development-only/);
  assert.equal(localDemoDir({ NODE_ENV: 'production' }), null);
  assert.equal(localDemoDir({ LOCAL_DB_DIR: '', NODE_ENV: 'production' }), null);
});

test('the local database persists across a close and a reopen, runs in UTC, and is one per process', async () => {
  const dir = path.join(scratch, 'persist');
  const schema = {};
  const db = openLocalDb(dir, schema);
  assert.equal(openLocalDb(dir, schema), db, 'the same client again in this process (a hot reload evaluates lib/db.ts again)');
  assert.throws(() => openLocalDb(path.join(scratch, 'elsewhere'), schema), /already open/);

  const zone = await db.execute(sql`select current_setting('TimeZone') as tz`);
  assert.equal((zone.rows[0] as { tz: string }).tz, 'UTC');
  await db.execute(sql`create table notes (id int primary key, at timestamp not null default now())`);
  await db.execute(sql`insert into notes (id) values (1)`);
  // A default the database wrote reads back as the time it is (drizzle reads timestamps as UTC).
  const [row] = (await db.execute(sql`select at::text as at from notes`)).rows as { at: string }[];
  assert.ok(Math.abs(new Date(`${row.at.replace(' ', 'T')}Z`).getTime() - Date.now()) < 60_000, `database time ${row.at} is not now`);

  await closeLocalDb();
  const again = openLocalDb(dir, schema);
  const [{ n }] = (await again.execute(sql`select count(*)::int as n from notes`)).rows as { n: number }[];
  assert.equal(n, 1, 'the row is still there after the database was closed and opened again');
  await closeLocalDb();
});

test('opening the database points everything in the process at disk and away from Neon', async () => {
  process.env.DATABASE_URL = 'postgresql://USER:PASSWORD@HOST/DB';
  process.env.PRINT_STORAGE_DRIVER = 'r2';
  delete process.env.PRINT_STORAGE_DIR;
  const dir = path.join(scratch, 'pinned');
  openLocalDb(dir, {});
  try {
    assert.ok(process.env.DATABASE_URL?.includes('.invalid'), 'the Neon address is gone from the environment');
    assert.equal(process.env.PRINT_STORAGE_DRIVER, 'local');
    assert.equal(process.env.PRINT_STORAGE_DIR, path.join(scratch, 'print-storage'));
  } finally {
    await closeLocalDb();
  }
});

test('a second live process is refused, a dead one is taken over, and our own lock is ours', () => {
  const file = lockFileFor(path.join(scratch, 'locked'));

  // the parent of this test process is alive and is not us
  writeFileSync(file, JSON.stringify({ pid: process.ppid, command: 'npm run demo:local' }));
  assert.throws(() => takeLock(file), /open in another process/);

  // a process that has finished
  const dead = Number(spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' }).stdout);
  assert.ok(dead > 0);
  writeFileSync(file, JSON.stringify({ pid: dead }));
  takeLock(file);
  takeLock(file); // taking it again as the holder is fine

  writeFileSync(file, 'not json');
  takeLock(file);
});

test('production refuses to load lib/db with LOCAL_DB_DIR set, and loads it without', () => {
  const tsxCli = path.join(PLATFORM, 'node_modules/tsx/dist/cli.mjs');
  const run = (env: Record<string, string>) =>
    spawnSync(process.execPath, [tsxCli, '-e', "import('./lib/db').then(() => console.log('LOADED'), (e) => { console.error(String(e.message)); process.exit(3); })"], {
      cwd: PLATFORM,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', DATABASE_URL: 'postgresql://USER:PASSWORD@HOST/DB', NODE_ENV: 'production', ...env },
      timeout: 60_000,
    });

  const refused = run({ LOCAL_DB_DIR: path.join(scratch, 'prod') });
  assert.equal(refused.status, 3, refused.stdout + refused.stderr);
  assert.match(refused.stderr, /development-only/);

  const normal = run({});
  assert.equal(normal.status, 0, normal.stdout + normal.stderr);
  assert.match(normal.stdout, /LOADED/);
});

test('lib/db opens the local database on the first query, not on import (Next imports pages in other processes too)', () => {
  const dir = path.join(scratch, 'lazy');
  const probe = path.join(scratch, 'probe.ts');
  writeFileSync(
    probe,
    `import { existsSync } from 'node:fs';
import { sql } from 'drizzle-orm';
(async () => {
  const { db } = await import(${JSON.stringify(path.join(PLATFORM, 'lib/db'))});
  const untouched = !existsSync(${JSON.stringify(dir)}) && !existsSync(${JSON.stringify(`${dir}.lock`)});
  const result = await db.execute(sql\`select 1 as one\`);
  console.log(JSON.stringify({ untouched, opened: existsSync(${JSON.stringify(`${dir}.lock`)}), one: (result.rows[0] as { one: number }).one }));
  process.exit(0);
})();
`,
  );
  const run = spawnSync(process.execPath, [path.join(PLATFORM, 'node_modules/tsx/dist/cli.mjs'), probe], {
    cwd: PLATFORM,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NODE_ENV: 'development', DATABASE_URL: '', LOCAL_DB_DIR: dir },
    timeout: 60_000,
  });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const out = JSON.parse(run.stdout.split('\n').filter((line) => line.startsWith('{')).pop() ?? '{}') as { untouched: boolean; opened: boolean; one: number };
  assert.equal(out.untouched, true, 'importing lib/db touched the database folder');
  assert.equal(out.opened, true, 'the first query opened it');
  assert.equal(out.one, 1);
});
