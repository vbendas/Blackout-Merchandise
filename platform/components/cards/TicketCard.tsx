import { humanStatus } from '@/lib/format/status';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type TicketCardType = Extract<Card, { kind: 'ticket' }>;
type TicketMessage = TicketCardType['messages'][number];

function statusTone(status: string): StatusTone {
  const value = status.toLowerCase();
  if (['resolved', 'closed'].includes(value)) return 'positive';
  if (['open', 'new'].includes(value)) return 'warning';
  if (['pending', 'waiting'].includes(value)) return 'dim';
  return 'neutral';
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const authorLabel: Record<TicketMessage['author'], string> = {
  artist: 'Artist',
  admin: 'Support',
  system: 'Blackout Merchandise',
};

export function TicketCard({ card, ctx }: { card: TicketCardType; ctx: CardActionContext }) {
  return (
    <CardFrame>
      <CardHead
        label="Support"
        title={card.subject}
        sentence={card.from}
        aside={<StatusPill label={humanStatus(card.status)} tone={statusTone(card.status)} />}
      />

      {card.messages.length > 0 ? (
        <div className="mfc-msgs">
          {card.messages.map((message, index) => (
            // Support replies read as the artist's own conversation with
            // support, so they sit on the right, tinted; artist and system
            // lines stay left.
            <div key={index} className="mfc-msg" data-side={message.author === 'admin' ? 'end' : undefined}>
              <div className="mfc-bubble">{message.text}</div>
              <div className="mfc-msg-meta">
                {authorLabel[message.author]} · {formatTime(message.at)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
