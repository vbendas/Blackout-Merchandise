import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';
import '@/components/cards/cards.css';

type NoticeCardType = Extract<Card, { kind: 'notice' }>;

/** Monochrome: an error is white text inside a white rule, a warning 80%, an
 * info 50% (see .mfc-notice). The tone is set on the element, not a colour. */
export function NoticeCard({ card, ctx }: { card: NoticeCardType; ctx: CardActionContext }) {
  return (
    <div className="mfc-notice" data-tone={card.tone}>
      {card.title ? <div className="mfc-label">{card.title}</div> : null}
      <p>{card.text}</p>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
