import Link from 'next/link';
import type { ChatMessage } from '@/components/chat/useConversation';
import type { CardActionContext } from '@/components/cards/actions';
import { CardSwitch } from '@/components/cards/CardSwitch';
import { Chip } from '@/components/ui/Chip';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { ChatPick } from '@/lib/agent/pick';

/** Colour dots shown under a garment; any more are counted. */
const PICK_DOTS = 6;

/** The garments an artist picked in the catalogue: small plates with names and colour dots. */
function PickStrip({ pick }: { pick: ChatPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {pick.blanks.map((blank) => {
        const dots = blank.colours.slice(0, PICK_DOTS);
        const more = blank.colours.length - dots.length;
        return (
          <div key={blank.code} className="grid w-[92px] gap-1">
            <div className="relative aspect-[4/5] rounded-[2px] bg-[#ECE5DA]">
              <img
                src={blank.image}
                alt=""
                width={92}
                height={115}
                loading="lazy"
                className="absolute inset-0 size-full object-contain p-[6%]"
              />
            </div>
            <span className="text-[11px] leading-[1.3] opacity-80">{blank.name}</span>
            <span role="img" aria-label={blank.colours.map((colour) => colour.name).join(', ')} className="flex items-center gap-[3px]">
              {dots.map((colour) => (
                <span key={colour.code} aria-hidden="true" className="mf-hairline size-2 rounded-full" style={{ background: colour.hex }} />
              ))}
              {more > 0 ? (
                <span aria-hidden="true" className="text-[11px] leading-none opacity-80">
                  +{more}
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MessageBubble({
  message,
  ctx,
  onRetry,
}: {
  message: ChatMessage;
  ctx: CardActionContext;
  /** Try again under a failed reply */
  onRetry?: (message: ChatMessage) => void;
}) {
  if (message.role === 'user') {
    return (
      <Message from="user" className="mf-fade-in max-w-[70%]">
        <MessageContent className="flex flex-col gap-2 mf-hairline rounded-[2px] bg-transparent px-[18px] py-3 text-[15px] text-[var(--signal)]">
          {message.attachments && message.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((attachment, index) => (
                <img
                  key={`${attachment.url}-${index}`}
                  src={attachment.url}
                  alt={attachment.name ?? 'Uploaded artwork'}
                  className="max-h-[220px] max-w-[220px] rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}
          {message.text ? message.text : null}
          {message.pick ? <PickStrip pick={message.pick} /> : null}
        </MessageContent>
      </Message>
    );
  }

  // A reply that has said nothing yet shows only as the thread's Thinking line.
  if (!message.text && message.cards.length === 0 && !message.stopped && !message.failed) return null;

  const failed = message.failed;
  return (
    <Message from="assistant" className="mf-fade-in max-w-full">
      {message.text ? (
        <MessageContent className="w-full max-w-none p-0 text-[16px] leading-[1.55]">
          <MessageResponse>{message.text}</MessageResponse>
        </MessageContent>
      ) : null}
      {message.cards.map((card) => (
        <CardSwitch key={card.id} card={card} ctx={ctx} />
      ))}
      {message.stopped ? <p className="mf-mono-note">Stopped</p> : null}
      {failed ? (
        <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[14px] leading-relaxed">{failed.message}</p>
          {failed.code === 'signed_out' ? (
            <Link href="/sign-in" className="mf-ulink">
              Sign in
            </Link>
          ) : null}
          {failed.retry && onRetry ? (
            <Chip small onClick={() => onRetry(message)}>
              Try again
            </Chip>
          ) : null}
        </div>
      ) : null}
    </Message>
  );
}
