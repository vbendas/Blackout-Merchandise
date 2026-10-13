'use client';

import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { Plate, blankLabel, formatMoney } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';
import { useOptionalCatalogue } from '@/components/catalogue/CatalogueProvider';

type BlankGridCardType = Extract<Card, { kind: 'blank_grid' }>;

// Blanks are named by what they are ('Heavy hoodie'), with the fabric facts
// under the name; the supplier's model name and code stay in the detail view.
// A grid has no outer box: each tile keeps one hairline.
export function BlankGridCard({ card, ctx }: { card: BlankGridCardType; ctx: CardActionContext }) {
  const catalogue = useOptionalCatalogue();
  const shown = card.items.length;
  // "12 of 36" when the grid shows a page of more blanks, else how many it holds.
  const countLabel = card.total !== undefined && card.total > shown ? `${shown} of ${card.total}` : `${shown} blanks`;
  return (
    <div className="mfc-stack">
      {card.title ? <span className="mfc-label">{card.title}</span> : null}
      <div className="mfc-tiles">
        {card.items.map((item) => {
          const name = blankLabel(item.code, item.name);
          return (
            <button key={item.code} type="button" onClick={() => ctx.onPrompt(`Show me the ${name}`)} className="mfc-tile">
              <Plate src={item.imageUrl} keep />
              <span className="mfc-tile-body">
                <span className="mfc-tile-name">{name}</span>
                {item.facts ? <span className="mfc-tile-facts">{item.facts}</span> : null}
                {item.fromPriceCents !== undefined ? <span className="mfc-tile-price">from {formatMoney(item.fromPriceCents)}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mfc-labelrow">
        <p className="mfc-gridnote">{countLabel}</p>
        {catalogue ? (
          <button type="button" className="mfc-link" onClick={() => catalogue.open({ category: card.category, q: card.query })}>
            Browse all in the catalogue
          </button>
        ) : null}
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
