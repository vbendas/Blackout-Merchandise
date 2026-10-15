import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  backHref,
  cleanSearch,
  extraScreenCents,
  filmsSharedNote,
  formatBytes,
  formatEuros,
  formatHistoryTime,
  formatStamp,
  formatWaiting,
  isReplaced,
  joinNames,
  parseHex,
  parseTab,
  queueHref,
  replacementTab,
  surchargeNote,
} from './format';
import type { PackTab } from '@/lib/services/prepress';

const NOW = new Date('2026-10-15T14:00:00Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

test('waiting time reads in minutes, hours and days', () => {
  assert.equal(formatWaiting(minutesAgo(0), NOW), 'Just now');
  assert.equal(formatWaiting(minutesAgo(40), NOW), '40 min');
  assert.equal(formatWaiting(minutesAgo(120), NOW), '2 h');
  assert.equal(formatWaiting(minutesAgo(5 * 60 + 30), NOW), '5 h');
  assert.equal(formatWaiting(minutesAgo(24 * 60), NOW), '1 d');
  assert.equal(formatWaiting(minutesAgo(3 * 24 * 60 + 600), NOW), '3 d');
});

test('waiting time never goes negative and survives a bad date', () => {
  assert.equal(formatWaiting(new Date(NOW.getTime() + 60_000).toISOString(), NOW), 'Just now');
  assert.equal(formatWaiting('not a date', NOW), '–');
});

test('history times are shown in the shop’s time zone', () => {
  // 11:40 UTC on 15 Oct 2026 is 13:40 in Barcelona (summer time).
  assert.equal(formatHistoryTime('2026-10-15T11:40:00Z', NOW), '13:40');
  assert.equal(formatHistoryTime('2026-10-13T11:40:00Z', NOW), '13 Oct, 13:40');
  assert.equal(formatHistoryTime('nonsense', NOW), '');
});

test('the day rolls over at midnight in Barcelona, not at midnight UTC', () => {
  // 22:30 UTC on the 14th is 00:30 on the 15th in Barcelona: the same day as NOW there.
  assert.equal(formatHistoryTime('2026-10-14T22:30:00Z', NOW), '00:30');
});

test('a stamp has the day and the time', () => {
  assert.equal(formatStamp('2026-10-15T09:20:00Z'), '15 Oct, 11:20');
  assert.equal(formatStamp('nope'), '');
});

test('the tab comes from a known list, else waiting', () => {
  assert.equal(parseTab('approved'), 'approved');
  assert.equal(parseTab(['sent_back', 'approved']), 'sent_back');
  assert.equal(parseTab('everything'), 'waiting');
  assert.equal(parseTab(undefined), 'waiting');
});

test('the search is one trimmed line of at most 80 characters', () => {
  assert.equal(cleanSearch('  under   writer \n'), 'under writer');
  assert.equal(cleanSearch(undefined), '');
  assert.equal(cleanSearch(['a', 'b']), 'a');
  assert.equal(cleanSearch('x'.repeat(200)).length, 80);
});

test('queue addresses leave out the defaults', () => {
  assert.equal(queueHref('waiting', ''), '/admin/prepress');
  assert.equal(queueHref('approved', ''), '/admin/prepress?tab=approved');
  assert.equal(queueHref('waiting', 'crow & moon'), '/admin/prepress?q=crow+%26+moon');
  assert.equal(queueHref('sent_back', 'crow'), '/admin/prepress?tab=sent_back&q=crow');
});

test('back from a pack goes to the tab it sits in', () => {
  assert.equal(backHref('approved'), '/admin/prepress?tab=approved');
  assert.equal(backHref('waiting'), '/admin/prepress');
  assert.equal(backHref('idle'), '/admin/prepress');
});

test('names join the way people say them', () => {
  assert.equal(joinNames([]), '');
  assert.equal(joinNames(['White']), 'White');
  assert.equal(joinNames(['Black', 'French Navy']), 'Black and French Navy');
  assert.equal(joinNames(['Black', 'French Navy', 'White']), 'Black, French Navy and White');
});

test('the films note says which garments print from them', () => {
  assert.equal(filmsSharedNote(['Black', 'French Navy'], 6), 'Black and French Navy print from these 6 screens.');
  assert.equal(filmsSharedNote(['White'], 5), 'White prints from these 5 screens.');
  assert.equal(filmsSharedNote([], 5), '');
});

test('screens above 8 cost €1 per piece each', () => {
  assert.equal(extraScreenCents(6), 0);
  assert.equal(extraScreenCents(8), 0);
  assert.equal(extraScreenCents(9), 100);
  assert.equal(extraScreenCents(12), 400);
  assert.equal(extraScreenCents(15), 700);
});

test('euros drop the cents when there are none', () => {
  assert.equal(formatEuros(400), '€4');
  assert.equal(formatEuros(450), '€4.50');
});

test('the surcharge note names the price only past 8 screens', () => {
  assert.equal(
    surchargeNote(6),
    'On a run, each screen above 8 adds €1 per piece. The artist is asked again only if the proof changes.',
  );
  assert.match(surchargeNote(12), /^12 screens add €4 per piece on a run\. On a run, each screen above 8/);
});

test('hex colours are tidied or refused', () => {
  assert.equal(parseHex('#c363da'), '#C363DA');
  assert.equal(parseHex('c363da'), '#C363DA');
  assert.equal(parseHex(' #abc '), '#AABBCC');
  assert.equal(parseHex('#12345'), null);
  assert.equal(parseHex('violet'), null);
});

test('byte sizes read plainly', () => {
  assert.equal(formatBytes(2048), '2 kB');
  assert.equal(formatBytes(340 * 1024 ** 2), '340 MB');
  assert.equal(formatBytes(1.5 * 1024 ** 3), '1.5 GB');
});

const tab = (packId: string, label: string, technique: PackTab['technique'], current = false): PackTab => ({ packId, label, technique, current });

test('a built pack that is not among its own tabs has been replaced', () => {
  const tabs = [tab('a', 'Screen · Darks · 6', 'screen', true), tab('b', 'DTG/DTF · 3 files', 'dtg_dtf')];
  assert.equal(isReplaced({ buildStatus: 'ready', tabs }), false);
  assert.equal(isReplaced({ buildStatus: 'ready', tabs: tabs.map((entry) => ({ ...entry, current: false })) }), true);
});

test('a pack still building or failed is not "replaced", though no tab is its own', () => {
  const tabs = [tab('b', 'DTG/DTF · 3 files', 'dtg_dtf')];
  assert.equal(isReplaced({ buildStatus: 'building', tabs }), false);
  assert.equal(isReplaced({ buildStatus: 'failed', tabs }), false);
});

test('with no tabs at all nothing is called replaced', () => {
  assert.equal(isReplaced({ buildStatus: 'ready', tabs: [] }), false);
});

test('the replacement is the only tab of that technique', () => {
  const tabs = [tab('new', 'Screen · Darks · 7', 'screen'), tab('dtg', 'DTG/DTF · 3 files', 'dtg_dtf')];
  assert.equal(replacementTab(tabs, 'screen', 'darks')?.packId, 'new');
  assert.equal(replacementTab(tabs, 'dtg_dtf', null)?.packId, 'dtg');
});

test('with two screen sets the replacement is the one with the same set', () => {
  const tabs = [tab('d', 'Screen · Darks · 7', 'screen'), tab('l', 'Screen · Lights · 5', 'screen')];
  assert.equal(replacementTab(tabs, 'screen', 'lights')?.packId, 'l');
  assert.equal(replacementTab(tabs, 'screen', 'DARKS')?.packId, 'd');
});

test('when the replacement can’t be told, there is none', () => {
  const tabs = [tab('d', 'Screen · Darks · 7', 'screen'), tab('l', 'Screen · Lights · 5', 'screen')];
  assert.equal(replacementTab(tabs, 'screen', null), null);
  assert.equal(replacementTab(tabs, 'screen', 'sand'), null);
  assert.equal(replacementTab([], 'screen', 'darks'), null);
  assert.equal(replacementTab(tabs, 'dtg_dtf', null), null);
});
