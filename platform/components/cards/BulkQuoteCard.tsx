import { humanStatus } from '@/lib/format/status';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type BulkQuoteCardType = Extract<Card, { kind: 'bulk_quote' }>;

// Six columns (item, colour, sizes, qty, unit, total) need more room than a
// narrow viewport gives them, so the table scrolls horizontally at a fixed
// minimum width instead of squeezing text — same tradeoff DomainSetupCard
// makes for its records table.
const GRID_COLUMNS = '1.6fr 0.9fr 0.9fr 0.6fr 0.8fr 0.9fr';

const statusTone: Record<BulkQuoteCardType['status'], StatusTone> = {
  quoted: 'neutral',
  proof_pending: 'dim',
  awaiting_payment: 'warning',
  paid: 'positive',
  in_production: 'dim',
  shipped: 'positive',
  delivered: 'positive',
  cancelled: 'danger',
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

export function BulkQuoteCard({ card, ctx }: { card: BulkQuoteCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="mf-display text-[18px]">Bulk order</div>
        <StatusPill label={humanStatus(card.status)} tone={statusTone[card.status]} />
      </div>

      <div className="mf-hairline-t mt-3 overflow-x-auto pt-2">
        <div className="min-w-[480px]">
          <div className="mf-dimmed grid gap-1.5 pb-1.5 text-[10px] uppercase tracking-wide" style={{ gridTemplateColumns: GRID_COLUMNS }}>
            <span>Item</span>
            <span>Colour</span>
            <span>Sizes</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit</span>
            <span className="text-right">Total</span>
          </div>
          {card.lines.map((line, index) => (
            <div
              key={`${line.label}-${index}`}
              className="mf-hairline-t grid items-center gap-1.5 py-1.5 text-[13px]"
              style={{ gridTemplateColumns: GRID_COLUMNS }}
            >
              <span className="truncate">{line.label}</span>
              <span className="mf-dimmed truncate">{line.colour ?? '—'}</span>
              <span className="mf-dimmed truncate">{line.sizes ?? '—'}</span>
              <span className="text-right">{line.qty}</span>
              <span className="mf-dimmed text-right whitespace-nowrap">{formatCents(line.unitCents)}</span>
              <span className="text-right whitespace-nowrap">{formatCents(line.totalCents)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mf-hairline-t mt-1 flex flex-col gap-1 pt-2 text-[13px]">
        {card.setupCents !== undefined ? (
          <div className="flex items-center justify-between">
            <span className="mf-dimmed">Setup</span>
            <span className="mf-dimmed">{formatCents(card.setupCents)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="mf-dimmed">Shipping</span>
          <span className="mf-dimmed">{formatCents(card.shippingCents)}</span>
        </div>
        <div className="flex items-center justify-between text-[14px]">
          <span>Total</span>
          <span style={{ color: 'var(--signal)' }}>{formatCents(card.totalCents)}</span>
        </div>
      </div>

      {card.shipTo || card.leadTime ? (
        <div className="mf-hairline-t mt-2 flex flex-col gap-0.5 pt-2 text-[12px]">
          {card.shipTo ? <span className="mf-dimmed">Ship to {card.shipTo}</span> : null}
          {card.leadTime ? <span className="mf-dimmed">Lead time {card.leadTime}</span> : null}
        </div>
      ) : null}

      {card.checkoutUrl ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={card.checkoutUrl} target="_blank" rel="noopener noreferrer" className="mf-pill mf-pill-sm mf-pill-primary">
            Pay now
          </a>
        </div>
      ) : (
        <CardActions actions={card.actions} ctx={ctx} />
      )}
    </div>
  );
}
