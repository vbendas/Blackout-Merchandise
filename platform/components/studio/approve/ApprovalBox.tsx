'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { approveArtworkAction, undoApprovalAction } from '@/app/(chat)/studio/approve/actions';
import type { ApprovalView } from '@/lib/services/print-prep';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import { ChatLink } from './ApproveLinks';
import { approvalScope, joinNames, phaseOf, readableError } from './approve-logic';

type Step = 'ask' | 'confirm';

/** The box that holds the artist's decision. Approving covers both versions
 * on every garment colour, and it locks the version, so it takes two steps:
 * "Approve artwork", then a plain confirmation that says what it locks. Once
 * approved the box says what happens next, with an Undo while no order waits
 * on the files and pre-press hasn't checked them (view.canRevoke). Both are
 * server actions that check the artist owns the design; approving also checks
 * that this is still the version they are looking at. */
export function ApprovalBox({ view, sessionId }: { view: ApprovalView; sessionId: string | null }) {
  const { refreshHome } = useStudioSidebar();
  const [step, setStep] = useState<Step>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set the moment the server says yes, so the box does not wait for the page to reload.
  const [approvedHere, setApprovedHere] = useState(false);
  // The approval time an Undo withdrew: until the page reloads, the view still carries it.
  const [undoneFor, setUndoneFor] = useState<string | null>(null);
  const withdrawn = undoneFor !== null && view.approvedAt === undoneFor;
  const approved = !withdrawn && phaseOf(view, approvedHere) === 'approved';

  // Each step replaces the one before it, including the button that was
  // pressed: keyboard focus goes to the new text (or back to the first button
  // after Cancel) instead of being lost.
  const leadRef = useRef<HTMLParagraphElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const last = useRef({ approved, step });
  useEffect(() => {
    const before = last.current;
    last.current = { approved, step };
    if (before.approved === approved && before.step === step) return;
    if (approved || step === 'confirm') leadRef.current?.focus();
    else askRef.current?.focus();
  }, [approved, step]);
  const whyNot = useId();

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const result = await approveArtworkAction(view.designId, view.versionId);
      if (result.ok) {
        setApprovedHere(true);
        setStep('ask');
        // "Needs you" on the home screen and the sidebar's shop block read the same state.
        void refreshHome();
      } else {
        setError(readableError(result.error));
      }
    } catch {
      setError('That did not go through. Check your connection and try again.');
    }
    setBusy(false);
  }

  async function undo() {
    setBusy(true);
    setError(null);
    try {
      const result = await undoApprovalAction(view.designId);
      if (result.ok) {
        setApprovedHere(false);
        setUndoneFor(view.approvedAt);
        setStep('ask');
        void refreshHome();
      } else {
        setError(readableError(result.error));
      }
    } catch {
      setError('That did not go through. Check your connection and try again.');
    }
    setBusy(false);
  }

  function cancel() {
    setError(null);
    setStep('ask');
  }

  if (approved) {
    return (
      <section className="ap-approval" aria-label="Approval" data-state="approved">
        <p ref={leadRef} tabIndex={-1} className="ap-approval-lead">
          Approved. Version {view.versionNumber} is locked for production.
        </p>
        <p className="ap-dim">
          Products on these garments, colours and print positions can now go live. A colour or print position you add later needs its own approval. Production files go to pre-press with the first order.
        </p>
        <div className="ap-actions">
          <ChatLink sessionId={sessionId} className="ap-btn">
            Back to the chat
          </ChatLink>
          {view.canRevoke ? (
            <button type="button" className="ap-btn" onClick={undo} disabled={busy}>
              {busy ? 'Undoing…' : 'Undo'}
            </button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="ap-err">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (step === 'confirm') {
    const names = joinNames(view.garments.map((garment) => garment.name));
    return (
      <section
        className="ap-approval"
        aria-label="Approval"
        data-state="confirm"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) cancel();
        }}
      >
        <p ref={leadRef} tabIndex={-1} className="ap-approval-lead">
          Approve version {view.versionNumber} for production?
        </p>
        <p className="ap-dim">
          This locks version {view.versionNumber} for screen print and DTG/DTF{names ? ` on ${names}` : ''}. To change anything afterwards, ask for changes and approve the new version.
        </p>
        <div className="ap-actions">
          <button type="button" className="ap-btn ap-btn-primary" onClick={approve} disabled={busy}>
            {busy ? 'Approving…' : `Yes, approve version ${view.versionNumber}`}
          </button>
          <button type="button" className="ap-btn" onClick={cancel} disabled={busy}>
            Cancel
          </button>
        </div>
        {error ? (
          <p role="alert" className="ap-err">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="ap-approval" aria-label="Approval" data-state="ask">
      <p className="ap-approval-lead">{approvalScope(view.garments)}</p>
      <p className="ap-dim">Our pre-press team checks every production file before it prints. If a fix changes how the print looks, we’ll ask you again.</p>
      <button
        ref={askRef}
        type="button"
        className="ap-btn ap-btn-primary ap-start"
        onClick={() => setStep('confirm')}
        disabled={!view.canApprove}
        aria-describedby={view.canApprove ? undefined : whyNot}
      >
        Approve artwork
      </button>
      {view.canApprove ? null : (
        <p id={whyNot} className="ap-dim">
          This version cannot be approved yet. Check what is worth a look, or ask for changes.
        </p>
      )}
    </section>
  );
}
