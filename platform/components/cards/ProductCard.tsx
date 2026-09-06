'use client';

import { useState } from 'react';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
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
  proof_pending: 'dim',
  live: 'positive',
  archived: 'dim',
};

function formatCents(cents?: number): string | null {
  if (cents === undefined) return null;
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

export function ProductCard({ card, ctx }: { card: ProductCardType; ctx: CardActionContext }) {
  const [activeCode, setActiveCode] = useState(card.colours[0]?.code);
  const activeColour = card.colours.find((colour) => colour.code === activeCode) ?? card.colours[0];
  const image = activeColour?.mockupUrl ?? card.imageUrl;
  const margin = formatCents(card.marginCents);

  return (
    <div className="mf-card p-4">
      <div className="flex gap-4">
        <div className="mf-hairline aspect-square w-28 shrink-0 overflow-hidden rounded-2xl">
          {image ? <img src={image} alt={card.name} className="h-full w-full object-cover" loading="lazy" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mf-display text-[20px] leading-tight">{card.name}</div>
          <div className="mf-label mf-dimmed mt-1">
            {card.blankName} · {card.blankCode}
          </div>
          {card.colours.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5" role="list" aria-label="Colours">
              {card.colours.map((colour) => (
                <button
                  key={colour.code}
                  type="button"
                  role="listitem"
                  title={colour.name}
                  aria-pressed={colour.code === activeCode}
                  onClick={() => colour.mockupUrl && setActiveCode(colour.code)}
                  className="h-4 w-4 shrink-0 rounded-full border"
                  style={{
                    background: colour.hex,
                    borderColor: colour.code === activeCode ? 'var(--signal)' : 'color-mix(in srgb, var(--signal) 30%, transparent)',
                    borderWidth: colour.code === activeCode ? 2 : 1,
                  }}
                />
              ))}
            </div>
          ) : null}
          {card.sizes.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.sizes.map((size) => (
                <span key={size} className="mf-hairline px-2 py-0.5 text-[11px]">
                  {size}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mf-dimmed mt-2 text-[12px]">
            {card.printService}
            {card.placement ? ` · ${card.placement}` : ''}
          </div>
        </div>
      </div>
      <div className="mf-hairline-t mt-3 flex flex-col gap-1 pt-2 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Base cost</span>
          <span className="mf-dimmed">{formatCents(card.baseCostCents) ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Retail</span>
          <span className="mf-dimmed">{formatCents(card.retailPriceCents) ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Margin</span>
          <span style={{ color: 'var(--signal)' }}>{margin ?? '—'}</span>
        </div>
      </div>
      <div className="mt-3">
        <StatusPill label={statusLabel[card.status]} tone={statusTone[card.status]} />
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
