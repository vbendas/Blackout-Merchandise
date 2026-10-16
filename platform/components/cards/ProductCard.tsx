'use client';

import { useState } from 'react';
import type { Card } from '@/lib/ui-cards/schemas';
import { humanStatus } from '@/lib/format/status';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, Sizes, SpecRows, Swatches, ViewPicker, blankLabel, productSpecRows, sleevesWaiting, viewImage, type SpecRowData } from '@/components/cards/CardKit';
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
  // The side on show: the front and back photos, and each sleeve's flat proof once the print files are made.
  const [view, setView] = useState<string | null>(null);
  const activeColour = card.colours.find((colour) => colour.code === activeCode) ?? card.colours[0];
  const image = viewImage(activeColour, view) ?? card.imageUrl;
  const waiting = sleevesWaiting(card.areas, activeColour?.views);

  const approval = card.printApproval;
  // Where it prints, area by area, and what the base cost is made of.
  const rows: SpecRowData[] = productSpecRows(card);
  // Publishing waits on the artwork's approval: say where it stands, and (blocked) what to do about it.
  if (approval) rows.push({ key: 'artwork', label: 'Artwork', value: approval.covered ? 'Approved' : 'Needs approval', state: approval.covered ? undefined : 'current' });

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
      <ViewPicker views={activeColour?.views} active={view} onPick={setView} />
      <Sizes sizes={card.sizes} />
      <SpecRows rows={rows} variant="plain" />
      {waiting ? <p className="mfc-sentence">{waiting}</p> : null}
      {approval && !approval.covered && approval.sentence ? <p className="mfc-sentence">{approval.sentence}</p> : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
