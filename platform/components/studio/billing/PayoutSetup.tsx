'use client';

import { useState } from 'react';

export function PayoutSetup({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }
      setError('We could not open payout setup just now. Please try again in a moment.');
    } catch {
      setError('We could not open payout setup. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <div>
      <button type="button" className="mf-pill mf-pill-primary" onClick={start} disabled={busy}>
        {busy ? 'Opening…' : label}
      </button>
      {error ? <p style={{ color: 'var(--danger)', fontSize: 13, margin: '10px 0 0' }}>{error}</p> : null}
    </div>
  );
}
