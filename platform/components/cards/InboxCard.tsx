import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type InboxCardType = Extract<Card, { kind: 'inbox' }>;

export function InboxCard({ card, ctx }: { card: InboxCardType; ctx: CardActionContext }) {
  return (
    <CardFrame>
      <CardHead label={card.title ?? 'Inbox'} />
      {card.items.length === 0 ? <p className="mfc-empty">Nothing yet. Proofs, sales and shipping updates land here.</p> : null}
      {card.items.length > 0 ? (
        <ul className="mfc-list">
          {card.items.map((item) => (
            <li key={item.id} className="mfc-item">
              <button type="button" disabled={!item.prompt} onClick={() => item.prompt && ctx.onPrompt(item.prompt)} className="mfc-item-btn">
                <span className="mfc-unread" data-read={item.unread ? undefined : ''} aria-hidden />
                <span className="mfc-item-main">
                  <span className="mfc-item-title">
                    {item.unread ? <span className="sr-only">Unread: </span> : null}
                    {item.text}
                  </span>
                  <span className="mfc-item-sub">{item.at}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
