'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CatalogueFilters } from './catalogue-state';
import { CATALOGUE_PATH, catalogueSearch, normaliseQuery, parseCatalogueParams, type CatalogueUrl } from './catalogue-url';

/** How long typing in the search box rests before it is written to the address. */
const SEARCH_WRITE_MS = 250;

/** The address as it is now: always current, even in the moment before the
 * router has caught up with a change this page just made. */
function readUrl(): CatalogueUrl {
  const params = new URLSearchParams(window.location.search);
  return parseCatalogueParams((name) => params.get(name));
}

export interface CatalogueUrlChange {
  filters?: Partial<CatalogueFilters>;
  blank?: string | null;
}

/** The catalogue page's state, which lives in its address (catalogue-url.ts):
 * read from the router's search params, written with the browser's own
 * history calls, which Next syncs into those params without a server round
 * trip (the way ChatShell moves to /studio/s/<id>).
 *
 * - Filters, search and sort replace the current history entry, so they do
 *   not fill the Back button; a new category and an opened blank push one.
 * - The search box types at once and reaches the address once typing rests.
 * - Back closes an opened blank and a refresh reopens it. */
export function useCatalogueUrl() {
  const router = useRouter();
  const params = useSearchParams();
  const parsed = useMemo(() => parseCatalogueParams((name) => params.get(name)), [params]);

  // The search text: the box owns it while the artist types; the address is
  // only trusted for it when it changed by some other hand (Back, a link).
  const urlQuery = parsed.filters.q;
  const [draft, setDraft] = useState(urlQuery);
  const [seenQuery, setSeenQuery] = useState(urlQuery);
  const [writtenQuery, setWrittenQuery] = useState(urlQuery);
  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery);
    if (urlQuery !== writtenQuery) {
      setDraft(urlQuery);
      setWrittenQuery(urlQuery);
    }
  }
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const write = useCallback(
    (next: CatalogueUrl, mode: 'push' | 'replace') => {
      const href = CATALOGUE_PATH + catalogueSearch(next);
      if (href === window.location.pathname + window.location.search) return;
      try {
        if (mode === 'push') window.history.pushState(null, '', href);
        else window.history.replaceState(null, '', href);
      } catch {
        // Browsers refuse history calls that come too fast: the router can still do it.
        router[mode](href, { scroll: false });
      }
    },
    [router],
  );

  const commit = useCallback(
    (change: CatalogueUrlChange, mode: 'push' | 'replace') => {
      const real = readUrl();
      const query = normaliseQuery(draftRef.current);
      setWrittenQuery(query);
      write(
        { ...real, filters: { ...real.filters, ...change.filters, q: query }, blank: change.blank !== undefined ? change.blank : real.blank },
        mode,
      );
    },
    [write],
  );

  const flushQuery = useCallback(
    (value: string) => {
      // Typing that rests after the artist has left the page writes nothing.
      if (window.location.pathname !== CATALOGUE_PATH) return;
      const query = normaliseQuery(value);
      setWrittenQuery(query);
      const real = readUrl();
      if (real.filters.q !== query) write({ ...real, filters: { ...real.filters, q: query } }, 'replace');
    },
    [write],
  );

  const timer = useRef<number | undefined>(undefined);
  const setQuery = useCallback(
    (value: string) => {
      draftRef.current = value;
      setDraft(value);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => flushQuery(draftRef.current), SEARCH_WRITE_MS);
    },
    [flushQuery],
  );
  /** Writes the search text now (Enter in the box). */
  const flushQueryNow = useCallback(() => {
    window.clearTimeout(timer.current);
    flushQuery(draftRef.current);
  }, [flushQuery]);

  // The blank whose detail is open. Closing it hides it at once, before the
  // address (which Back changes a moment later) has caught up.
  const pushedBlank = useRef(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (dismissed !== null && parsed.blank !== dismissed) setDismissed(null);
  const blank = parsed.blank !== null && parsed.blank !== dismissed ? parsed.blank : null;
  const blankRef = useRef<string | null>(null);
  useEffect(() => {
    blankRef.current = blank;
  }, [blank]);

  const openBlank = useCallback(
    (code: string) => {
      setDismissed(null);
      pushedBlank.current = true;
      commit({ blank: code }, 'push');
    },
    [commit],
  );

  /** Back when this page pushed the blank's entry (so the history ends where
   * it began), else the address is rewritten without it (a shared link, a refresh). */
  const closeBlank = useCallback(() => {
    const shown = blankRef.current;
    if (!shown) return;
    setDismissed(shown);
    if (readUrl().blank === null) return;
    if (pushedBlank.current) {
      pushedBlank.current = false;
      window.history.back();
      return;
    }
    commit({ blank: null }, 'replace');
  }, [commit]);

  const url = useMemo<CatalogueUrl>(() => ({ ...parsed, filters: { ...parsed.filters, q: draft }, blank }), [parsed, draft, blank]);

  return { url, setQuery, flushQueryNow, commit, openBlank, closeBlank };
}
