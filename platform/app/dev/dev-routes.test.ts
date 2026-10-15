// /dev/as/<key> (app/dev/as/[who]/route.ts) and the /dev page: with AUTH_DEV_BYPASS the link sets the cookie and
// goes where it was told, on this site only; anywhere else both are a plain 404 and the route sets nothing.
import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';

const PLATFORM = path.resolve(__dirname, '../..');
type RouteModule = typeof import('./as/[who]/route');
let route: RouteModule;

before(async () => {
  process.env.AUTH_DEV_BYPASS = '1';
  process.env.DATABASE_URL ||= 'postgresql://USER:PASSWORD@HOST/DB';
  route = await import('./as/[who]/route');
});

async function visit(who: string, query = '') {
  const req = new NextRequest(`http://localhost:3030/dev/as/${who}${query}`);
  return route.GET(req, { params: Promise.resolve({ who }) });
}

test('an identity link sets the cookie and goes to next, a path on this site', async () => {
  const res = await visit('artist', `?next=${encodeURIComponent('/studio/approve/abc?tab=runs')}`);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'http://localhost:3030/studio/approve/abc?tab=runs');
  const cookie = res.headers.get('set-cookie') ?? '';
  assert.match(cookie, /^mf_dev_as=artist;/);
  assert.match(cookie, /Path=\//i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('without next it goes back to /dev, and anything that is not a path on this site is the same', async () => {
  assert.equal((await visit('owner')).headers.get('location'), 'http://localhost:3030/dev');
  for (const next of ['//evil.example', 'https://evil.example/x', '/\\evil.example', 'javascript:alert(1)', 'studio']) {
    const res = await visit('prepress', `?next=${encodeURIComponent(next)}`);
    assert.equal(res.headers.get('location'), 'http://localhost:3030/dev', next);
    assert.match(res.headers.get('set-cookie') ?? '', /^mf_dev_as=prepress;/);
  }
});

test('default clears the cookie, and a key that is not an identity is a 404 that sets nothing', async () => {
  const cleared = await visit('default', '?next=/studio');
  assert.equal(cleared.status, 303);
  assert.equal(cleared.headers.get('location'), 'http://localhost:3030/studio');
  const cookie = cleared.headers.get('set-cookie') ?? '';
  assert.match(cookie, /^mf_dev_as=;/);
  assert.match(cookie, /Max-Age=0|Expires=Thu, 01 Jan 1970/i);

  for (const who of ['nobody', 'ARTIST', 'dev-bypass', '__proto__', 'artist%2F..']) {
    const res = await visit(who);
    assert.equal(res.status, 404, who);
    assert.equal(res.headers.get('set-cookie'), null, who);
  }
});

test('without AUTH_DEV_BYPASS the page and the link are a 404 and set no cookie', () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'mf-dev-routes-'));
  try {
    const probe = path.join(scratch, 'probe.ts');
    writeFileSync(
      probe,
      `(async () => {
  const { NextRequest } = await import(${JSON.stringify(path.join(PLATFORM, 'node_modules/next/server.js'))});
  const route = await import(${JSON.stringify(path.join(PLATFORM, 'app/dev/as/[who]/route'))});
  const res = await route.GET(new NextRequest('http://localhost:3030/dev/as/owner?next=/studio'), { params: Promise.resolve({ who: 'owner' }) });
  const page = await import(${JSON.stringify(path.join(PLATFORM, 'app/dev/page'))});
  let pageError = '';
  try { await page.default(); } catch (e) { pageError = String((e as { digest?: string }).digest ?? e); }
  console.log(JSON.stringify({ status: res.status, cookie: res.headers.get('set-cookie'), pageError }));
  process.exit(0);
})();
`,
    );
    const run = spawnSync(process.execPath, [path.join(PLATFORM, 'node_modules/tsx/dist/cli.mjs'), probe], {
      cwd: PLATFORM,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NODE_ENV: 'development', DATABASE_URL: 'postgresql://USER:PASSWORD@HOST/DB' },
      timeout: 120_000,
    });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const out = JSON.parse(run.stdout.split('\n').filter((line) => line.startsWith('{')).pop() ?? '{}') as { status: number; cookie: string | null; pageError: string };
    assert.equal(out.status, 404);
    assert.equal(out.cookie, null);
    assert.match(out.pageError, /NEXT_HTTP_ERROR_FALLBACK;404/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
