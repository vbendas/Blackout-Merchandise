// The dev identities (lib/dev/identities.ts): the list /dev shows and the cookie names, and the one check
// that keeps /dev/as/<key>?next= from being sent to another site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS } from '@/lib/auth/permissions';
import { DEV_AS_COOKIE, DEV_IDENTITIES, devIdentityByKey, safeNextPath } from './identities';

test('the identities are the owner, the artist and one employee for each of three presets', () => {
  assert.deepEqual(
    DEV_IDENTITIES.map((i) => i.key),
    ['owner', 'artist', 'prepress', 'production', 'support'],
  );
  assert.equal(DEV_AS_COOKIE, 'mf_dev_as');
});

test('keys, emails and clerk ids are each unique, so a cookie names exactly one user', () => {
  for (const field of ['key', 'email', 'clerkId'] as const) {
    const values = DEV_IDENTITIES.map((i) => i[field]);
    assert.equal(new Set(values).size, values.length, `${field} repeats`);
  }
});

test('the owner is the fixed dev user lib/auth.ts has always signed in (clerk id dev-bypass, the dev email)', () => {
  const owner = devIdentityByKey('owner');
  assert.ok(owner);
  assert.equal(owner.clerkId, 'dev-bypass');
  assert.equal(owner.email, 'dev@merchfrom.test');
  assert.equal(owner.role, 'admin');
  // every other identity has a clerk id of its own, never the fixed user's
  for (const other of DEV_IDENTITIES.filter((i) => i.key !== 'owner')) {
    assert.notEqual(other.clerkId, 'dev-bypass');
    assert.ok(other.clerkId.startsWith('dev-bypass:'));
  }
});

test('employees are on a real preset with a job title, and nobody else is', () => {
  for (const identity of DEV_IDENTITIES) {
    if (identity.role === 'staff') {
      assert.ok(identity.preset && identity.preset in PRESETS, `${identity.key} needs a preset`);
      assert.ok(identity.title, `${identity.key} needs a title`);
    } else {
      assert.equal(identity.preset, undefined);
    }
  }
  assert.deepEqual(
    DEV_IDENTITIES.filter((i) => i.role === 'staff').map((i) => i.preset),
    ['prepress', 'production', 'support'],
  );
});

test('a cookie value is an identity only when it is one of the keys', () => {
  assert.equal(devIdentityByKey('artist')?.email, 'nova@merchfrom.test');
  assert.equal(devIdentityByKey('prepress')?.role, 'staff');
  for (const value of [undefined, null, '', 'nobody', 'ARTIST', ' artist', 'artist ', 'dev-bypass', 'dev@merchfrom.test', '__proto__', 'constructor', 'toString']) {
    assert.equal(devIdentityByKey(value), null, JSON.stringify(value));
  }
});

test('next is a path on this site, else the fallback', () => {
  assert.equal(safeNextPath('/studio'), '/studio');
  assert.equal(safeNextPath('/studio/approve/abc?tab=runs&from=x'), '/studio/approve/abc?tab=runs&from=x');
  assert.equal(safeNextPath('/admin/prepress?tab=approved#top'), '/admin/prepress?tab=approved#top');
  assert.equal(safeNextPath('/'), '/');
  assert.equal(safeNextPath(undefined), '/dev');
  assert.equal(safeNextPath(null), '/dev');
  assert.equal(safeNextPath(''), '/dev');
  assert.equal(safeNextPath(undefined, '/studio'), '/studio');
});

test('anything that could reach another site or smuggle a header is the fallback', () => {
  for (const next of [
    '//evil.example',
    '//evil.example/studio',
    '/\\evil.example',
    '\\\\evil.example',
    'https://evil.example',
    'http://localhost:3030/dev',
    'javascript:alert(1)',
    'studio',
    '../admin',
    '/studio\r\nSet-Cookie: x=1',
    '/studio\n',
    '/stu\u0000dio',
    '/studio\\..\\admin',
    `/${'a'.repeat(700)}`,
  ]) {
    assert.equal(safeNextPath(next), '/dev', JSON.stringify(next.slice(0, 40)));
  }
});
