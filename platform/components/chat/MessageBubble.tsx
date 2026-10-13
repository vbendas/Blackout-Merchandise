import Link from 'next/link';
import type { ChatMessage } from '@/components/chat/useConversation';
import type { CardActionContext } from '@/components/cards/actions';
import { CardSwitch } from '@/components/cards/CardSwitch';
import { Chip } from '@/components/ui/Chip';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';

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
