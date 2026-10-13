'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const MAX_LENGTH = 500;

/** /studio?prompt=Open%20Run%203: once the home screen has loaded, hands that
 * text to the composer as a draft, then takes the parameter out of the URL.
 * It never sends: any link can carry a ?prompt=, so the artist reads it and
 * presses Enter. In-app buttons use askStudio instead, which sends. An empty
 * or very long value is dropped. Renders nothing. */
export function PromptParam({ ready, onPrompt }: { ready: boolean; onPrompt: (text: string) => void }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const raw = params.get('prompt');
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (raw === null) {
      handled.current = null;
      return;
    }
    if (!ready || handled.current === raw) return;
    handled.current = raw;

    // Native history API, as the session URL change does: it syncs with
    // useSearchParams without a navigation, so the shell and its stream stay
    // mounted and nothing races the move to /studio/s/<id>.
    const rest = new URLSearchParams(params.toString());
    rest.delete('prompt');
    const query = rest.toString();
    window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);

    const text = raw.trim();
    if (text && text.length <= MAX_LENGTH) onPrompt(text);
  }, [ready, raw, params, pathname, onPrompt]);

  return null;
}
