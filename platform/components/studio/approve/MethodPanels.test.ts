import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MOCK_APPROVAL_VIEW } from '@/lib/print/mock-views';
import { ApproveSkeleton } from './ApproveSkeleton';
import { ScreenPanel, ShopPanel, WarningsPanel } from './MethodPanels';

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
  assert.match(read, /No surcharge\. On a run, each screen above 8 adds €1 per piece\./);
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

test('a view with no price note still says what extra screens cost', () => {
  const html = renderToStaticMarkup(createElement(ScreenPanel, { set: { ...darks, priceNote: '' }, garment: black }));
  assert.match(text(html), /On a run, each screen above 8 adds €1 per piece\./);
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
