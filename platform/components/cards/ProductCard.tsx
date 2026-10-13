'use client';

import { useState } from 'react';
import type { Card } from '@/lib/ui-cards/schemas';
import { humanStatus } from '@/lib/format/status';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, Sizes, SpecRows, Swatches, blankLabel, formatMoney, placementWords, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type ProductCardType = Extract<Card, { kind: 'product' }>;

const statusLabel: Record<ProductCardType['status'], string> = {
  draft: 'Draft',
  proof_pending: 'Proof pending',
  live: 'Live',
  archived: 'Archived',
};

const statusTone: Record<ProductCardType['status'], StatusTone> = {
  draft: 'neutral',
  proof_pending: 'warning',
  live: 'positive',
  archived: 'dim',
};

export function ProductCard({ card, ctx }: { card: ProductCardType; ctx: CardActionContext }) {
  const [activeCode, setActiveCode] = useState(card.colours[0]?.code);
  const activeColour = card.colours.find((colour) => colour.code === activeCode) ?? card.colours[0];
  const image = activeColour?.mockupUrl ?? card.imageUrl;

  const rows: SpecRowData[] = [
    { key: 'print', label: 'Print', value: [card.printService, placementWords(card.placement)].filter(Boolean).join(' · ') },
    { key: 'base', label: 'Base cost', value: card.baseCostCents !== undefined ? formatMoney(card.baseCostCents) : '—', dim: true },
    { key: 'retail', label: 'Retail', value: card.retailPriceCents !== undefined ? formatMoney(card.retailPriceCents) : '—' },
    { key: 'margin', label: 'Margin', value: card.marginCents !== undefined ? formatMoney(card.marginCents) : '—', strong: true },
  ];

  return (
    <CardFrame media={image} mediaAlt={card.name}>
      <CardHead
        label={card.title ?? 'Product'}
        title={card.name}
        sentence={blankLabel(card.blankCode, card.blankName)}
        aside={<StatusPill label={statusLabel[card.status] ?? humanStatus(card.status)} tone={statusTone[card.status] ?? 'neutral'} />}
      />
      <Swatches
        colours={card.colours}
        activeCode={activeCode}
        onPick={(colour) => {
          if (colour.mockupUrl) setActiveCode(colour.code);
        }}
        canPick={(colour) => Boolean(colour.mockupUrl)}
      />
      <Sizes sizes={card.sizes} />
      <SpecRows rows={rows} variant="plain" />
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
