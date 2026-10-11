import { humanStatus } from '@/lib/format/status';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
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

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OrderCard({ card, ctx }: { card: OrderCardType; ctx: CardActionContext }) {
  const subtotalCents = card.totals.grossCents - card.totals.shippingCents - card.totals.taxCents;

  return (
    <div className="mf-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="mf-display truncate text-[16px]">{card.reference}</div>
          <div className="mf-dimmed text-[12px]">
            {formatDate(card.placedAt)}
            {card.productionStatus ? ` · ${humanStatus(card.productionStatus)}` : ''}
          </div>
        </div>
        <StatusPill label={humanStatus(card.status)} tone={statusTone(card.status)} />
      </div>

      {card.lines.length > 0 ? (
        <div className="mf-hairline-t mt-3 pt-1">
          {card.lines.map((line, index) => (
            <div key={`${line.label}-${index}`} className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
              <span className="min-w-0 truncate">
                {line.label}
                {line.colour ? ` · ${line.colour}` : ''}
                {line.size ? ` · ${line.size}` : ''} × {line.qty}
              </span>
              <span className="mf-dimmed shrink-0">{formatCents(line.unitCents)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mf-hairline-t mt-1 flex flex-col gap-1 pt-2 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Subtotal</span>
          <span className="mf-dimmed">{formatCents(subtotalCents)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Shipping</span>
          <span className="mf-dimmed">{formatCents(card.totals.shippingCents)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Tax</span>
          <span className="mf-dimmed">{formatCents(card.totals.taxCents)}</span>
        </div>
        <div className="flex items-center justify-between text-[14px]">
          <span>Total</span>
          <span>{formatCents(card.totals.grossCents)}</span>
        </div>
        {card.totals.transferCents !== undefined ? (
          <div className="flex items-center justify-between">
            <span className="mf-dimmed">Your share</span>
            <span style={{ color: 'var(--signal)' }}>{formatCents(card.totals.transferCents)}</span>
          </div>
        ) : null}
      </div>

      {card.tracking ? (
        <div className="mf-hairline-t mt-2 pt-2 text-[12px]">
          {card.tracking.url ? (
            <a href={card.tracking.url} target="_blank" rel="noopener noreferrer" className="underline">
              {card.tracking.carrier} · {card.tracking.code}
            </a>
          ) : (
            <span className="mf-dimmed">
              {card.tracking.carrier} · {card.tracking.code}
            </span>
          )}
        </div>
      ) : null}

      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
