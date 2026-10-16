// The plots on the calibration page, drawn to static markup: what a screen reader and the page's own text rely on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CurvePlot } from './CurvePlot';

const render = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

test('a plot says what it shows in words, and draws each line and reading', () => {
  const html = render(
    h(CurvePlot, {
      title: 'What the press does',
      description: 'At 50% on the film the press prints 68%.',
      xLabel: 'Coverage on the film (%)',
      yLabel: 'Coverage printed (%)',
      lines: [
        { id: 'linear', label: 'No dot gain', fn: (x: number) => x, style: 'dotted' },
        { id: 'new', label: 'This measurement', fn: (x: number) => x + 0.7 * x * (1 - x), style: 'main' },
      ],
      readings: [
        { input: 0.25, printed: 0.4 },
        { input: 0.5, printed: 0.675 },
      ],
    }),
  );
  assert.match(html, /role="img"/);
  assert.match(html, /<title id="what-the-press-does-t">What the press does<\/title>/);
  assert.match(html, /<desc id="what-the-press-does-d">At 50% on the film the press prints 68%\.<\/desc>/);
  assert.match(html, /aria-labelledby="what-the-press-does-t what-the-press-does-d"/);
  assert.equal((html.match(/<path /g) ?? []).length, 2, 'one path for each line');
  assert.match(html, /data-style="dotted"/);
  assert.match(html, /data-style="main"/);
  assert.equal((html.match(/class="cal-reading"/g) ?? []).length, 3, 'two readings and the legend’s sample');
  for (const text of ['Coverage on the film (%)', 'Coverage printed (%)', 'No dot gain', 'This measurement', 'Readings']) assert.ok(html.includes(text), text);
  // 0, 25, 50, 75 and 100 on both axes
  for (const tick of ['>0<', '>25<', '>50<', '>75<', '>100<']) assert.ok(html.includes(tick), tick);
});

test('a line is clipped to the plot even if the curve strays, and a plot with no readings has no legend entry for them', () => {
  const html = render(
    h(CurvePlot, { title: 'Stray', description: 'd', xLabel: 'x', yLabel: 'y', lines: [{ id: 'a', label: 'A', fn: (x: number) => x * 3 - 1, style: 'main' }] }),
  );
  const d = /<path d="([^"]+)"/.exec(html)?.[1] ?? '';
  const ys = [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(ys.length > 50);
  assert.ok(ys.every((y) => y >= 12 - 1e-6 && y <= 360 - 38 + 1e-6), 'every point is inside the frame');
  assert.doesNotMatch(html, /Readings/);
});
