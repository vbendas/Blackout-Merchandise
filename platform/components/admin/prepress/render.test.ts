// What the pages that only show things say, rendered to static HTML. The pieces
// with state and actions (header, films and inks, run again) need the Next router
// and server actions, so they are checked in the browser instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PackTab, PrepressQueueRow } from '@/lib/services/prepress';
import { CheckList, DtgPack, EngineChoices, HistoryList, PackBanners } from './PackSections';
import { PrintImage } from './PrintImage';
import { QueueTable } from './QueueTable';
import { TabNav } from './TabNav';

const NOW = new Date('2026-10-15T14:00:00Z');
const render = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

const row = (over: Partial<PrepressQueueRow> = {}): PrepressQueueRow => ({
  packId: 'pack-1',
  designName: 'Underwriter · v3',
  shopName: 'Underwriter band shop',
  thumbUrl: '/thumb.webp',
  initials: 'UW',
  fileLabel: 'Screen print · Darks',
  garmentsLabel: 'Black, French Navy',
  screensLabel: '6 of 8',
  methodLabel: 'Simulated process',
  checks: { state: 'review', label: '2 to review' },
  neededForLabel: 'Run 2 · 120 pieces',
  waitingSince: new Date(NOW.getTime() - 2 * 3_600_000).toISOString(),
  auditStatus: 'waiting',
  ...over,
});

// ---------------------------------------------------------------------------
// The queue
// ---------------------------------------------------------------------------

test('the queue shows each pack with a way in', () => {
  const html = render(h(QueueTable, { rows: [row()], tab: 'waiting', search: '', now: NOW }));
  assert.match(html, /Underwriter · v3/);
  assert.match(html, /Underwriter band shop/);
  assert.match(html, /Screen print · Darks/);
  assert.match(html, /Black, French Navy/);
  assert.match(html, /6 of 8/);
  assert.match(html, /Simulated process/);
  assert.match(html, /2 to review/);
  assert.match(html, /Run 2 · 120 pieces/);
  assert.match(html, /href="\/admin\/prepress\/pack-1"/);
  // the link says which pack it opens, for a screen reader
  assert.match(html, /Open<span class="sr-only"> Underwriter · v3, Screen print · Darks<\/span>/);
});

test('an open pack counts how long it has waited', () => {
  const html = render(h(QueueTable, { rows: [row()], tab: 'waiting', search: '', now: NOW }));
  assert.match(html, /<th scope="col">Waiting<\/th>/);
  assert.match(html, /<time dateTime="[^"]+">2 h<\/time>/);
});

test('a pack that is done says where it ended up, not a running count', () => {
  const html = render(h(QueueTable, { rows: [row({ auditStatus: 'approved' })], tab: 'approved', search: '', now: NOW }));
  assert.match(html, /<th scope="col">Status<\/th>/);
  assert.match(html, />Approved</);
  assert.doesNotMatch(html, /<time/);
});

test('the check summary carries its state for the dot', () => {
  const states = (['passed', 'review', 'failed'] as const).map((state) => render(h(QueueTable, { rows: [row({ checks: { state, label: state } })], tab: 'waiting', search: '', now: NOW })));
  assert.match(states[0], /data-state="passed"/);
  assert.match(states[1], /data-state="review"/);
  assert.match(states[2], /data-state="failed"/);
});

test('a design with no thumbnail shows its initials', () => {
  const html = render(h(QueueTable, { rows: [row({ thumbUrl: null, initials: 'TW' })], tab: 'waiting', search: '', now: NOW }));
  assert.match(html, /pp-thumb-initials[^>]*>TW</);
  assert.doesNotMatch(html, /<img/);
});

test('an empty queue says what that tab is for', () => {
  assert.match(render(h(QueueTable, { rows: [], tab: 'waiting', search: '', now: NOW })), /Nothing is waiting\. A pack arrives here when the first order needs it\./);
  assert.match(render(h(QueueTable, { rows: [], tab: 'approved', search: '', now: NOW })), /No packs have been approved yet\./);
  assert.match(render(h(QueueTable, { rows: [], tab: 'sent_back', search: '', now: NOW })), /No packs have been sent back\./);
});

test('an empty search says so, and what was searched for is escaped', () => {
  const html = render(h(QueueTable, { rows: [], tab: 'waiting', search: '<b>crow</b>', now: NOW }));
  assert.match(html, /No packs match “&lt;b&gt;crow&lt;\/b&gt;”\./);
  assert.doesNotMatch(html, /<b>/);
});

test('the table scrolls as a labelled, focusable region', () => {
  const html = render(h(QueueTable, { rows: [row()], tab: 'waiting', search: '', now: NOW }));
  assert.match(html, /role="region" aria-label="Pre-press queue" tabindex="0"/);
});

test('tabs are links, and the current one says so', () => {
  const html = render(
    h(TabNav, {
      label: 'Pack status',
      items: [
        { href: '/admin/prepress', label: 'Waiting', count: 5, current: true },
        { href: '/admin/prepress?tab=approved', label: 'Approved', count: null, current: false },
      ],
    }),
  );
  assert.match(html, /<nav aria-label="Pack status"/);
  assert.match(html, /aria-current="page"[^>]*>Waiting · 5</);
  assert.match(html, /href="\/admin\/prepress\?tab=approved"[^>]*>Approved</);
  assert.equal((html.match(/aria-current/g) ?? []).length, 1);
});

// ---------------------------------------------------------------------------
// A pack's sections
// ---------------------------------------------------------------------------

test('checks name their state in words', () => {
  const html = render(
    h(CheckList, {
      headingId: 'c',
      checks: [
        { id: 'size', title: 'Size', state: 'passed', detail: 'Fine.' },
        { id: 'features', title: 'Fine lines', state: 'review', detail: 'Some are thin.' },
        { id: 'proof', title: 'Proof', state: 'failed', detail: 'Differs.' },
      ],
    }),
  );
  assert.match(html, /data-state="passed"[^>]*><span class="pp-check-state">Passed</);
  assert.match(html, /data-state="review"[^>]*><span class="pp-check-state">Review</);
  assert.match(html, /data-state="failed"[^>]*><span class="pp-check-state">Failed</);
  assert.match(html, /Some are thin\./);
});

test('no checks says none have run', () => {
  assert.match(render(h(CheckList, { headingId: 'c', checks: [] })), /No checks have run on this pack yet\./);
});

test('the engine’s choices are laid out with their reasons', () => {
  const html = render(
    h(EngineChoices, {
      headingId: 'e',
      engine: {
        method: 'Simulated process',
        methodReason: 'Soft shading runs through most of the art.',
        screensWhy: '6 of 8: underbase, 4 colours, highlight white.',
        underbase: 'Aquaflex V2 White, choked 0.2 mm, then flash.',
        order: 'Underbase, flash, colours, highlight white last.',
        screenSets: 'Black and French Navy share one set.',
      },
    }),
  );
  assert.match(html, /Simulated process\. Soft shading runs through most of the art\./);
  assert.match(html, /Screen sets/);
  assert.match(html, /Black and French Navy share one set\./);
});

test('history shows times in the shop’s zone, and nothing when there is none', () => {
  const html = render(
    h(HistoryList, {
      headingId: 'h',
      now: NOW,
      history: [
        { at: '2026-10-15T11:40:00Z', text: 'Pack generated.' },
        { at: '2026-10-13T11:40:00Z', text: 'Artist approved version 3.' },
      ],
    }),
  );
  assert.match(html, />13:40<\/time>Pack generated\./);
  assert.match(html, />13 Oct, 13:40<\/time>Artist approved version 3\./);
  assert.equal(render(h(HistoryList, { headingId: 'h', now: NOW, history: [] })), '');
});

const file = (over: Partial<Parameters<typeof DtgPack>[0]['files'][number]> = {}) => ({
  garmentCode: 'C002',
  garmentName: 'On Black',
  fileName: 'UNDERWRITER-v3-FRONT-on-black.png',
  proofUrl: '/proof.webp',
  downloadUrl: '/api/print-files/x.png',
  note: 'Black left out.',
  ...over,
});

test('the DTG tab has a proof, a file name and a download for each garment colour', () => {
  const html = render(h(DtgPack, { files: [file(), file({ garmentCode: 'C001', garmentName: 'On White', fileName: 'on-white.png' })], loupeUrl: '/loupe.png', checks: [] }));
  assert.match(html, /UNDERWRITER-v3-FRONT-on-black\.png/);
  assert.match(html, /href="\/api\/print-files\/x\.png" download="UNDERWRITER-v3-FRONT-on-black\.png"/);
  assert.match(html, /Download PNG<span class="sr-only"> for On White<\/span>/);
  assert.match(html, /True size · fades as dots/);
});

test('a DTG file whose link couldn’t be made says it isn’t ready, with no broken link', () => {
  const html = render(h(DtgPack, { files: [file({ downloadUrl: '' })], loupeUrl: null, checks: [] }));
  assert.match(html, /The PNG isn’t ready yet/);
  assert.doesNotMatch(html, /download=/);
  assert.doesNotMatch(html, /True size/);
});

test('a DTG pack with no files says so', () => {
  assert.match(render(h(DtgPack, { files: [], loupeUrl: null, checks: [] })), /No files have been made for this pack yet\./);
});

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

const banners = (over: Partial<Parameters<typeof PackBanners>[0]> = {}) =>
  render(h(PackBanners, { packId: 'p', auditStatus: 'waiting', buildStatus: 'ready', canWork: true, ...over }));

test('a waiting pack that is built has no banner', () => {
  assert.equal(banners(), '<div class="pp-banners"></div>');
});

test('an approved pack says production can go ahead', () => {
  assert.match(banners({ auditStatus: 'approved' }), /Pack approved\. Production can go ahead with these files\./);
});

test('the approved banner offers Undo to Work access only', () => {
  const undo = h('button', { type: 'button' }, 'Undo');
  assert.match(banners({ auditStatus: 'approved', undoApproval: undo }), /<button type="button">Undo<\/button>/);
  assert.doesNotMatch(banners({ auditStatus: 'approved', undoApproval: undo, canWork: false }), /Undo/);
  assert.doesNotMatch(banners({ auditStatus: 'waiting', undoApproval: undo }), /Undo/);
});

test('a pack sent back says it can’t be used until approved again', () => {
  assert.match(banners({ auditStatus: 'sent_back' }), /Sent back to the artist\.[\s\S]*can’t use this pack until it is approved again/);
});

test('a pack still building says the page keeps checking', () => {
  assert.match(banners({ buildStatus: 'building' }), /still being built[\s\S]*This page keeps checking/);
});

test('a failed pack points to run again for someone who can, and to someone who can for someone who can’t', () => {
  assert.match(banners({ buildStatus: 'failed', canWork: true }), /couldn’t be built[\s\S]*Run it again below/);
  assert.match(banners({ buildStatus: 'failed', canWork: false }), /Someone with Work access can run it again/);
});

const tab = (packId: string): PackTab => ({ packId, label: 'Screen · Darks · 7', technique: 'screen', current: false });

test('a replaced pack points to the newer one, or to the queue when that can’t be told', () => {
  const withNewer = banners({ replaced: true, replacedBy: tab('new-pack') });
  assert.match(withNewer, /A newer pack replaced this one\./);
  assert.match(withNewer, /href="\/admin\/prepress\/new-pack"[^>]*>Open the newer pack</);

  const withoutNewer = banners({ replaced: true, replacedBy: null });
  assert.match(withoutNewer, /href="\/admin\/prepress\?tab=being_fixed"[^>]*>Open the queue</);
});

// ---------------------------------------------------------------------------
// Smaller pieces
// ---------------------------------------------------------------------------

test('an image with a link is an image; one without is a quiet box, not a broken picture', () => {
  assert.match(render(h(PrintImage, { src: '/a.webp', alt: 'A proof' })), /<img src="\/a\.webp" alt="A proof" loading="lazy"/);

  const missing = render(h(PrintImage, { src: '', alt: 'A proof' }));
  assert.doesNotMatch(missing, /<img/);
  assert.match(missing, /role="img" aria-label="A proof \(not available\)"/);

  const decorative = render(h(PrintImage, { src: '', alt: '' }));
  assert.match(decorative, /aria-hidden="true"/);
  assert.doesNotMatch(decorative, /role="img"/);
});
