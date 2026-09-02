'use client';

import { useCallback, useEffect, useState } from 'react';

// Favourite blanks, pinned per browser in localStorage. Any component
// can call useFavourites(); all instances stay in sync through a custom
// event (same tab) and the storage event (other tabs).
const KEY = 'mf-favourites';
const EVENT = 'mf-favourites-change';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function write(codes: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes));
  } catch {
    // storage unavailable — favourites simply don't persist
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useFavourites() {
  // Empty on the server and first paint (no hydration mismatch), real
  // list after mount.
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setCodes(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((code: string) => {
    const current = read();
    write(current.includes(code) ? current.filter((c) => c !== code) : [...current, code]);
  }, []);

  const has = useCallback((code: string) => codes.includes(code), [codes]);

  return { codes, has, toggle };
}
