import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type SupplierOrderCardType = Extract<Card, { kind: 'supplier_order' }>;

function statusTone(status: string): StatusTone {
  if (status === 'received') return 'positive';
  if (status === 'cancelled') return 'dim';
  return 'neutral';
}

export function SupplierOrderCard({ card, ctx }: { card: SupplierOrderCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="mf-display truncate text-[16px]">{card.title ?? card.supplier}</div>
          <div className="mf-dimmed text-[12px]">
            {card.supplier} · {card.totalUnits} unit{card.totalUnits === 1 ? '' : 's'}
          </div>
        </div>
        <StatusPill label={card.status} tone={statusTone(card.status)} />
      </div>

      {card.lines.length > 0 ? (
        <div className="mf-hairline-t mt-3 grid gap-1.5 pt-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
          {card.lines.map((line, index) => (
            <div key={`${line.blankCode}-${line.colour}-${line.size}-${index}`} className="mf-hairline rounded-lg px-2.5 py-2 text-[12px]">
              <div className="truncate">{line.blankName}</div>
              <div className="mf-dimmed truncate">
                {line.colour} · {line.size}
              </div>
              <div>{line.qty} units</div>
            </div>
          ))}
        </div>
      ) : null}

      {card.note ? <div className="mf-dimmed mt-3 text-[12px]">{card.note}</div> : null}

      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
