import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type InboxCardType = Extract<Card, { kind: 'inbox' }>;

export function InboxCard({ card, ctx }: { card: InboxCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-3">{card.title}</div> : null}
      {card.items.length === 0 ? (
        <div className="mf-dimmed py-2 text-[13px]">Nothing yet. Proofs, sales and shipping updates land here.</div>
      ) : null}
      <ul className="flex flex-col">
        {card.items.map((item, index) => (
          <li key={item.id} className={index > 0 ? 'mf-hairline-t' : ''}>
            <button
              type="button"
              disabled={!item.prompt}
              onClick={() => item.prompt && ctx.onPrompt(item.prompt)}
              className="mf-tint-hover flex w-full min-h-10 items-start gap-3 py-2 text-left disabled:cursor-default"
            >
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 shrink-0"
                style={{ background: item.unread ? 'var(--signal)' : 'transparent' }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-snug">{item.text}</span>
                <span className="mf-dimmed block text-[11px]">{item.at}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
