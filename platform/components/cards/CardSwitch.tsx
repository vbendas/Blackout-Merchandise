'use client';

import { useState, type ReactNode } from 'react';
import type { Card } from '@/lib/ui-cards/schemas';
import type { CardActionContext } from '@/components/cards/actions';
import { Modal } from '@/components/ui/Modal';
import { OnboardingChecklistCard } from '@/components/cards/OnboardingChecklistCard';
import { BlankCard } from '@/components/cards/BlankCard';
import { BlankGridCard } from '@/components/cards/BlankGridCard';
import { StoreCard } from '@/components/cards/StoreCard';
import { ConfirmCard } from '@/components/cards/ConfirmCard';
import { InboxCard } from '@/components/cards/InboxCard';
import { MenuCard } from '@/components/cards/MenuCard';
import { NoticeCard } from '@/components/cards/NoticeCard';

export interface CardSwitchProps {
  card: Card;
  ctx: CardActionContext;
  confirmResolution?: 'approved' | 'rejected';
}

function renderBody(card: Card, ctx: CardActionContext, confirmResolution?: 'approved' | 'rejected'): ReactNode {
  switch (card.kind) {
    case 'onboarding_checklist':
      return <OnboardingChecklistCard card={card} ctx={ctx} />;
    case 'blank':
      return <BlankCard card={card} ctx={ctx} />;
    case 'blank_grid':
      return <BlankGridCard card={card} ctx={ctx} />;
    case 'store':
      return <StoreCard card={card} ctx={ctx} />;
    case 'confirm':
      return <ConfirmCard card={card} ctx={ctx} resolution={confirmResolution} />;
    case 'inbox':
      return <InboxCard card={card} ctx={ctx} />;
    case 'menu':
      return <MenuCard card={card} ctx={ctx} />;
    case 'notice':
      return <NoticeCard card={card} ctx={ctx} />;
    default:
      return null;
  }
}

export function CardSwitch({ card, ctx, confirmResolution }: CardSwitchProps) {
  const [open, setOpen] = useState(false);
  const body = renderBody(card, ctx, confirmResolution);

  if (!card.expandable) return <div className="mf-fade-in">{body}</div>;

  return (
    <div className="mf-fade-in">
      <div className="max-h-[240px] overflow-hidden">{body}</div>
      <button type="button" className="mf-chip mt-2" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={card.title}>
        {body}
      </Modal>
    </div>
  );
}
