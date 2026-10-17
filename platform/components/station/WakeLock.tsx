'use client';

// Screen Wake Lock for the iPads at the stations: the screen stays on while the station is open, so a job sheet is
// not a black screen when someone looks up from the press. It lives in the layout, so the lock survives going from the
// queue to a job and back. The choice is the person's (a toggle in the bar) and is kept on the device. The lock is
// let go when the page is hidden (the browser does that itself) and asked for again when it is back in front; some
// browsers only grant it after a touch, so a touch asks too.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { IconAwake } from './icons';

const KEY = 'mf-station-awake';
const CHANGED = 'mf-station-awake-changed';

/** The person's choice, kept on the device (localStorage) and, when storage is blocked, for as long as the page is open. */
let chosen: boolean | null = null;
const readWanted = (): boolean => {
  if (chosen !== null) return chosen;
  try {
    return window.localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
};
const watchWanted = (watcher: () => void): (() => void) => {
  window.addEventListener('storage', watcher);
  window.addEventListener(CHANGED, watcher);
  return () => {
    window.removeEventListener('storage', watcher);
    window.removeEventListener(CHANGED, watcher);
  };
};
const noWatch = () => () => undefined;

interface WakeLockState {
  /** the browser can keep the screen on at all */
  supported: boolean;
  /** the person wants it on (the default) */
  wanted: boolean;
  /** the screen is being kept on right now */
  active: boolean;
  toggle: () => void;
}

const WakeLockContext = createContext<WakeLockState>({ supported: false, wanted: false, active: false, toggle: () => undefined });

export function WakeLockProvider({ children }: { children: ReactNode }) {
  // What the device supports and what this iPad's person chose last time are read from the device, not guessed on the server.
  const supported = useSyncExternalStore(noWatch, () => 'wakeLock' in navigator, () => false);
  const wanted = useSyncExternalStore(watchWanted, readWanted, () => true);
  const [active, setActive] = useState(false);
  const sentinel = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    const release = () => {
      const held = sentinel.current;
      sentinel.current = null;
      setActive(false);
      if (held) void held.release().catch(() => undefined);
    };

    const acquire = async () => {
      if (cancelled || !wanted || sentinel.current || document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled || !wanted) {
          void lock.release().catch(() => undefined);
          return;
        }
        sentinel.current = lock;
        setActive(true);
        lock.addEventListener('release', () => {
          if (sentinel.current === lock) {
            sentinel.current = null;
            setActive(false);
          }
        });
      } catch {
        // not granted (low battery, no touch yet): it is asked for again on the next touch or when the page comes back
        setActive(false);
      }
    };

    if (wanted) void acquire();
    else release();

    const onVisible = () => void acquire();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', onVisible, { passive: true });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onVisible);
      release();
    };
  }, [supported, wanted]);

  const toggle = useCallback(() => {
    const next = !readWanted();
    chosen = next;
    try {
      window.localStorage.setItem(KEY, next ? '1' : '0');
    } catch {
      // not kept past this page: it still changes now
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  const value = useMemo(() => ({ supported, wanted, active, toggle }), [supported, wanted, active, toggle]);
  return <WakeLockContext.Provider value={value}>{children}</WakeLockContext.Provider>;
}

/** The toggle in the bar: "Screen on" / "Screen may sleep", and why when the device cannot keep it on. */
export function ScreenOnToggle() {
  const { supported, wanted, active, toggle } = useContext(WakeLockContext);
  const label = !supported ? 'Screen may sleep' : wanted ? (active ? 'Screen stays on' : 'Screen on') : 'Screen may sleep';
  return (
    <button
      type="button"
      className="st-btn st-btn-quiet"
      aria-pressed={supported && wanted}
      aria-label={label}
      disabled={!supported}
      onClick={toggle}
    >
      <IconAwake />
      <span className="st-hide-narrow">{label}</span>
    </button>
  );
}
