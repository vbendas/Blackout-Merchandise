import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type BlankGridCardType = Extract<Card, { kind: 'blank_grid' }>;

function formatPrice(cents?: number): string | null {
  if (cents === undefined) return null;
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

export function BlankGridCard({ card, ctx }: { card: BlankGridCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-3">{card.title}</div> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {card.items.map((item) => {
          const price = formatPrice(item.fromPriceCents);
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => ctx.onPrompt(`Show me ${item.code}`)}
              className="mf-tint-hover mf-hairline flex min-h-10 flex-col gap-2 rounded-xl p-2 text-left"
            >
              <span className="mf-hairline aspect-square w-full rounded-2xl p-[9%]">
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
              </span>
              <span className="text-[12px] leading-tight">{item.name}</span>
              {price ? <span className="mf-dimmed text-[11px]">from {price}</span> : null}
            </button>
          );
        })}
      </div>
      {card.total !== undefined ? <div className="mf-dimmed mt-3 text-[12px]">{card.total} blanks total</div> : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
