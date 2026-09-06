import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type NoticeCardType = Extract<Card, { kind: 'notice' }>;

const toneColour: Record<NoticeCardType['tone'], string> = {
  info: 'var(--signal)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--danger)',
};

export function NoticeCard({ card, ctx }: { card: NoticeCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card flex gap-3 p-4" style={{ borderLeft: `2px solid ${toneColour[card.tone]}` }}>
      <div className="min-w-0 flex-1">
        {card.title ? <div className="mf-label mf-dimmed mb-1">{card.title}</div> : null}
        <p className="text-[14px] leading-relaxed">{card.text}</p>
        <CardActions actions={card.actions} ctx={ctx} />
      </div>
    </div>
  );
}
