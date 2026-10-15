// Voice caller tokens on PGlite: the bridge acts only for the user a token
// from /api/voice/session names. A bare user id, an altered or expired token,
// or one signed with another secret is nobody. No ElevenLabs call is made.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { seedUser, setupTestDb, type TestDb } from '../../scripts/test/pglite';

// Never the dev-bypass user: without a token that verifies there is no caller.
delete process.env.AUTH_DEV_BYPASS;
const SECRET = 'test-voice-bridge-secret';
process.env.VOICE_BRIDGE_SECRET = SECRET;

let t: TestDb;
let voice: typeof import('./voice');

before(async () => {
  t = await setupTestDb();
  voice = await import('./voice');
});

after(async () => {
  process.env.VOICE_BRIDGE_SECRET = SECRET;
  await t.close();
});

const NOW = Date.parse('2026-10-15T08:30:00Z');
const USER = '3f2b8c1e-7d4a-4e6b-9c1d-0a5b6c7d8e9f';
const OTHER_USER = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const MINUTE = 60 * 1000;

test('a caller token names the user it was minted for, for about an hour', () => {
  const token = voice.mintVoiceCallerToken(USER, NOW);
  assert.match(token, /^v1\.[0-9a-f-]{36}\.\d{10}\.[A-Za-z0-9_-]{43}$/);
  assert.equal(voice.verifyVoiceCallerToken(token, NOW), USER);
  assert.equal(voice.verifyVoiceCallerToken(token, NOW + 59 * MINUTE), USER);
  assert.equal(voice.verifyVoiceCallerToken(token, NOW + 60 * MINUTE), null, 'expired on the hour');
  assert.equal(voice.verifyVoiceCallerToken(token, NOW + 24 * 60 * MINUTE), null);
});

test('an altered token is nobody: another user, a later expiry, a changed signature', () => {
  const token = voice.mintVoiceCallerToken(USER, NOW);
  const [version, , expires, signature] = token.split('.');
  assert.equal(voice.verifyVoiceCallerToken(`${version}.${OTHER_USER}.${expires}.${signature}`, NOW), null, 'someone else’s id');
  assert.equal(voice.verifyVoiceCallerToken(`${version}.${USER}.${Number(expires) + 86400}.${signature}`, NOW), null, 'a later expiry');
  const flipped = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;
  assert.equal(voice.verifyVoiceCallerToken(`${version}.${USER}.${expires}.${flipped}`, NOW), null, 'a changed signature');
  assert.equal(voice.verifyVoiceCallerToken(`${version}.${USER}.${expires}.${signature}=`, NOW), null, 'a padded signature');
  assert.equal(voice.verifyVoiceCallerToken(`v2.${USER}.${expires}.${signature}`, NOW), null, 'another version');
});

test('a token signed with another secret, or with none set, is nobody', () => {
  const ours = voice.mintVoiceCallerToken(USER, NOW);
  try {
    process.env.VOICE_BRIDGE_SECRET = 'another-secret';
    assert.equal(voice.verifyVoiceCallerToken(ours, NOW), null);
    const theirs = voice.mintVoiceCallerToken(USER, NOW);
    process.env.VOICE_BRIDGE_SECRET = SECRET;
    assert.equal(voice.verifyVoiceCallerToken(theirs, NOW), null);

    delete process.env.VOICE_BRIDGE_SECRET;
    assert.equal(voice.verifyVoiceCallerToken(ours, NOW), null);
    assert.throws(() => voice.mintVoiceCallerToken(USER, NOW), /VOICE_BRIDGE_SECRET/);
  } finally {
    process.env.VOICE_BRIDGE_SECRET = SECRET;
  }
});

test('garbage is nobody', () => {
  const token = voice.mintVoiceCallerToken(USER, NOW);
  const garbage: unknown[] = ['', USER, 'v1', `v1.${USER}`, `v1.${USER}.${NOW}`, 'v1...', `${token}.x`, `x${token}`, 'v1.a.b.c', `${token}${'a'.repeat(600)}`, null, undefined, 42, {}, [token]];
  for (const value of garbage) {
    assert.equal(voice.verifyVoiceCallerToken(value as string, NOW), null, JSON.stringify(value)?.slice(0, 60));
  }
});

test('resolveVoiceCaller: a valid token is its user; a raw user id, a Clerk id or no token is nobody', async () => {
  const { userId, storeId } = await seedUser(t.db, { email: 'voice-artist@merchfrom.test', withStore: true });
  const caller = await voice.resolveVoiceCaller(voice.mintVoiceCallerToken(userId));
  assert.equal(caller?.userId, userId);
  assert.equal(caller?.storeId, storeId);
  assert.equal(caller?.role, 'artist');

  const { userId: ownerId } = await seedUser(t.db, { email: 'voice-owner@merchfrom.test', role: 'admin' });
  assert.equal(await voice.resolveVoiceCaller(ownerId), null, 'the owner’s id, unsigned, is never trusted');
  assert.equal(await voice.resolveVoiceCaller('test-voice-owner@merchfrom.test'), null, 'nor their Clerk id');
  assert.equal(await voice.resolveVoiceCaller(null), null);
  assert.equal(await voice.resolveVoiceCaller(undefined), null);
  // signed by us, for nobody we know
  assert.equal(await voice.resolveVoiceCaller(voice.mintVoiceCallerToken(OTHER_USER)), null);
});
