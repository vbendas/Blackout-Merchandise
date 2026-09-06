import type { ChatMessage } from '@/components/chat/useConversation';
import type { CardActionContext } from '@/components/cards/actions';
import { CardSwitch } from '@/components/cards/CardSwitch';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';

export function MessageBubble({
  message,
  ctx,
  confirmResolutions,
}: {
  message: ChatMessage;
  ctx: CardActionContext;
  confirmResolutions: Record<string, 'approved' | 'rejected'>;
}) {
  if (message.role === 'user') {
    return (
      <Message from="user" className="mf-fade-in max-w-[70%]">
        <MessageContent className="flex flex-col gap-2 rounded-[22px] bg-[var(--tint-8)] px-[18px] py-3 text-[15px] text-[var(--signal)]">
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

  return (
    <Message from="assistant" className="mf-fade-in max-w-full">
      {message.text ? (
        <MessageContent className="w-full max-w-none p-0 text-[16px] leading-[1.55]">
          <MessageResponse>{message.text}</MessageResponse>
        </MessageContent>
      ) : null}
      {message.cards.map((card) => (
        <CardSwitch key={card.id} card={card} ctx={ctx} confirmResolution={card.kind === 'confirm' ? confirmResolutions[card.toolCallId] : undefined} />
      ))}
    </Message>
  );
}
