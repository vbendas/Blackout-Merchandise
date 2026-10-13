import { humanStatus } from '@/lib/format/status';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, SpecRows, formatDate, formatMoney, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type OrderCardType = Extract<Card, { kind: 'order' }>;

function statusTone(status: string): StatusTone {
  const value = status.toLowerCase();
  if (['paid', 'live', 'shipped', 'delivered', 'fulfilled'].includes(value)) return 'positive';
  if (['cancelled', 'refunded', 'error'].includes(value)) return 'danger';
  if (['processing', 'printing', 'packed', 'queued', 'proof_pending'].includes(value)) return 'dim';
  return 'neutral';
}

export function OrderCard({ card, ctx }: { card: OrderCardType; ctx: CardActionContext }) {
  const subtotalCents = card.totals.grossCents - card.totals.shippingCents - card.totals.taxCents;
  const placed = formatDate(card.placedAt);

  const rows: SpecRowData[] = [
    ...card.lines.map((line, index) => ({
      key: `line-${index}`,
      label: `${line.label}${line.colour ? ` · ${line.colour}` : ''}${line.size ? ` · ${line.size}` : ''} × ${line.qty}`,
      value: formatMoney(line.unitCents * line.qty),
    })),
    { key: 'subtotal', label: 'Subtotal', value: formatMoney(subtotalCents), dim: true },
    { key: 'shipping', label: 'Shipping', value: formatMoney(card.totals.shippingCents), dim: true },
    { key: 'tax', label: 'Tax', value: formatMoney(card.totals.taxCents), dim: true },
    { key: 'total', label: 'Total', value: formatMoney(card.totals.grossCents), strong: true },
    ...(card.totals.transferCents !== undefined
      ? [{ key: 'share', label: 'Your share', value: formatMoney(card.totals.transferCents), strong: true }]
      : []),
    ...(card.tracking
      ? [
          {
            key: 'tracking',
            label: 'Tracking',
            value: card.tracking.url ? (
              <a href={card.tracking.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                {card.tracking.carrier} · {card.tracking.code}
              </a>
            ) : (
              `${card.tracking.carrier} · ${card.tracking.code}`
            ),
          },
        ]
      : []),
  ];

  return (
    <CardFrame>
      <CardHead
        label="Order"
        title={card.reference}
        sentence={card.productionStatus ? `${placed} · ${humanStatus(card.productionStatus)}` : placed}
        aside={<StatusPill label={humanStatus(card.status)} tone={statusTone(card.status)} />}
      />
      <SpecRows rows={rows} variant="plain" />
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
