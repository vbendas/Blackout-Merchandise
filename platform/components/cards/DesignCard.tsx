import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, SpecRows, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

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
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
