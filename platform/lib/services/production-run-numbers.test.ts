// Run numbers (owner request, 17 Oct 2026): every production job has one sequential number, from 1001, that the stations show
// as "No. 1001" and the website's "On the press" board carries as `run`. The database gives it (migration 0007: production_jobs.run_number
// defaults to the next value of production_run_number_seq), so no code passes one. On PGlite, through the real print pipeline with
// its fakes (lib/print/test-support.ts); nothing here touches Neon.
//
// The first test must stay first: the harness database is shared by the tests of this file, so they read their numbers from what
// is already there and only the first one starts from an empty table.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { asc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import ts from 'typescript';
import * as schema from '@db/schema';
import type { Actor } from '@/lib/auth/permissions';
import type { PackRow } from '@/lib/print/pipeline';
import { bootstrapPrint, type Harness } from '@/lib/print/test-support';

type Progress = typeof import('@/lib/services/production-progress');

let h: Harness;
let pp: Progress;
let owner: { actor: Actor };

before(async () => {
  h = await bootstrapPrint();
  pp = await import('@/lib/services/production-progress');
  // Every station read brings the jobs up to date here; in the app it is at most every few seconds.
  pp.productionSyncTiming.minIntervalMs = 0;
  owner = { actor: h.owner };
});

after(async () => {
  await h.close();
});

// -- helpers -------------------------------------------------------------------------------

const BLACK = 'C002';
const NAVY = 'C727';

/** A design prepared for the default drop, its DTG/DTF pack approved by pre-press, and its shop product. */
async function approvedDesign() {
  const { designId, productId } = await h.newDesign();
  const { designVersionId } = await h.prepare(designId);
  const dtg = (await h.packs(designVersionId)).find((p: PackRow) => p.technique === 'dtg_dtf')!;
  const approved = await h.prepress.approvePack(h.owner, dtg.id);
  assert.ok(approved.ok, JSON.stringify(approved));
  return { designId, productId };
}

async function placeOrder(productId: string, items: { colour: string; size: string; qty: number }[]): Promise<string> {
  const [order] = await h.db
    .insert(schema.orders)
    .values({ storeId: h.artist.storeId, orderType: 'pod', status: 'paid', totalAmount: 2500, productionStatus: 'queued', fanEmail: null })
    .returning({ id: schema.orders.id });
  await h.db.insert(schema.orderItems).values(items.map((i) => ({ orderId: order.id, productId, quantity: i.qty, priceAtPurchase: 2500, colourCode: i.colour, size: i.size })));
  return order.id;
}

/** A paid shop sale, joined to the packs it needs the way the payment path does it: its job is made at once (the paid hook syncs). */
async function paidOrder(productId: string, items: { colour: string; size: string; qty: number }[] = [{ colour: BLACK, size: 'M', qty: 2 }]): Promise<string> {
  const id = await placeOrder(productId, items);
  await h.prepress.markPacksNeededForOrder(id);
  return id;
}

/** A paid sale whose approved files are attached without any sync, so the jobs it needs wait to be made by whoever syncs next. */
async function waitingOrder(productId: string): Promise<string> {
  const id = await placeOrder(productId, [{ colour: BLACK, size: 'M', qty: 3 }]);
  await h.prepress.attachBuiltPacksToOrder(id);
  return id;
}

async function jobOf(designId: string, method: 'screen' | 'dtg' | 'dtf' = 'dtg') {
  const listed = await pp.listStationJobs(owner, 'all');
  assert.ok(listed.ok, JSON.stringify(listed));
  return listed.value.find((j) => j.designId === designId && j.method === method) ?? null;
}

/** Every run number in the table, as the database holds them, lowest first. */
async function numbers(): Promise<number[]> {
  return (await h.db.select({ n: schema.productionJobs.runNumber }).from(schema.productionJobs).orderBy(asc(schema.productionJobs.runNumber))).map((r) => r.n);
}

const hashId = (jobId: string) => createHash('sha256').update(`press-board:${jobId}`).digest('hex').slice(0, 12);

const ok = <T>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
  assert.ok(result.ok, JSON.stringify(result));
  return result.value;
};

const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);

// -- new jobs ------------------------------------------------------------------------------

test('new jobs are numbered 1001, 1002 and so on, in the order they are made; the stations and the board show the same number', async () => {
  assert.deepEqual(await numbers(), [], 'an empty table: the first job is the first number');
  const made: { designId: string; productId: string; jobId: string; runNumber: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const { designId, productId } = await approvedDesign();
    await paidOrder(productId);
    const job = (await jobOf(designId))!;
    assert.ok(job, `a job for design ${i + 1}`);
    made.push({ designId, productId, jobId: job.jobId, runNumber: job.runNumber });
  }
  assert.deepEqual(
    made.map((j) => j.runNumber),
    [1001, 1002, 1003],
  );

  // The database holds exactly those, and each job's own page opens with its number.
  assert.deepEqual(await numbers(), [1001, 1002, 1003]);
  for (const job of made) {
    const opened = ok(await pp.getStationJob(owner, job.jobId));
    assert.equal(opened.runNumber, job.runNumber);
  }

  // The board carries the same number as `run`, for the same jobs, in the same order as ever (oldest first within a stage).
  const feed = await pp.onThePressFeed();
  for (const job of made) assert.equal(feed.find((r) => r.id === hashId(job.jobId))?.run, job.runNumber);
  assert.deepEqual(
    feed.map((r) => r.run),
    [1001, 1002, 1003],
  );
  for (const row of feed) assert.ok(Number.isInteger(row.run) && row.run >= 1001);

  // A second order for a design that has an open job joins it: one job, one number.
  await paidOrder(made[0].productId, [{ colour: NAVY, size: 'L', qty: 1 }]);
  const joined = (await jobOf(made[0].designId))!;
  assert.deepEqual([joined.jobId, joined.runNumber, joined.total], [made[0].jobId, 1001, 3]);
  assert.deepEqual(await numbers(), [1001, 1002, 1003], 'no number for a line, only for a job');

  // Once that job is off the press, pieces paid for after it start the next batch, and the next batch the next number.
  for (const line of (await pp.getStationJob(owner, made[0].jobId).then(ok)).lines) ok(await pp.setPrintedCount(owner, made[0].jobId, line.key, line.total));
  ok(await pp.setJobStage(owner, made[0].jobId, 'curing'));
  await paidOrder(made[0].productId, [{ colour: BLACK, size: 'S', qty: 4 }]);
  const next = ok(await pp.listStationJobs(owner, 'dtg')).filter((j) => j.designId === made[0].designId && j.jobId !== made[0].jobId);
  assert.deepEqual(
    next.map((j) => [j.runNumber, j.stage]),
    [[1004, 'queued']],
  );
  assert.deepEqual(await numbers(), [1001, 1002, 1003, 1004]);

  // And the first job keeps the number it was made with, whatever it does.
  assert.equal((await jobOf(made[0].designId))!.runNumber, 1001);
});

test('a number is never given twice: a job that goes (its order cancelled) takes its number with it', async () => {
  const before = await numbers();
  const top = before[before.length - 1];
  const { designId, productId } = await approvedDesign();
  const sale = await paidOrder(productId);
  const job = (await jobOf(designId))!;
  assert.equal(job.runNumber, top + 1);

  // Cancelled and left for a minute: the job has no pieces and is removed.
  await h.db.update(schema.orders).set({ status: 'cancelled' }).where(eq(schema.orders.id, sale));
  await h.db.update(schema.productionJobs).set({ createdAt: new Date(Date.now() - 5 * 60_000) }).where(eq(schema.productionJobs.id, job.jobId));
  await pp.syncProductionJobs();
  assert.equal(await jobOf(designId), null, 'the job is gone');
  assert.deepEqual(await numbers(), before, 'and its number with it');

  // The next job does not take the number over.
  const again = await approvedDesign();
  await paidOrder(again.productId);
  assert.equal((await jobOf(again.designId))!.runNumber, top + 2, `${top + 1} was given out once`);
});

// -- two syncs at once ---------------------------------------------------------------------

/** A second copy of the service with a state of its own (its own "one sync at a time" guard), as a second server instance would be:
 * the way two syncs really overlap. It shares the database, as the instances share Neon. */
function anotherInstance(): Progress {
  const id = require.resolve('@/lib/services/production-progress');
  const kept = require.cache[id];
  delete require.cache[id];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh evaluation of the module, which an import cannot give
    const copy = require(id) as Progress;
    assert.notEqual(copy, pp, 'a copy of its own');
    copy.productionSyncTiming.minIntervalMs = 0;
    return copy;
  } finally {
    if (kept) require.cache[id] = kept;
  }
}

test('two syncs running at once never share a number', async () => {
  // Four sales for four designs whose files are approved, waiting for the next sync to make their jobs. (Every approval syncs, so
  // they are all approved first: an order placed before the last approval would have its job made by it.)
  const approved = [];
  for (let i = 0; i < 4; i++) approved.push(await approvedDesign());
  const designs = approved.map((a) => a.designId);
  for (const { productId } of approved) await waitingOrder(productId);
  const before = await numbers();
  assert.equal((await h.db.select().from(schema.productionJobs).where(inArray(schema.productionJobs.designId, designs))).length, 0, 'nothing made yet');

  // In one process the second call waits for the first, and then finds the jobs made: the numbers are one run of the sequence.
  await Promise.all([pp.syncProductionJobs(), pp.syncProductionJobs(), pp.syncProductionJobs()]);
  const here = await numbers();
  assert.deepEqual(here.slice(before.length), range(before[before.length - 1] + 1, 4), 'four jobs, four consecutive numbers');
  assert.equal(new Set(here).size, here.length);

  // Two instances at the same moment (nothing waits on the other): both want the same four jobs and the database hands each
  // job one number. A race may use a number up (the loser of a job's creation had been given one), so the numbers need not be
  // consecutive, but none is shared and each design has one job.
  const approvedMore = [];
  for (let i = 0; i < 4; i++) approvedMore.push(await approvedDesign());
  const more = approvedMore.map((a) => a.designId);
  for (const { productId } of approvedMore) await waitingOrder(productId);
  const second = anotherInstance();
  const reports = await Promise.all([pp.syncProductionJobs(), second.syncProductionJobs()]);
  assert.equal(reports[0].jobsCreated + reports[1].jobsCreated, 4, JSON.stringify(reports));
  const rows = await h.db.select().from(schema.productionJobs).where(inArray(schema.productionJobs.designId, more));
  assert.equal(rows.length, 4, 'one job per design, whoever made it');
  const all = await numbers();
  assert.equal(new Set(all).size, all.length, `no number is shared: ${all.join(', ')}`);
  assert.ok(rows.every((r) => r.runNumber > here[here.length - 1]), 'and each is a fresh one, after the others');
  // The lines landed once each: two syncs of the same orders did not double the pieces.
  const lines = await h.db.select({ total: schema.productionLines.total }).from(schema.productionLines).where(inArray(schema.productionLines.jobId, rows.map((r) => r.id)));
  assert.deepEqual(lines.map((l) => l.total), [3, 3, 3, 3]);

  // The database alone, with no service in between: a burst of jobs made at the same moment is a run of the sequence.
  const burst = await Promise.all(
    Array.from({ length: 8 }, async () => {
      const { designId } = await h.newDesign();
      const [row] = await h.db.insert(schema.productionJobs).values({ designId, storeId: h.artist.storeId, method: 'dtg' }).returning({ n: schema.productionJobs.runNumber });
      return row.n;
    }),
  );
  assert.equal(new Set(burst).size, 8);
  assert.deepEqual([...burst].sort((a, b) => a - b), range(Math.min(...burst), 8), 'eight inserts at once, eight consecutive numbers');
});

// -- the migration -------------------------------------------------------------------------

const DRIZZLE = path.resolve(__dirname, '../../drizzle');
const TAG = '0007_production_run_numbers';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** The migrations up to 0006 only, as a folder: a database as it was before run numbers. */
async function folderBefore0007(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), 'run-numbers-migration-'));
  await mkdir(path.join(folder, 'meta'), { recursive: true });
  const journal = JSON.parse(await readFile(path.join(DRIZZLE, 'meta', '_journal.json'), 'utf8')) as { entries: { idx: number; tag: string }[] };
  const old = journal.entries.filter((e) => e.idx <= 6);
  assert.equal(old.length, 7, 'migrations 0000 to 0006');
  for (const entry of old) await copyFile(path.join(DRIZZLE, `${entry.tag}.sql`), path.join(folder, `${entry.tag}.sql`));
  await writeFile(path.join(folder, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries: old }));
  return folder;
}

/** Everything 0007 can touch, as one string: the numbers, where the sequence stands, the column, the index and the sequence itself. */
async function shape(client: PGlite): Promise<string> {
  const rows = (await client.query('select id, run_number, updated_at::text as updated_at from production_jobs order by id')).rows;
  const sequence = (await client.query('select last_value::text as last_value, is_called from production_run_number_seq')).rows;
  const column = (await client.query("select data_type, is_nullable, column_default from information_schema.columns where table_name = 'production_jobs' and column_name = 'run_number'")).rows;
  const indexes = (await client.query("select indexname, indexdef from pg_indexes where tablename = 'production_jobs' order by indexname")).rows;
  const definition = (await client.query("select start_value::text, increment_by::text, min_value::text, max_value::text, cache_size::text, cycle from pg_sequences where sequencename = 'production_run_number_seq'")).rows;
  return JSON.stringify({ rows, sequence, column, indexes, definition });
}

test('migration 0007 numbers the jobs that exist from 1001, oldest first, and the next new job goes on after them; run again it changes nothing', async () => {
  const before = await folderBefore0007();
  const client = new PGlite();
  try {
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: before });
    const had = await client.query("select 1 from information_schema.columns where table_name = 'production_jobs' and column_name = 'run_number'");
    assert.equal(had.rows.length, 0, 'no number before 0007');

    // Jobs as they stood: made at different times, written in no particular order, two at the very same moment.
    await client.exec(`
      insert into users (id, clerk_id, email, role) values ('${id(1)}', 'm', 'm@merchfrom.test', 'artist');
      insert into artist_stores (id, artist_id, slug, name) values ('${id(2)}', '${id(1)}', 'm', 'm');
    `);
    for (let i = 0; i < 7; i++) await client.exec(`insert into designs (id, store_id, source) values ('${id(100 + i)}', '${id(2)}', 'upload');`);
    const job = (n: number, design: number, createdAt: string, stage = 'queued') =>
      client.exec(`insert into production_jobs (id, design_id, store_id, method, stage, created_at) values ('${id(n)}', '${id(100 + design)}', '${id(2)}', 'dtg', '${stage}', '${createdAt}');`);
    await job(9, 0, '2026-10-16 12:00:00'); // the newest, written first
    await job(8, 1, '2026-10-16 11:00:00');
    await job(7, 3, '2026-10-16 10:00:00'); // 4 and 7 were made at the same moment, 7 written first: the lower id still comes first
    await job(4, 2, '2026-10-16 10:00:00');
    await job(5, 4, '2026-10-16 09:00:00');
    await job(6, 5, '2026-10-16 09:00:00.5');
    await job(3, 5, '2026-10-15 08:00:00', 'shipped'); // the oldest of all, a job that shipped (the same design as another, as the open-batch rule allows)
    const touched = (await client.query('select id, updated_at::text as at from production_jobs order by id')).rows;

    // 0007, as db:migrate applies it: with the real journal and folder.
    await migrate(db, { migrationsFolder: DRIZZLE });
    const jobs = await db.select().from(schema.productionJobs).orderBy(asc(schema.productionJobs.runNumber));
    assert.deepEqual(
      jobs.map((j) => [j.runNumber, j.id.slice(-2)]),
      [
        [1001, '03'], // 15 Oct
        [1002, '05'], // 09:00:00
        [1003, '06'], // 09:00:00.5
        [1004, '04'], // 10:00:00, the lower id
        [1005, '07'], // 10:00:00, the higher id
        [1006, '08'], // 11:00:00
        [1007, '09'], // 12:00:00
      ],
    );
    assert.deepEqual((await client.query('select id, updated_at::text as at from production_jobs order by id')).rows, touched, 'numbering changes the number and nothing else on a job');

    // The next job, made the way the service makes one (no number given), goes on after the highest.
    const [next] = await db.insert(schema.productionJobs).values({ designId: id(106), storeId: id(2), method: 'dtf' }).returning();
    assert.equal(next.runNumber, 1008);

    // The shape: not null, a default from the sequence, a unique index, the sequence that starts at 1001 and never wraps.
    const [column] = (await client.query<{ is_nullable: string; column_default: string }>("select is_nullable, column_default from information_schema.columns where table_name = 'production_jobs' and column_name = 'run_number'")).rows;
    assert.equal(column.is_nullable, 'NO');
    assert.match(column.column_default, /^nextval\('production_run_number_seq'::regclass\)$/);
    const [unique] = (await client.query<{ indexdef: string }>("select indexdef from pg_indexes where indexname = 'production_jobs_run_number_unique'")).rows;
    assert.match(unique.indexdef, /^CREATE UNIQUE INDEX production_jobs_run_number_unique ON public\.production_jobs USING btree \(run_number\)$/);
    const [seq] = (await client.query<{ start_value: string; increment_by: string; cycle: boolean }>("select start_value::text, increment_by::text, cycle from pg_sequences where sequencename = 'production_run_number_seq'")).rows;
    assert.deepEqual([seq.start_value, seq.increment_by, seq.cycle], ['1001', '1', false]);
    await assert.rejects(client.exec(`insert into production_jobs (id, design_id, store_id, method, stage, run_number) values ('${id(20)}', '${id(100)}', '${id(2)}', 'dtg', 'shipped', 1003)`), /production_jobs_run_number_unique|duplicate key/);
    await assert.rejects(client.exec(`insert into production_jobs (id, design_id, store_id, method, stage, run_number) values ('${id(21)}', '${id(100)}', '${id(2)}', 'dtg', 'shipped', null)`), /null value|not-null/);

    // Run again, by hand and twice, and by the migrator (which knows it has run): nothing moves, not a number, not the sequence.
    const done = await shape(client);
    const statements = (await readFile(path.join(DRIZZLE, `${TAG}.sql`), 'utf8')).split('--> statement-breakpoint');
    assert.ok(statements.length >= 6);
    for (let i = 0; i < 2; i++) for (const statement of statements) await client.exec(statement);
    assert.equal(await shape(client), done, 'the same numbers, the same sequence, the same column and index');
    await migrate(db, { migrationsFolder: DRIZZLE });
    assert.equal(await shape(client), done);
    const [again] = await db.insert(schema.productionJobs).values({ designId: id(100), storeId: id(2), method: 'dtf', stage: 'shipped' }).returning();
    assert.equal(again.runNumber, 1009, 'the sequence is where it was');

    // A number once given out is not given again, even after a re-run: the job that had 1009 goes, and the sequence stays ahead of it.
    await db.delete(schema.productionJobs).where(eq(schema.productionJobs.id, again.id));
    for (const statement of statements) await client.exec(statement);
    const [last] = await db.insert(schema.productionJobs).values({ designId: id(100), storeId: id(2), method: 'dtf', stage: 'shipped' }).returning();
    assert.equal(last.runNumber, 1010);
  } finally {
    await client.close();
    await rm(before, { recursive: true, force: true });
  }
});

test('migration 0007 on an empty table starts the first job at 1001, and repairs a sequence that fell behind its numbers', async () => {
  const before = await folderBefore0007();
  const client = new PGlite();
  try {
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: before });
    await client.exec(`
      insert into users (id, clerk_id, email, role) values ('${id(1)}', 'm', 'm@merchfrom.test', 'artist');
      insert into artist_stores (id, artist_id, slug, name) values ('${id(2)}', '${id(1)}', 'm', 'm');
    `);
    for (let i = 0; i < 3; i++) await client.exec(`insert into designs (id, store_id, source) values ('${id(100 + i)}', '${id(2)}', 'upload');`);
    await migrate(db, { migrationsFolder: DRIZZLE });
    const [first] = await db.insert(schema.productionJobs).values({ designId: id(100), storeId: id(2), method: 'screen' }).returning();
    assert.equal(first.runNumber, 1001);
    const [second] = await db.insert(schema.productionJobs).values({ designId: id(101), storeId: id(2), method: 'screen' }).returning();
    assert.equal(second.runNumber, 1002);

    // A sequence restored to an older value (a database copied back, say) would hand out numbers the jobs already have: the next
    // run of the migration brings it up to the highest number, and the unique index would have refused the repeat anyway.
    await client.exec("select setval('production_run_number_seq', 1001, false)");
    for (const statement of (await readFile(path.join(DRIZZLE, `${TAG}.sql`), 'utf8')).split('--> statement-breakpoint')) await client.exec(statement);
    const [third] = await db.insert(schema.productionJobs).values({ designId: id(102), storeId: id(2), method: 'screen' }).returning();
    assert.equal(third.runNumber, 1003);
  } finally {
    await client.close();
    await rm(before, { recursive: true, force: true });
  }
});

test('the journal lists 0007 after 0006, later than it, with a snapshot that follows 0006’s', async () => {
  const journal = JSON.parse(await readFile(path.join(DRIZZLE, 'meta', '_journal.json'), 'utf8')) as { entries: { idx: number; tag: string; when: number; breakpoints: boolean }[] };
  const six = journal.entries.find((e) => e.tag === '0006_production_progress')!;
  const seven = journal.entries.find((e) => e.tag === TAG)!;
  assert.ok(six && seven, 'both are listed');
  assert.deepEqual([seven.idx, seven.breakpoints], [six.idx + 1, true]);
  assert.equal(journal.entries[journal.entries.length - 1], seven, 'the last one');
  assert.ok(seven.when > six.when, 'later, or the migrator would take it for applied');
  const snap6 = JSON.parse(await readFile(path.join(DRIZZLE, 'meta', '0006_snapshot.json'), 'utf8')) as { id: string };
  const snap7 = JSON.parse(await readFile(path.join(DRIZZLE, 'meta', '0007_snapshot.json'), 'utf8')) as {
    prevId: string;
    sequences: Record<string, { startWith: string; increment: string }>;
    tables: Record<string, { columns: Record<string, { type: string; notNull: boolean; default?: string }>; indexes: Record<string, { isUnique: boolean }> }>;
  };
  assert.equal(snap7.prevId, snap6.id);
  assert.deepEqual(snap7.sequences['public.production_run_number_seq'].startWith, '1001');
  const jobs = snap7.tables['public.production_jobs'];
  assert.deepEqual([jobs.columns.run_number.type, jobs.columns.run_number.notNull, jobs.columns.run_number.default], ['integer', true, "nextval('production_run_number_seq')"]);
  assert.equal(jobs.indexes.production_jobs_run_number_unique.isUnique, true);
});

// -- no code gives a number ----------------------------------------------------------------

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('no code passes a run number: the jobs it makes get theirs from the database, and nothing changes one', () => {
  const root = path.resolve(__dirname, '../..');
  const problems: string[] = [];
  let sync = false;
  for (const dir of ['lib', 'app', 'components', 'scripts', 'worker']) {
    for (const file of sources(path.join(root, dir))) {
      const text = fs.readFileSync(file, 'utf8');
      const named = /runNumber|run_number/.test(text);
      const syncs = file.endsWith(path.join('lib', 'services', 'production-progress.ts'));
      if (!named && !syncs) continue;
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node) => {
        // db.insert(table).values({...}) and db.update(table).set({...}): whatever the table, the payload names no run number
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ['values', 'set'].includes(node.expression.name.text)) {
          const receiver = node.expression.expression;
          if (syncs && ts.isCallExpression(receiver) && receiver.arguments[0]?.getText(source) === 'schema.productionJobs' && node.expression.name.text === 'values') sync = true;
          for (const arg of node.arguments) {
            for (const payload of ts.isArrayLiteralExpression(arg) ? arg.elements : [arg]) {
              if (!ts.isObjectLiteralExpression(payload)) continue;
              for (const property of payload.properties) {
                const name = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : '';
                if (name === 'runNumber' || name === 'run_number') problems.push(`${path.relative(root, file)} passes ${name} (line ${source.getLineAndCharacterOfPosition(property.getStart(source)).line + 1})`);
              }
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  assert.ok(sync, 'the sync\'s insert of a job was looked at');
  assert.deepEqual(problems, []);
  // the column is the database's own: not null, with a default of its own
  assert.deepEqual([schema.productionJobs.runNumber.notNull, schema.productionJobs.runNumber.hasDefault], [true, true]);
});
