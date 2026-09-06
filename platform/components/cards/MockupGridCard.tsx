import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type MockupGridCardType = Extract<Card, { kind: 'mockup_grid' }>;

export function MockupGridCard({ card, ctx }: { card: MockupGridCardType; ctx: CardActionContext }) {
  const columns = card.columns ?? 2;

  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-3">{card.title}</div> : null}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {card.items.map((item) => {
          const clickable = Boolean(item.prompt);
          return (
            <button
              key={item.id}
              type="button"
              disabled={!clickable}
              onClick={() => item.prompt && ctx.onPrompt(item.prompt)}
              className="mf-lift flex flex-col gap-1.5 text-left disabled:cursor-default"
            >
              <span className="mf-hairline block aspect-square w-full overflow-hidden rounded-2xl">
                <img src={item.url} alt={item.label ?? ''} className="h-full w-full object-cover" loading="lazy" />
              </span>
              {item.label ? <span className="mf-dimmed text-[12px] leading-tight">{item.label}</span> : null}
            </button>
          );
        })}
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
