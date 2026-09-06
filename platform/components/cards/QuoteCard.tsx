import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type QuoteCardType = Extract<Card, { kind: 'quote' }>;

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency });
}

export function QuoteCard({ card, ctx }: { card: QuoteCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-3">{card.title}</div> : null}
      <div className="mf-dimmed flex items-center justify-between text-[11px] uppercase tracking-wide">
        <span>Item</span>
        <span>Qty · Unit · Total</span>
      </div>
      {card.lines.map((line, index) => (
        <div key={`${line.label}-${index}`} className="mf-hairline-t flex items-center justify-between py-1.5 text-[13px]">
          <span>{line.label}</span>
          <span className="mf-dimmed">
            {line.qty} · {formatCents(line.unitCents, card.currency)} ·{' '}
            <span style={{ color: 'var(--signal)' }}>{formatCents(line.totalCents, card.currency)}</span>
          </span>
        </div>
      ))}
      <div className="mf-hairline-t flex items-center justify-between pt-2 text-[14px]">
        <span>Total</span>
        <span style={{ color: 'var(--signal)' }}>{formatCents(card.totalCents, card.currency)}</span>
      </div>
      {card.note ? <p className="mf-dimmed mt-2 text-[12px] leading-relaxed">{card.note}</p> : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
