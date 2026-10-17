import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MOCK_APPROVAL_VIEW } from '@/lib/print/mock-views';
import { ApproveSkeleton } from './ApproveSkeleton';
import type { ApprovalArea } from '@/lib/services/print-prep';
import { ScreenPanel, ShopPanel, WarningsPanel, type AreaScreenSet } from './MethodPanels';

const [darks, lights] = MOCK_APPROVAL_VIEW.screenSets;
const black = MOCK_APPROVAL_VIEW.garments[0];

/** The text a reader gets: tags and attributes (swatch colours live in style="") removed. */
function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

test('the runs panel names the set, the screen count, who shares it and the price effect', () => {
  const html = renderToStaticMarkup(createElement(ScreenPanel, { set: darks, garment: black }));
  const read = text(html);
  assert.match(read, /Runs · screen print · Darks/);
  assert.match(read, /6 screens, within the standard 8\./);
  assert.match(read, /Black and French Navy print from the same 6 screens, over a white underbase\./);
  assert.match(read, /6 colours: no surcharge\. On a run, each colour above 8 adds €1 per piece on each print position, up to 15 colours on a position\./);
});

test('the inks come in press order with their plain names, and only the whites explain themselves', () => {
  const html = renderToStaticMarkup(createElement(ScreenPanel, { set: darks, garment: black }));
  const names = [...html.matchAll(/<span class="ap-ink-name"><span>([^<]*)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(names, ['White underbase', 'Orchid pink', 'Violet', 'Indigo', 'Deep purple', 'Highlight white']);
  const numbers = [...html.matchAll(/<span class="ap-ink-n">(\d+)<\/span>/g)].map((match) => Number(match[1]));
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6]);
  const details = [...html.matchAll(/<span class="ap-ink-detail">([^<]*)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(details, ['Under the colours so they stay bright', 'The brightest points, printed last']);
});

test('the swatches are decoration: each ink is read by its name, in a real list', () => {
  const html = renderToStaticMarkup(createElement(ScreenPanel, { set: lights, garment: MOCK_APPROVAL_VIEW.garments[2] }));
  assert.match(html, /<ol class="ap-inks" role="list">/);
  assert.equal((html.match(/class="ap-ink-sw" aria-hidden="true"/g) ?? []).length, lights.inks.length);
});

test('no Pantone code reaches a client, on either set', () => {
  for (const set of MOCK_APPROVAL_VIEW.screenSets) {
    const read = text(renderToStaticMarkup(createElement(ScreenPanel, { set, garment: black })));
    assert.doesNotMatch(read, /pantone/i);
    assert.doesNotMatch(read, /\b\d{3,4}\s?[CUM]\b/);
  }
});

// The price line comes from the set's own screen count, whatever note the view carries.
const withScreens = (screenCount: number) => ({ ...darks, screenCount });
const priceLine = (set: typeof darks) => text(renderToStaticMarkup(createElement(ScreenPanel, { set, garment: black })));

test('the price line shows the colour count and its effect: nothing up to 8', () => {
  assert.match(priceLine(withScreens(1)), /1 colour: no surcharge\./);
  assert.match(priceLine(withScreens(6)), /6 colours: no surcharge\./);
  assert.match(priceLine(withScreens(8)), /8 colours: no surcharge\./);
  assert.doesNotMatch(priceLine(withScreens(8)), /ask in the chat/i);
});

test('above 8 the price line says what each extra colour adds, and how to bring it down', () => {
  assert.match(priceLine(withScreens(9)), /9 colours: \+€1\.00 per piece\./);
  assert.match(priceLine(withScreens(11)), /11 colours: \+€3\.00 per piece\./);
  assert.match(priceLine(withScreens(15)), /15 colours: \+€7\.00 per piece\./);
  const read = priceLine(withScreens(11));
  assert.match(read, /On a run, each colour above 8 adds €1 per piece on each print position, up to 15 colours on a position\./);
  assert.match(read, /The white underbase and highlight white count as colours\./);
  assert.match(read, /For fewer colours, ask in the chat: the look changes, and you approve the new proof again\./);
});

test('a note the view carries does not change the line: the count decides', () => {
  const stale = { ...withScreens(11), priceNote: 'No surcharge. On a run, each screen above 8 adds €1 per piece.' };
  assert.match(priceLine(stale), /11 colours: \+€3\.00 per piece\./);
  assert.doesNotMatch(priceLine(stale), /No surcharge\./);
});

test('the price line is plain text in the details column: no Pantone, no codes, and the effect leads', () => {
  for (const screens of [3, 8, 12]) {
    const read = priceLine(withScreens(screens));
    assert.doesNotMatch(read, /pantone/i);
    assert.ok(read.indexOf(`${screens} colours:`) > read.indexOf('Runs · screen print'), 'after the heading');
  }
});

// The surcharge is counted for each print position, on that position's own design (owner, 16 Oct 2026).
const area = (position: string, label: string, widthCm: number): ApprovalArea => ({ key: `${position}:${widthCm * 10}:0`, position, label, size: `${widthCm} × 30 cm`, widthCm, heightCm: 30, sleeve: position.startsWith('sleeve') });
const front = area('front_chest', 'Front chest', 28);
const back = area('back', 'Back', 32);
const setOf = (base: typeof darks, of: ApprovalArea, screenCount: number): AreaScreenSet => ({ ...base, areaKey: of.key, screenCount });
const perPosition = (frontScreens: number, backScreens: number, garment = black, base = darks) =>
  text(renderToStaticMarkup(createElement(ScreenPanel, { set: setOf(base, front, frontScreens), garment, sets: [setOf(base, front, frontScreens), setOf(base, back, backScreens)], areas: [front, back] })));

test("the owner's example: 10 colours on the back is +€2.00, the front at 10 too is +€2.00 more, €4.00 in all", () => {
  const read = perPosition(10, 10);
  assert.match(read, /Front chest · 10 colours: \+€2\.00 per piece\./);
  assert.match(read, /Back · 10 colours: \+€2\.00 per piece\./);
  assert.match(read, /Together these add €4\.00 to each piece\./);
  assert.match(read, /On a run, each colour above 8 adds €1 per piece on each print position/);
  assert.match(read, /For fewer colours, ask in the chat/);
  assert.ok(read.indexOf('Front chest · 10 colours') < read.indexOf('Back · 10 colours'), 'the front first');
});

test('each position counts alone: the front at 8 has no surcharge, the back at 10 has its own', () => {
  const read = perPosition(8, 10);
  assert.match(read, /Front chest · 8 colours: no surcharge\./);
  assert.match(read, /Back · 10 colours: \+€2\.00 per piece\./);
  assert.doesNotMatch(read, /Together/, 'only one position adds anything: nothing to add up');
  const none = perPosition(8, 6);
  assert.match(none, /Front chest · 8 colours: no surcharge\./);
  assert.match(none, /Back · 6 colours: no surcharge\./);
  assert.doesNotMatch(none, /ask in the chat|Together/);
  assert.match(perPosition(9, 15), /Front chest · 9 colours: \+€1\.00 per piece\.[^]*Back · 15 colours: \+€7\.00 per piece\.[^]*Together these add €8\.00 to each piece\./);
});

test('the lines are the chosen colour\'s: each position reads the set that prints that garment', () => {
  const white = MOCK_APPROVAL_VIEW.garments[2];
  const sets = [setOf(darks, front, 10), setOf(lights, front, 5), setOf(darks, back, 12), setOf(lights, back, 9)];
  const read = (garment: typeof black) => text(renderToStaticMarkup(createElement(ScreenPanel, { set: sets[0], garment, sets, areas: [front, back] })));
  assert.match(read(black), /Front chest · 10 colours: \+€2\.00 per piece\.[^]*Back · 12 colours: \+€4\.00 per piece\./);
  assert.match(read(white), /Front chest · 5 colours: no surcharge\.[^]*Back · 9 colours: \+€1\.00 per piece\./);
});

test('a position with no screens on this colour is left out; one with a refused count says so', () => {
  const only = text(renderToStaticMarkup(createElement(ScreenPanel, { set: setOf(darks, front, 10), garment: black, sets: [setOf(darks, front, 10)], areas: [front, back] })));
  assert.match(only, /Front chest · 10 colours: \+€2\.00 per piece\./);
  assert.doesNotMatch(only, /Back ·/);
  assert.match(perPosition(10, 16), /Back · 16 colours: more than the 15 we can print\./);
});

test('a page that cannot say which area a set is for still names the position when there is only one', () => {
  const one = text(renderToStaticMarkup(createElement(ScreenPanel, { set: withScreens(10), garment: black, areas: [front] })));
  assert.match(one, /Front chest · 10 colours: \+€2\.00 per piece\./);
  // with several areas and no way to tell, the one set on show stands alone, without a position
  const several = text(renderToStaticMarkup(createElement(ScreenPanel, { set: withScreens(10), garment: black, areas: [front, back] })));
  assert.match(several, /10 colours: \+€2\.00 per piece\./);
  assert.doesNotMatch(several, /Front chest ·|Back ·/);
});

test('the per-position lines are colour words only: no Pantone, no codes', () => {
  const read = perPosition(12, 12);
  assert.doesNotMatch(read, /pantone/i);
  assert.doesNotMatch(read, /\b\d{3,4}\s?[CUM]\b/);
});

test('a colour with no screen set says so, by name, instead of showing an empty list', () => {
  const html = renderToStaticMarkup(createElement(ScreenPanel, { set: null, garment: black }));
  assert.match(text(html), /The screen print version for Black is not ready yet\./);
  assert.doesNotMatch(html, /ap-inks/);
  assert.match(text(renderToStaticMarkup(createElement(ScreenPanel, { set: null, garment: null }))), /The screen print version is not ready yet\./);
});

test('the shop panel says how every product prints and lists the facts it was given', () => {
  const facts = MOCK_APPROVAL_VIEW.dtgFacts.C001;
  const html = renderToStaticMarkup(createElement(ShopPanel, { facts }));
  const read = text(html);
  assert.match(read, /Shop products · DTG\/DTF/);
  assert.match(read, /Every product in your shop prints this way: full colour with a white base, one piece at a time\./);
  assert.equal((html.match(/<li>/g) ?? []).length, facts.length);
  for (const fact of facts) assert.ok(read.includes(fact), fact);
});

test('worth a look lists each warning, and is absent when there is nothing to flag', () => {
  assert.equal(renderToStaticMarkup(createElement(WarningsPanel, { warnings: [] })), '');
  const html = renderToStaticMarkup(createElement(WarningsPanel, { warnings: MOCK_APPROVAL_VIEW.warnings }));
  assert.match(text(html), /Worth a look/);
  assert.equal((html.match(/<li>/g) ?? []).length, MOCK_APPROVAL_VIEW.warnings.length);
  // two identical warnings are both shown
  const twice = renderToStaticMarkup(createElement(WarningsPanel, { warnings: ['Same.', 'Same.'] }));
  assert.equal((twice.match(/<li>/g) ?? []).length, 2);
});

test('the loading skeleton announces itself once and hides its blocks from readers', () => {
  const html = renderToStaticMarkup(createElement(ApproveSkeleton));
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
  assert.match(html, /aria-label="Loading the proofs"/);
  assert.doesNotMatch(html, /<button|<a /);
});
