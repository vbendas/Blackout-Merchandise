import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ApprovalGarment, ApprovalView } from '@/lib/services/print-prep';
import { MOCK_APPROVAL_VIEW } from '@/lib/print/mock-views';
import {
  POLL_LIMIT_MS,
  TABS,
  approvalScope,
  barMeta,
  changesPrompt,
  chatHref,
  checkApprovable,
  cleanId,
  dtgFactsFor,
  joinNames,
  keepPolling,
  loupeAlt,
  parseTab,
  phaseOf,
  pickGarment,
  pickLoupe,
  pickProof,
  pickScreenSet,
  placementPosition,
  readableError,
  retryPrompt,
  techniqueOf,
} from './approve-logic';

const black: ApprovalGarment = { code: 'C002', name: 'Black', hex: '#1B1C1E', isLight: false, screenSetKey: 'darks' };
const white: ApprovalGarment = { code: 'C001', name: 'White', hex: '#F3F3F1', isLight: true, screenSetKey: 'lights' };

function view(patch: Partial<ApprovalView> = {}): ApprovalView {
  return { ...MOCK_APPROVAL_VIEW, ...patch };
}

test('shop products come first and are the default tab', () => {
  assert.deepEqual(
    TABS.map((tab) => tab.id),
    ['shop', 'runs'],
  );
  assert.equal(parseTab(undefined), 'shop');
  assert.equal(techniqueOf('shop'), 'dtg_dtf');
  assert.equal(techniqueOf('runs'), 'screen');
});

test('?tab= opens the runs tab for runs or screen, in any case, and nothing else', () => {
  assert.equal(parseTab('runs'), 'runs');
  assert.equal(parseTab(' Runs '), 'runs');
  assert.equal(parseTab('screen'), 'runs');
  assert.equal(parseTab(['runs', 'shop']), 'runs');
  assert.equal(parseTab('shop'), 'shop');
  assert.equal(parseTab('anything else'), 'shop');
  assert.equal(parseTab([]), 'shop');
});

test('ids from the address are word characters and dashes only', () => {
  assert.equal(cleanId('3f2a-91bc_7'), '3f2a-91bc_7');
  assert.equal(cleanId(' abc '), 'abc');
  assert.equal(cleanId(['abc', 'def']), 'abc');
  assert.equal(cleanId(''), null);
  assert.equal(cleanId(undefined), null);
  assert.equal(cleanId('a/b'), null);
  assert.equal(cleanId('a b'), null);
  assert.equal(cleanId('a'.repeat(101)), null);
});

test('the way back is the session the artist came from, else a fresh one', () => {
  assert.equal(chatHref('abc-123'), '/studio/s/abc-123');
  assert.equal(chatHref(null), '/studio');
  assert.equal(chatHref('a b/c'), '/studio/s/a%20b%2Fc');
});

test('a proof matches both the technique and the colour, never another colour', () => {
  const proofs = MOCK_APPROVAL_VIEW.proofs;
  assert.equal(pickProof(proofs, 'screen', 'C727')?.url.endsWith('proof-screen-navy.webp'), true);
  assert.equal(pickProof(proofs, 'dtg_dtf', 'C001')?.url.endsWith('proof-dtg-white.webp'), true);
  assert.equal(pickProof(proofs, 'screen', 'C999'), null);
  assert.equal(pickProof(proofs, 'screen', undefined), null);
  assert.equal(pickProof([], 'screen', 'C002'), null);
});

test('a loupe is the colour\'s own, else the technique\'s, else none', () => {
  const loupes = MOCK_APPROVAL_VIEW.loupes;
  assert.equal(pickLoupe(loupes, 'screen', 'C002')?.url.endsWith('loupe-screen-black.png'), true);
  // the mock draws one loupe per technique, on Black; White shows that one with its own caption
  const forWhite = pickLoupe(loupes, 'dtg_dtf', 'C001');
  assert.equal(forWhite?.url.endsWith('loupe-dtg-black.png'), true);
  assert.match(forWhite?.caption ?? '', /on Black/);
  assert.equal(pickLoupe([], 'screen', 'C002'), null);
  assert.equal(pickLoupe(loupes.filter((loupe) => loupe.technique === 'screen'), 'dtg_dtf', 'C002'), null);
});

test('the chosen colour falls back to the first one when it is gone', () => {
  assert.equal(pickGarment([black, white], 'C001'), white);
  assert.equal(pickGarment([black, white], 'C404'), black);
  assert.equal(pickGarment([black, white], null), black);
  assert.equal(pickGarment([], 'C001'), null);
});

test('a colour finds its screen set by key, then by the colours a set lists', () => {
  const sets = MOCK_APPROVAL_VIEW.screenSets;
  assert.equal(pickScreenSet(sets, black)?.key, 'darks');
  assert.equal(pickScreenSet(sets, white)?.key, 'lights');
  assert.equal(pickScreenSet(sets, { ...white, screenSetKey: null })?.key, 'lights');
  assert.equal(pickScreenSet(sets, { ...white, code: 'C777', screenSetKey: null }), null);
  assert.equal(pickScreenSet(sets, null), null);
  assert.equal(pickScreenSet([], black), null);
});

test('with a front and a back, the colour finds the set of the print area on show', () => {
  const [darks] = MOCK_APPROVAL_VIEW.screenSets;
  const front = { ...darks, areaKey: 'front_chest:280:0', screenCount: 10 };
  const back = { ...darks, areaKey: 'back:300:0', screenCount: 6 };
  assert.equal(pickScreenSet([front, back], black, 'back:300:0'), back);
  assert.equal(pickScreenSet([front, back], black, 'front_chest:280:0'), front);
  assert.equal(pickScreenSet([front, back], black), front, 'no area on show: the first');
  assert.equal(pickScreenSet([front, back], black, 'sleeve_left:90:0'), front, 'an area with no set of its own falls back to any set of the colour');
  assert.equal(pickScreenSet([darks], black, 'back:300:0'), darks, 'a set that names no area belongs to every area');
});

test('the DTG/DTF facts are the view\'s own, with a plain fallback for a colour that has none', () => {
  assert.deepEqual(dtgFactsFor({ C002: ['one', 'two'] }, black), ['one', 'two']);
  const dark = dtgFactsFor({}, black);
  const light = dtgFactsFor({ C001: [] }, white);
  assert.equal(dark.length, 4);
  assert.equal(light.length, 4);
  assert.match(dark[0], /left out/);
  assert.match(dark[2], /white ink/);
  assert.match(light[0], /removed/);
  assert.match(light[2], /no ink/);
  assert.equal(dtgFactsFor({}, null).length, 4);
});

test('names are joined the way the mock reads', () => {
  assert.equal(joinNames([]), '');
  assert.equal(joinNames(['Black']), 'Black');
  assert.equal(joinNames(['Black', 'White']), 'Black and White');
  assert.equal(joinNames(['Black', 'French Navy', 'White']), 'Black, French Navy and White');
});

test('the approval covers every garment colour on both methods', () => {
  assert.equal(
    approvalScope(MOCK_APPROVAL_VIEW.garments),
    'Approving covers both versions on Black, French Navy and White: DTG/DTF for your shop products, and screen print for runs.',
  );
  assert.equal(approvalScope([]), 'Approving covers both versions: DTG/DTF for your shop products, and screen print for runs.');
});

test('the top bar line is design, version and position', () => {
  assert.equal(placementPosition('Front · 28 × 33.6 cm'), 'Front');
  assert.equal(placementPosition('Left sleeve'), 'Left sleeve');
  assert.equal(barMeta(MOCK_APPROVAL_VIEW), 'Underwriter · Version 3 · Front');
});

test('the prompts name the design and its version, and stay short', () => {
  assert.equal(changesPrompt(MOCK_APPROVAL_VIEW), 'I want to change the artwork for Underwriter, version 3.');
  assert.equal(retryPrompt(MOCK_APPROVAL_VIEW), 'Prepare the print files for Underwriter, version 3, again.');
  const long = changesPrompt({ designName: 'x'.repeat(300), versionNumber: 1 });
  assert.ok(long.length < 140);
  assert.match(changesPrompt({ designName: '  ', versionNumber: 2 }), /this design, version 2/);
});

test('only a sentence is shown as an error; a code becomes the plain fallback', () => {
  assert.equal(readableError('A newer version is ready.'), 'A newer version is ready.');
  assert.equal(readableError('not_found'), 'That did not go through. Please try again.');
  assert.equal(readableError(undefined), 'That did not go through. Please try again.');
});

test('the loupe alt text says what it shows', () => {
  assert.match(loupeAlt('screen'), /screen print/);
  assert.match(loupeAlt('dtg_dtf'), /DTG/);
});

test('the phase follows the view, and an approval made here counts at once', () => {
  assert.equal(phaseOf({ status: 'preparing', approvedAt: null }), 'preparing');
  assert.equal(phaseOf({ status: 'failed', approvedAt: null }), 'failed');
  assert.equal(phaseOf({ status: 'ready', approvedAt: null }), 'ready');
  assert.equal(phaseOf({ status: 'ready', approvedAt: null }, true), 'approved');
  assert.equal(phaseOf({ status: 'approved', approvedAt: '2026-10-15T10:00:00.000Z' }), 'approved');
  // a newer version still rendering is not approved, whatever happened before
  assert.equal(phaseOf({ status: 'preparing', approvedAt: null }, true), 'preparing');
});

test('the page only polls while the proofs render, and gives up after ten minutes', () => {
  assert.equal(keepPolling('preparing', 0), true);
  assert.equal(keepPolling('preparing', POLL_LIMIT_MS - 1), true);
  assert.equal(keepPolling('preparing', POLL_LIMIT_MS), false);
  assert.equal(keepPolling('ready', 0), false);
  assert.equal(keepPolling('failed', 0), false);
  assert.equal(keepPolling('approved', 0), false);
});

test('approve: the version on screen, once the proofs are ready', () => {
  assert.deepEqual(checkApprovable(view(), 'mock-version-3'), { ok: true, already: false });
});

test('approve: a second click on an approved version is fine', () => {
  assert.deepEqual(checkApprovable(view({ status: 'approved', approvedAt: '2026-10-15T10:00:00.000Z', canApprove: false }), 'mock-version-3'), { ok: true, already: true });
});

test('approve: refuses another version than the one that was shown', () => {
  const result = checkApprovable(view(), 'mock-version-2');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /newer version/);
});

test('approve: refuses a missing design, proofs still rendering, a failed run and a blocked version', () => {
  const missing = checkApprovable(null, 'mock-version-3');
  assert.deepEqual(missing, { ok: false, error: 'We could not find this artwork.' });

  const preparing = checkApprovable(view({ status: 'preparing', canApprove: false }), 'mock-version-3');
  assert.equal(preparing.ok, false);
  if (!preparing.ok) assert.match(preparing.error, /still being prepared/);

  const failed = checkApprovable(view({ status: 'failed', canApprove: false }), 'mock-version-3');
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.match(failed.error, /could not be prepared/);

  const blocked = checkApprovable(view({ canApprove: false }), 'mock-version-3');
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.error, /cannot be approved yet/);
});

test('every refusal reads as a sentence, so the page shows it as it is', () => {
  const refusals = [
    checkApprovable(null, 'x'),
    checkApprovable(view(), 'other'),
    checkApprovable(view({ status: 'preparing' }), 'mock-version-3'),
    checkApprovable(view({ status: 'failed' }), 'mock-version-3'),
    checkApprovable(view({ canApprove: false }), 'mock-version-3'),
  ];
  for (const refusal of refusals) {
    assert.equal(refusal.ok, false);
    if (!refusal.ok) assert.equal(readableError(refusal.error), refusal.error);
  }
});

test('the sample view gives every colour a proof on both tabs and the runs tab a set per colour', () => {
  for (const garment of MOCK_APPROVAL_VIEW.garments) {
    for (const tab of TABS) {
      assert.ok(pickProof(MOCK_APPROVAL_VIEW.proofs, tab.technique, garment.code), `${garment.name} has a ${tab.id} proof`);
      assert.ok(pickLoupe(MOCK_APPROVAL_VIEW.loupes, tab.technique, garment.code), `${garment.name} has a ${tab.id} loupe`);
    }
    assert.ok(pickScreenSet(MOCK_APPROVAL_VIEW.screenSets, garment), `${garment.name} has a screen set`);
    assert.ok(dtgFactsFor(MOCK_APPROVAL_VIEW.dtgFacts, garment).length > 0);
  }
});

test('colours print by name only: no Pantone code reaches the page', () => {
  for (const set of MOCK_APPROVAL_VIEW.screenSets) {
    for (const ink of set.inks) assert.doesNotMatch(`${ink.name} ${ink.detail}`, /pantone|\b\d{3,4}\s?[CUM]\b/i);
  }
});
