'use client';

import { useNow } from './hooks';
import { timeAgo } from './model';

/** "Updated 12 s ago" in the bar, and "Saving…" while a change is on its way. It is the only part of a screen that follows the clock, so the
 * screen around it does not draw again every second. Not a live region: a reader would be told the time every second. */
export function UpdatedLine({ at, saving = false, problem = false }: { at: number; saving?: boolean; problem?: boolean }) {
  const now = useNow();
  const age = now === null ? 0 : Math.max(0, now - at);
  return <p className="st-updated">{saving ? 'Saving…' : problem ? 'Not updating' : `Updated ${timeAgo(age)}`}</p>;
}
