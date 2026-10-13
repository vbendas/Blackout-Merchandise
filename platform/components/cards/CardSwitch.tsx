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
import { DesignCard } from '@/components/cards/DesignCard';
import { MockupGridCard } from '@/components/cards/MockupGridCard';
import { ProductCard } from '@/components/cards/ProductCard';
import { QuoteCard } from '@/components/cards/QuoteCard';
import { ProofCard } from '@/components/cards/ProofCard';
import { UploadCard } from '@/components/cards/UploadCard';
import { StripeOnboardingCard } from '@/components/cards/StripeOnboardingCard';
import { DomainSetupCard } from '@/components/cards/DomainSetupCard';
import { OrderCard } from '@/components/cards/OrderCard';
import { OrdersTableCard } from '@/components/cards/OrdersTableCard';
import { SalesSummaryCard } from '@/components/cards/SalesSummaryCard';
import { AdminQueueCard } from '@/components/cards/AdminQueueCard';
import { SupplierOrderCard } from '@/components/cards/SupplierOrderCard';
import { BulkQuoteCard } from '@/components/cards/BulkQuoteCard';
import { RunCard } from '@/components/cards/RunCard';
import { TicketCard } from '@/components/cards/TicketCard';
import { WaitlistTableCard } from '@/components/cards/WaitlistTableCard';

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
    case 'design':
      return <DesignCard card={card} ctx={ctx} />;
    case 'mockup_grid':
      return <MockupGridCard card={card} ctx={ctx} />;
    case 'product':
      return <ProductCard card={card} ctx={ctx} />;
    case 'quote':
      return <QuoteCard card={card} ctx={ctx} />;
    case 'proof':
      return <ProofCard card={card} ctx={ctx} />;
    case 'upload':
      return <UploadCard card={card} ctx={ctx} />;
    case 'stripe_onboarding':
      return <StripeOnboardingCard card={card} ctx={ctx} />;
    case 'domain_setup':
      return <DomainSetupCard card={card} ctx={ctx} />;
    case 'order':
      return <OrderCard card={card} ctx={ctx} />;
    case 'orders_table':
      return <OrdersTableCard card={card} ctx={ctx} />;
    case 'sales_summary':
      return <SalesSummaryCard card={card} ctx={ctx} />;
    case 'bulk_quote':
      return <BulkQuoteCard card={card} ctx={ctx} />;
    case 'run':
      return <RunCard card={card} ctx={ctx} />;
    case 'admin_queue':
      return <AdminQueueCard card={card} ctx={ctx} />;
    case 'supplier_order':
      return <SupplierOrderCard card={card} ctx={ctx} />;
    case 'ticket':
      return <TicketCard card={card} ctx={ctx} />;
    case 'waitlist_table':
      return <WaitlistTableCard card={card} ctx={ctx} />;
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
      <button type="button" className="mf-chip mt-2" onClick={() => setOpen(true)} aria-label={card.title ? `Open ${card.title}` : 'Open'}>
        Open
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={card.title}>
        {body}
      </Modal>
    </div>
  );
}
