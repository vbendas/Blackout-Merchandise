import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type OrdersTableCardType = Extract<Card, { kind: 'orders_table' }>;

// Proportional tracks (not a fixed min-width) so the five columns fit the
// card at both preview widths without forcing a horizontal scroll.
const GRID_COLUMNS = '1.3fr 0.7fr 0.9fr 0.8fr 0.9fr';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase());
}

export function OrdersTableCard({ card, ctx }: { card: OrdersTableCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-2">{card.title}</div> : null}
      <div className="overflow-x-auto">
        <div className="mf-dimmed grid gap-1.5 pb-1.5 text-[10px] uppercase tracking-wide" style={{ gridTemplateColumns: GRID_COLUMNS }}>
          <span>Reference</span>
          <span>Date</span>
          <span>Status</span>
          <span className="text-right">Gross</span>
          <span className="text-right">Share</span>
        </div>
        {card.rows.map((row) => {
          const clickable = Boolean(row.prompt);
          return (
            <button
              key={row.orderId}
              type="button"
              disabled={!clickable}
              onClick={() => row.prompt && ctx.onPrompt(row.prompt)}
              className="mf-hairline-t mf-tint-hover grid w-full items-center gap-1.5 py-2 text-left text-[13px] disabled:cursor-default"
              style={{ gridTemplateColumns: GRID_COLUMNS }}
            >
              <span className="truncate">{row.reference}</span>
              <span className="mf-dimmed truncate whitespace-nowrap">{formatDate(row.placedAt)}</span>
              <span className="mf-dimmed truncate">{statusLabel(row.status)}</span>
              <span className="truncate text-right whitespace-nowrap">{formatCents(row.grossCents)}</span>
              <span
                className="truncate text-right whitespace-nowrap"
                style={{ color: row.transferCents !== undefined ? 'var(--signal)' : undefined }}
              >
                {row.transferCents !== undefined ? formatCents(row.transferCents) : '—'}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mf-hairline-t mf-dimmed mt-2 pt-2 text-[12px]">{card.total ?? card.rows.length} orders</div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
