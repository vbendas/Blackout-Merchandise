'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ApprovalView } from '@/lib/services/print-prep';
import { AskLink } from './ApproveLinks';
import { POLL_MS, keepPolling, retryPrompt } from './approve-logic';

/** Shown while the proofs are still being drawn (status "preparing"): a
 * progress line and what is happening. The page asks the server again every
 * few seconds (only while the tab is in view, for ten minutes at most), so
 * the proofs appear by themselves; "Check now" asks at once. */
export function PreparingPanel({ view }: { view: ApprovalView }) {
  const router = useRouter();
  const [checking, startChecking] = useTransition();
  const [gaveUp, setGaveUp] = useState(false);
  // Bumped by "Check again" to start the clock over.
  const [round, setRound] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (!keepPolling('preparing', Date.now() - started)) {
        window.clearInterval(timer);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [router, round]);

  function checkNow() {
    if (gaveUp) {
      setGaveUp(false);
      setRound((value) => value + 1);
    }
    startChecking(() => router.refresh());
  }

  return (
    <section className="ap-wait" aria-busy={!gaveUp} aria-label="Preparing the proofs">
      <h2 className="mf-label">Preparing your proofs</h2>
      <p className="ap-headline">
        {gaveUp ? 'This is taking longer than usual.' : `We are drawing ${view.designName}, version ${view.versionNumber}, from the production files.`}
      </p>
      <p className="ap-a8">
        {gaveUp
          ? 'The proofs are still in the queue. Check again in a moment, or ask in the chat.'
          : 'Both versions, on every garment colour you picked. This usually takes a minute or two, and this page updates by itself.'}
      </p>
      {gaveUp ? null : <div className="ap-progress" role="progressbar" aria-label="Preparing the proofs" aria-valuetext="In progress" />}
      <div className="ap-actions">
        <button type="button" className="ap-btn" onClick={checkNow} disabled={checking}>
          {checking ? 'Checking…' : gaveUp ? 'Check again' : 'Check now'}
        </button>
      </div>
    </section>
  );
}

/** Shown when the engine could not draw the proofs (status "failed"). Nothing
 * can be approved; the way forward is the chat. */
export function FailedPanel({ view, sessionId }: { view: ApprovalView; sessionId: string | null }) {
  return (
    <section className="ap-wait" aria-label="Proofs not ready">
      <h2 className="mf-label">Proofs not ready</h2>
      <p className="ap-headline">We could not prepare the proofs for this version.</p>
      <p className="ap-a8">Nothing was approved. Ask the assistant to run it again, or ask for changes to the artwork.</p>
      <div className="ap-actions">
        <AskLink prompt={retryPrompt(view)} sessionId={sessionId} className="ap-btn ap-btn-primary">
          Ask the assistant to try again
        </AskLink>
      </div>
    </section>
  );
}
