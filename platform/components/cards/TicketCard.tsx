import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
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

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase());
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
  system: 'System',
};

export function TicketCard({ card, ctx }: { card: TicketCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="mf-display truncate text-[18px]">{card.subject}</div>
        <StatusPill label={statusLabel(card.status)} tone={statusTone(card.status)} />
      </div>
      {card.from ? <div className="mf-dimmed mt-1 text-[12px]">{card.from}</div> : null}

      {card.messages.length > 0 ? (
        <div className="mf-hairline-t mt-3 flex flex-col gap-2.5 pt-3">
          {card.messages.map((message, index) => {
            // Admin replies read as the artist's own conversation with
            // support, so they mirror a chat bubble (right, tinted); artist
            // and system lines stay left, unadorned.
            const isAdmin = message.author === 'admin';
            return (
              <div key={index} className={`flex flex-col ${isAdmin ? 'items-end text-right' : 'items-start text-left'}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed"
                  style={isAdmin ? { background: 'var(--tint-8)' } : undefined}
                >
                  {message.text}
                </div>
                <div className="mf-dimmed mt-0.5 text-[11px]">
                  {authorLabel[message.author]} · {formatTime(message.at)}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
