// The counters of the production stations: how a count of printed pieces moves when a button is
// tapped or a number is typed. Pure and client-safe. The server clamps the same way (a count is a
// whole number from 0 to the line's total), so what the screen shows before the answer comes back is
// what the answer says.

/** The quick buttons beside a count, in the order they are drawn. */
export const QUICK_STEPS = [-1, 1, 5, 10] as const;
export type QuickStep = (typeof QUICK_STEPS)[number];

/** A count as the line can hold it: a whole number from 0 to the total (anything that is not a number is 0). */
export function clampCount(value: number, total: number): number {
  if (!Number.isFinite(value)) return 0;
  const max = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  return Math.min(max, Math.max(0, Math.round(value)));
}

/** The count after adding `delta` (taking, when it is negative), held between 0 and the total. */
export function applyDelta(printed: number, delta: number, total: number): number {
  return clampCount(clampCount(printed, total) + (Number.isFinite(delta) ? delta : 0), total);
}

/** Whether a step would change anything: -1 at 0 and +5 at the total do nothing, so their buttons are off. */
export function stepChanges(printed: number, delta: number, total: number): boolean {
  return applyDelta(printed, delta, total) !== clampCount(printed, total);
}

/** "All": every piece of the line printed. */
export function allCount(total: number): number {
  return clampCount(total, total);
}

/** What is left to print on a line. */
export function remaining(printed: number, total: number): number {
  return Math.max(0, clampCount(total, total) - clampCount(printed, total));
}

// ---------------------------------------------------------------------------
// The keypad for an exact number

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'back' | 'clear';

/** The keys in the order they are drawn: three by four, the last row clear, zero, back. */
export const KEYPAD_KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

/** What the keypad shows after a key: digits only, no leading zero, and never more than the line's total (typing past it shows the total). */
export function pressKey(text: string, key: KeypadKey, total: number): string {
  if (key === 'clear') return '';
  if (key === 'back') return text.slice(0, -1);
  const next = text === '0' || text === '' ? key : `${text}${key}`;
  const max = Math.max(0, Math.floor(total));
  return Number(next) > max ? String(max) : next;
}

/** The number typed, or null when nothing is typed yet (so "Set" has nothing to set). */
export function keypadCount(text: string, total: number): number | null {
  if (text === '') return null;
  return clampCount(Number(text), total);
}
