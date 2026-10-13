'use client';

import { createContext, useContext } from 'react';
import type { Card } from '@/lib/ui-cards/schemas';
import type { ConfirmOutcome } from '@/lib/agent/protocol';
import type { ConfirmState } from '@/components/chat/useConversation';
import { Chip } from '@/components/ui/Chip';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type ConfirmCardType = Extract<Card, { kind: 'confirm' }>;

/** Live confirm-card states for this session, by tool call id. The thread
 * provides it; without it a card falls back to its stored outcome. */
export const ConfirmStatesContext = createContext<Record<string, ConfirmState>>({});

const OUTCOME_WORDS: Record<ConfirmOutcome, string> = {
  approved: 'Approved',
  declined: 'Declined',
  done: 'Done',
  failed: "Didn't go through",
};

function PendingDots() {
  return (
    <span aria-hidden="true" className="flex items-center gap-[3px]">
      <span className="mf-spinner-dot bg-current motion-reduce:animate-none" />
      <span className="mf-spinner-dot bg-current motion-reduce:animate-none" />
      <span className="mf-spinner-dot bg-current motion-reduce:animate-none" />
    </span>
  );
}

export function ConfirmCard({
  card,
  ctx,
  resolution,
}: {
  card: ConfirmCardType;
  ctx: CardActionContext;
  /** older callers: a decision made in this session */
  resolution?: 'approved' | 'rejected';
}) {
  const live = useContext(ConfirmStatesContext)[card.toolCallId];
  const legacy: ConfirmOutcome | undefined = resolution === 'approved' ? 'approved' : resolution === 'rejected' ? 'declined' : undefined;
  const phase = live?.phase ?? card.outcome ?? legacy;
  const pending = phase === 'approving' || phase === 'declining';
  const outcome = phase && !pending ? (phase as ConfirmOutcome) : null;
  const approveLabel = card.approveLabel ?? 'Approve';
  const cancelLabel = card.cancelLabel ?? 'Cancel';

  // While a decision is on its way both buttons stay focusable but inert
  // (aria-disabled, not disabled, so keyboard focus isn't dropped); the
  // clicked one keeps full strength and shows it is working.
  const decide = (approve: boolean) => {
    if (pending) return;
    ctx.onConfirm(card.toolCallId, approve);
  };

  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-2">{card.title}</div> : null}
      <p className="text-[14px] leading-relaxed">{card.summary}</p>
      {card.details && card.details.length > 0 ? (
        <div className="mf-hairline-t mt-3 pt-2">
          {card.details.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between py-1.5 text-[13px]">
              <span className="mf-dimmed">{detail.label}</span>
              <span>{detail.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {outcome ? (
        <p className="mf-mono-note mt-3">{OUTCOME_WORDS[outcome]}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip
            small
            primary
            aria-disabled={pending || undefined}
            aria-busy={phase === 'approving' || undefined}
            onClick={() => decide(true)}
            className={pending ? (phase === 'approving' ? 'cursor-default' : 'cursor-default opacity-40') : undefined}
          >
            {approveLabel}
            {phase === 'approving' ? <PendingDots /> : null}
          </Chip>
          <Chip
            small
            aria-disabled={pending || undefined}
            aria-busy={phase === 'declining' || undefined}
            onClick={() => decide(false)}
            className={pending ? (phase === 'declining' ? 'cursor-default' : 'cursor-default opacity-40') : undefined}
          >
            {cancelLabel}
            {phase === 'declining' ? <PendingDots /> : null}
          </Chip>
        </div>
      )}
      {!outcome && live?.error ? (
        <p role="alert" className="mt-2 text-[13px] leading-relaxed">
          {live.error}
        </p>
      ) : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
