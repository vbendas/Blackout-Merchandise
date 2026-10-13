import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, Sizes, SpecRows, Swatches, blankLabel, formatMoney, type SpecRowData } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type BlankCardType = Extract<Card, { kind: 'blank' }>;

export function BlankCard({ card, ctx }: { card: BlankCardType; ctx: CardActionContext }) {
  const name = blankLabel(card.code, card.name);

  const rows: SpecRowData[] = [
    ...(card.composition ? [{ key: 'fabric', label: 'Fabric', value: card.composition }] : []),
    ...(card.weightGsm ? [{ key: 'weight', label: 'Weight', value: `${card.weightGsm} g` }] : []),
    ...(card.fit ? [{ key: 'fit', label: 'Fit', value: card.fit }] : []),
    ...(card.printServices && card.printServices.length > 0 ? [{ key: 'print', label: 'Print', value: card.printServices.join(', ') }] : []),
    ...(card.fromPriceCents !== undefined ? [{ key: 'from', label: 'From', value: formatMoney(card.fromPriceCents), strong: true }] : []),
  ];

  return (
    <CardFrame media={card.imageUrl} mediaAlt={name}>
      <CardHead label={card.title ?? card.type ?? 'Blank'} title={name} sentence={card.description} />
      <Swatches colours={card.colours ?? []} />
      <Sizes sizes={card.sizes ?? []} />
      <SpecRows rows={rows} variant="plain" />
      <CardActions actions={card.actions} ctx={ctx} />
      {/* The supplier's own name and style code: detail text, never the name. */}
      <p className="mfc-detail">Supplier style {card.supplierName ? `${card.supplierName} · ` : ''}{card.code}</p>
    </CardFrame>
  );
}
