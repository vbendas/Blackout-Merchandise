// The counters of the stations: the quick buttons, "all", an exact number from the keypad, how a
// count is held between 0 and its total, and how changes on their way to the server are laid over
// what the server last said.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProgressLine, ScreenProgress, StationJobDetail } from '@/lib/services/production-progress';
import { allCount, applyDelta, clampCount, keypadCount, KEYPAD_KEYS, pressKey, QUICK_STEPS, remaining, stepChanges, type KeypadKey } from './counter';
import { applyOps, type Op } from './ops';

test('a count is a whole number from 0 to the total: anything outside is held at the nearest end', () => {
  assert.equal(clampCount(5, 60), 5);
  assert.equal(clampCount(-3, 60), 0);
  assert.equal(clampCount(61, 60), 60);
  assert.equal(clampCount(12.4, 60), 12);
  assert.equal(clampCount(12.6, 60), 13);
  assert.equal(clampCount(Number.NaN, 60), 0);
  assert.equal(clampCount(Number.POSITIVE_INFINITY, 60), 0, 'not a number it can use');
  assert.equal(clampCount(7, 0), 0, 'a line of none holds none');
  assert.equal(clampCount(7, -4), 0);
});

test('the quick buttons add and take one, five and ten, and stop at 0 and at the total', () => {
  assert.deepEqual([...QUICK_STEPS], [-1, 1, 5, 10]);
  assert.equal(applyDelta(12, 1, 60), 13);
  assert.equal(applyDelta(12, 5, 60), 17);
  assert.equal(applyDelta(12, 10, 60), 22);
  assert.equal(applyDelta(12, -1, 60), 11);
  assert.equal(applyDelta(0, -1, 60), 0, 'nothing below none');
  assert.equal(applyDelta(58, 5, 60), 60, 'nothing above the total');
  assert.equal(applyDelta(60, 10, 60), 60);
  assert.equal(applyDelta(3, Number.NaN, 60), 3, 'a step that is not a number changes nothing');
  assert.equal(applyDelta(70, 0, 60), 60, 'a count the server held above the total reads as the total');
});

test('a button is off when its step would change nothing', () => {
  assert.equal(stepChanges(0, -1, 60), false);
  assert.equal(stepChanges(1, -1, 60), true);
  assert.equal(stepChanges(60, 1, 60), false);
  assert.equal(stepChanges(59, 1, 60), true);
  assert.equal(stepChanges(59, 10, 60), true, 'a step that only gets part of the way still counts');
  assert.equal(stepChanges(0, 1, 0), false, 'a line of none has no step');
});

test('"all" is the whole line, and what is left is the total less what is printed', () => {
  assert.equal(allCount(60), 60);
  assert.equal(allCount(0), 0);
  assert.equal(remaining(12, 60), 48);
  assert.equal(remaining(60, 60), 0);
  assert.equal(remaining(75, 60), 0);
});

test('the keypad types a number: digits only, no leading zero, never more than the total', () => {
  const type = (keys: KeypadKey[], total = 60) => keys.reduce((text, key) => pressKey(text, key, total), '');
  assert.equal(type(['4', '2']), '42');
  assert.equal(type(['0']), '0');
  assert.equal(type(['0', '0', '7']), '7', 'zeros before a number are dropped');
  assert.equal(type(['9', '9']), '60', 'typing past the total shows the total');
  assert.equal(type(['6', '0', '0']), '60');
  assert.equal(type(['1', '2', 'back']), '1');
  assert.equal(type(['back']), '', 'nothing to take from');
  assert.equal(type(['4', '2', 'clear']), '');
  assert.equal(type(['5'], 0), '0', 'a line of none takes only none');
  assert.deepEqual(KEYPAD_KEYS, ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']);
});

test('the number typed is what gets set; nothing typed sets nothing', () => {
  assert.equal(keypadCount('', 60), null);
  assert.equal(keypadCount('0', 60), 0, 'zero is a count: it puts a line back to none');
  assert.equal(keypadCount('37', 60), 37);
  assert.equal(keypadCount('999', 60), 60);
});

// ---------------------------------------------------------------------------
// Changes on their way

const line = (key: string, size: string, total: number, printed: number): ProgressLine => ({ key, orderRef: 'Run 2', blankName: 'Classic tee', colourName: 'Black', size, total, printed, position: 'Front chest · 28 cm', flag: null });
const screen = (n: number, status: ScreenProgress['status']): ScreenProgress => ({ key: `pack:${n}`, setName: 'Darks', position: `${n}/3`, inkName: `Ink ${n}`, status, packId: 'pack', filmNumber: n });

function job(overrides: Partial<StationJobDetail> = {}): StationJobDetail {
  return {
    jobId: 'job-1',
    designId: 'design-1',
    designTitle: 'Underwriter · v3',
    shopName: 'Band shop',
    method: 'screen',
    stage: 'printing',
    total: 100,
    printed: 30,
    screensReady: 1,
    screensTotal: 3,
    updatedAt: '2026-10-16T09:00:00.000Z',
    hiddenFromBoard: false,
    flaggedLines: 0,
    canWork: true,
    lines: [line('a', 'S', 20, 20), line('b', 'M', 80, 10)],
    screens: [screen(1, 'screen_ready'), screen(2, 'film_printed'), screen(3, 'waiting')],
    jobSheetUrl: '/api/job-sheets/design-1',
    ...overrides,
  };
}

let seq = 0;
const adjust = (lineKey: string, delta: number): Op => ({ id: ++seq, kind: 'adjust', lineKey, delta });
const set = (lineKey: string, value: number): Op => ({ id: ++seq, kind: 'set', lineKey, value });
const screenOp = (screenKey: string, status: ScreenProgress['status']): Op => ({ id: ++seq, kind: 'screen', screenKey, status });
const stageOp = (stage: StationJobDetail['stage']): Op => ({ id: ++seq, kind: 'stage', stage });
const hiddenOp = (hidden: boolean): Op => ({ id: ++seq, kind: 'hidden', hidden });

test('with nothing pending the job is the server’s own', () => {
  const server = job();
  assert.equal(applyOps(server, []), server);
});

test('a tap shows at once: the line, the job’s printed count and nothing else move', () => {
  const server = job();
  const shown = applyOps(server, [adjust('b', 5)]);
  assert.equal(shown.lines[1].printed, 15);
  assert.equal(shown.lines[0], server.lines[0], 'the other line is the same object');
  assert.equal(shown.printed, 35);
  assert.deepEqual(server.lines[1].printed, 10, 'the server’s numbers are not changed');
  assert.equal(shown.screens, server.screens);
});

test('taps in a row add up, are held at the total, and an exact number replaces the count', () => {
  const server = job();
  assert.equal(applyOps(server, [adjust('b', 10), adjust('b', 10), adjust('b', 1)]).lines[1].printed, 31);
  assert.equal(applyOps(server, [adjust('a', 5)]).lines[0].printed, 20, 'already all printed');
  assert.equal(applyOps(server, [adjust('b', 100)]).lines[1].printed, 80);
  assert.equal(applyOps(server, [set('b', 55), adjust('b', 5)]).lines[1].printed, 60);
  assert.equal(applyOps(server, [set('b', 500)]).lines[1].printed, 80, 'typed past the total');
  assert.equal(applyOps(server, [adjust('b', -50)]).lines[1].printed, 0);
  const all = applyOps(server, [set('a', 20), set('b', 80)]);
  assert.equal(all.printed, 100);
});

test('a change for a line the job does not have is ignored', () => {
  const server = job();
  const shown = applyOps(server, [adjust('nope', 5), set('nope', 5), screenOp('nope', 'on_press')]);
  assert.deepEqual(shown.lines, server.lines);
  assert.deepEqual(shown.screens, server.screens);
});

test('a screen’s status and the job’s stage show at once; screens ready follow the server’s own count', () => {
  const server = job();
  const shown = applyOps(server, [screenOp('pack:2', 'screen_ready'), screenOp('pack:3', 'on_press'), stageOp('curing')]);
  assert.deepEqual(shown.screens.map((s) => s.status), ['screen_ready', 'screen_ready', 'on_press']);
  assert.equal(shown.stage, 'curing');
  assert.equal(shown.screensReady, 3);
  assert.equal(shown.screensTotal, 3);
  // Taking a screen back to waiting takes it out of the count.
  assert.equal(applyOps(server, [screenOp('pack:1', 'waiting')]).screensReady, 0);
  // A server that counts "ready" its own way keeps its way: only the change is added to its number.
  assert.equal(applyOps(job({ screensReady: 2 }), [screenOp('pack:2', 'screen_ready')]).screensReady, 3);
  // A screen on the press and then reclaimed is still ready.
  assert.equal(applyOps(server, [screenOp('pack:1', 'on_press'), screenOp('pack:1', 'reclaimed')]).screensReady, 1);
});

test('hiding a job from the website’s board shows at once too', () => {
  assert.equal(applyOps(job(), [hiddenOp(true)]).hiddenFromBoard, true);
  assert.equal(applyOps(job({ hiddenFromBoard: true }), [hiddenOp(false)]).hiddenFromBoard, false);
  assert.equal(applyOps(job({ hiddenFromBoard: true }), [hiddenOp(false), hiddenOp(true)]).hiddenFromBoard, true, 'the last change wins');
});

test('a job with no screens has none to count', () => {
  const shown = applyOps(job({ method: 'dtg', screens: [], screensReady: undefined, screensTotal: undefined }), [adjust('b', 1)]);
  assert.equal('screensReady' in shown && shown.screensReady !== undefined, false);
  assert.equal(shown.printed, 31);
});

test('when an answer comes back the change comes off the list, and the screen is the server’s numbers with the rest still laid over them', () => {
  const server = job();
  const first = adjust('b', 5);
  const second = adjust('b', 1);
  const pending = [first, second];
  assert.equal(applyOps(server, pending).lines[1].printed, 16);

  // The first answer: the server has the five now; the one still on its way is laid over it.
  const afterFirst: StationJobDetail = { ...server, printed: 35, lines: [server.lines[0], { ...server.lines[1], printed: 15 }] };
  assert.equal(applyOps(afterFirst, pending.filter((op) => op.id !== first.id)).lines[1].printed, 16, 'no flick back to 15');

  // The second one fails: it comes off the list and the line is what the server has.
  const rolledBack = applyOps(afterFirst, []);
  assert.equal(rolledBack.lines[1].printed, 15);
  assert.equal(rolledBack.printed, 35);
});

test('a poll that lands while a tap is still on its way does not take the tap away', () => {
  const tap = adjust('a', -2);
  const polled = job({ lines: [line('a', 'S', 20, 18), line('b', 'M', 80, 10)], printed: 28 });
  assert.equal(applyOps(polled, [tap]).lines[0].printed, 16);
  assert.equal(applyOps(polled, [tap]).printed, 26);
});
