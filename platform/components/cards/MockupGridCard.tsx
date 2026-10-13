import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { Plate } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type MockupGridCardType = Extract<Card, { kind: 'mockup_grid' }>;

// A grid has no outer box: each mockup is a tile with one hairline, on the plate.
export function MockupGridCard({ card, ctx }: { card: MockupGridCardType; ctx: CardActionContext }) {
  const columns = card.columns ?? 2;

  return (
    <div className="mfc-stack">
      {card.title ? <span className="mfc-label">{card.title}</span> : null}
      <div className="mfc-tiles" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {card.items.map((item) => {
          const clickable = Boolean(item.prompt);
          return (
            <button
              key={item.id}
              type="button"
              disabled={!clickable}
              onClick={() => item.prompt && ctx.onPrompt(item.prompt)}
              className="mfc-tile"
            >
              <Plate src={item.url} alt={item.label ?? ''} ratio="1 / 1" />
              {item.label ? (
                <span className="mfc-tile-body">
                  <span className="mfc-tile-facts">{item.label}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
