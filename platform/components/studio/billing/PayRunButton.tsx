'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ERRORS: Record<string, string> = {
  not_awaiting_payment: 'This run is no longer waiting for payment.',
  not_found: 'We could not find this run.',
};

/** Pay for one run: asks the server for the checkout page and goes there.
 * Renders the button and, when something goes wrong, a plain message after
 * it (a fragment, so a row can lay the message out across its full width). */
export function PayRunButton({ runId, label, variant = 'pill' }: { runId: string; label: string; variant?: 'pill' | 'link' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coming back from checkout with the back button can restore this page as
  // it was, mid-click: let the button be used again.
  useEffect(() => {
    function onShow(event: PageTransitionEvent) {
      if (event.persisted) setBusy(false);
    }
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/runs/${encodeURIComponent(runId)}/pay`, { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (res.ok && data?.url) {
        // Stay in the pending state while the browser leaves.
        window.location.assign(data.url);
        return;
      }
      const known = data?.error ? ERRORS[data.error] : undefined;
      if (known) router.refresh();
      setError(known ?? 'We could not start the payment just now. Please try again in a moment.');
    } catch {
      setError('We could not start the payment. Check your connection and try again.');
    }
    setBusy(false);
  }

  const isPill = variant === 'pill';
  return (
    <>
      <button
        type="button"
        className={isPill ? 'mf-pill mf-pill-sm mf-pill-primary bl-slot' : 'mf-ulink bl-linkbtn'}
        onClick={pay}
        disabled={busy}
        aria-label={busy ? undefined : isPill ? `Pay ${label}` : `Pay now for ${label}`}
      >
        {busy ? 'Opening…' : isPill ? 'Pay' : 'Pay now'}
      </button>
      {error ? (
        <p role="alert" className="bl-err">
          {error}
        </p>
      ) : null}
    </>
  );
}
