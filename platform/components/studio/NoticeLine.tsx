'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const NOTICES: Record<string, { text: string; tone: 'positive' | 'warning' }> = {
  stripe_ready: { text: 'Payouts are set up. Sales will now be paid out to your bank.', tone: 'positive' },
  stripe_action_required: {
    text: 'Payouts need a few more details before they can start. Open Billing to finish.',
    tone: 'warning',
  },
};

/** One dismissible plain-language line under the header, driven by
 * `?notice=` (set when the artist comes back from payout setup). Dismissing also drops the
 * parameter from the URL so a refresh does not bring it back. */
export function NoticeLine() {
  const params = useSearchParams();
  const pathname = usePathname();
  const key = params.get('notice') ?? '';
  const [dismissed, setDismissed] = useState<string | null>(null);
  const notice = NOTICES[key];
  if (!notice || dismissed === key) return null;

  function dismiss() {
    setDismissed(key);
    const next = new URLSearchParams(params.toString());
    next.delete('notice');
    const query = next.toString();
    window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div role="status" className="mf-hairline-b flex shrink-0 items-center gap-3 px-5 py-2.5 md:px-8">
      {/* Monochrome: a solid square for good news, a hollow one for a heads-up. */}
      <span
        aria-hidden
        className="size-1.5 shrink-0"
        style={notice.tone === 'positive' ? { background: 'var(--signal)' } : { border: '1px solid var(--signal)' }}
      />
      <p className="min-w-0 flex-1 text-[13px] leading-[18px]">{notice.text}</p>
      <button type="button" onClick={dismiss} className="mf-ulink shrink-0 text-[11px]">
        Dismiss
      </button>
    </div>
  );
}
