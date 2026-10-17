// The public "On the press" route: readable from any website (the rows are public, no credentials), a short public cache that
// is the same for every caller, a plain refusal when the board can't be read, and the feed read at most once every 15
// seconds. No Next, no database.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { OnThePressRow } from '@/lib/services/production-progress';
import { BOARD_MAX_AGE_SECONDS, handleBoard, handleBoardPreflight, memoFeed, type BoardBody } from './handler';

const logged: string[] = [];
const realError = console.error;
before(() => {
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(' '));
  };
});
after(() => {
  console.error = realError;
});

const ROW: OnThePressRow = { id: 'a1b2c3d4e5f6', client: 'Private', piece: 'Classic tee', printed: 82, total: 120, ink: '2 colours', stage: 'ON THE PRESS', updatedAt: '2026-10-16T10:00:00.000Z' };

const get = (origin?: string) => new Request('https://studio.merchfrom.com/api/public/on-the-press', { headers: origin ? { origin } : {} });

test('every caller gets the same answer: the rows, readable from any website, never with credentials', async () => {
  const answers: string[] = [];
  for (const origin of ['https://merchfrom.com', 'https://www.merchfrom.com', 'https://evil.example', 'null', undefined]) {
    const res = await handleBoard(get(origin), { feed: async () => [ROW] });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), '*', String(origin));
    assert.equal(res.headers.get('access-control-allow-credentials'), null, 'no credentials, ever');
    assert.equal(res.headers.get('vary'), null, 'nothing in the answer depends on the caller, so a CDN may keep one copy');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    const text = await res.text();
    const body = JSON.parse(text) as BoardBody;
    assert.deepEqual(body.rows, [ROW]);
    assert.ok(!Number.isNaN(Date.parse(body.generatedAt)));
    answers.push(JSON.stringify(body.rows));
  }
  assert.equal(new Set(answers).size, 1);
});

test('a short public cache: 15 seconds in the browser and the CDN', async () => {
  const res = await handleBoard(get('https://merchfrom.com'), { feed: async () => [] });
  assert.equal(res.headers.get('cache-control'), `public, max-age=${BOARD_MAX_AGE_SECONDS}, s-maxage=${BOARD_MAX_AGE_SECONDS}, stale-while-revalidate=${BOARD_MAX_AGE_SECONDS}`);
  assert.equal(BOARD_MAX_AGE_SECONDS, 15);
  assert.match(res.headers.get('content-type') ?? '', /^application\/json/);
});

test('when the board cannot be read: a 503 with a plain sentence, not cached, the reason logged and not sent', async () => {
  logged.length = 0;
  const res = await handleBoard(get('https://merchfrom.com'), {
    feed: async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.1:5432 (orders table)');
    },
  });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('access-control-allow-origin'), '*', 'the website can read the refusal');
  const text = await res.text();
  assert.deepEqual(JSON.parse(text), { error: 'The board is not available just now. Try again in a moment.' });
  assert.ok(!text.includes('ECONNREFUSED'));
  assert.ok(logged.some((line) => line.includes('ECONNREFUSED')));
});

test('a preflight is answered for GET, from anywhere (it reads nothing of the request)', () => {
  const res = handleBoardPreflight();
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
  assert.equal(res.headers.get('access-control-max-age'), '600');
  assert.equal(res.headers.get('access-control-allow-credentials'), null);
});

test('the feed is read at most once every 15 seconds; a failed read is not kept', async () => {
  let now = 1_000_000;
  let reads = 0;
  let fail = false;
  const feed = memoFeed(
    async () => {
      reads += 1;
      if (fail) throw new Error('down');
      return [{ ...ROW, printed: reads }];
    },
    15_000,
    () => now,
  );
  assert.equal((await feed())[0].printed, 1);
  now += 14_999;
  assert.equal((await feed())[0].printed, 1, 'kept');
  assert.equal(reads, 1);
  now += 1;
  assert.equal((await feed())[0].printed, 2, 'read again after 15 seconds');
  now += 15_000;
  fail = true;
  await assert.rejects(feed());
  fail = false;
  assert.equal((await feed())[0].printed, 4, 'the failure was not kept: read again at once');
});

test('the route is public in the proxy and answers GET and OPTIONS only', async () => {
  const route = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
  assert.deepEqual([...route.matchAll(/export (?:async )?function (\w+)/g)].map((m) => m[1]).sort(), ['GET', 'OPTIONS']);
  // proxy.ts imports the domains service, which loads lib/db.ts: a placeholder address (nothing connects).
  process.env.DATABASE_URL ||= 'postgresql://USER:PASSWORD@HOST/DB';
  const { isPublicPath } = await import('@/proxy');
  assert.equal(isPublicPath('/api/public/on-the-press'), true);
  assert.equal(isPublicPath('/api/public/on-the-press/x'), false);
  assert.equal(isPublicPath('/api/public'), false);
});

test('the stations the board is fed from stay behind sign-in, and no shop can take their address', async () => {
  process.env.DATABASE_URL ||= 'postgresql://USER:PASSWORD@HOST/DB';
  const { APP_SEGMENTS, isPublicPath } = await import('@/proxy');
  const { RESERVED_SLUGS } = await import('@/lib/services/registration');
  for (const p of ['/station', '/station/', '/station/job/x', '/STATION']) assert.equal(isPublicPath(p), false, p);
  assert.ok(APP_SEGMENTS.has('station'), 'not read as a shop slug by the proxy');
  assert.ok(RESERVED_SLUGS.has('station'), 'not a shop address an artist can register');
});
