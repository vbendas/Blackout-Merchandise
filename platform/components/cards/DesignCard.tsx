'use client';

import type { Card } from '@/lib/ui-cards/schemas';
import { cardActionItems } from '@/components/cards/CardActions';
import { ActionRow, CardFrame, CardHead, SpecRows, type ActionItem, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';
import { useOptionalCatalogue } from '@/components/catalogue/CatalogueProvider';
import { DEFAULT_DESIGN_NAME } from '@/components/catalogue/catalogue-url';

type DesignCardType = Extract<Card, { kind: 'design' }>;

const readinessLabel: Record<DesignCardType['readiness'], string> = {
  ready: 'Ready to print',
  needs_cleanup: 'Needs cleanup',
  blocked: 'Blocked',
};

const readinessTone: Record<DesignCardType['readiness'], StatusTone> = {
  ready: 'positive',
  needs_cleanup: 'warning',
  blocked: 'danger',
};

export function DesignCard({ card, ctx }: { card: DesignCardType; ctx: CardActionContext }) {
  const catalogue = useOptionalCatalogue();
  // In the Studio the artwork can go straight onto garments: the catalogue
  // opens in pick mode for this design, with a way back to this session.
  const actions: ActionItem[] = [
    ...cardActionItems(card.actions, ctx),
    ...(catalogue
      ? [{ key: 'garments', label: 'Put it on garments', onClick: () => catalogue.open({ design: { id: card.designId, name: card.title ?? DEFAULT_DESIGN_NAME } }) }]
      : []),
  ];
  const rows: SpecRowData[] = [
    ...(card.widthPx && card.heightPx ? [{ key: 'size', label: 'Size', value: `${card.widthPx} × ${card.heightPx} px` }] : []),
    ...(card.dpiAtPrint ? [{ key: 'dpi', label: 'Print resolution', value: `${card.dpiAtPrint} dpi` }] : []),
    ...(card.notes ?? []).map((note, index) => ({ key: `note-${index}`, label: note })),
  ];

  return (
    <CardFrame>
      <CardHead label={card.title ?? 'Artwork'} aside={<StatusPill label={readinessLabel[card.readiness]} tone={readinessTone[card.readiness]} />} />
      {/* The checker shows where the artwork is transparent; the plate would hide cream and white ink. */}
      <div className="mfc-checker mf-checker">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.previewUrl} alt={card.title ?? 'Uploaded artwork'} loading="lazy" />
      </div>
      <SpecRows rows={rows} variant="plain" />
      <ActionRow actions={actions} />
    </CardFrame>
  );
}
