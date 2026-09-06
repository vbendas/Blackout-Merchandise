'use client';

import { useEffect, useRef, useState } from 'react';
import type { Suggestion } from '@/lib/agent/protocol';
import { fetchSuggestions } from '@/lib/agent/client';

const DEBOUNCE_MS = 150;
const MIN_QUERY_LENGTH = 2;

// A stable reference: returning a fresh `[]` literal on every render (when
// inactive) would give Composer's render-time reset a new array identity
// each pass and loop forever re-triggering its state update.
const EMPTY_SUGGESTIONS: Suggestion[] = [];

/** Debounced GET /api/agent/suggest?q= — resolves to [] while the query is
 * short, dismissed, or the endpoint 404s (it is owned by another workstream
 * and may not exist yet). */
export function useSuggestions(query: string, dismissed: boolean): Suggestion[] {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const trimmed = query.trim();
  const active = !dismissed && trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) {
      abortRef.current?.abort();
      return;
    }
    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetchSuggestions(trimmed, controller.signal).then((result) => {
        if (!controller.signal.aborted) setSuggestions(result);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [trimmed, active]);

  // Derived at render time rather than reset via a second effect: avoids a
  // stale-suggestions flash without a synchronous setState-in-effect.
  return active ? suggestions : EMPTY_SUGGESTIONS;
}
