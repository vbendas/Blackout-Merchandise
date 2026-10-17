'use client';

// Two small hooks the station screens share: the clock behind "Updated 12 s ago", and the poll that asks the server for the
// numbers again every few seconds.
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

// One clock for every screen that shows how old something is: a store React subscribes to, so what the server drew (no time) and what
// the first draw in the browser shows are the same, and the time comes in right after.
let clock: number | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
const watchers = new Set<() => void>();

function subscribeClock(watcher: () => void): () => void {
  watchers.add(watcher);
  clock ??= Date.now();
  if (ticker === null) {
    ticker = setInterval(() => {
      clock = Date.now();
      watchers.forEach((w) => w());
    }, 1000);
  }
  return () => {
    watchers.delete(watcher);
    if (watchers.size === 0 && ticker !== null) {
      clearInterval(ticker);
      ticker = null;
      clock = null;
    }
  };
}

/** The time, ticking every second. It is null until the screen is on the iPad, so what the server drew is never a time that differs from what the browser draws. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => clock,
    () => null,
  );
}

/** Runs `run` every `ms` while the page is in front, once more the moment it comes back (an iPad that slept), and never two at
 * a time. `enabled` false stops it. The returned function runs it now (the refresh button), whatever the page is doing. */
export function usePoll(run: () => Promise<void>, ms: number, enabled = true): () => Promise<void> {
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });
  const busy = useRef(false);

  const tick = useCallback(async (force: boolean) => {
    if (busy.current) return;
    if (!force && typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    busy.current = true;
    try {
      await latest.current();
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => void tick(false), ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms, enabled, tick]);

  return useCallback(() => tick(true), [tick]);
}
