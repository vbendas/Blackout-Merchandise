import { humanStatus } from '@/lib/format/status';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, formatDate, formatMoney } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type OrdersTableCardType = Extract<Card, { kind: 'orders_table' }>;

// Two lines per row (reference, then date and status) instead of five
// columns, so it reads the same at 390px as on a wide screen with no
// horizontal scroll.
export function OrdersTableCard({ card, ctx }: { card: OrdersTableCardType; ctx: CardActionContext }) {
  const total = card.total ?? card.rows.length;

  return (
    <CardFrame>
      <CardHead label={card.title ?? 'Orders'} />
      {card.rows.length === 0 ? (
        <p className="mfc-empty">Nothing here yet.</p>
      ) : (
        <ul className="mfc-list">
          {card.rows.map((row) => {
            const clickable = Boolean(row.prompt);
            return (
              <li key={row.orderId} className="mfc-item">
                <button type="button" disabled={!clickable} onClick={() => row.prompt && ctx.onPrompt(row.prompt)} className="mfc-item-btn">
                  <span className="mfc-item-main">
                    <span className="mfc-item-title">{row.reference}</span>
                    <span className="mfc-item-sub">
                      {formatDate(row.placedAt, false)} · {humanStatus(row.status)}
                    </span>
                  </span>
                  <span className="mfc-item-end">
                    <span>{formatMoney(row.grossCents)}</span>
                    {row.transferCents !== undefined ? <span className="mfc-item-sub">Your share {formatMoney(row.transferCents)}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {total > card.rows.length ? <p className="mfc-gridnote">Showing {card.rows.length} of {total}</p> : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
