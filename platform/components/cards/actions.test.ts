// What a card action may link to: a web address (a new tab) or a page of the Studio (the same tab, so the
// conversation is still there on the way back), and nothing else. The ActionRow in CardKit.tsx filters on these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSitePath, isWebUrl } from '@/components/cards/actions';

test('a path inside the Studio is a site path, with its query', () => {
  assert.equal(isSitePath('/studio/approve/5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11'), true);
  assert.equal(isSitePath('/studio/approve/5f6c0f0e-6f83-4c0a-9a53-1d0e1b1d6a11?from=abc'), true);
  assert.equal(isSitePath('/'), true);
});

test('anything that could reach another site, or is not a path, is not a site path', () => {
  assert.equal(isSitePath('//evil.test/studio'), false, 'protocol-relative');
  assert.equal(isSitePath('/\\evil.test'), false, 'a backslash form some browsers read as //');
  assert.equal(isSitePath('https://blackoutmerch.example/studio'), false);
  assert.equal(isSitePath('javascript:alert(1)'), false);
  assert.equal(isSitePath('studio/approve'), false);
  assert.equal(isSitePath(''), false);
});

test('a web address is a web url, and a site path is not', () => {
  assert.equal(isWebUrl('https://blackoutmerch.example/shop'), true);
  assert.equal(isWebUrl('http://localhost:3000'), true);
  assert.equal(isWebUrl('/studio/approve/abc'), false);
  assert.equal(isWebUrl('javascript:alert(1)'), false);
});
