// What the assistant offers an employee follows their access: the system
// prompt, the home chips, the composer suggestions and the "what can I do"
// menu never name what they can't do.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestDb, type TestDb } from '../../scripts/test/pglite';
import { PRESETS, type PermissionMap } from '@/lib/auth/permissions';

let t: TestDb;
let prompt: typeof import('./system-prompt');
let guidance: typeof import('./guidance');
let suggest: typeof import('./suggest');
let menu: typeof import('@/lib/tools/menu');

before(async () => {
  t = await setupTestDb();
  prompt = await import('./system-prompt');
  guidance = await import('./guidance');
  suggest = await import('./suggest');
  menu = await import('@/lib/tools/menu');
});

after(async () => {
  await t.close();
});

const prepressOnly: PermissionMap = { prepress: 'work' };

test('the system prompt tells the model the employee’s areas and nothing more', () => {
  const text = prompt.stableSystemText('staff', prepressOnly);
  assert.match(text, /employee \(staff\)/);
  assert.match(text, /- Pre-press: Work \(Approve packs/);
  assert.doesNotMatch(text, /- Money:/);
  assert.doesNotMatch(text, /- Production:/);
  assert.match(text, /Never offer, suggest or describe anything outside it/);

  const none = prompt.stableSystemText('staff', {});
  assert.match(none, /no admin areas yet/);

  assert.match(prompt.stableSystemText('admin'), /talking to the MerchFrom owner/);
  const artist = prompt.stableSystemText('artist');
  assert.doesNotMatch(artist, /employee|owner has every admin area/);
});

test('the staff prompt is stable for the same access, so the prompt cache holds', () => {
  assert.equal(prompt.stableSystemText('staff', { production: 'view', prepress: 'work' }), prompt.stableSystemText('staff', { prepress: 'work', production: 'view' }));
  const blocks = prompt.buildSystemBlocks({ role: 'staff', permissions: prepressOnly, store: null, project: null, locale: 'en' });
  assert.equal(blocks[0].text, prompt.stableSystemText('staff', prepressOnly));
  assert.match(blocks[1].text, /Caller role: staff/);
});

test('home chips: the owner keeps the full set, an employee sees their own areas only', () => {
  const owner = guidance.quickActionsFor('admin', { role: 'admin' }).map((c) => c.label);
  assert.deepEqual(owner, ["What's waiting", 'Production queue', 'Waitlist', 'Payout anomalies']);

  const support = guidance.quickActionsFor('admin', { role: 'staff', permissions: PRESETS.support.permissions as PermissionMap }).map((c) => c.label);
  assert.deepEqual(support, ['Waitlist', 'Open tickets']);

  const prepress = guidance.quickActionsFor('admin', { role: 'staff', permissions: prepressOnly });
  assert.deepEqual(prepress, []);
  assert.deepEqual(guidance.quickActionsFor('admin'), [], 'staff with no access given: nothing');

  const production = guidance.quickActionsFor('admin', { role: 'staff', permissions: { production: 'view' } });
  assert.equal(production[0].primary, true);
  assert.ok(!production.some((c) => c.label === 'Payout anomalies'));
});

test('guidance treats staff like the owner: the admin state, no shop checklist', async () => {
  const session = {
    user: { id: '00000000-0000-4000-8000-000000000001', displayName: 'Ana Ruiz', email: 'ana@merchfrom.test' },
    store: null,
    role: 'staff' as const,
    actor: { userId: '00000000-0000-4000-8000-000000000001', role: 'staff' as const, permissions: { support: 'view' as const } },
  } as unknown as Parameters<typeof guidance.checklistFor>[0];
  const counts = await guidance.loadGuidanceCounts(session);
  assert.equal(guidance.guidanceStateFor(session, counts), 'admin');
  assert.equal(await guidance.checklistFor(session), null);
});

test('composer suggestions offer an employee only the admin prompts their access serves', async () => {
  const ctx = { role: 'staff' as const, state: 'admin' as const, permissions: { support: 'view' as const } };
  const texts = async (q: string, permissions: PermissionMap) => (await suggest.suggestFor(q, { ...ctx, permissions })).map((s) => s.text);
  assert.ok((await texts('show open', { support: 'view' })).includes('Show open support tickets'));
  assert.ok(!(await texts('show payout', { support: 'view' })).includes('Show payout anomalies'));
  assert.ok((await texts('show payout', { money: 'view' })).includes('Show payout anomalies'));
  assert.ok(!(await texts('show the admin', { support: 'view' })).includes('Show the admin queue'));
  assert.ok((await texts('show the admin', { production: 'view' })).includes('Show the admin queue'));
  // Artist prompts belong to tools the team doesn't have.
  assert.ok(!(await texts('approve the', { support: 'manage' })).includes('Approve the artwork'));
  assert.ok((await suggest.suggestFor('approve the', { role: 'artist', state: 'live' })).some((s) => s.text === 'Approve the artwork'));
  // A run keeps its proof; a shop product has none, so no suggestion offers one.
  const asked = (await suggest.suggestFor('proof', { role: 'artist', state: 'live' })).map((s) => s.text);
  assert.ok(asked.includes('Send the proof for my run') && asked.includes('Approve the proof for my run'));
  assert.ok(!asked.some((text) => /^(send|approve) (a|the) proof$|request changes to the proof/i.test(text)));

  const approve = (await suggest.suggestFor('approve', { ...ctx, permissions: { applications: 'view' } })).map((s) => s.text);
  assert.ok(!approve.includes('Approve waitlist entries'), 'approving needs Work');
  const canApprove = (await suggest.suggestFor('approve', { ...ctx, permissions: { applications: 'work' } })).map((s) => s.text);
  assert.ok(canApprove.includes('Approve waitlist entries'));

  const artist = (await suggest.suggestFor('show', { role: 'artist', state: 'live' })).map((s) => s.text);
  assert.ok(!artist.some((text) => /payout anomalies|admin queue|support tickets/.test(text)));

  const suspended = (await suggest.suggestFor('show open', { ...ctx, permissions: { support: 'manage' }, suspended: true })).map((s) => s.text);
  assert.ok(!suspended.includes('Show open support tickets'));
});

test('the "what can I do" menu lists only the employee’s areas', () => {
  const titles = (permissions: PermissionMap) => menu.teamMenuSections({ role: 'staff', permissions }).map((s) => s.title);
  assert.deepEqual(titles({ support: 'work' }), ['Support']);
  assert.deepEqual(titles(PRESETS.operations_lead.permissions as PermissionMap), ['Queue', 'Artists', 'Support', 'Money']);
  assert.deepEqual(titles({}), []);
  assert.deepEqual(
    menu.teamMenuSections({ role: 'admin' }).map((s) => s.title),
    ['Queue', 'Artists', 'Support', 'Money'],
  );
});
