import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type BlankCardType = Extract<Card, { kind: 'blank' }>;

function formatPrice(cents?: number): string | null {
  if (cents === undefined) return null;
  return `from ${(cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}`;
}

export function BlankCard({ card, ctx }: { card: BlankCardType; ctx: CardActionContext }) {
  const price = formatPrice(card.fromPriceCents);
  return (
    <div className="mf-card p-4">
      <div className="flex gap-4">
        <div className="mf-plate aspect-square w-28 shrink-0 p-[9%]">
          <img src={card.imageUrl} alt={card.name} className="h-full w-full object-contain" loading="lazy" />
        </div>
        <div className="min-w-0 flex-1">
          {card.title ? <div className="mf-label mf-dimmed mb-1">{card.title}</div> : null}
          <div className="text-[15px] leading-snug">{card.name}</div>
          <div className="mf-label mf-dimmed mt-1">{card.code}</div>
          {card.description ? <p className="mf-dimmed mt-2 text-[13px] leading-relaxed">{card.description}</p> : null}
          {card.colours && card.colours.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5" role="list" aria-label="Colours">
              {card.colours.map((colour) => (
                <span
                  key={colour.code}
                  role="listitem"
                  title={colour.name}
                  className="h-4 w-4 shrink-0 border"
                  style={{ background: colour.hex, borderColor: 'color-mix(in srgb, var(--signal) 30%, transparent)' }}
                />
              ))}
            </div>
          ) : null}
          {card.sizes && card.sizes.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.sizes.map((size) => (
                <span key={size} className="mf-hairline px-2 py-0.5 text-[11px]">
                  {size}
                </span>
              ))}
            </div>
          ) : null}
          {price ? <div className="mt-2 text-[13px]">{price}</div> : null}
        </div>
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
